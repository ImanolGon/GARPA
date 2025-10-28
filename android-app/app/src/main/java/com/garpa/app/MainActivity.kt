package com.garpa.app

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.garpa.app.data.ConnectionMethod
import com.garpa.app.data.ConnectionState
import com.garpa.app.data.EmgConnectionManager
import com.garpa.app.ui.BluetoothDeviceUi
import com.garpa.app.ui.MainUiState
import com.garpa.app.ui.MainViewModel
import com.garpa.app.ui.theme.GarpaTheme
import kotlin.math.abs

class MainActivity : ComponentActivity() {

    private val bluetoothPermissions: Array<String> by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val bluetoothAdapter = getBluetoothAdapter()
        val factory = MainViewModelFactory(bluetoothAdapter)
        val viewModel: MainViewModel by viewModels { factory }

        val permissionLauncher = registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { _ ->
            viewModel.refreshBluetoothDevices()
        }

        permissionLauncher.launch(bluetoothPermissions)

        setContent {
            GarpaTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    MainScreen(viewModel = viewModel)
                }
            }
        }
    }

    private fun getBluetoothAdapter(): BluetoothAdapter? {
        val manager = getSystemService(BluetoothManager::class.java)
        return manager?.adapter
    }
}

class MainViewModelFactory(
    private val bluetoothAdapter: BluetoothAdapter?
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MainViewModel(EmgConnectionManager(bluetoothAdapter), bluetoothAdapter) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

private enum class ConnectionOption { WIFI, BLUETOOTH }

@Composable
fun MainScreen(viewModel: MainViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.statusMessage) {
        val message = uiState.statusMessage
        if (!message.isNullOrBlank()) {
            snackbarHostState.showSnackbar(
                message = message,
                duration = SnackbarDuration.Short,
                withDismissAction = true
            )
            viewModel.clearMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "GARPA Entrenamiento",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            ConnectionCard(uiState = uiState, onConnectWifi = { host, port ->
                viewModel.connectWifi(host, port)
            }, onConnectBluetooth = { address ->
                viewModel.connectBluetooth(address)
            }, onDisconnect = {
                viewModel.disconnect()
            })
            EmgCard(samples = uiState.emgSamples)
            TrainingControls(
                isTraining = uiState.trainingActive,
                onStart = { viewModel.startTraining() },
                onStop = { viewModel.stopTraining() },
                connectionState = uiState.connectionState
            )
        }
    }
}

