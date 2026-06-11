# Instalación local — Frontend Web (Insights)

> El backend debe estar corriendo antes de iniciar el frontend.
> Sigue primero el README de `2026-1-TI-S2-Grupo6-Backend`.

---

## 1. Instalar Node.js 20 y Yarn

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

## 2. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd 2026-1-TI-S2-Grupo6-Web/insightsweb
```

> **Windows/WSL:** clona dentro del sistema de archivos de Linux (`~/`), no en `/mnt/c/`.

---

## 3. Crear `.env.local`

Crea el archivo `insightsweb/.env.local` con el contenido que te pasan por privado.

El archivo debe quedar en `insightsweb/.env.local`.

---

## 4. Instalar dependencias

```bash
npm install
```

La primera vez tarda 1–3 minutos. Debe terminar sin errores.

---

## 5. Ejecutar

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

## URLs cuando todo está corriendo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |
