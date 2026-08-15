# Integración con Trello para Obsidian

Este plugin conecta tu entorno de notas de Obsidian con la gestión de proyectos de Trello. Su objetivo principal es unificar tu flujo de trabajo, permitiéndote interactuar con tus tableros y tarjetas sin tener que salir de tu bóveda (vault) de conocimiento.

## Características

*(Aquí puedes detallar las funciones exactas una vez desarrolladas. Por ejemplo:)*
* **Sincronización:** Visualiza el estado de tus tarjetas de Trello directamente en tus notas.
* **Gestión ágil:** Crea nuevas tareas o actualiza las existentes desde la interfaz de Obsidian.
* **Conexión de contextos:** Vincula documentos de proyectos directamente a los tableros relevantes.

## Configuración y Autenticación

Para que el plugin pueda comunicarse con tu cuenta de Trello, necesitas proporcionarle una **Clave API (API Key)**, un **Token de acceso** y el **ID de tu Tablero**. Sigue estos pasos para configurarlo:

### 1. Obtener tus credenciales de Trello
1. Inicia sesión en Trello y visita el [Power-Up Admin Portal](https://trello.com/power-ups/admin) de Atlassian.
2. Crea una nueva integración (o selecciona una existente) y ve a la pestaña **API Key**.
3. Copia tu **API Key**.
4. En esa misma página, haz clic en la opción para generar un **Token** de forma manual. Autoriza el acceso y copia el **API Token** generado (este token es privado, no lo compartas).

### 2. Obtener el ID de tu Tablero (Board ID)
Para que el plugin sepa con qué tablero específico interactuar, necesitas su identificador.
1. Abre el tablero de Trello que quieres conectar en tu navegador.
2. Fíjate en la URL de la página. Tendrá un formato similar a este: `https://trello.com/b/ABCDefgh/nombre-del-tablero`
3. Tu **Board ID** es el código alfanumérico que aparece justo después de `/b/` (en el ejemplo, sería `ABCDefgh`).
   *(Alternativa: añade `.json` al final de la URL completa y copia el valor del primer campo `"id"` que aparece).*

### 3. Configurar el plugin en Obsidian
1. En Obsidian, abre los ajustes (⚙️) y baja hasta la sección **Community Plugins** (Plugins de la comunidad) en el menú lateral.
2. Encuentra tu plugin en la lista y haz clic en el icono del engranaje para abrir su configuración.
3. Pega tu **API Key**, tu **API Token** y tu **Board ID** en los campos correspondientes.
4. Cierra los ajustes. ¡El plugin ya está autenticado y conectado a tu tablero!

## Uso

Una vez configurado, podrás interactuar con tus tableros a través de la paleta de comandos de Obsidian (pulsa `Ctrl/Cmd + P` y busca los comandos de Trello).

## Instalación Manual

### En Windows / macOS
1. Ve a la sección de **Releases** de este repositorio y descarga `main.js` y `manifest.json`.
2. Ve a la carpeta de tu bóveda (vault) de Obsidian.
3. Asegúrate de tener habilitada la vista de "Archivos ocultos" para poder ver la carpeta `.obsidian`.
4. Debes **crear manualmente** una nueva carpeta llamada `mi-trello-plugin` dentro del directorio `.obsidian/plugins/`.
5. Pega los archivos descargados (`main.js` y `manifest.json`) dentro de esa nueva carpeta que acabas de crear.
6. Reinicia Obsidian, ve a *Settings > Community plugins* y activa el plugin.

### En Linux
Si prefieres usar la terminal en Linux, el proceso es muy directo. Asumiendo que has descargado los archivos en `~/Downloads` y tu bóveda está en `~/Documents/Vault`:

```bash
# 1. Ve al directorio de plugins de tu bóveda (se creará si no existe)
mkdir -p ~/Documents/Vault/.obsidian/plugins/mi-trello-plugin

# 2. Mueve los archivos descargados al directorio del plugin
cp ~/Downloads/main.js ~/Documents/Vault/.obsidian/plugins/mi-trello-plugin/
cp ~/Downloads/manifest.json ~/Documents/Vault/.obsidian/plugins/mi-trello-plugin/
```
Después, abre Obsidian, dirígete a *Settings > Community plugins* y activa el plugin.

## Desarrollo

Este proyecto utiliza `pnpm` y `esbuild` para el entorno de desarrollo.

```bash
# Instalar dependencias
pnpm install

# Compilar en modo desarrollo (observando cambios)
pnpm run dev

# Compilar para producción
pnpm run build
```