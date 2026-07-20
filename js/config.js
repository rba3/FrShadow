/*
 * config.js — Configuración editable de la Transition Readiness Tool.
 *
 * Aquí vive TODO el marco de evaluación (rubros, pesos, dimensiones, competencias,
 * niveles de madurez, KPIs y umbrales). Si mañana cambia el modelo, se edita este
 * archivo y la app se adapta sola. No hace falta tocar app.js.
 *
 * Basado en: ISO/IEC 330xx (SPICE), ISO 9001:2015, ITIL 4 y PMBOK.
 */

const CONFIG = {

  /* ------------------------------------------------------------------ *
   *  Persistencia: un JSON dentro del propio repo (data/evaluaciones.json).
   *  - Cualquiera puede VER el dashboard (lectura pública del JSON).
   *  - Para CREAR / EDITAR / BORRAR se necesita un token personal de GitHub
   *    con permiso de escritura en este repo. El token se guarda solo en el
   *    navegador del editor (localStorage); nunca se guarda en el repo.
   *  Cada guardado hace un commit real, así queda historial auditable.
   * ------------------------------------------------------------------ */
  GITHUB: {
    owner: 'rba3',
    repo: 'FrShadow-data',
    branch: 'main',
    path: 'data/evaluaciones.json'
  },

  /* ------------------------------------------------------------------ *
   *  Scorecard de Shadow — 7 rubros. Los pesos deben sumar 100.
   *  Cada rubro se captura como % (0–100) o queda "Pendiente".
   * ------------------------------------------------------------------ */
  RUBROS: [
    { key: 'asistencia',        nombre: 'Asistencia al Shadow',      peso: 10, evidencia: 'Calendario' },
    { key: 'comprension',       nombre: 'Comprensión funcional',     peso: 20, evidencia: 'Quiz / entrevista' },
    { key: 'ejec_guiada',       nombre: 'Ejecución guiada',          peso: 20, evidencia: 'Demostración' },
    { key: 'ejec_independiente',nombre: 'Ejecución independiente',   peso: 20, evidencia: 'Caso práctico' },
    { key: 'documentacion',     nombre: 'Documentación actualizada', peso: 10, evidencia: 'Wiki / Git' },
    { key: 'incidentes',        nombre: 'Resolución de incidentes',  peso: 10, evidencia: 'Ticket' },
    { key: 'reverse',           nombre: 'Reverse Shadow',            peso: 10, evidencia: 'Sesión' }
  ],

  /* ------------------------------------------------------------------ *
   *  Dimensiones del TRI (Transition Readiness Index) — 5 dimensiones.
   *  Los pesos deben sumar 100. Cada dimensión se calcula como el
   *  promedio de los rubros listados en "fuentes" (los "Pendiente"
   *  cuentan como 0).
   * ------------------------------------------------------------------ */
  DIMENSIONES_TRI: [
    { key: 'conocimiento', nombre: 'Conocimiento técnico', peso: 30, fuentes: ['comprension'] },
    { key: 'ejecucion',    nombre: 'Ejecución práctica',   peso: 30, fuentes: ['ejec_guiada', 'ejec_independiente', 'incidentes'] },
    { key: 'documentacion',nombre: 'Documentación',        peso: 15, fuentes: ['documentacion'] },
    { key: 'autonomia',    nombre: 'Autonomía',            peso: 15, fuentes: ['asistencia', 'ejec_independiente'] },
    { key: 'reverse',      nombre: 'Reverse Shadow',       peso: 10, fuentes: ['reverse'] }
  ],

  /* ------------------------------------------------------------------ *
   *  Niveles de madurez (0–5). Similar al concepto de capacidad ISO 330xx.
   * ------------------------------------------------------------------ */
  NIVELES_MADUREZ: [
    { nivel: 0, desc: 'No iniciado' },
    { nivel: 1, desc: 'Observó (Shadow)' },
    { nivel: 2, desc: 'Ejecuta con ayuda' },
    { nivel: 3, desc: 'Ejecuta solo' },
    { nivel: 4, desc: 'Optimiza' },
    { nivel: 5, desc: 'Enseña (Reverse Shadow)' }
  ],

  /* ------------------------------------------------------------------ *
   *  Matriz de competencias. El nivel esperado viene precargado de aquí;
   *  el nivel actual se captura por persona. El gap se calcula solo.
   *  Escala 0–5 (misma que niveles de madurez).
   * ------------------------------------------------------------------ */
  COMPETENCIAS: [
    { key: 'playwright', nombre: 'Playwright', esperado: 4 },
    { key: 'jmeter',     nombre: 'JMeter',     esperado: 3 },
    { key: 'elastic',    nombre: 'Elastic',    esperado: 3 },
    { key: 'genrocket',  nombre: 'GenRocket',  esperado: 4 }
  ],

  /* ------------------------------------------------------------------ *
   *  Checklist por actividad. Cada celda (actividad × fase) es una casilla.
   * ------------------------------------------------------------------ */
  ACTIVIDADES: ['Instalación', 'Configuración', 'Ejecución', 'Análisis', 'Reporte'],
  FASES_CHECKLIST: [
    { key: 'shadow',        nombre: 'Shadow' },
    { key: 'practica',      nombre: 'Práctica' },
    { key: 'independiente', nombre: 'Independiente' },
    { key: 'reverse',       nombre: 'Reverse' }
  ],

  /* ------------------------------------------------------------------ *
   *  KPIs. Los de tipo "auto" se calculan solos; los "manual" se capturan.
   *   - meta: umbral objetivo (texto).
   *   - calc: cómo se calcula un KPI automático (lo interpreta app.js).
   * ------------------------------------------------------------------ */
  KPIS: [
    { key: 'shadow_completado', nombre: '% Shadow completado', formula: 'Actividades completadas / Total', meta: '> 95%', tipo: 'auto', calc: 'checklist_col:shadow', unidad: '%' },
    { key: 'independencia',     nombre: '% Independencia',     formula: 'Actividades realizadas sin ayuda', meta: '> 90%', tipo: 'auto', calc: 'checklist_col:independiente', unidad: '%' },
    { key: 'reverse_aprobado',  nombre: '% Reverse aprobado',  formula: 'Actividades aprobadas / Total',    meta: '100%',  tipo: 'auto', calc: 'checklist_col:reverse', unidad: '%' },
    { key: 'documentacion',     nombre: '% Documentación',     formula: 'Documentos completos / Esperados', meta: '100%',  tipo: 'auto', calc: 'rubro:documentacion', unidad: '%' },
    { key: 'riesgos_abiertos',  nombre: 'Riesgos abiertos',    formula: 'Riesgos pendientes',               meta: '< 3',   tipo: 'manual', unidad: '' },
    { key: 'defectos_kt',       nombre: 'Defectos por desconocimiento', formula: 'Incidentes por falta de KT', meta: '0', tipo: 'manual', unidad: '' }
  ],

  /* ------------------------------------------------------------------ *
   *  Semáforo. Se evalúa contra el TRI (0–100), de mayor a menor.
   * ------------------------------------------------------------------ */
  UMBRALES: [
    { min: 90, clase: 'verde',    etiqueta: 'Listo para transición' },
    { min: 75, clase: 'amarillo', etiqueta: 'Requiere acompañamiento' },
    { min: 0,  clase: 'rojo',     etiqueta: 'Continuar Shadow' }
  ],

  /* Umbral de referencia para "listo sin acompañamiento" */
  UMBRAL_LISTO: 90,

  /* ------------------------------------------------------------------ *
   *  Fases del proceso (stepper informativo).
   * ------------------------------------------------------------------ */
  FASES: [
    'Shadow',
    'Shadow Activo',
    'Hands-on Supervisado',
    'Ejecución Independiente',
    'Reverse Shadow',
    'Certificación de Competencia',
    'Go Live'
  ]
};
