package com.example.smsgateway

import android.util.Log
import com.example.smsgateway.model.OutboundSms
import com.example.smsgateway.model.SmsStatusUpdate
import io.github.jan.supabase.SupabaseClient
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
    private val tag = "SupabaseRepository"
    val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = supabaseUrl,
        supabaseKey = supabaseKey
    ) {
        install(Postgrest)
        install(Realtime)
    }

    private val tableName = "outbound_sms"

    /**
     * Test connection to Supabase database by attempting to query the table schema
     */
    suspend fun checkConnection(): Result<Boolean> {
        return runCatching {
            client.postgrest[tableName]
                .select {
                    limit(1)
                }
            true
        }
    }

    /**
     * Poll pending SMS records from the Supabase table.
     */
    suspend fun fetchPendingMessages(limit: Long = 10): List<OutboundSms> {
        return try {
            client.postgrest[tableName]
                .select {
                    filter {
                        eq("status", OutboundSms.STATUS_PENDING)
                    }
                    order("created_at", io.github.jan.supabase.postgrest.query.Order.ASCENDING)
                    limit(limit)
                }
                .decodeList<OutboundSms>()
        } catch (e: Exception) {
            Log.e(tag, "Failed to fetch pending SMS from Supabase", e)
            emptyList()
        }
    }

    /**
     * Atomically mark an SMS as PROCESSING or SENT or FAILED.
     */
    suspend fun updateSmsStatus(
        id: String,
        status: String,
        errorMessage: String? = null
    ): Result<Unit> {
        return runCatching {
            val isoDate = getIsoCurrentTimestamp()
            val updatePayload = SmsStatusUpdate(
                status = status,
                sentAt = if (status == OutboundSms.STATUS_SENT) isoDate else null,
                errorMessage = errorMessage
            )

            client.postgrest[tableName]
                .update(updatePayload) {
                    filter {
                        eq("id", id)
                    }
                }
        }
    }

    /**
     * Listen to Realtime Postgres inserts on the `outbound_sms` table.
     */
    suspend fun subscribeToNewPendingInserts(): Flow<PostgresAction> {
        val channel = client.realtime.channel("outbound-sms-channel")
        val flow = channel.postgresChangeFlow<PostgresAction>(schema = "public") {
            table = tableName
        }
        channel.subscribe()
        return flow
    }

    private fun getIsoCurrentTimestamp(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }
}
