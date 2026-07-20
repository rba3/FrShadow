/*
 * app.js — Lógica de la Transition Readiness Tool.
 * Ruteo por hash, motor de cálculo (Score / TRI / semáforo / KPIs) y render
 * de las 3 vistas: dashboard, formulario y resultado imprimible.
 */

(function () {
  const app = document.getElementById('app');
  const modoBanner = document.getElementById('modo-banner');

  /* =========================================================
   *  Utilidades
   * ========================================================= */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function rubroCfg(key) { return CONFIG.RUBROS.find(function (r) { return r.key === key; }); }
  function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
  function fechaCorta(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /* =========================================================
   *  Motor de cálculo
   * ========================================================= */
  // Valor de un rubro en % (Pendiente -> 0)
  function valRubro(data, key) {
    const v = data && data.rubros ? data.rubros[key] : null;
    return v == null || v === '' ? 0 : num(v);
  }

  function calcScore(data) {
    let s = 0;
    CONFIG.RUBROS.forEach(function (r) {
      s += valRubro(data, r.key) * (r.peso / 100);
    });
    return Math.round(s);
  }

  function calcDimensiones(data) {
    return CONFIG.DIMENSIONES_TRI.map(function (d) {
      const vals = d.fuentes.map(function (k) { return valRubro(data, k); });
      const prom = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0;
      return { key: d.key, nombre: d.nombre, peso: d.peso, valor: Math.round(prom) };
    });
  }

  function calcTRI(data) {
    let t = 0;
    calcDimensiones(data).forEach(function (d) { t += d.valor * (d.peso / 100); });
    return Math.round(t);
  }

  function calcSemaforo(tri) {
    for (let i = 0; i < CONFIG.UMBRALES.length; i++) {
      if (tri >= CONFIG.UMBRALES[i].min) return CONFIG.UMBRALES[i];
    }
    return CONFIG.UMBRALES[CONFIG.UMBRALES.length - 1];
  }

  function calcKPI(kpi, data) {
    if (kpi.tipo === 'manual') {
      const v = data.kpis ? data.kpis[kpi.key] : '';
      return { valor: (v === '' || v == null) ? '—' : v, raw: v };
    }
    // auto
    if (kpi.calc && kpi.calc.indexOf('checklist_col:') === 0) {
      const col = kpi.calc.split(':')[1];
      const total = CONFIG.ACTIVIDADES.length;
      let n = 0;
      CONFIG.ACTIVIDADES.forEach(function (act) {
        const fila = data.checklist ? data.checklist[act] : null;
        if (fila && fila[col]) n++;
      });
      const pct = total ? Math.round((n / total) * 100) : 0;
      return { valor: pct + '%', raw: pct };
    }
    if (kpi.calc && kpi.calc.indexOf('rubro:') === 0) {
      const key = kpi.calc.split(':')[1];
      const v = valRubro(data, key);
      return { valor: v + '%', raw: v };
    }
    return { valor: '—', raw: null };
  }

  function competenciasCalc(data) {
    return CONFIG.COMPETENCIAS.map(function (c) {
      const actual = data.competencias && data.competencias[c.key] != null
        ? num(data.competencias[c.key]) : 0;
      return { key: c.key, nombre: c.nombre, esperado: c.esperado, actual: actual, gap: c.esperado - actual };
    });
  }

  // Recalcula y sella score/tri/semaforo en la evaluación
  function sellar(evalu) {
    evalu.score = calcScore(evalu.data);
    evalu.tri = calcTRI(evalu.data);
    evalu.semaforo = calcSemaforo(evalu.tri).clase;
    return evalu;
  }

  /* =========================================================
   *  Banner de modo (nube / local)
   * ========================================================= */
  function pintarBanner() {
    if (Store.modo === 'editor') {
      modoBanner.className = 'modo-banner nube';
      modoBanner.innerHTML = 'Modo administrador: acceso completo. Tus cambios se guardan como commit en el repo privado de datos. <a href="#/acceso">Administrar acceso</a>';
    } else {
      modoBanner.className = 'modo-banner local';
      modoBanner.innerHTML = 'Herramienta privada: conecta tu token de administrador para acceder. <a href="#/acceso">Conectar acceso</a>';
    }
  }

  /* =========================================================
   *  Vista: Dashboard
   * ========================================================= */
  function vistaDashboard() {
    app.innerHTML = '<div class="cargando">Cargando evaluaciones…</div>';
    Store.listar().then(function (lista) {
      renderDashboard(lista);
    }).catch(function (e) {
      app.innerHTML = '<div class="error">No se pudieron cargar los datos: ' + esc(e.message || e) + '</div>';
    });
  }

  function renderDashboard(lista) {
    const listos = lista.filter(function (e) { return num(e.tri) >= CONFIG.UMBRAL_LISTO; }).length;
    const promedio = lista.length
      ? Math.round(lista.reduce(function (a, e) { return a + num(e.tri); }, 0) / lista.length) : 0;

    let html = '';
    html += '<section class="page-head">';
    html += '  <div><h1>Transition Readiness Dashboard</h1>';
    html += '    <p class="sub">Preparación del equipo para la transición (Shadow / Reverse Shadow)</p></div>';
    html += '  <a class="btn primary" href="#/nueva">Nueva evaluación</a>';
    html += '</section>';

    html += '<section class="kpi-row">';
    html += tile('Personas evaluadas', lista.length);
    html += tile('TRI promedio', promedio);
    html += tile('Listos para transición', listos + ' / ' + lista.length);
    html += '</section>';

    if (!lista.length) {
      html += '<div class="vacio">Aún no hay evaluaciones. Crea la primera con “Nueva evaluación”.</div>';
      app.innerHTML = html;
      return;
    }

    html += '<section class="card"><table class="tabla"><thead><tr>';
    html += '<th>Persona</th><th>Rol</th><th>Nivel</th><th class="num">Score</th><th class="num">TRI</th><th>Semáforo</th><th>Actualizado</th><th></th>';
    html += '</tr></thead><tbody>';

    lista.forEach(function (e) {
      const sem = calcSemaforo(num(e.tri));
      const nivel = (e.data && e.data.madurez != null) ? e.data.madurez : '—';
      html += '<tr>';
      html += '<td><a class="lnk" href="#/eval/' + esc(e.id) + '">' + esc(e.persona || 'Sin nombre') + '</a></td>';
      html += '<td>' + esc(e.rol || '—') + '</td>';
      html += '<td class="num">' + esc(nivel) + '</td>';
      html += '<td class="num">' + num(e.score) + '</td>';
      html += '<td class="num"><strong>' + num(e.tri) + '</strong></td>';
      html += '<td>' + badge(sem) + barra(num(e.tri)) + '</td>';
      html += '<td>' + fechaCorta(e.updated_at) + '</td>';
      html += '<td class="acciones">';
      html += '<a class="mini" href="#/print/' + esc(e.id) + '">Ver</a>';
      html += '<button class="mini danger" data-del="' + esc(e.id) + '">Borrar</button>';
      html += '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></section>';
    app.innerHTML = html;

    app.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!Store.tieneToken()) {
          alert('Para borrar necesitas conectar tu token de GitHub (menú “Acceso”).');
          location.hash = '#/acceso';
          return;
        }
        const id = b.getAttribute('data-del');
        if (confirm('¿Borrar esta evaluación? No se puede deshacer.')) {
          b.disabled = true; b.textContent = 'Borrando…';
          Store.eliminar(id).then(vistaDashboard).catch(function (e) {
            alert('No se pudo borrar: ' + (e.message || e));
            b.disabled = false; b.textContent = 'Borrar';
          });
        }
      });
    });
  }

  function tile(label, val) {
    return '<div class="tile"><div class="tile-val">' + esc(val) + '</div><div class="tile-lbl">' + esc(label) + '</div></div>';
  }
  function badge(sem) {
    return '<span class="badge ' + sem.clase + '"><span class="dot"></span>' + esc(sem.etiqueta) + '</span>';
  }
  function barra(tri) {
    return '<span class="mini-bar"><span class="mini-fill ' + calcSemaforo(tri).clase + '" style="width:' + Math.max(0, Math.min(100, tri)) + '%"></span></span>';
  }

  /* =========================================================
   *  Vista: Formulario
   * ========================================================= */
  function nuevaEvaluacion() {
    return {
      id: null, persona: '', rol: '', evaluador: '', estado: 'borrador',
      data: { rubros: {}, madurez: 0, competencias: {}, checklist: {}, kpis: {} }
    };
  }

  function vistaForm(id) {
    if (!id) { renderForm(nuevaEvaluacion()); return; }
    app.innerHTML = '<div class="cargando">Cargando…</div>';
    Store.obtener(id).then(function (e) {
      if (!e) { app.innerHTML = '<div class="error">Evaluación no encontrada.</div>'; return; }
      if (!e.data) e.data = { rubros: {}, madurez: 0, competencias: {}, checklist: {}, kpis: {} };
      renderForm(e);
    });
  }

  function renderForm(evalu) {
    const d = evalu.data;
    let html = '';
    html += '<section class="page-head"><div>';
    html += '<h1>' + (evalu.id ? 'Editar evaluación' : 'Nueva evaluación') + '</h1>';
    html += '<p class="sub">Captura y evidencia por rubro. El Score, el TRI y el semáforo se calculan en vivo.</p>';
    html += '</div><a class="btn ghost" href="#/">Volver</a></section>';

    html += '<div class="form-grid"><form id="f-eval" class="form-col">';

    /* Datos */
    html += bloque('Datos de la persona', ''
      + campo('persona', 'Persona', 'text', evalu.persona)
      + campo('rol', 'Rol', 'text', evalu.rol)
      + campo('evaluador', 'Evaluador', 'text', evalu.evaluador));

    /* Scorecard */
    let sc = '<table class="tabla mini-tabla"><thead><tr><th>Rubro</th><th>Peso</th><th>Estado</th><th>Evidencia</th></tr></thead><tbody>';
    CONFIG.RUBROS.forEach(function (r) {
      const v = d.rubros[r.key];
      sc += '<tr>';
      sc += '<td>' + esc(r.nombre) + '</td>';
      sc += '<td class="num">' + r.peso + '%</td>';
      sc += '<td><div class="estado-cell">'
        + '<input type="range" min="0" max="100" step="5" data-rubro="' + r.key + '" value="' + (v == null ? 0 : num(v)) + '" ' + (v == null ? 'disabled' : '') + '>'
        + '<span class="estado-val" data-rubroval="' + r.key + '">' + (v == null ? 'Pendiente' : num(v) + '%') + '</span>'
        + '<label class="pend"><input type="checkbox" data-pend="' + r.key + '" ' + (v == null ? 'checked' : '') + '> Pendiente</label>'
        + '</div></td>';
      sc += '<td><input class="ev" type="text" data-ev="' + r.key + '" placeholder="' + esc(r.evidencia) + '" value="' + esc(d.rubros['_ev_' + r.key] || '') + '"></td>';
      sc += '</tr>';
    });
    sc += '</tbody></table>';
    html += bloque('Scorecard de Shadow', sc);

    /* Nivel de madurez */
    let mad = '<div class="madurez">';
    CONFIG.NIVELES_MADUREZ.forEach(function (n) {
      mad += '<label class="mad-opt"><input type="radio" name="madurez" value="' + n.nivel + '" ' + (num(d.madurez) === n.nivel ? 'checked' : '') + '>'
        + '<span class="mad-n">' + n.nivel + '</span><span class="mad-d">' + esc(n.desc) + '</span></label>';
    });
    mad += '</div>';
    html += bloque('Nivel de madurez', mad);

    /* Competencias */
    let comp = '<table class="tabla mini-tabla"><thead><tr><th>Competencia</th><th class="num">Esperado</th><th class="num">Actual</th><th class="num">Gap</th></tr></thead><tbody>';
    CONFIG.COMPETENCIAS.forEach(function (c) {
      const actual = d.competencias[c.key] != null ? num(d.competencias[c.key]) : 0;
      comp += '<tr><td>' + esc(c.nombre) + '</td><td class="num">' + c.esperado + '</td>';
      comp += '<td class="num"><select data-comp="' + c.key + '">';
      for (let i = 0; i <= 5; i++) comp += '<option value="' + i + '" ' + (actual === i ? 'selected' : '') + '>' + i + '</option>';
      comp += '</select></td>';
      comp += '<td class="num gap" data-gap="' + c.key + '">' + (c.esperado - actual) + '</td></tr>';
    });
    comp += '</tbody></table>';
    html += bloque('Matriz de competencias', comp);

    /* Checklist */
    let chk = '<table class="tabla mini-tabla check"><thead><tr><th>Actividad</th>';
    CONFIG.FASES_CHECKLIST.forEach(function (f) { chk += '<th class="num">' + esc(f.nombre) + '</th>'; });
    chk += '</tr></thead><tbody>';
    CONFIG.ACTIVIDADES.forEach(function (act) {
      chk += '<tr><td>' + esc(act) + '</td>';
      CONFIG.FASES_CHECKLIST.forEach(function (f) {
        const on = d.checklist[act] && d.checklist[act][f.key];
        chk += '<td class="num"><input type="checkbox" data-chk="' + esc(act) + '|' + f.key + '" ' + (on ? 'checked' : '') + '></td>';
      });
      chk += '</tr>';
    });
    chk += '</tbody></table>';
    html += bloque('Checklist por actividad', chk);

    /* KPIs manuales */
    let kp = '<div class="kpi-manual">';
    CONFIG.KPIS.filter(function (k) { return k.tipo === 'manual'; }).forEach(function (k) {
      kp += '<label class="kpi-in"><span>' + esc(k.nombre) + ' <em>(meta ' + esc(k.meta) + ')</em></span>'
        + '<input type="number" min="0" step="1" data-kpi="' + k.key + '" value="' + esc(d.kpis[k.key] != null ? d.kpis[k.key] : '') + '"></label>';
    });
    kp += '</div>';
    html += bloque('KPIs manuales', kp);

    html += '</form>';

    /* Panel resumen en vivo */
    html += '<aside class="resumen" id="resumen"></aside>';
    html += '</div>';

    /* Barra de acciones */
    html += '<div class="form-actions">';
    html += '<button class="btn primary" id="btn-guardar">Guardar</button>';
    html += '<button class="btn ghost" id="btn-guardar-print">Guardar y ver resultado</button>';
    html += '</div>';

    app.innerHTML = html;

    // Estado de trabajo (referencia mutable)
    const work = evalu;

    function recolectar() {
      const f = document.getElementById('f-eval');
      work.persona = f.querySelector('[name="persona"]').value.trim();
      work.rol = f.querySelector('[name="rol"]').value.trim();
      work.evaluador = f.querySelector('[name="evaluador"]').value.trim();
      const md = f.querySelector('input[name="madurez"]:checked');
      work.data.madurez = md ? num(md.value) : 0;
      // rubros
      CONFIG.RUBROS.forEach(function (r) {
        const pend = f.querySelector('[data-pend="' + r.key + '"]').checked;
        if (pend) work.data.rubros[r.key] = null;
        else work.data.rubros[r.key] = num(f.querySelector('[data-rubro="' + r.key + '"]').value);
        work.data.rubros['_ev_' + r.key] = f.querySelector('[data-ev="' + r.key + '"]').value.trim();
      });
      // competencias
      f.querySelectorAll('[data-comp]').forEach(function (s) {
        work.data.competencias[s.getAttribute('data-comp')] = num(s.value);
      });
      // checklist
      f.querySelectorAll('[data-chk]').forEach(function (c) {
        const parts = c.getAttribute('data-chk').split('|');
        const act = parts[0], fase = parts[1];
        if (!work.data.checklist[act]) work.data.checklist[act] = {};
        work.data.checklist[act][fase] = c.checked;
      });
      // kpis manuales
      f.querySelectorAll('[data-kpi]').forEach(function (k) {
        const val = k.value;
        work.data.kpis[k.getAttribute('data-kpi')] = val === '' ? null : num(val);
      });
    }

    function refrescar() {
      recolectar();
      sellar(work);
      // reflejar estados de rubro y gaps sin re-render total
      CONFIG.RUBROS.forEach(function (r) {
        const range = app.querySelector('[data-rubro="' + r.key + '"]');
        const lbl = app.querySelector('[data-rubroval="' + r.key + '"]');
        const v = work.data.rubros[r.key];
        range.disabled = (v == null);
        lbl.textContent = (v == null) ? 'Pendiente' : v + '%';
      });
      competenciasCalc(work.data).forEach(function (c) {
        const cell = app.querySelector('[data-gap="' + c.key + '"]');
        if (cell) { cell.textContent = c.gap; cell.className = 'num gap' + (c.gap > 0 ? ' warn' : ' ok'); }
      });
      document.getElementById('resumen').innerHTML = panelResumen(work);
    }

    // listeners
    app.querySelector('#f-eval').addEventListener('input', refrescar);
    app.querySelector('#f-eval').addEventListener('change', refrescar);

    function guardar() {
      recolectar();
      sellar(work);
      if (!work.persona) { alert('Ponle nombre a la persona antes de guardar.'); return null; }
      work.estado = 'completo';
      return Store.guardar(work);
    }
    function conGuardado(btn, despues) {
      if (!Store.tieneToken()) {
        alert('Para guardar necesitas conectar tu token de GitHub (menú “Acceso”).');
        location.hash = '#/acceso';
        return;
      }
      const p = guardar();
      if (!p) return;
      const btns = app.querySelectorAll('.form-actions .btn');
      const txt = btn.textContent;
      btns.forEach(function (b) { b.disabled = true; });
      btn.textContent = 'Guardando…';
      p.then(function (saved) {
        despues(saved);
      }).catch(function (e) {
        alert('No se pudo guardar: ' + (e.message || e));
        btns.forEach(function (b) { b.disabled = false; });
        btn.textContent = txt;
      });
    }
    document.getElementById('btn-guardar').addEventListener('click', function () {
      conGuardado(this, function () { location.hash = '#/'; });
    });
    document.getElementById('btn-guardar-print').addEventListener('click', function () {
      conGuardado(this, function (saved) { location.hash = '#/print/' + saved.id; });
    });

    refrescar();
  }

  function bloque(titulo, contenido) {
    return '<section class="card bloque"><h2>' + esc(titulo) + '</h2>' + contenido + '</section>';
  }
  function campo(name, label, tipo, val) {
    return '<label class="campo"><span>' + esc(label) + '</span><input name="' + name + '" type="' + tipo + '" value="' + esc(val || '') + '"></label>';
  }

  function panelResumen(work) {
    const sem = calcSemaforo(work.tri);
    let h = '<div class="res-tri ' + sem.clase + '">';
    h += '<div class="res-num">' + work.tri + '</div><div class="res-cap">TRI</div>';
    h += badge(sem);
    h += '</div>';
    h += '<div class="res-score">Score de Shadow: <strong>' + work.score + '</strong> / 100</div>';
    h += '<div class="res-dims"><h3>Dimensiones</h3>';
    calcDimensiones(work.data).forEach(function (dm) {
      h += '<div class="dim"><span class="dim-n">' + esc(dm.nombre) + ' <em>' + dm.peso + '%</em></span>'
        + '<span class="dim-bar"><span class="dim-fill" style="width:' + dm.valor + '%"></span></span>'
        + '<span class="dim-v">' + dm.valor + '</span></div>';
    });
    h += '</div>';
    h += '<div class="res-kpis"><h3>KPIs</h3>';
    CONFIG.KPIS.forEach(function (k) {
      const r = calcKPI(k, work.data);
      h += '<div class="kpi-line"><span>' + esc(k.nombre) + '</span><span class="kpi-v">' + esc(r.valor) + '</span><span class="kpi-meta">meta ' + esc(k.meta) + '</span></div>';
    });
    h += '</div>';
    return h;
  }

  /* =========================================================
   *  Vista: Resultado imprimible
   * ========================================================= */
  function vistaPrint(id) {
    app.innerHTML = '<div class="cargando">Cargando…</div>';
    Store.obtener(id).then(function (e) {
      if (!e) { app.innerHTML = '<div class="error">Evaluación no encontrada.</div>'; return; }
      if (!e.data) e.data = { rubros: {}, madurez: 0, competencias: {}, checklist: {}, kpis: {} };
      sellar(e);
      renderPrint(e);
    });
  }

  function renderPrint(e) {
    const sem = calcSemaforo(num(e.tri));
    const nivel = CONFIG.NIVELES_MADUREZ.find(function (n) { return n.nivel === num(e.data.madurez); });

    let h = '';
    h += '<section class="page-head no-print"><a class="btn ghost" href="#/">Volver</a>';
    h += '<div><a class="btn ghost" href="#/eval/' + esc(e.id) + '">Editar</a> ';
    h += '<button class="btn primary" id="btn-print">Imprimir / PDF</button></div></section>';

    h += '<article class="hoja">';
    h += '<header class="hoja-head"><div><h1>Reporte de preparación para la transición</h1>';
    h += '<p class="sub">Shadow / Reverse Shadow — Índice TRI</p></div>';
    h += '<div class="hoja-marca">Transition Readiness</div></header>';

    h += '<section class="hoja-persona">';
    h += '<div><span class="lbl">Persona</span><strong>' + esc(e.persona || '—') + '</strong></div>';
    h += '<div><span class="lbl">Rol</span><strong>' + esc(e.rol || '—') + '</strong></div>';
    h += '<div><span class="lbl">Evaluador</span><strong>' + esc(e.evaluador || '—') + '</strong></div>';
    h += '<div><span class="lbl">Fecha</span><strong>' + fechaCorta(e.updated_at || e.created_at) + '</strong></div>';
    h += '</section>';

    h += '<section class="hoja-tri ' + sem.clase + '">';
    h += '<div class="tri-big"><span class="tri-num">' + num(e.tri) + '</span><span class="tri-cap">TRI / 100</span></div>';
    h += '<div class="tri-meta">' + badge(sem)
      + '<div class="tri-score">Score de Shadow: <strong>' + num(e.score) + '</strong> / 100</div>'
      + '<div class="tri-nivel">Nivel de madurez: <strong>' + num(e.data.madurez) + '</strong> — ' + esc(nivel ? nivel.desc : '') + '</div>'
      + '</div></section>';

    // Scorecard
    h += '<h2 class="hoja-h2">Scorecard de Shadow</h2>';
    h += '<table class="tabla print-tabla"><thead><tr><th>Categoría</th><th class="num">Peso</th><th>Estado</th><th>Evidencia</th></tr></thead><tbody>';
    CONFIG.RUBROS.forEach(function (r) {
      const v = e.data.rubros[r.key];
      const ev = e.data.rubros['_ev_' + r.key] || r.evidencia;
      h += '<tr><td>' + esc(r.nombre) + '</td><td class="num">' + r.peso + '%</td>'
        + '<td>' + (v == null ? 'Pendiente' : num(v) + '%') + '</td><td>' + esc(ev) + '</td></tr>';
    });
    h += '<tr class="total"><td>Score Total</td><td></td><td><strong>' + num(e.score) + '%</strong></td><td></td></tr>';
    h += '</tbody></table>';

    // Dimensiones TRI
    h += '<h2 class="hoja-h2">Índice de Preparación (TRI)</h2>';
    h += '<table class="tabla print-tabla"><thead><tr><th>Dimensión</th><th class="num">Peso</th><th class="num">Valor</th></tr></thead><tbody>';
    calcDimensiones(e.data).forEach(function (dm) {
      h += '<tr><td>' + esc(dm.nombre) + '</td><td class="num">' + dm.peso + '%</td><td class="num">' + dm.valor + '</td></tr>';
    });
    h += '<tr class="total"><td>TRI</td><td></td><td class="num"><strong>' + num(e.tri) + '</strong></td></tr>';
    h += '</tbody></table>';

    // Competencias
    h += '<h2 class="hoja-h2">Matriz de competencias</h2>';
    h += '<table class="tabla print-tabla"><thead><tr><th>Competencia</th><th class="num">Esperado</th><th class="num">Actual</th><th class="num">Gap</th></tr></thead><tbody>';
    competenciasCalc(e.data).forEach(function (c) {
      h += '<tr><td>' + esc(c.nombre) + '</td><td class="num">' + c.esperado + '</td><td class="num">' + c.actual + '</td><td class="num">' + c.gap + '</td></tr>';
    });
    h += '</tbody></table>';

    // Checklist
    h += '<h2 class="hoja-h2">Checklist por actividad</h2>';
    h += '<table class="tabla print-tabla check"><thead><tr><th>Actividad</th>';
    CONFIG.FASES_CHECKLIST.forEach(function (f) { h += '<th class="num">' + esc(f.nombre) + '</th>'; });
    h += '</tr></thead><tbody>';
    CONFIG.ACTIVIDADES.forEach(function (act) {
      h += '<tr><td>' + esc(act) + '</td>';
      CONFIG.FASES_CHECKLIST.forEach(function (f) {
        const on = e.data.checklist[act] && e.data.checklist[act][f.key];
        h += '<td class="num">' + (on ? '<span class="ok-mark">Sí</span>' : '—') + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table>';

    // KPIs
    h += '<h2 class="hoja-h2">KPIs</h2>';
    h += '<table class="tabla print-tabla"><thead><tr><th>KPI</th><th>Fórmula</th><th class="num">Valor</th><th class="num">Meta</th></tr></thead><tbody>';
    CONFIG.KPIS.forEach(function (k) {
      const r = calcKPI(k, e.data);
      h += '<tr><td>' + esc(k.nombre) + '</td><td>' + esc(k.formula) + '</td><td class="num">' + esc(r.valor) + '</td><td class="num">' + esc(k.meta) + '</td></tr>';
    });
    h += '</tbody></table>';

    // Fases
    h += '<h2 class="hoja-h2">Fases del proceso</h2>';
    h += '<ol class="fases">';
    CONFIG.FASES.forEach(function (f, i) {
      h += '<li><span class="fase-n">' + (i + 1) + '</span><span>' + esc(f) + '</span></li>';
    });
    h += '</ol>';

    h += '<footer class="hoja-foot">Marco de referencia: ISO/IEC 330xx (SPICE), ISO 9001:2015, ITIL 4, PMBOK. Umbral de transición sin acompañamiento: TRI ≥ ' + CONFIG.UMBRAL_LISTO + '.</footer>';
    h += '</article>';

    app.innerHTML = h;
    const bp = document.getElementById('btn-print');
    if (bp) bp.addEventListener('click', function () { window.print(); });
  }

  /* =========================================================
   *  Vista: Acceso (token de GitHub)
   * ========================================================= */
  function vistaAcceso() {
    const owner = CONFIG.GITHUB.owner, repo = CONFIG.GITHUB.repo;
    const tokenUrl = 'https://github.com/settings/personal-access-tokens/new';
    let h = '';
    h += '<section class="page-head"><div><h1>Acceso de administrador</h1>';
    h += '<p class="sub">Esta herramienta es privada. Conecta tu token de GitHub para ver el dashboard y capturar evaluaciones. Sin token no hay acceso.</p></div>';
    h += '<a class="btn ghost" href="#/">Volver</a></section>';

    h += '<section class="card" style="max-width:640px">';
    h += '<div id="acceso-estado"></div>';
    h += '<label class="campo"><span>Token personal de GitHub</span>';
    h += '<input id="tok" type="password" placeholder="github_pat_..." autocomplete="off"></label>';
    h += '<div class="form-actions">';
    h += '<button class="btn primary" id="btn-tok-guardar">Guardar y validar</button>';
    h += '<button class="btn ghost" id="btn-tok-quitar">Quitar token</button>';
    h += '</div>';
    h += '<div id="acceso-msg" class="acceso-msg"></div>';

    h += '<div class="acceso-ayuda"><h3>Cómo crear el token</h3><ol>';
    h += '<li>Abre <a href="' + tokenUrl + '" target="_blank" rel="noopener">GitHub → Fine-grained tokens</a> e inicia sesión.</li>';
    h += '<li>En <strong>Repository access</strong> elige “Only select repositories” y selecciona <strong>' + esc(owner) + '/' + esc(repo) + '</strong>.</li>';
    h += '<li>En <strong>Permissions → Repository permissions</strong>, pon <strong>Contents: Read and write</strong>.</li>';
    h += '<li>Genera el token, cópialo y pégalo aquí arriba.</li>';
    h += '</ol><p class="nota">El token se guarda solo en este navegador (localStorage). Nunca se sube al repo.</p></div>';
    h += '</section>';

    app.innerHTML = h;
    pintarEstadoAcceso();

    document.getElementById('btn-tok-guardar').addEventListener('click', function () {
      const val = document.getElementById('tok').value.trim();
      const msg = document.getElementById('acceso-msg');
      if (!val) { msg.className = 'acceso-msg err'; msg.textContent = 'Pega un token primero.'; return; }
      msg.className = 'acceso-msg'; msg.textContent = 'Validando…';
      Store.validarToken(val).then(function (login) {
        Store.setToken(val);
        pintarBanner();
        pintarEstadoAcceso();
        document.getElementById('tok').value = '';
        msg.className = 'acceso-msg ok'; msg.textContent = 'Conectado como ' + login + '. Ya puedes crear y editar evaluaciones.';
      }).catch(function (e) {
        msg.className = 'acceso-msg err'; msg.textContent = 'No se pudo validar: ' + (e.message || e);
      });
    });
    document.getElementById('btn-tok-quitar').addEventListener('click', function () {
      Store.clearToken();
      pintarBanner();
      pintarEstadoAcceso();
      const msg = document.getElementById('acceso-msg');
      msg.className = 'acceso-msg'; msg.textContent = 'Token eliminado de este navegador.';
    });
  }

  function pintarEstadoAcceso() {
    const el = document.getElementById('acceso-estado');
    if (!el) return;
    if (Store.tieneToken()) {
      el.className = 'estado-acceso ok';
      el.innerHTML = '<span class="dot"></span> Conectado — modo administrador activo en este navegador.';
    } else {
      el.className = 'estado-acceso off';
      el.innerHTML = '<span class="dot"></span> No conectado — sin acceso.';
    }
  }

  /* =========================================================
   *  Vista: Bloqueado (sin token = sin acceso)
   * ========================================================= */
  function vistaBloqueado() {
    let h = '';
    h += '<section class="bloqueo">';
    h += '<div class="bloqueo-icono"><span></span></div>';
    h += '<h1>Herramienta privada</h1>';
    h += '<p>Este panel de preparación para la transición es de uso exclusivo del administrador. ';
    h += 'Conecta tu token de GitHub para ver el dashboard y capturar evaluaciones.</p>';
    h += '<a class="btn primary" href="#/acceso">Conectar acceso</a>';
    h += '</section>';
    app.innerHTML = h;
  }

  /* =========================================================
   *  Router
   * ========================================================= */
  function router() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/eval\/(.+)$/);
    const p = h.match(/^#\/print\/(.+)$/);
    if (h === '#/acceso') {
      vistaAcceso();
    } else if (!Store.tieneToken()) {
      // Sin token no hay acceso a ninguna vista (herramienta privada del admin)
      vistaBloqueado();
    } else if (h === '#/nueva') {
      vistaForm(null);
    } else if (m) {
      vistaForm(m[1]);
    } else if (p) {
      vistaPrint(p[1]);
    } else {
      vistaDashboard();
    }
    pintarBanner();
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', router);
  pintarBanner();
  router();
})();
