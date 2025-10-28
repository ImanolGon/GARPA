# GARPA

Proyecto "GARPA: Guante Asistente para la Rehabilitación de Personas con Artritis" para la materia Instrumentacion Biomedica 2.

## Cómo ejecutar la interfaz

La aplicación es completamente estática, por lo que podés visualizarla directamente en un navegador o levantar un servidor HTTP sencillo. Estas son dos formas recomendadas:

### Opción 1: abrir los archivos directamente
1. Abrí el archivo `index.html` en tu navegador preferido (doble clic desde el explorador de archivos o `Ctrl+O` desde el navegador).
2. Navegá por las distintas pantallas utilizando los botones de la interfaz.

### Opción 2: usar un servidor local con Python
1. Posicionate en la carpeta del proyecto:
   ```bash
   cd GARPA
   ```
2. Iniciá un servidor HTTP (Python 3):
   ```bash
   python3 -m http.server 8000
   ```
3. Abrí <http://localhost:8000/index.html> en tu navegador.

Levantar el servidor evita problemas de rutas relativas y te permite probar la experiencia completa como si estuviera desplegada en la web.

## Páginas disponibles

- `index.html`: portada con acceso rápido al tutorial, entrenamiento y registro personal.
- `tutorial.html`: guía interactiva con video, paso a paso, seguridad, accesibilidad y enlaces de soporte.
- `login.html`: formulario de inicio de sesión con recuperación y acceso a registro.
- `training.html`: configuración de sesiones (duración e intensidad).
- `entrenamiento-activo.html`: visualización en vivo con temporizador, control de intensidad y señal EMG simulada.
- `registro.html`: registro personal del paciente con preferencias, dispositivo y calibración.

## Aplicación Android

El repositorio incluye una primera versión de la app móvil nativa (Kotlin + Jetpack Compose) en `android-app/`.

### Requisitos

- Android Studio Giraffe o superior.
- Android SDK 34 configurado en el entorno.

### Ejecución

1. Abrir Android Studio y seleccionar **Open** para importar la carpeta `android-app/`.
2. Conectar un dispositivo o crear un emulador con Android 8.0 (API 26) o superior.
3. Compilar y ejecutar el módulo `app`.

### Funcionalidades iniciales

- Conexión WiFi al ESP32 indicando IP y puerto del socket TCP desde el cual se envían las muestras EMG.
- Conexión Bluetooth clásica (SPP) con dispositivos emparejados previamente.
- Visualización en tiempo real de la señal EMG recibida.
- Control básico para iniciar y detener sesiones de entrenamiento.
