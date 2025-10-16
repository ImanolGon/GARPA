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
