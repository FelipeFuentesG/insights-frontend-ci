# Documentación proyecto Google Cloud Platform
# Insights - AndesML

### Taller de Integración IIC3104-2 2026-1
### Pontificia Universidad Católica de Chile
### Grupo 6

---

Este documento describe los recursos de Google Cloud Platform (GCP) que sostienen la infraestructura del proyecto, cómo acceder a ellos y qué rol cumple cada uno.

> Documentación idéntica a README_GCP de `2026-1-TI-S2-Grupo6-Backend`.

> Las credenciales y contraseñas mencionadas aquí se entregan por privado.

---

## Cuenta principal

| Campo | Valor |
|-------|-------|
| Correo | andesmlg6insights@gmail.com |
| Contraseña | (entregada por privado) |
| Proyecto GCP | AndesML Insights G6 |
| ID del proyecto | `andesml-insights-g6` |

Esta cuenta da acceso a la consola de GCP en [console.cloud.google.com](https://console.cloud.google.com). Desde allí se puede acceder a todos los recursos del proyecto.

---

## Arquitectura general

El proyecto usa tres servicios de GCP:

- **BigQuery** — Data warehouse en la nube. Almacena todas las tablas del sistema multitenant (retailers, marcas, productos, transacciones, eventos, etc.). Es la base de datos que consulta el backend.
- **Cloud Storage** — Almacena los archivos CSV crudos que sirven de origen de datos para el ETL.
- **Cloud Run + Cloud Scheduler** — Ejecutan el pipeline ETL automáticamente: un Job de Cloud Run procesa y carga los datos desde Cloud Storage hacia BigQuery, disparado por Cloud Scheduler según una frecuencia configurada.

```
CSVs del retailer
      │
      ▼
Cloud Storage (andesml_bucket_inicial)
      │
      ▼
Cloud Run Job (ETL en Python)
      │
      ▼
BigQuery (andesml_dataset)
      │
      ▼
Backend Spring Boot → Frontend Next.js
```

---

## Recursos del proyecto

### BigQuery

| Campo | Valor |
|-------|-------|
| Dataset | `andesml_dataset` |
| Proyecto | `andesml-insights-g6` |
| Región | `us-central1` (Iowa) |

**Cómo acceder al dataset:**
1. Inicia sesión en [console.cloud.google.com](https://console.cloud.google.com) con la cuenta principal.
2. En el menú lateral, navega a **BigQuery**.
3. En el panel izquierdo, expande el proyecto `andesml-insights-g6`.
4. Expande `andesml_dataset` para ver las tablas.

Desde ahí se pueden explorar esquemas, previsualizar datos y ejecutar consultas SQL directamente en el editor.

---

### Cloud Storage

| Campo | Valor |
|-------|-------|
| Bucket | `andesml_bucket_inicial` |
| Proyecto | `andesml-insights-g6` |
| Región | `us-central1` (Iowa) |

**Cómo acceder al bucket:**
1. En la consola de GCP, navega a **Cloud Storage → Buckets**.
2. Selecciona `andesml_bucket_inicial`.

Aquí se depositan los CSVs de origen que el ETL procesa y carga a BigQuery.

---

### Cloud Run y Cloud Scheduler (ETL)

| Campo | Valor |
|-------|-------|
| Job de Cloud Run | `andesml-etl-job` |
| Región | `us-central1` (Iowa) |

El ETL corre como un Job de Cloud Run disparado automáticamente por Cloud Scheduler. Para ver el estado de las ejecuciones, los logs y cualquier operación sobre el ETL, referirse al repositorio dedicado:

> **[2026-1-TI-S2-Grupo6-Extra-1](https://github.com/iictituloing/2026-1-TI-S2-Grupo6-Extra-1)** — contiene el código del ETL y su README con instrucciones completas de operación, monitoreo y despliegue.

**Cómo ver las ejecuciones del Job:**
1. En la consola de GCP, navega a **Cloud Run**.
2. Selecciona la pestaña **Jobs**.
3. Haz clic en `andesml-etl-job` para ver el historial de ejecuciones y logs.

---

## Cuentas de servicio

Las cuentas de servicio son identidades automáticas (bots) que permiten que los distintos componentes del sistema se comuniquen con GCP de forma segura, sin exponer credenciales de usuario.

### `backend-bigquery`

| Campo | Valor |
|-------|-------|
| Correo | `backend-bigquery@andesml-insights-g6.iam.gserviceaccount.com` |
| Archivo de clave | `andesml-insights-g6-77cc38e95a05.json` |
| Permisos | Lector y usuario de trabajo de BigQuery |

Permite que el backend de Spring Boot consulte BigQuery. El archivo de clave se coloca en el entorno local según las instrucciones del README del backend.

---

### `etl-bigquery`

| Campo | Valor |
|-------|-------|
| Correo | `etl-bigquery@andesml-insights-g6.iam.gserviceaccount.com` |
| Archivo de clave | `andesml-insights-g6-a12c67e6ba58.json` |
| Permisos | Editor de datos y usuario de trabajo de BigQuery |

Permite que el proceso ETL lea desde Cloud Storage y escriba en BigQuery. Su uso detallado está documentado en el repositorio del ETL.

---

## Monitoreo de costos

El proyecto opera dentro de la Capa Gratuita Permanente de GCP. Hay una alerta configurada que notifica por correo a la cuenta principal si el gasto supera **$1.00 USD**, antes de consumir cualquier crédito de prueba.

Para revisar el estado de facturación: en la consola de GCP, navega a **Facturación → Informes**.
