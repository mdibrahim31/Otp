/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Play, 
  Square, 
  Smartphone, 
  Database, 
  Send, 
  ShieldCheck, 
  Radio, 
  Terminal, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sliders,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import JSZip from 'jszip';

interface ProjectFile {
  path: string;
  name: string;
  language: string;
  description: string;
  content: string;
}

interface SimulatedSms {
  id: string;
  phoneNumber: string;
  message: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  parts: number;
  createdAt: string;
  sentAt?: string;
  errorMessage?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'code' | 'simulator' | 'sql' | 'architecture'>('code');
  const [selectedFilePath, setSelectedFilePath] = useState<string>('app/src/main/java/com/example/smsgateway/SmsGatewayService.kt');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Simulator State
  const [simServiceRunning, setSimServiceRunning] = useState<boolean>(true);
  const [targetPhone, setTargetPhone] = useState<string>('+1 (555) 234-5678');
  const [targetMessage, setTargetMessage] = useState<string>('Your verification code is 849201. Valid for 10 minutes.');
  const [simFailRate, setSimFailRate] = useState<number>(0);
  const [queue, setQueue] = useState<SimulatedSms[]>([
    {
      id: 'sms-7f2e-48a1',
      phoneNumber: '+1 (555) 019-2834',
      message: 'Order #9042 has been shipped via Express Carrier.',
      status: 'SENT',
      parts: 1,
      createdAt: '12:40:15',
      sentAt: '12:40:16',
    },
    {
      id: 'sms-9b3c-11e2',
      phoneNumber: '+1 (555) 839-4412',
      message: 'Security Alert: New login from Chrome on Windows.',
      status: 'SENT',
      parts: 1,
      createdAt: '12:41:02',
      sentAt: '12:41:03',
    }
  ]);

