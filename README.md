# Transition Readiness Tool — Shadow / Reverse Shadow

Herramienta web para medir la preparación de cada persona del equipo para asumir la
operación tras un proceso de **Shadow / Reverse Shadow**. Calcula el **TRI**
(Transition Readiness Index, 0–100), muestra un **semáforo** de transición y un
**dashboard** comparativo del equipo. Cada evaluación se puede **imprimir / exportar a PDF**.

Marco de referencia: **ISO/IEC 330xx (SPICE)**, **ISO 9001:2015**, **ITIL 4** y **PMBOK**.

## Qué mide

- **Scorecard de Shadow** — 7 rubros ponderados (asistencia, comprensión funcional,
  ejecución guiada e independiente, documentación, resolución de incidentes, reverse shadow).
- **TRI** — 5 dimensiones (conocimiento técnico 30%, ejecución práctica 30%,
  documentación 15%, autonomía 15%, reverse shadow 10%).
- **Nivel de madurez** (0–5), **matriz de competencias** (esperado / actual / gap),
  **checklist por actividad** y **KPIs**.
- **Semáforo**: TRI ≥ 90 listo para transición · 75–89 requiere acompañamiento · < 75 continuar Shadow.

## Cómo funciona el almacenamiento (sin base de datos)

Los datos viven en un JSON **dentro del propio repo**: [`data/evaluaciones.json`](data/evaluaciones.json).

- **Ver el dashboard es abierto**: cualquiera con el link lee ese JSON (repo público).
- **Crear / editar / borrar** hace un **commit real** de ese JSON vía la API de GitHub,
  así queda historial auditable de cada cambio. No hay servidor ni base de datos externa.

Para editar necesitas conectar **una vez** un token personal de GitHub con permiso de
escritura en este repo. El token se guarda **solo en tu navegador** (localStorage) y
**nunca se sube al repo**.

## Conectar tu token (para editar)

1. En la app, entra a **Acceso**.
2. Abre [GitHub → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
3. En **Repository access** elige “Only select repositories” y selecciona `rba3/FrShadow`.
4. En **Permissions → Repository permissions**, pon **Contents: Read and write**.
5. Genera el token, pégalo en la pantalla de **Acceso** y da “Guardar y validar”.

El banner superior pasará a “Modo editor”. Quien no tenga token queda en “Solo lectura”.

## Editar el modelo de evaluación

Todo (rubros, pesos, dimensiones del TRI, competencias, niveles de madurez, KPIs y
umbrales del semáforo) vive en [`js/config.js`](js/config.js). Edítalo ahí; la app se adapta sola.

## Correr en local

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
npx serve .
```

## Publicado en

**https://rba3.github.io/FrShadow/** (GitHub Pages, rama `main`).
