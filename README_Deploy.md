# Despliegue en Render — Frontend Web
# Insights - AndesML

### Taller de Integración IIC3104-2 2026-1
### Pontificia Universidad Católica de Chile
### Grupo 6

---

> El backend debe estar desplegado y funcionando antes de configurar el frontend.
> Sigue primero el `README_Deploy.md` de `2026-1-TI-S2-Grupo6-Backend`.

---

## Requisitos previos

- Cuenta en [render.com](https://render.com) (el plan **Free** es suficiente)
- El repositorio subido a GitHub
- La URL del backend ya desplegado en Render
- Los valores de las variables de entorno (el equipo los comparte por privado)

---

## Paso 1 — Crear el servicio

1. Inicia sesión en [render.com](https://render.com)
2. Haz clic en **New +** → **Web Service**
3. Conecta tu cuenta de GitHub si no lo has hecho
4. Selecciona el repositorio `2026-1-TI-S2-Grupo6-Web` y haz clic en **Connect**

---

## Paso 2 — Configurar el Build

Render detecta el `render.yaml` automáticamente. Verifica que los campos de la sección **Build** queden así:

| Campo | Valor |
|-------|-------|
| **Source** | URL del repositorio en GitHub |
| **Branch** | `main` |
| **Root Directory** | `insightsweb` |
| **Build Command** | `npm install && npm run build` |

---

## Paso 3 — Configurar el Deploy

Verifica que los campos de la sección **Deploy** queden así:

| Campo | Valor |
|-------|-------|
| **Start Command** | `npm start` |
| **Auto-Deploy** | `On Commit` |

---

## Paso 4 — Agregar las variables de entorno

Ve a la sección **Environment Variables** y agrega las siguientes. Los valores te los pasa el equipo por privado:

| Key | Descripción |
|-----|-------------|
| `GEMINI_API_KEY` | API Key del modelo Gemini (Google AI) |
| `jwt.secret` | Clave secreta para verificar los tokens JWT del backend |
| `NEXT_PUBLIC_API_URL` | URL base del backend desplegado en Render (ej: `https://two026-1-ti-s2-grupo6-backend.onrender.com`) |

> **Importante:** el valor de `NEXT_PUBLIC_API_URL` debe ser exactamente la URL que Render le asignó al backend, **sin barra al final**.

---

## Paso 5 — Desplegar

1. Haz clic en **Create Web Service**
2. Render ejecutará el build automáticamente:
   - Instala dependencias con `npm install`
   - Compila el proyecto Next.js con `npm run build`
   - Levanta el servidor con `npm start`
3. El primer build tarda entre **3 y 7 minutos**

Cuando el estado cambie a **Live**, el frontend estará disponible en una URL con este formato:

```
https://insightsweb.onrender.com
```

---

## Paso 6 — Verificar que funciona

1. Abre la URL del servicio en el navegador
2. Deberías ver la pantalla de login
3. Inicia sesión y verifica que los dashboards carguen datos correctamente

Si los datos no cargan, revisa que `NEXT_PUBLIC_API_URL` apunte correctamente al backend.

---

## Redeploys

Render redespliega automáticamente con cada `push` a la rama `main` (Auto-Deploy: On Commit).

Para forzar un redeploy manual: **Manual Deploy** → **Deploy latest commit**.

---

## Notas sobre el plan Free

| Comportamiento | Detalle |
|----------------|---------|
| **Cold start** | El servicio se apaga tras 15 min sin tráfico. La primera petición después tarda ~50 segundos |
| **Horas de cómputo** | 750 h/mes compartidas entre todos los servicios Free de la cuenta |
| **Build concurrente** | Solo un build a la vez en el plan Free |

---

## Resumen del orden de despliegue

```
1. Backend  → 2026-1-TI-S2-Grupo6-Backend  → https://two026-1-ti-s2-grupo6-backend.onrender.com
2. Frontend → 2026-1-TI-S2-Grupo6-Web      → https://insightsweb.onrender.com
```
