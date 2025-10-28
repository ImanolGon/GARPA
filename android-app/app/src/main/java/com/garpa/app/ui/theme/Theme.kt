package com.garpa.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF00A6FF),
    onPrimary = Color(0xFF001F2B),
    secondary = Color(0xFF4B636E),
    onSecondary = Color(0xFFE3F2FD),
    background = Color(0xFF111315),
    onBackground = Color(0xFFE1E3E4),
    surface = Color(0xFF1C1F22),
    onSurface = Color(0xFFE1E3E4)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF006495),
    onPrimary = Color.White,
    secondary = Color(0xFF4B636E),
    onSecondary = Color.White,
    background = Color(0xFFF0F4F8),
    onBackground = Color(0xFF1B1B1D),
    surface = Color.White,
    onSurface = Color(0xFF1B1B1D)
)

@Composable
fun GarpaTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (useDarkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colors,
        typography = MaterialTheme.typography,
        content = content
    )
}
