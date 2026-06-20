# **Frontend Web**
# **Insights - AndesML**

### Taller de Integración IIC3104-2 2026-1
### Pontificia Universidad Católica de Chile
### Grupo 6: 

- Fares Dababneh Olguín

- Lesly de la Hoz Bahamóndez

- Monserrat Fernández Lillo

- Felipe Fuentes González

- Raimundo Lecaros Vial

- Vicente Muñoz Garachena

---

## Instalación local — Frontend Web (Insights)

> El backend debe estar corriendo antes de iniciar el frontend.
> Sigue primero el README de `2026-1-TI-S2-Grupo6-Backend`.

---

### 1. Instalar Node.js 20 y Yarn

**macOS**
```bash
brew install nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install 20 && nvm use 20 && nvm alias default 20
```
> Si no tienes Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

**Windows/Ubuntu (WSL2)**
```bash
sudo apt update && sudo apt install -y git curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && nvm alias default 20
```
> Si no tienes WSL2: abre PowerShell como administrador y ejecuta `wsl --install`, luego reinicia.

Verifica: `node -v` → `v20.x.x` | `npm -v` → `10.x.x`

---

### 2. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd 2026-1-TI-S2-Grupo6-Web/insightsweb
```

> **Windows/WSL:** clona dentro del sistema de archivos de Linux (`~/`), no en `/mnt/c/`.

---

### 3. Crear `.env.local`

Crea el archivo `insightsweb/.env.local` con el contenido que te pasan por privado.

El archivo debe quedar en `insightsweb/.env.local`.

---

### 4. Instalar dependencias

```bash
npm install
```

La primera vez tarda 1–3 minutos. Debe terminar sin errores.

---

### 5. Ejecutar

```bash
npm run dev
```

El frontend está listo cuando veas:
```
▲ Next.js 16.x.x
- Local:   http://localhost:3000
```

Abre **http://localhost:3000** en tu navegador.

---

## Solución de problemas

| Síntoma | Solución |
|---------|----------|
| `node: command not found` | `source ~/.zshrc` (Mac) o `source ~/.bashrc` (Ubuntu) |
| `Cannot find module` | `npm install` desde dentro de `insightsweb/` |
| Datos no cargan en el navegador | Verifica que el backend esté corriendo en `http://localhost:8080` |
| Puerto 3000 en uso | `npm run dev -- --port 3001` o `kill $(lsof -ti:3000)` |
| Errores de permisos en `npm install` | Mueve el proyecto a `~/` dentro de Ubuntu, no trabajes en `/mnt/c/` |

---

## Tests E2E (Playwright)

Todos los comandos de esta sección se ejecutan desde la carpeta `insightsweb/`.

### Requisitos previos

El backend del proyecto debe estar corriendo antes de ejecutar los tests, ya que las pruebas realizan llamadas reales a la API.

### Instalación

Descarga el navegador que Playwright necesita:

```bash
npm install
npx playwright install chromium
```

### Scripts disponibles

Ejecuta todos los tests en modo headless (sin abrir ventana de navegador):

```bash
npm run test:e2e
```

Abre el reporte HTML generado por el último run, saldrá en la terminal el comando a ejecutar. 

> **Nota sobre artefactos:** Los resultados y el reporte HTML de Playwright se guardan fuera de la carpeta del proyecto, en el directorio temporal del sistema. Esto es intencional, evita que los archivos generados durante los tests entren en conflicto con el watcher del servidor de desarrollo.

---

## Tests unitarios (Vitest)

Todos los comandos se ejecutan desde la carpeta `insightsweb/`.

```bash
npm install  # solo la primera vez
```

Correr todos los tests una vez:

```bash
npm test
```

Modo watch (salir con `q`):

```bash
npx vitest
```

Un archivo puntual:

```bash
npx vitest run <ruta/al/archivo.test.ts>
```

Filtrar por nombre de test:

```bash
npx vitest run -t "<nombre del test>"
```

## URLs cuando todo está corriendo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |
