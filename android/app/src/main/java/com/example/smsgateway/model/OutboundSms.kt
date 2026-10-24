package com.example.smsgateway.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OutboundSms(
    @SerialName("id")
    val id: String,
    
    @SerialName("phone")
    val phone: String? = null,

    @SerialName("phone_number")
    val phoneNumberAlt: String? = null,
    
    @SerialName("otp")
    val otp: String? = null,
    
    @SerialName("message")
    val message: String? = null,
    
    @SerialName("expires_at")
    val expiresAt: String? = null,
    
    @SerialName("status")
    val statusRaw: String = STATUS_PENDING,
    
    @SerialName("error_message")
    val errorMessage: String? = null,
    
    @SerialName("created_at")
    val createdAt: String? = null,
    
    @SerialName("sent_at")
    val sentAt: String? = null,

    @SerialName("updated_at")
    val updatedAt: String? = null
) {
    val phoneNumber: String
        get() = (if (!phone.isNullOrBlank()) phone else phoneNumberAlt) ?: ""

    val isPending: Boolean
        get() = statusRaw.equals("pending", ignoreCase = true)

    /**
     * Resolves the actual text to send: uses the message column or generates from OTP
     */
    fun getResolvedMessage(): String {
        return when {
            !message.isNullOrBlank() -> message
            !otp.isNullOrBlank() -> "Your OTP verification code is $otp. Valid for 5 minutes."
            else -> "Your OTP verification code is $otp."
        }
    }

    companion object {
        const val STATUS_PENDING = "pending"
        const val STATUS_PROCESSING = "processing"
        const val STATUS_SENT = "sent"
        const val STATUS_FAILED = "failed"
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
)

