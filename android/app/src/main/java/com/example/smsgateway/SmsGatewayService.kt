package com.example.smsgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.smsgateway.model.GatewayLogEntry
import com.example.smsgateway.model.OutboundSms
import io.github.jan.supabase.realtime.PostgresAction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class SmsGatewayService : Service() {

    private val tag = "SmsGatewayService"
    private val serviceJob = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + serviceJob)

    private lateinit var supabaseRepository: SupabaseRepository
    private lateinit var smsSender: SmsSender
    private var wakeLock: PowerManager.WakeLock? = null
    private var pollingJob: Job? = null
    private var realtimeJob: Job? = null

    companion object {
        const val ACTION_START = "ACTION_START_GATEWAY"
        const val ACTION_STOP = "ACTION_STOP_GATEWAY"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "sms_gateway_channel"

        // Observable State for UI
        private val _isServiceRunning = MutableStateFlow(false)
        val isServiceRunning: StateFlow<Boolean> = _isServiceRunning.asStateFlow()

        private val _isSupabaseConnected = MutableStateFlow(false)
        val isSupabaseConnected: StateFlow<Boolean> = _isSupabaseConnected.asStateFlow()

        private val _recentLogs = MutableStateFlow<List<GatewayLogEntry>>(emptyList())
        val recentLogs: StateFlow<List<GatewayLogEntry>> = _recentLogs.asStateFlow()

        fun addLog(entry: GatewayLogEntry) {
            val current = _recentLogs.value.toMutableList()
            current.add(0, entry)
            // Keep latest 100 entries
            if (current.size > 100) {
                current.removeAt(current.size - 1)
            }
            _recentLogs.value = current
        }
    }

    override fun onCreate() {
        super.onCreate()
        supabaseRepository = SupabaseRepository()
        smsSender = SmsSender(applicationContext)

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SmsGateway::WakeLock").apply {
            setReferenceCounted(false)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopGateway()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START, null -> {
                startForegroundNotification()
                startGateway()
            }
        }
        return START_STICKY
    }

    private fun startForegroundNotification() {
        createNotificationChannel()

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, SmsGatewayService::class.java).apply { action = ACTION_STOP },
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS Gateway Active")
            .setContentText("Listening for outbound messages from Supabase...")
            .setSmallIcon(android.R.drawable.sym_action_chat)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Gateway", stopIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startGateway() {
        _isServiceRunning.value = true
        wakeLock?.acquire(24 * 60 * 60 * 1000L) // 24h fallback
        Log.i(tag, "SmsGatewayService started")

        // 1. Initial Connection Test
        scope.launch {
            val result = supabaseRepository.checkConnection()
            _isSupabaseConnected.value = result.isSuccess
            if (result.isSuccess) {
                addLog(GatewayLogEntry(
                    id = "SYS-CONN",
                    phoneNumber = "SYSTEM",
                    previewMessage = "Connected to Supabase table 'otp_sender'",
                    status = "CONNECTED"
                ))
            } else {
                addLog(GatewayLogEntry(
                    id = "SYS-ERR",
                    phoneNumber = "SYSTEM",
                    previewMessage = "Failed to connect to Supabase: ${result.exceptionOrNull()?.message}",
                    status = "ERROR"
                ))
            }
        }

        // 2. Realtime WebSocket listener for immediate instant dispatch
        realtimeJob = scope.launch {
            try {
                val flow = supabaseRepository.subscribeToNewPendingInserts()
                flow.collect { action ->
                    if (action is PostgresAction.Insert) {
                        Log.d(tag, "Received Realtime Insert event: ${action.record}")
                        processPendingQueue()
                    }
                }
            } catch (e: Exception) {
                Log.w(tag, "Supabase Realtime subscription error, fallback to polling", e)
            }
        }

        // 3. Resilient Polling Loop (every 5 seconds) to guarantee no missed records
        pollingJob = scope.launch {
            while (isActive) {
                try {
                    processPendingQueue()
                } catch (e: Exception) {
                    Log.e(tag, "Error inside gateway polling iteration", e)
                }
                delay(5000)
            }
        }
    }

    private suspend fun processPendingQueue() {
        val pendingList = supabaseRepository.fetchPendingMessages(limit = 5)
        if (pendingList.isNotEmpty()) {
            _isSupabaseConnected.value = true
        }

        for (sms in pendingList) {
            sendSingleOutboundSms(sms)
        }
    }

    private suspend fun sendSingleOutboundSms(sms: OutboundSms) {
        // Step A: Mark as PROCESSING to prevent duplicate processing
        supabaseRepository.updateSmsStatus(sms.id, OutboundSms.STATUS_PROCESSING)

        val textToSend = sms.getResolvedMessage()
        Log.i(tag, "Dispatching SMS ${sms.id} (OTP: ${sms.otp ?: "N/A"}) to ${sms.phoneNumber}")
        
        // Step B: Send via Android SmsManager
        val sendResult = smsSender.sendSms(
            phoneNumber = sms.phoneNumber,
            messageText = textToSend
        )

        if (sendResult.isSuccess) {
            // Step C: Update Supabase to SENT
            supabaseRepository.updateSmsStatus(sms.id, OutboundSms.STATUS_SENT)
            Log.i(tag, "Successfully sent SMS ${sms.id}")
            addLog(GatewayLogEntry(
                id = sms.id,
                phoneNumber = sms.phoneNumber,
                previewMessage = textToSend.take(60),
                status = OutboundSms.STATUS_SENT,
                otp = sms.otp,
                detail = "Delivered to cellular network"
            ))
        } else {
            val errorMsg = sendResult.exceptionOrNull()?.message ?: "Unknown telephony error"
            // Step D: Update Supabase to FAILED with error details
            supabaseRepository.updateSmsStatus(
                id = sms.id,
                status = OutboundSms.STATUS_FAILED,
                errorMessage = errorMsg
            )
            Log.e(tag, "Failed to send SMS ${sms.id}: $errorMsg")
            addLog(GatewayLogEntry(
                id = sms.id,
                phoneNumber = sms.phoneNumber,
                previewMessage = textToSend.take(60),
                status = OutboundSms.STATUS_FAILED,
                otp = sms.otp,
                detail = errorMsg
            ))
        }
    }

    private fun stopGateway() {
        _isServiceRunning.value = false
        pollingJob?.cancel()
        realtimeJob?.cancel()
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        addLog(GatewayLogEntry(
            id = "SYS-STOP",
            phoneNumber = "SYSTEM",
            previewMessage = "SMS Gateway Service Stopped",
            status = "STOPPED"
        ))
        Log.i(tag, "SmsGatewayService stopped")
    }

    override fun onDestroy() {
        stopGateway()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Outbound SMS Gateway Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when background SMS Gateway is running"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
