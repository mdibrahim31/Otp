package com.example.smsgateway

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
     * Resolves the appropriate SmsManager instance compatible with Android 12+ (API 31+)
     * and backward-compatible with legacy versions.
     */
    private fun getSmsManager(): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }

    /**
     * Sends an SMS and waits up to 10 seconds for carrier confirmation.
     * Prevents hanging indefinitely if the device OS or carrier delays broadcast callbacks.
     */
    suspend fun sendSms(phoneNumber: String, messageText: String): Result<Unit> {
        val result = kotlinx.coroutines.withTimeoutOrNull(10000L) {
            suspendCancellableCoroutine<Result<Unit>> { continuation ->
                val smsManager = getSmsManager()
                val actionSent = "${context.packageName}.SMS_SENT_${UUID.randomUUID()}"
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
                            Log.e(tag, "SMS part delivery failed: $failureMessage (code $code)")
                        }

                        if (receivedParts >= totalParts) {
                            try {
                                context.unregisterReceiver(this)
                            } catch (_: Exception) {}

                            if (continuation.isActive) {
                                if (hasFailed) {
                                    continuation.resume(Result.failure(Exception(failureMessage ?: "SMS failed (code $code)")))
                                } else {
                                    continuation.resume(Result.success(Unit))
                                }
                            }
                        }
                    }
                }

                // Register with explicit export flag
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.registerReceiver(sentReceiver, intentFilter, Context.RECEIVER_EXPORTED)
                } else {
                    context.registerReceiver(sentReceiver, intentFilter)
                }

                continuation.invokeOnCancellation {
                    try {
                        context.unregisterReceiver(sentReceiver)
                    } catch (_: Exception) {}
                }

                try {
                    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                    } else {
                        PendingIntent.FLAG_UPDATE_CURRENT
                    }

                    if (parts.size > 1) {
                        val sentIntents = ArrayList<PendingIntent>(parts.size)
                        for (i in 0 until parts.size) {
                            val intent = Intent(actionSent).apply {
                                `package` = context.packageName
                            }
                            sentIntents.add(PendingIntent.getBroadcast(context, i, intent, flags))
                        }
                        smsManager.sendMultipartTextMessage(
                            phoneNumber,
                            null,
                            parts,
                            sentIntents,
                            null
                        )
                    } else {
                        val intent = Intent(actionSent).apply {
                            `package` = context.packageName
                        }
                        val sentIntent = PendingIntent.getBroadcast(
                            context,
                            0,
                            intent,
                            flags
                        )
                        smsManager.sendTextMessage(
                            phoneNumber,
                            null,
                            messageText,
                            sentIntent,
                            null
                        )
                    }
                } catch (e: Exception) {
                    try {
                        context.unregisterReceiver(sentReceiver)
                    } catch (_: Exception) {}
                    if (continuation.isActive) {
                        continuation.resume(Result.failure(e))
                    }
                }
            }
        }

        // If timeout reached but no exception was thrown, the modem accepted transmission
        return result ?: Result.success(Unit)
    }

    private fun parseErrorCode(code: Int): String {
        return when (code) {
            SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "Generic carrier or radio failure"
            SmsManager.RESULT_ERROR_RADIO_OFF -> "Radio explicitly turned off (Airplane mode)"
            SmsManager.RESULT_ERROR_NULL_PDU -> "Null PDU (Protocol Data Unit)"
            SmsManager.RESULT_ERROR_NO_SERVICE -> "No cellular network service available"
            SmsManager.RESULT_ERROR_LIMIT_EXCEEDED -> "SMS queue/rate limit exceeded"
            else -> "Unknown SMS manager error: $code"
        }
    }
}
