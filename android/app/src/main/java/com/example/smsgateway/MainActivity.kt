package com.example.smsgateway

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
import androidx.compose.animation.AnimatedVisibility
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
import com.example.smsgateway.model.GatewayLogEntry
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF38BDF8),
                    onPrimary = Color(0xFF0F172A),
                    background = Color(0xFF0B1120),
                    surface = Color(0xFF1E293B),
                    onSurface = Color(0xFFF8FAFC)
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SmsGatewayDashboard()
                }
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
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.SEND_SMS
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    // Permission Request Launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasSmsPermission = permissions[Manifest.permission.SEND_SMS] == true
        if (hasSmsPermission) {
            Toast.makeText(context, "SMS Permission Granted", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "SMS Permission is required to send messages", Toast.LENGTH_LONG).show()
        }
    }

    fun requestRequiredPermissions() {
        val permissionsToRequest = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_PHONE_STATE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(permissionsToRequest.toTypedArray())
    }

    fun toggleGateway() {
        if (!hasSmsPermission) {
            requestRequiredPermissions()
            return
        }

        val serviceIntent = Intent(context, SmsGatewayService::class.java).apply {
            action = if (isRunning) SmsGatewayService.ACTION_STOP else SmsGatewayService.ACTION_START
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Send,
                            contentDescription = null,
                            tint = Color(0xFF38BDF8),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            "Supabase SMS Gateway",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            // Permission Notice
            AnimatedVisibility(visible = !hasSmsPermission) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = Color(0xFFFCA5A5)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Permissions Required",
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                "Grant SEND_SMS permission to allow this gateway to dispatch SMS messages.",
                                fontSize = 12.sp,
                                color = Color(0xFFFECACA)
                            )
                        }
                        Button(
                            onClick = { requestRequiredPermissions() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                        ) {
                            Text("Grant", color = Color(0xFF7F1D1D), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Gateway State Banner
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (isRunning) Color(0xFF22C55E) else Color(0xFFEF4444)
                                    )
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                if (isRunning) "Gateway Active / Waiting for SMS" else "Gateway Stopped",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                                color = Color.White
                            )
                        }

                        Button(
                            onClick = { toggleGateway() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isRunning) Color(0xFFEF4444) else Color(0xFF0284C7)
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                if (isRunning) "Stop" else "Start Service",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = Color(0xFF334155))
                    Spacer(modifier = Modifier.height(12.dp))

                    // Supabase Connection Info
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "SUPABASE TARGET",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8),
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                BuildConfig.SUPABASE_URL.ifEmpty { "Not configured" },
                                fontSize = 13.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFFE2E8F0)
                            )
                        }

                        AssistChip(
                            onClick = {},
                            label = {
                                Text(
                                    if (isConnected) "Connected" else "Idle / Offline",
                                    fontSize = 11.sp,
                                    color = if (isConnected) Color(0xFF86EFAC) else Color(0xFFFCA5A5)
                                )
                            },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = if (isConnected) Color(0xFF14532D) else Color(0xFF450A0A)
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Live Log Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Live Outbound Logs (${logs.size})",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFCBD5E1)
                )

                if (logs.isNotEmpty()) {
                    TextButton(onClick = { /* clear in memory */ }) {
                        Text("Auto-refreshed", fontSize = 12.sp, color = Color(0xFF64748B))
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Logs List
            if (logs.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF131D2E)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.AllInbox,
                            contentDescription = null,
                            tint = Color(0xFF475569),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "No SMS events recorded yet",
                            color = Color(0xFF64748B),
                            fontSize = 14.sp
                        )
                        Text(
                            "Insert a row with status='PENDING' into 'outbound_sms'",
                            color = Color(0xFF475569),
                            fontSize = 12.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(logs) { log ->
                        LogItemRow(log)
                    }
                }
            }
        }
    }
}

@Composable
fun LogItemRow(entry: GatewayLogEntry) {
    val timeStr = remember(entry.timestamp) {
        val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        sdf.format(Date(entry.timestamp))
    }

    val (badgeBg, badgeText) = when (entry.status) {
        "SENT" -> Color(0xFF14532D) to Color(0xFF86EFAC)
        "FAILED", "ERROR" -> Color(0xFF7F1D1D) to Color(0xFFFCA5A5)
        "CONNECTED" -> Color(0xFF1E3A8A) to Color(0xFF93C5FD)
        else -> Color(0xFF334155) to Color(0xFFCBD5E1)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        entry.phoneNumber,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        timeStr,
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    entry.previewMessage,
                    fontSize = 12.sp,
                    color = Color(0xFFCBD5E1),
                    maxLines = 2
                )
                if (entry.detail != null) {
                    Text(
                        entry.detail,
                        fontSize = 11.sp,
                        color = if (entry.status == "FAILED") Color(0xFFF87171) else Color(0xFF94A3B8)
                    )
                }
            }

            Surface(
                color = badgeBg,
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = entry.status,
                    color = badgeText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}
