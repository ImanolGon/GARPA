package com.garpa.app.ui

import android.bluetooth.BluetoothAdapter
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.garpa.app.data.ConnectionMethod
import com.garpa.app.data.ConnectionState
import com.garpa.app.data.EmgConnectionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val MAX_SAMPLES = 256

data class BluetoothDeviceUi(
    val name: String,
    val address: String
)

data class MainUiState(
    val connectionState: ConnectionState = ConnectionState.Idle,
    val emgSamples: List<Float> = emptyList(),
    val trainingActive: Boolean = false,
    val statusMessage: String? = null,
    val availableBluetoothDevices: List<BluetoothDeviceUi> = emptyList(),
    val connectionMethod: ConnectionMethod? = null
)

class MainViewModel(
    private val connectionManager: EmgConnectionManager,
    private val bluetoothAdapter: BluetoothAdapter?
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState

    init {
        refreshBluetoothDevices()
    }

    fun refreshBluetoothDevices() {
        val devices = bluetoothAdapter?.bondedDevices?.map {
            BluetoothDeviceUi(it.name ?: it.address, it.address)
        }?.sortedBy { it.name } ?: emptyList()
        _uiState.update { it.copy(availableBluetoothDevices = devices) }
    }

    fun connectWifi(host: String, port: Int) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    connectionState = ConnectionState.Connecting,
                    statusMessage = null,
                    connectionMethod = ConnectionMethod.Wifi(host, port)
                )
            }
            runCatching {
                connectionManager.connectWifi(host, port, viewModelScope, ::onSample)
            }.onSuccess {
                _uiState.update {
                    it.copy(
                        connectionState = ConnectionState.Connected(ConnectionMethod.Wifi(host, port)),
                        statusMessage = "Conectado a $host:$port",
                        connectionMethod = ConnectionMethod.Wifi(host, port)
                    )
                }
            }.onFailure { error ->
                val message = error.localizedMessage ?: "No se pudo conectar por WiFi"
                _uiState.update {
                    it.copy(
                        connectionState = ConnectionState.Error(message),
                        statusMessage = message,
                        trainingActive = false,
                        connectionMethod = null
                    )
                }
            }
        }
    }

    fun connectBluetooth(address: String) {
        val device = bluetoothAdapter?.bondedDevices?.firstOrNull { it.address == address }
        if (device == null) {
            _uiState.update {
                it.copy(
                    connectionState = ConnectionState.Error("Dispositivo no encontrado"),
                    statusMessage = "Dispositivo no encontrado"
                )
            }
            return
        }
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    connectionState = ConnectionState.Connecting,
                    statusMessage = null,
                    connectionMethod = ConnectionMethod.Bluetooth(device.name ?: device.address)
                )
            }
            runCatching {
                connectionManager.connectBluetooth(device, viewModelScope, ::onSample)
            }.onSuccess {
                val name = device.name ?: device.address
                _uiState.update {
                    it.copy(
                        connectionState = ConnectionState.Connected(ConnectionMethod.Bluetooth(name)),
                        statusMessage = "Conectado a $name",
                        connectionMethod = ConnectionMethod.Bluetooth(name)
                    )
                }
            }.onFailure { error ->
                val message = error.localizedMessage ?: "No se pudo conectar por Bluetooth"
                _uiState.update {
                    it.copy(
                        connectionState = ConnectionState.Error(message),
                        statusMessage = message,
                        trainingActive = false,
                        connectionMethod = null
                    )
                }
            }
        }
    }

    fun disconnect() {
        viewModelScope.launch {
            runCatching { connectionManager.disconnect() }
            _uiState.update {
                it.copy(
                    connectionState = ConnectionState.Idle,
                    statusMessage = "Conexión finalizada",
                    connectionMethod = null,
                    trainingActive = false
                )
            }
        }
    }

    fun startTraining() {
        _uiState.update { it.copy(trainingActive = true, statusMessage = "Entrenamiento iniciado") }
    }

    fun stopTraining() {
        _uiState.update { it.copy(trainingActive = false, statusMessage = "Entrenamiento detenido") }
    }

    fun clearMessage() {
        _uiState.update { it.copy(statusMessage = null) }
    }

    private fun onSample(value: Float) {
        _uiState.update { current ->
            val updated = (current.emgSamples + value).takeLast(MAX_SAMPLES)
            current.copy(emgSamples = updated)
        }
    }

    override fun onCleared() {
        viewModelScope.launch {
            connectionManager.disconnect()
        }
        super.onCleared()
    }
}