  const projectFiles: ProjectFile[] = [
    {
      path: 'app/src/main/AndroidManifest.xml',
      name: 'AndroidManifest.xml',
      language: 'xml',
      description: 'Permissions for SEND_SMS, FOREGROUND_SERVICE_DATA_SYNC, and Service definition.',
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Essential Permissions for SMS Gateway & Background execution -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:name=".GatewayApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SupabaseSmsGateway">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:theme="@style/Theme.SupabaseSmsGateway">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Foreground Service for background Supabase listener & SMS dispatcher -->
        <service
            android:name=".SmsGatewayService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="dataSync" />

        <!-- Auto-start gateway after phone reboot -->
        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

    </application>

</manifest>`
    },
    {
      path: 'app/build.gradle.kts',
      name: 'app/build.gradle.kts',
      language: 'kotlin',
      description: 'Gradle configuration with buildConfigField injecting SUPABASE_URL and SUPABASE_KEY.',
      content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.example.smsgateway"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.smsgateway"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Build-time injection of Supabase credentials from Environment Variables
        val envSupabaseUrl = System.getenv("SUPABASE_URL") 
            ?: (project.findProperty("SUPABASE_URL") as? String) 
            ?: "https://your-project-id.supabase.co"

        val envSupabaseKey = System.getenv("SUPABASE_KEY") 
            ?: (project.findProperty("SUPABASE_KEY") as? String) 
            ?: "your-anon-or-service-role-key"

        buildConfigField("String", "SUPABASE_URL", "\\"$envSupabaseUrl\\"")
        buildConfigField("String", "SUPABASE_KEY", "\\"$envSupabaseKey\\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Supabase Kotlin SDK (Postgrest & Realtime)
    implementation(platform("io.github.jan-tennert.supabase:bom:2.1.5"))
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.github.jan-tennert.supabase:realtime-kt")
    implementation("io.ktor:ktor-client-android:2.3.8")

    // Serialization & Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}`
    },
    {
      path: 'app/src/main/java/com/example/smsgateway/SmsGatewayService.kt',
      name: 'SmsGatewayService.kt',
      language: 'kotlin',
      description: 'Persistent Foreground Service combining Supabase Realtime and resilient polling.',
      content: `package com.example.smsgateway

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
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

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

        private val _isServiceRunning = MutableStateFlow(false)
        val isServiceRunning: StateFlow<Boolean> = _isServiceRunning.asStateFlow()

        private val _isSupabaseConnected = MutableStateFlow(false)
        val isSupabaseConnected: StateFlow<Boolean> = _isSupabaseConnected.asStateFlow()

        private val _recentLogs = MutableStateFlow<List<GatewayLogEntry>>(emptyList())
        val recentLogs: StateFlow<List<GatewayLogEntry>> = _recentLogs.asStateFlow()

        fun addLog(entry: GatewayLogEntry) {
            val current = _recentLogs.value.toMutableList()
            current.add(0, entry)
            if (current.size > 100) current.removeAt(current.size - 1)
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
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this, 1,
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
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startGateway() {
        _isServiceRunning.value = true
        wakeLock?.acquire(24 * 60 * 60 * 1000L)

        // Realtime Subscription
        realtimeJob = scope.launch {
            try {
                supabaseRepository.subscribeToNewPendingInserts().collect { action ->
                    if (action is PostgresAction.Insert) {
                        processPendingQueue()
                    }
                }
            } catch (e: Exception) {
                Log.w(tag, "Realtime listener fallback to polling", e)
            }
        }

        // Resilient polling fallback loop (every 5s)
        pollingJob = scope.launch {
            while (isActive) {
                try {
                    processPendingQueue()
                } catch (e: Exception) {
                    Log.e(tag, "Polling loop error", e)
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
            // Mark as PROCESSING
            supabaseRepository.updateSmsStatus(sms.id, OutboundSms.STATUS_PROCESSING)

            // Dispatch using hardware SIM
            val sendResult = smsSender.sendSms(sms.phoneNumber, sms.message)

            if (sendResult.isSuccess) {
                supabaseRepository.updateSmsStatus(sms.id, OutboundSms.STATUS_SENT)
                addLog(GatewayLogEntry(
                    id = sms.id,
                    phoneNumber = sms.phoneNumber,
                    previewMessage = sms.message.take(60),
                    status = OutboundSms.STATUS_SENT,
                    detail = "Sent via cellular radio"
                ))
            } else {
                val error = sendResult.exceptionOrNull()?.message ?: "Telephony failure"
                supabaseRepository.updateSmsStatus(sms.id, OutboundSms.STATUS_FAILED, error)
                addLog(GatewayLogEntry(
                    id = sms.id,
                    phoneNumber = sms.phoneNumber,
                    previewMessage = sms.message.take(60),
                    status = OutboundSms.STATUS_FAILED,
                    detail = error
                ))
            }
        }
    }

    private fun stopGateway() {
        _isServiceRunning.value = false
        pollingJob?.cancel()
        realtimeJob?.cancel()
        if (wakeLock?.isHeld == true) wakeLock?.release()
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
            )
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }
}`
    },
    {
      path: 'app/src/main/java/com/example/smsgateway/SmsSender.kt',
      name: 'SmsSender.kt',
      language: 'kotlin',
      description: 'SmsManager implementation supporting Android 12+ (API 31+), multipart SMS, and callback intents.',
      content: `package com.example.smsgateway

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.util.Log
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.UUID
import kotlin.coroutines.resume

class SmsSender(private val context: Context) {

    private val tag = "SmsSender"

    /**
     * Resolves the SmsManager compatible with Android 12+ (API 31+) & legacy APIs
     */
    private fun getSmsManager(): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }

    suspend fun sendSms(phoneNumber: String, messageText: String): Result<Unit> {
        return suspendCancellableCoroutine { continuation ->
            val smsManager = getSmsManager()
            val actionSent = "SMS_SENT_ACTION_\${UUID.randomUUID()}"
            val intentFilter = IntentFilter(actionSent)

            val parts = smsManager.divideMessage(messageText)
            val totalParts = parts.size
            var receivedParts = 0
            var hasFailed = false
            var failureMessage: String? = null

            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(recvContext: Context?, intent: Intent?) {
                    receivedParts++
                    val code = resultCode

                    if (code != Activity.RESULT_OK) {
                        hasFailed = true
                        failureMessage = parseErrorCode(code)
                    }

                    if (receivedParts >= totalParts) {
                        try {
                            context.unregisterReceiver(this)
                        } catch (_: Exception) {}

                        if (continuation.isActive) {
                            if (hasFailed) {
                                continuation.resume(Result.failure(Exception(failureMessage ?: "SMS failed code $code")))
                            } else {
                                continuation.resume(Result.success(Unit))
                            }
                        }
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(sentReceiver, intentFilter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(sentReceiver, intentFilter)
            }

            continuation.invokeOnCancellation {
                try { context.unregisterReceiver(sentReceiver) } catch (_: Exception) {}
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            try {
                if (parts.size > 1) {
                    val sentIntents = ArrayList<PendingIntent>(parts.size)
                    for (i in 0 until parts.size) {
                        sentIntents.add(PendingIntent.getBroadcast(context, i, Intent(actionSent), flags))
                    }
                    smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null)
                } else {
                    val sentIntent = PendingIntent.getBroadcast(context, 0, Intent(actionSent), flags)
                    smsManager.sendTextMessage(phoneNumber, null, messageText, sentIntent, null)
                }
            } catch (e: Exception) {
                try { context.unregisterReceiver(sentReceiver) } catch (_: Exception) {}
                if (continuation.isActive) continuation.resume(Result.failure(e))
            }
        }
    }

    private fun parseErrorCode(code: Int): String {
        return when (code) {
            SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "Generic carrier or radio failure"
            SmsManager.RESULT_ERROR_RADIO_OFF -> "Radio explicitly turned off (Airplane mode)"
            SmsManager.RESULT_ERROR_NULL_PDU -> "Null PDU (Protocol Data Unit)"
            SmsManager.RESULT_ERROR_NO_SERVICE -> "No cellular network service available"
            SmsManager.RESULT_ERROR_LIMIT_EXCEEDED -> "SMS rate limit exceeded"
            else -> "Telephony error: $code"
        }
    }
}`
    },
    {
      path: 'app/src/main/java/com/example/smsgateway/MainActivity.kt',
      name: 'MainActivity.kt',
      language: 'kotlin',
      description: 'Jetpack Compose dashboard displaying gateway state, Supabase URL status, and live SMS logs.',
      content: `package com.example.smsgateway

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                SmsGatewayDashboard()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmsGatewayDashboard() {
    val context = LocalContext.current
    val isRunning by SmsGatewayService.isServiceRunning.collectAsState()
    val isConnected by SmsGatewayService.isSupabaseConnected.collectAsState()
    val logs by SmsGatewayService.recentLogs.collectAsState()

    var hasSmsPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        hasSmsPermission = perms[Manifest.permission.SEND_SMS] == true
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Supabase SMS Gateway") })
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).padding(16.dp)) {
            // Service Status Card
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = if (isRunning) "Gateway Active / Waiting for SMS" else "Gateway Stopped",
                        fontWeight = FontWeight.Bold,
                        color = if (isRunning) Color(0xFF22C55E) else Color(0xFFEF4444)
                    )
                    Text("Supabase: " + BuildConfig.SUPABASE_URL)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = {
                        val intent = Intent(context, SmsGatewayService::class.java).apply {
                            action = if (isRunning) SmsGatewayService.ACTION_STOP else SmsGatewayService.ACTION_START
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
                        else context.startService(intent)
                    }) {
                        Text(if (isRunning) "Stop Gateway" else "Start Gateway")
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text("Live Outbound Logs", fontWeight = FontWeight.SemiBold)

            LazyColumn {
                items(logs) { log ->
                    Text("\${log.phoneNumber}: \${log.status} - \${log.previewMessage}")
                }
            }
        }
    }
}`
    },
    {
      path: 'app/src/main/java/com/example/smsgateway/SupabaseRepository.kt',
      name: 'SupabaseRepository.kt',
      language: 'kotlin',
      description: 'Supabase client queries for fetching PENDING rows, updating to SENT/FAILED, and Realtime stream.',
      content: `package com.example.smsgateway

import com.example.smsgateway.model.OutboundSms
import com.example.smsgateway.model.SmsStatusUpdate
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.realtime.PostgresAction
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class SupabaseRepository(
    supabaseUrl: String = BuildConfig.SUPABASE_URL,
    supabaseKey: String = BuildConfig.SUPABASE_KEY
) {
    val client = createSupabaseClient(supabaseUrl, supabaseKey) {
        install(Postgrest)
        install(Realtime)
    }

    private val tableName = "otp_sender"

    suspend fun fetchPendingMessages(limit: Long = 10): List<OutboundSms> {
        return client.postgrest[tableName]
            .select {
                filter { eq("status", OutboundSms.STATUS_PENDING) }
                order("created_at", io.github.jan.supabase.postgrest.query.Order.ASCENDING)
                limit(limit)
            }
            .decodeList<OutboundSms>()
    }

    suspend fun updateSmsStatus(id: String, status: String, errorMessage: String? = null): Result<Unit> {
        return runCatching {
            val updatePayload = SmsStatusUpdate(
                status = status,
                sentAt = if (status == OutboundSms.STATUS_SENT) getIsoTimestamp() else null,
                errorMessage = errorMessage
            )
            client.postgrest[tableName].update(updatePayload) {
                filter { eq("id", id) }
            }
        }
    }

    suspend fun subscribeToNewPendingInserts(): Flow<PostgresAction> {
        val channel = client.realtime.channel("outbound-sms-channel")
        val flow = channel.postgresChangeFlow<PostgresAction>(schema = "public") {
            table = tableName
        }
        channel.subscribe()
        return flow
    }

    private fun getIsoTimestamp(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }
}`
    },
    {
      path: 'app/src/main/java/com/example/smsgateway/model/OutboundSms.kt',
      name: 'OutboundSms.kt',
      language: 'kotlin',
      description: 'Data classes matching Supabase table schema (id, phone_number, otp, message, expires_at, status).',
      content: `package com.example.smsgateway.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OutboundSms(
    @SerialName("id")
    val id: String,
    
    @SerialName("phone_number")
    val phoneNumber: String,
    
    @SerialName("otp")
    val otp: String? = null,
    
    @SerialName("message")
    val message: String? = null,
    
    @SerialName("expires_at")
    val expiresAt: String? = null,
    
    @SerialName("status")
    val status: String = STATUS_PENDING,
    
    @SerialName("error_message")
    val errorMessage: String? = null,
    
    @SerialName("created_at")
    val createdAt: String? = null,
    
    @SerialName("sent_at")
    val sentAt: String? = null
) {
    fun getResolvedMessage(): String {
        return when {
            !message.isNullOrBlank() -> message
            !otp.isNullOrBlank() -> "Your OTP verification code is $otp. Valid for 5 minutes."
            else -> "Your verification code has been generated."
        }
    }

    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_PROCESSING = "PROCESSING"
        const val STATUS_SENT = "SENT"
        const val STATUS_FAILED = "FAILED"
    }
}

@Serializable
data class SmsStatusUpdate(
    @SerialName("status")
    val status: String,
    
    @SerialName("sent_at")
    val sentAt: String? = null,
    
    @SerialName("error_message")
    val errorMessage: String? = null
)

data class GatewayLogEntry(
    val timestamp: Long = System.currentTimeMillis(),
    val id: String,
    val phoneNumber: String,
    val previewMessage: String,
    val status: String,
    val otp: String? = null,
    val detail: String? = null
)`
    },
    {
      path: 'supabase_schema.sql',
      name: 'supabase_schema.sql',
      language: 'sql',
      description: 'PostgreSQL table definition, auto-generating 6-digit OTP trigger, and 5-minute expiry column.',
      content: `-- ==========================================================
-- Supabase Schema for Otp_sender Table + Auto OTP Generator
-- ==========================================================

-- 1. Rename existing outbound_sms table to otp_sender (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'outbound_sms') 
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'otp_sender') THEN
        ALTER TABLE public.outbound_sms RENAME TO otp_sender;
    END IF;
END $$;

-- 2. Create table otp_sender if not exists
CREATE TABLE IF NOT EXISTS public.otp_sender (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp TEXT,
    message TEXT,
    expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '5 minutes'),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ
);

-- Upgrade columns if needed:
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS otp TEXT;
ALTER TABLE public.otp_sender ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '5 minutes');
ALTER TABLE public.otp_sender ALTER COLUMN message DROP NOT NULL;

-- 3. Trigger function to automatically generate 6-digit OTP, 5-minute expiry, and SMS message
CREATE OR REPLACE FUNCTION generate_otp_sender_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.otp IS NULL OR NEW.otp = '' THEN
        NEW.otp := lpad(floor(random() * (999999 - 100000 + 1) + 100000)::text, 6, '0');
    END IF;

    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := timezone('utc'::text, now()) + interval '5 minutes';
    END IF;

    IF NEW.message IS NULL OR NEW.message = '' THEN
        NEW.message := 'Your OTP verification code is ' || NEW.otp || '. Valid for 5 minutes.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger before insert on otp_sender
DROP TRIGGER IF EXISTS trg_generate_otp ON public.otp_sender;
CREATE TRIGGER trg_generate_otp
BEFORE INSERT ON public.otp_sender
FOR EACH ROW
EXECUTE FUNCTION generate_otp_sender_code();

-- 5. Indexes for fast queue polling
CREATE INDEX IF NOT EXISTS idx_otp_sender_status_created 
ON public.otp_sender (status, created_at ASC);

-- 6. Enable Realtime on otp_sender table (Safe check if already member)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'otp_sender'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.otp_sender;
    END IF;
END $$;

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.otp_sender ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gateway full access" ON public.otp_sender;
CREATE POLICY "Allow gateway full access" 
ON public.otp_sender
FOR ALL 
USING (true)
WITH CHECK (true);

-- 8. Test Insertion into otp_sender
INSERT INTO public.otp_sender (phone_number, status)
VALUES ('+8801700000000', 'PENDING');`
    }
  ];

