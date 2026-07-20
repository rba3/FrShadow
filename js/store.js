/*
 * store.js — Capa de datos sobre un JSON en el propio repo (GitHub).
 *
 * Lectura: cualquiera puede leer data/evaluaciones.json (repo público).
 * Escritura: requiere un token personal de GitHub con permiso de escritura
 * en este repo. El token vive solo en el navegador (localStorage), nunca en
 * el repo. Cada guardado hace un commit real vía la API de GitHub.
 *
 * Expone un objeto global `Store` con promesas:
 *   Store.modo             -> 'editor' | 'lectura'
 *   Store.tieneToken()     -> bool
 *   Store.getToken()/setToken(t)/clearToken()
 *   Store.listar()         -> Promise<Array>
 *   Store.obtener(id)      -> Promise<obj|null>
 *   Store.guardar(obj)     -> Promise<obj>   (requiere token)
 *   Store.eliminar(id)     -> Promise<void>  (requiere token)
 */

const Store = (function () {
  const TOKEN_KEY = 'sr_github_token';
  const gh = CONFIG.GITHUB;
  const API = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo + '/contents/' + gh.path;

  /* -------------------- token -------------------- */
  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, (t || '').trim()); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }
  function tieneToken() { return !!getToken(); }

  /* -------------------- utilidades -------------------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function ahora() { return new Date().toISOString(); }

  // base64 <-> UTF-8 (soporta acentos)
  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(b64) { return decodeURIComponent(escape(atob((b64 || '').replace(/\s/g, '')))); }

  function headers(conToken) {
    const h = { 'Accept': 'application/vnd.github+json' };
    if (conToken && getToken()) h['Authorization'] = 'Bearer ' + getToken();
    return h;
  }

  /* -------------------- lectura cruda (items + sha) -------------------- */
  function leerCrudo() {
    const url = API + '?ref=' + encodeURIComponent(gh.branch) + '&_=' + Date.now();
    return fetch(url, { headers: headers(true), cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return { items: [], sha: null }; // el archivo aún no existe
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (b) {
        throw new Error(mensajeError(r.status, b));
      });
      return r.json().then(function (data) {
        let items = [];
        try { items = JSON.parse(b64decode(data.content)) || []; } catch (e) { items = []; }
        if (!Array.isArray(items)) items = [];
        return { items: items, sha: data.sha };
      });
    });
  }

  function mensajeError(status, body) {
    const msg = body && body.message ? body.message : '';
    if (status === 401) return 'Token inválido o expirado. Vuelve a configurar tu acceso.';
    if (status === 403) return 'Permiso insuficiente o límite de peticiones alcanzado. ' + msg;
    if (status === 409) return 'Conflicto de versión.';
    if (status === 422) return 'El token no tiene permiso de escritura en este repo. ' + msg;
    return 'Error ' + status + (msg ? ': ' + msg : '');
  }

  /* -------------------- escritura (commit) -------------------- */
  function escribir(items, sha, mensajeCommit) {
    const payload = {
      message: mensajeCommit,
      content: b64encode(JSON.stringify(items, null, 2) + '\n'),
      branch: gh.branch
    };
    if (sha) payload.sha = sha;
    return fetch(API, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers(true)),
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (b) {
        const err = new Error(mensajeError(r.status, b));
        err.status = r.status;
        throw err;
      });
      return r.json();
    });
  }

  // Aplica un cambio (fn muta el array) con reintento ante conflicto 409.
  function commitCambio(fn, mensajeCommit, intento) {
    intento = intento || 0;
    return leerCrudo().then(function (estado) {
      const items = estado.items.slice();
      fn(items);
      return escribir(items, estado.sha, mensajeCommit).catch(function (err) {
        if (err.status === 409 && intento < 2) {
          return commitCambio(fn, mensajeCommit, intento + 1); // otra persona escribió; reintenta
        }
        throw err;
      });
    });
  }

  /* -------------------- API pública -------------------- */
  function listar() {
    return leerCrudo().then(function (e) {
      return e.items.sort(function (a, b) {
        return (b.updated_at || '').localeCompare(a.updated_at || '');
      });
    });
  }

  function obtener(id) {
    return leerCrudo().then(function (e) {
      return e.items.find(function (x) { return x.id === id; }) || null;
    });
  }

  function guardar(obj) {
    if (!tieneToken()) return Promise.reject(new Error('Necesitas configurar tu token de GitHub para guardar.'));
    if (!obj.id) { obj.id = uuid(); obj.created_at = ahora(); }
    obj.updated_at = ahora();
    const msg = 'Evaluación: ' + (obj.persona || 'sin nombre') + ' (TRI ' + (obj.tri != null ? obj.tri : '—') + ')';
    return commitCambio(function (items) {
      const i = items.findIndex(function (x) { return x.id === obj.id; });
      if (i >= 0) items[i] = obj; else items.push(obj);
    }, msg).then(function () { return obj; });
  }

  function eliminar(id) {
    if (!tieneToken()) return Promise.reject(new Error('Necesitas configurar tu token de GitHub para borrar.'));
    let nombre = '';
    return commitCambio(function (items) {
      const it = items.find(function (x) { return x.id === id; });
      nombre = it ? (it.persona || '') : '';
      const i = items.findIndex(function (x) { return x.id === id; });
      if (i >= 0) items.splice(i, 1);
    }, 'Borra evaluación' + (nombre ? ': ' + nombre : ''));
  }

  // Valida el token contra la API (devuelve el login del usuario)
  function validarToken(t) {
    return fetch('https://api.github.com/user', {
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + (t || '').trim() }
    }).then(function (r) {
      if (!r.ok) throw new Error('Token inválido (' + r.status + ').');
      return r.json().then(function (u) { return u.login; });
    });
  }

  return {
    get modo() { return tieneToken() ? 'editor' : 'lectura'; },
    tieneToken: tieneToken,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    validarToken: validarToken,
    listar: listar,
    obtener: obtener,
    guardar: guardar,
    eliminar: eliminar
  };
})();
