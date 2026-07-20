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
    {
      key: 'asistencia', nombre: 'Asistencia al Shadow', peso: 10, evidencia: 'Calendario',
      criterio: 'Presencia real y puntual en las sesiones de shadow agendadas.',
      guia: '0% = no asistió · 50% = asistió a la mitad de las sesiones · 100% = asistió a todas. Evidencia: calendario / registro de asistencia.'
    },
    {
      key: 'comprension', nombre: 'Comprensión funcional', peso: 20, evidencia: 'Quiz / entrevista',
      criterio: 'Entiende el propósito, el flujo y las reglas de negocio del proceso.',
      guia: 'Se mide con quiz o entrevista. 100% = explica el flujo completo sin ayuda · 60% = lo explica con dudas menores · <50% = no logra describir el proceso.'
    },
    {
      key: 'ejec_guiada', nombre: 'Ejecución guiada', peso: 20, evidencia: 'Demostración',
      criterio: 'Ejecuta el proceso mientras el mentor observa o guía.',
      guia: '100% = ejecuta todos los pasos con guía mínima · 50% = requiere correcciones frecuentes · <30% = no completa la ejecución guiada.'
    },
    {
      key: 'ejec_independiente', nombre: 'Ejecución independiente', peso: 20, evidencia: 'Caso práctico',
      criterio: 'Resuelve un caso real por su cuenta, sin ayuda del mentor.',
      guia: '100% = resuelve el caso sin intervención · 70% = termina con 1–2 consultas · <50% = necesita apoyo constante.'
    },
    {
      key: 'documentacion', nombre: 'Documentación actualizada', peso: 10, evidencia: 'Wiki / Git',
      criterio: 'Mantiene runbooks, wiki o repos actualizados por su cuenta.',
      guia: '100% = documentación completa y al día · 50% = parcial o desactualizada · 0% = sin documentar. Evidencia: enlace a Wiki/Git.'
    },
    {
      key: 'incidentes', nombre: 'Resolución de incidentes', peso: 10, evidencia: 'Ticket',
      criterio: 'Detecta, diagnostica y resuelve incidencias del proceso.',
      guia: 'Se mide con tickets reales. 100% = resolvió sin escalar · 60% = resolvió con apoyo · <50% = escaló todo sin diagnóstico propio.'
    },
    {
      key: 'reverse', nombre: 'Reverse Shadow', peso: 10, evidencia: 'Sesión',
      criterio: 'La persona invierte el rol: enseña y guía a alguien más.',
      guia: '100% = condujo una sesión completa enseñando el proceso · 50% = enseñó parte con apoyo · Pendiente = aún no ocurre.'
    }
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
    { nivel: 0, desc: 'No iniciado',            ejemplo: 'Aún no participa en el proceso.' },
    { nivel: 1, desc: 'Observó (Shadow)',       ejemplo: 'Vio al experto ejecutar, sin operar todavía.' },
    { nivel: 2, desc: 'Ejecuta con ayuda',      ejemplo: 'Opera el proceso con el mentor guiando cada paso.' },
    { nivel: 3, desc: 'Ejecuta solo',           ejemplo: 'Resuelve casos reales sin ayuda.' },
    { nivel: 4, desc: 'Optimiza',               ejemplo: 'Mejora el proceso, detecta y previene fallos.' },
    { nivel: 5, desc: 'Enseña (Reverse Shadow)',ejemplo: 'Capacita a otros y certifica el proceso.' }
  ],

  /* Escala compartida para la matriz de competencias (0–5) */
  ESCALA_COMPETENCIA: '0 = sin conocimiento · 1 = básico/teórico · 2 = usa con ayuda · 3 = autónomo · 4 = avanzado/optimiza · 5 = experto/enseña',

  /* Descripción corta de cada módulo del formulario (siempre visible bajo el título) */
  MODULOS: {
    scorecard:   'Evalúa 7 dimensiones ponderadas del shadow. Asigna un % a cada rubro según la evidencia; el peso refleja su importancia en el Score total.',
    madurez:     'Ubica a la persona en la escala de capacidad (estilo ISO/IEC 330xx), desde solo observar (1) hasta enseñar el proceso (5).',
    competencias:'Compara el nivel esperado del rol contra el nivel actual por herramienta. El gap indica cuánto falta por cerrar.',
    checklist:   'Marca qué actividades ya domina en cada fase de la transición. De aquí salen los KPIs de avance.',
    kpis:        'Indicadores de avance y riesgo. Los de fórmula se calculan solos desde el checklist y el scorecard; los manuales los capturas tú.'
  },

  /* ------------------------------------------------------------------ *
   *  Matriz de competencias. El nivel esperado viene precargado de aquí;
   *  el nivel actual se captura por persona. El gap se calcula solo.
   *  Escala 0–5 (misma que niveles de madurez).
   * ------------------------------------------------------------------ */
  COMPETENCIAS: [
    { key: 'jmeter',     nombre: 'JMeter',     esperado: 3 },
    { key: 'blazemeter', nombre: 'BlazeMeter', esperado: 3 },
    { key: 'elastic',    nombre: 'Elastic',    esperado: 3 }
  ],

  /* ------------------------------------------------------------------ *
   *  Checklist por actividad. Cada celda (actividad × fase) es una casilla.
   * ------------------------------------------------------------------ */
  ACTIVIDADES: ['Instalación', 'Configuración', 'Ejecución', 'Análisis', 'Reporte'],
  FASES_CHECKLIST: [
    { key: 'shadow',        nombre: 'Shadow',        desc: 'Observó cómo se hace.' },
    { key: 'practica',      nombre: 'Práctica',      desc: 'Lo hizo en un entorno de práctica.' },
    { key: 'independiente', nombre: 'Independiente', desc: 'Lo hizo solo en un caso real.' },
    { key: 'reverse',       nombre: 'Reverse',       desc: 'Se lo enseñó a alguien más.' }
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