@Composable
private fun ConnectionCard(
    uiState: MainUiState,
    onConnectWifi: (String, Int) -> Unit,
    onConnectBluetooth: (String) -> Unit,
    onDisconnect: () -> Unit
) {
    var option by rememberSaveable { mutableStateOf(ConnectionOption.WIFI) }
    var host by rememberSaveable { mutableStateOf("192.168.4.1") }
    var portText by rememberSaveable { mutableStateOf("3333") }
    var selectedDevice by rememberSaveable { mutableStateOf<String?>(null) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = "Conexión", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SegmentedButton(
                    text = "WiFi",
                    selected = option == ConnectionOption.WIFI,
                    onClick = { option = ConnectionOption.WIFI }
                )
                SegmentedButton(
                    text = "Bluetooth",
                    selected = option == ConnectionOption.BLUETOOTH,
                    onClick = { option = ConnectionOption.BLUETOOTH }
                )
            }
            when (option) {
                ConnectionOption.WIFI -> {
                    OutlinedTextField(
                        value = host,
                        onValueChange = { host = it },
                        label = { Text("IP del ESP32") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = portText,
                        onValueChange = { portText = it.filter { char -> char.isDigit() } },
                        label = { Text("Puerto") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                ConnectionOption.BLUETOOTH -> {
                    if (uiState.availableBluetoothDevices.isEmpty()) {
                        Text(
                            text = "No hay dispositivos emparejados.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        DeviceSelector(
                            devices = uiState.availableBluetoothDevices,
                            selectedAddress = selectedDevice,
                            onDeviceSelected = { selectedDevice = it }
                        )
                    }
                }
            }
            ConnectionStatusText(connectionState = uiState.connectionState, method = uiState.connectionMethod)
            val isConnecting = uiState.connectionState is ConnectionState.Connecting
            val canConnect = when (option) {
                ConnectionOption.WIFI -> host.isNotBlank() && (portText.toIntOrNull() ?: 0) in 1..65535
                ConnectionOption.BLUETOOTH -> selectedDevice != null
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = {
                        when (option) {
                            ConnectionOption.WIFI -> {
                                val port = portText.toIntOrNull() ?: 0
                                if (host.isNotBlank() && port in 1..65535) {
                                    onConnectWifi(host, port)
                                }
                            }
                            ConnectionOption.BLUETOOTH -> {
                                selectedDevice?.let { onConnectBluetooth(it) }
                            }
                        }
                    },
                    enabled = canConnect && !isConnecting
                ) {
                    Text(if (isConnecting) "Conectando" else "Conectar")
                }
                OutlinedButton(onClick = onDisconnect) {
                    Text("Desconectar")
                }
            }
        }
    }
}

@Composable
private fun SegmentedButton(text: String, selected: Boolean, onClick: () -> Unit) {
    val background = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    TextButton(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.background(background, RoundedCornerShape(12.dp)),
        colors = ButtonDefaults.textButtonColors(contentColor = contentColor)
    ) {
        Text(text = text)
    }
}

@Composable
private fun DeviceSelector(
    devices: List<BluetoothDeviceUi>,
    selectedAddress: String?,
    onDeviceSelected: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        devices.forEach { device ->
            val isSelected = device.address == selectedAddress
            OutlinedButton(
                onClick = { onDeviceSelected(device.address) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface
                )
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(text = device.name, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
                    Text(text = device.address, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun ConnectionStatusText(connectionState: ConnectionState, method: ConnectionMethod?) {
    val text = when (connectionState) {
        is ConnectionState.Idle -> "Sin conexión"
        is ConnectionState.Connecting -> "Conectando..."
        is ConnectionState.Connected -> when (method) {
            is ConnectionMethod.Wifi -> "Conectado por WiFi a ${method.host}:${method.port}"
            is ConnectionMethod.Bluetooth -> "Conectado por Bluetooth a ${method.deviceName}"
            null -> "Conectado"
        }
        is ConnectionState.Error -> "Error: ${connectionState.message}"
    }
    Text(text = text, style = MaterialTheme.typography.bodyMedium)
}

@Composable
private fun EmgCard(samples: List<Float>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = "Señal EMG", style = MaterialTheme.typography.titleMedium)
            EmgChart(samples = samples, modifier = Modifier.fillMaxSize())
        }
    }
}

@Composable
private fun EmgChart(samples: List<Float>, modifier: Modifier = Modifier) {
    if (samples.isEmpty()) {
        Column(
            modifier = modifier,
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Esperando datos EMG", textAlign = TextAlign.Center)
        }
        return
    }

    Canvas(modifier = modifier) {
        val maxMagnitude = samples.maxOf { abs(it) }.coerceAtLeast(1f)
        val centerY = size.height / 2
        drawLine(
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f),
            start = androidx.compose.ui.geometry.Offset(0f, centerY),
            end = androidx.compose.ui.geometry.Offset(size.width, centerY),
            strokeWidth = 1.dp.toPx()
        )
        val path = Path()
        samples.forEachIndexed { index, value ->
            val x = if (samples.size == 1) 0f else index / (samples.size - 1f) * size.width
            val normalized = (value / maxMagnitude).coerceIn(-1f, 1f)
            val y = centerY - normalized * centerY
            if (index == 0) {
                path.moveTo(x, y)
            } else {
                path.lineTo(x, y)
            }
        }
        drawPath(
            path = path,
            color = MaterialTheme.colorScheme.primary,
            style = Stroke(width = 2.dp.toPx())
        )
    }
}

@Composable
private fun TrainingControls(
    isTraining: Boolean,
    onStart: () -> Unit,
    onStop: () -> Unit,
    connectionState: ConnectionState
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = "Entrenamiento", style = MaterialTheme.typography.titleMedium)
            Text(
                text = if (isTraining) "Entrenamiento en curso" else "Entrenamiento detenido",
                style = MaterialTheme.typography.bodyMedium
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = onStart,
                    enabled = !isTraining && connectionState is ConnectionState.Connected
                ) {
                    Text("Iniciar")
                }
                OutlinedButton(onClick = onStop, enabled = isTraining) {
                    Text("Detener")
                }
            }
        }
    }
}