  const currentFile = projectFiles.find(f => f.path === selectedFilePath) || projectFiles[2];

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Root build files
      zip.file('settings.gradle.kts', `rootProject.name = "SupabaseSmsGateway"\ninclude(":app")\n`);
      zip.file('build.gradle.kts', `plugins {\n    alias(libs.plugins.android.application) apply false\n    alias(libs.plugins.kotlin.android) apply false\n    alias(libs.plugins.kotlin.serialization) apply false\n}\n`);
      
      // All project files
      for (const file of projectFiles) {
        zip.file(file.path, file.content);
      }

      // Add Readme
      zip.file('README.md', `# Android Supabase Outbound SMS Gateway

## How to Build & Run:
1. Open this folder in Android Studio Hedgehog or newer.
2. In terminal or your CI/CD, export your credentials:
   \`\`\`bash
   export SUPABASE_URL="https://xyzcompany.supabase.co"
   export SUPABASE_KEY="eyJhbGciOi..."
   \`\`\`
   Or add them in \`local.properties\`:
   \`\`\`properties
   SUPABASE_URL=https://xyzcompany.supabase.co
   SUPABASE_KEY=your-supabase-key
   \`\`\`
3. Run the Supabase SQL script (\`supabase_schema.sql\`) in your Supabase SQL Editor.
4. Launch the app on an Android device with an active SIM card.
5. Grant SMS permission and click "Start Gateway".
`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'android-supabase-sms-gateway.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Simulator Queue Processor
  useEffect(() => {
    if (!simServiceRunning) return;

    const interval = setInterval(() => {
      setQueue(prev => {
        const pendingIndex = prev.findIndex(item => item.status === 'PENDING');
        if (pendingIndex === -1) return prev;

        const updated = [...prev];
        const currentItem = updated[pendingIndex];

        // Transition to PROCESSING
        updated[pendingIndex] = { ...currentItem, status: 'PROCESSING' };

        // Schedule completion after 1.2s to simulate carrier radio transmission
        setTimeout(() => {
          setQueue(q => {
            const idx = q.findIndex(i => i.id === currentItem.id);
            if (idx === -1) return q;
            const isFailure = Math.random() < (simFailRate / 100);
            const nowTime = new Date().toLocaleTimeString();

            const nq = [...q];
            nq[idx] = {
              ...nq[idx],
              status: isFailure ? 'FAILED' : 'SENT',
              sentAt: isFailure ? undefined : nowTime,
              errorMessage: isFailure ? 'Carrier Radio Failure (RESULT_ERROR_GENERIC_FAILURE)' : undefined
            };
            return nq;
          });
        }, 1200);

        return updated;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [simServiceRunning, simFailRate]);

  const handleQueueSimulatedSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhone || !targetMessage) return;

    const parts = Math.ceil(targetMessage.length / 160) || 1;
    const newSms: SimulatedSms = {
      id: `sms-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`,
      phoneNumber: targetPhone,
      message: targetMessage,
      status: 'PENDING',
      parts,
      createdAt: new Date().toLocaleTimeString()
    };

    setQueue(prev => [newSms, ...prev]);
  };

  const sentCount = queue.filter(q => q.status === 'SENT').length;
  const pendingCount = queue.filter(q => q.status === 'PENDING' || q.status === 'PROCESSING').length;
  const failedCount = queue.filter(q => q.status === 'FAILED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white">Android Supabase SMS Gateway</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Kotlin & Android 14+ Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Foreground Service • Telephony SmsManager • Realtime Postgrest Polling • BuildConfig Injection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition shadow-md hover:shadow-sky-500/25 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isZipping ? 'Packaging...' : 'Download Android Project (.ZIP)'}
          </button>
        </div>
      </header>

      {/* Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-sm">
        <nav className="flex space-x-1 py-1">
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 font-medium rounded-lg text-xs flex items-center gap-2 transition ${
              activeTab === 'code'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Project Source Code ({projectFiles.length} files)
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 font-medium rounded-lg text-xs flex items-center gap-2 transition ${
              activeTab === 'simulator'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Live Gateway Simulator & Queue
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 font-medium rounded-lg text-xs flex items-center gap-2 transition ${
              activeTab === 'sql'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Supabase SQL Migration
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 font-medium rounded-lg text-xs flex items-center gap-2 transition ${
              activeTab === 'architecture'
                ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Architecture & Permissions Guide
          </button>
        </nav>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Target Table: <code className="text-slate-300 font-mono">public.otp_sender</code></span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col p-6">
        {activeTab === 'code' && (
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
            {/* File Sidebar */}
            <div className="col-span-4 flex flex-col min-h-0 border-r border-slate-800 pr-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>Android Project Files</span>
                <span className="text-[10px] text-slate-500 font-mono">Gradle + Kotlin</span>
              </div>
              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
                {projectFiles.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`w-full text-left p-3 rounded-xl transition flex flex-col gap-1 border ${
                      selectedFilePath === file.path
                        ? 'bg-sky-950/40 border-sky-500/40 text-sky-200 shadow-sm'
                        : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold text-slate-400 bg-slate-800">
                        {file.language}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{file.description}</p>
                    <span className="text-[10px] text-slate-500 font-mono truncate">{file.path}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Code Viewer */}
            <div className="col-span-8 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="font-mono text-xs font-bold text-sky-400">{currentFile.path}</div>
                  <p className="text-xs text-slate-400">{currentFile.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyCode(currentFile.content)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className="flex-1 mt-3 overflow-auto rounded-xl bg-slate-950 border border-slate-800/80 p-4 font-mono text-xs leading-relaxed text-slate-300">
                <pre>
                  <code>{currentFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left Column: Dispatcher Control & New SMS */}
            <div className="col-span-5 flex flex-col gap-6">
              {/* Service Status Dashboard */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${simServiceRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {simServiceRunning ? 'Gateway Active / Waiting for SMS' : 'Gateway Service Stopped'}
                      </h3>
                      <p className="text-xs text-slate-400">ForegroundService • DataSync Priority</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSimServiceRunning(!simServiceRunning)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      simServiceRunning 
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {simServiceRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {simServiceRunning ? 'Stop Service' : 'Start Gateway'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] text-slate-400 font-medium">Delivered (SENT)</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{sentCount}</div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] text-slate-400 font-medium">In Queue (PENDING)</div>
                    <div className="text-xl font-bold text-amber-400 mt-1">{pendingCount}</div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] text-slate-400 font-medium">Failed</div>
                    <div className="text-xl font-bold text-rose-400 mt-1">{failedCount}</div>
                  </div>
                </div>
              </div>

              {/* Push Test SMS to Supabase */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-400" />
                    Simulate Row Insertion in Supabase
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">INSERT INTO outbound_sms</span>
                </div>

                <form onSubmit={handleQueueSimulatedSms} className="flex flex-col gap-3 flex-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Target Phone Number (E.164 format)
                    </label>
                    <input
                      type="text"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                      <span>Message Content</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {targetMessage.length} chars ({Math.ceil(targetMessage.length / 160) || 1} part)
                      </span>
                    </div>
                    <textarea
                      value={targetMessage}
                      onChange={(e) => setTargetMessage(e.target.value)}
                      rows={3}
                      placeholder="Type outgoing SMS..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 resize-none font-sans"
                      required
                    />
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Carrier Failure Simulation Rate:</span>
                      <span className="font-mono text-amber-400 font-semibold">{simFailRate}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={simFailRate}
                      onChange={(e) => setSimFailRate(Number(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-auto w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <Database className="w-3.5 h-3.5 text-slate-950" />
                    Insert PENDING Row into Supabase Table
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Live Outbound SMS Log & Hardware State */}
            <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-0 shadow-lg">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <h3 className="font-bold text-sm text-white">Live Outbound Gateway Feed</h3>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Realtime Stream & Auto-Poll Active
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {queue.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                    <Radio className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No messages in queue</p>
                    <p className="text-xs text-slate-600 mt-1">Insert a test row on the left to watch the gateway dispatch it.</p>
                  </div>
                ) : (
                  queue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2 transition hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{item.phoneNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({item.id})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-mono">{item.createdAt}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                              item.status === 'SENT'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : item.status === 'PROCESSING'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse'
                                : item.status === 'FAILED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-sans">{item.message}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-900 font-mono">
                        <div className="flex items-center gap-3">
                          <span>Parts: {item.parts}</span>
                          {item.sentAt && <span className="text-emerald-400">Delivered: {item.sentAt}</span>}
                        </div>
                        {item.errorMessage && (
                          <span className="text-rose-400 font-sans text-[11px]">{item.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-sky-400" />
                  Supabase PostgreSQL Setup Script
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Execute this SQL in your Supabase project dashboard (SQL Editor) to provision the table, indexes, and Realtime publication.
                </p>
              </div>

              <button
                onClick={() => copyCode(projectFiles.find(f => f.name === 'supabase_schema.sql')?.content || '')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard' : 'Copy SQL Script'}
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed">
              <pre>
                <code>{projectFiles.find(f => f.name === 'supabase_schema.sql')?.content}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'architecture' && (
          <div className="flex-1 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full">
            {/* System Flow Diagram */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                End-to-End Gateway Architecture Flow
              </h3>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                  <Database className="w-6 h-6 text-emerald-400 mb-2" />
                  <span className="font-bold text-xs text-white">1. Row Inserted</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your backend or API inserts row into <code className="text-sky-300">outbound_sms</code> with <code className="text-amber-400">status='PENDING'</code>.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                  <Radio className="w-6 h-6 text-sky-400 mb-2" />
                  <span className="font-bold text-xs text-white">2. Realtime / Polling</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Android <code className="text-sky-300">SmsGatewayService</code> catches insert via Supabase Realtime WebSocket + 5s polling backup.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                  <Smartphone className="w-6 h-6 text-indigo-400 mb-2" />
                  <span className="font-bold text-xs text-white">3. SIM Radio Dispatch</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Row updated to <code className="text-sky-400">PROCESSING</code>. <code className="text-sky-300">SmsManager</code> sends SMS through physical SIM card.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                  <CheckCircle2 className="w-6 h-6 text-teal-400 mb-2" />
                  <span className="font-bold text-xs text-white">4. Status Confirmed</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    On cellular confirmation callback, row is marked <code className="text-emerald-400">SENT</code> with <code className="text-slate-300">sent_at</code> timestamp.
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions & Security Requirements */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Required Android Permissions
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <code className="text-sky-300 font-mono">android.permission.SEND_SMS</code>
                      <p className="text-slate-400 text-[11px]">Dangerous runtime permission requested at app launch.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <code className="text-sky-300 font-mono">android.permission.FOREGROUND_SERVICE_DATA_SYNC</code>
                      <p className="text-slate-400 text-[11px]">Required by Android 14 (API 34) for continuous background data sync services.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <code className="text-sky-300 font-mono">android.permission.INTERNET</code>
                      <p className="text-slate-400 text-[11px]">Enables communication with the Supabase Postgrest API and Realtime WebSockets.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <code className="text-sky-300 font-mono">android.permission.POST_NOTIFICATIONS</code>
                      <p className="text-slate-400 text-[11px]">Required for the ongoing Foreground Service status notification on Android 13+.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Build-Time Credentials Injection
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  In <code className="text-slate-300">app/build.gradle.kts</code>, the credentials are securely injected via Gradle <code className="text-sky-300">buildConfigField</code>:
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
                  <span className="text-slate-500"># Set environment variables before building:</span><br />
                  <span className="text-sky-400">export</span> SUPABASE_URL=<span className="text-emerald-400">"https://xyz.supabase.co"</span><br />
                  <span className="text-sky-400">export</span> SUPABASE_KEY=<span className="text-emerald-400">"eyJhbGciOi..."</span><br /><br />
                  <span className="text-slate-500"># Build release or debug APK:</span><br />
                  ./gradlew assembleDebug
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-2.5 bg-slate-900/90 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Android Kotlin SMS Gateway for Supabase</span>
          <span>•</span>
          <span className="text-slate-400">Compatibility: Android 8.0 (API 26) through Android 14+ (API 34)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-400">SmsManager.sendMultipartTextMessage</span>
        </div>
      </footer>
    </div>
  );
}
