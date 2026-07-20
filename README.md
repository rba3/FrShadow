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

## Arquitectura (herramienta privada del administrador)

Dos repos:

- **`rba3/FrShadow`** (público) — solo el código del sitio (GitHub Pages gratis).
- **`rba3/FrShadow-data`** (privado) — las evaluaciones en `data/evaluaciones.json`.

La app entera está **detrás del token**: sin token no se ve ni se captura nada
(pantalla de bloqueo). Como los datos viven en un repo **privado**, nadie sin el
token puede leerlos — el dashboard es realmente privado, no un candado cosmético.

Cada guardado hace un **commit real** en el repo de datos vía la API de GitHub, así
queda historial auditable. No hay servidor ni base de datos externa.

## Puesta en marcha

1. Crea el repo privado **`rba3/FrShadow-data`** (inicialízalo con un README para
   que exista la rama `main`).
2. Genera un token en [GitHub → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new):
   - **Repository access** → “Only select repositories” → **`rba3/FrShadow-data`**.
   - **Permissions → Repository permissions → Contents: Read and write**.
3. En la app, entra a **Acceso**, pega el token y da “Guardar y validar”.

El banner pasará a **“Modo administrador”** y tendrás acceso completo. El token se
guarda **solo en tu navegador** (localStorage) y nunca se sube a ningún repo.

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
