package com.example.smsgateway.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OutboundSms(
    @SerialName("id")
    val id: String,
    
    @SerialName("phone_number")
    val phoneNumber: String,
    
    @SerialName("message")
    val message: String,
    
    @SerialName("status")
    val status: String = STATUS_PENDING,
    
    @SerialName("error_message")
    val errorMessage: String? = null,
    
    @SerialName("created_at")
    val createdAt: String? = null,
    
    @SerialName("sent_at")
    val sentAt: String? = null
) {
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
    val detail: String? = null
)
