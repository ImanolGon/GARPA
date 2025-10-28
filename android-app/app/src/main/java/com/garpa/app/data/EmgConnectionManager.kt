package com.garpa.app.data

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetSocketAddress
import java.net.Socket
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

sealed class ConnectionState {
    data object Idle : ConnectionState()
    data object Connecting : ConnectionState()
    data class Connected(val method: ConnectionMethod) : ConnectionState()
    data class Error(val message: String) : ConnectionState()
}

sealed class ConnectionMethod {
    data class Wifi(val host: String, val port: Int) : ConnectionMethod()
    data class Bluetooth(val deviceName: String) : ConnectionMethod()
}

class EmgConnectionManager(
    private val bluetoothAdapter: BluetoothAdapter?
) {
    private val wifiClient = WifiEmgClient()
    private val bluetoothClient = BluetoothEmgClient(bluetoothAdapter)

    suspend fun connectWifi(
        host: String,
        port: Int,
        scope: CoroutineScope,
        onSample: (Float) -> Unit
    ) {
        wifiClient.listen(host, port, scope, onSample)
    }

    suspend fun connectBluetooth(
        device: BluetoothDevice,
        scope: CoroutineScope,
        onSample: (Float) -> Unit
    ) {
        bluetoothClient.listen(device, scope, onSample)
    }

    suspend fun disconnect() {
        wifiClient.disconnect()
        bluetoothClient.disconnect()
    }
}

private class WifiEmgClient {
    private var job: Job? = null
    private var socket: Socket? = null
    private val active = AtomicBoolean(false)

    suspend fun listen(
        host: String,
        port: Int,
        scope: CoroutineScope,
        onSample: (Float) -> Unit
    ) {
        disconnect()
        job = scope.launchReader {
            val newSocket = Socket()
            newSocket.connect(InetSocketAddress(host, port), 5000)
            socket = newSocket
            active.set(true)
            val reader = BufferedReader(InputStreamReader(newSocket.getInputStream()))
            while (isActive && active.get()) {
                val line = reader.readLine() ?: break
                val value = line.trim().toFloatOrNull()
                if (value != null) {
                    onSample(value)
                }
            }
        }
    }

    suspend fun disconnect() {
        active.set(false)
        job?.cancel()
        job = null
        withContext(Dispatchers.IO) {
            try {
                socket?.close()
            } catch (_: Exception) {
            } finally {
                socket = null
            }
        }
    }
}

@SuppressLint("MissingPermission")
private class BluetoothEmgClient(
    private val adapter: BluetoothAdapter?
) {
    private var job: Job? = null
    private var socket: BluetoothSocket? = null
    private val active = AtomicBoolean(false)

    suspend fun listen(
        device: BluetoothDevice,
        scope: CoroutineScope,
        onSample: (Float) -> Unit
    ) {
        disconnect()
        job = scope.launchReader {
            adapter?.cancelDiscovery()
            val uuid = preferredUuid(device)
            val bluetoothSocket = device.createRfcommSocketToServiceRecord(uuid)
            bluetoothSocket.connect()
            socket = bluetoothSocket
            active.set(true)
            val reader = BufferedReader(InputStreamReader(bluetoothSocket.inputStream))
            while (isActive && active.get()) {
                val line = reader.readLine() ?: break
                val value = line.trim().toFloatOrNull()
                if (value != null) {
                    onSample(value)
                }
            }
        }
    }

    suspend fun disconnect() {
        active.set(false)
        job?.cancel()
        job = null
        withContext(Dispatchers.IO) {
            try {
                socket?.close()
            } catch (_: Exception) {
            } finally {
                socket = null
            }
        }
    }

    private fun preferredUuid(device: BluetoothDevice): UUID {
        val sppUuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        val uuids = device.uuids
        if (!uuids.isNullOrEmpty()) {
            return uuids.first().uuid
        }
        return sppUuid
    }
}

private fun CoroutineScope.launchReader(block: suspend CoroutineScope.() -> Unit): Job {
    return this.launch(context = Dispatchers.IO) {
        block()
    }
}
