(() => {
'use strict';

const KEY = 'pensador.v1';
const AREAS = ['Historia', 'Filosofía', 'Mundo', 'Ciencia', 'Mente', 'Otro'];
const MAX_VIVAS = 3;
const STATUS = { viva: 'Viva', cola: 'En cola', resuelta: 'Resuelta' };
const LEVELS = ['Sin puntuar', 'Casi nada', 'Lo básico', 'Defendible', 'Sólido', 'Podría enseñarlo'];
const VIEWS = { hoy: 'Hoy', preguntas: 'Preguntas', mapa: 'Mapa', revision: 'Revisión' };
const DAY = 864e5;

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const fmtDay = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const ago = t => {
  if (!t) return 'nunca';
  const d = Math.floor((Date.now() - t) / DAY);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
};

const mkQ = (text, area, status = 'cola', extra = {}) => ({
  id: uid(), text, area, status,
  hypothesis: '', refutation: '', prediction: '', missing: '', consult: false,
  evidence: [], created: Date.now(), updated: Date.now(), resolvedAt: 0, ...extra,
});
const mkNode = name => ({ id: uid(), name, level: 0, gap: '' });

function seed() {
  return {
    v: 1,
    questions: [
      mkQ('¿Por qué cae la República romana: instituciones débiles o ambiciones personales?', 'Historia', 'viva', { seed: true }),
      mkQ('¿Qué depende de mí de verdad y qué solo creo que depende de mí?', 'Filosofía', 'viva', { seed: true }),
      mkQ('¿Por qué las sociedades más ricas tienen menos hijos?', 'Mundo', 'viva', { seed: true }),
    ],
    map: ['Historia antigua', 'Historia moderna', 'Filosofía estoica', 'Filosofía política', 'Economía', 'Ciencia y método', 'Psicología y mente', 'Literatura'].map(mkNode),
    parked: [],
    meta: { cur: 0, lastExport: 0 },
  };
}

function valid(s) {
  return s && typeof s === 'object' && Array.isArray(s.questions) && Array.isArray(s.map);
}
function norm(s) {
  return {
    v: 1,
    questions: s.questions.map(x => ({ ...mkQ('', 'Otro'), ...x })),
    map: s.map.map(x => ({ ...mkNode(''), ...x })),
    parked: Array.isArray(s.parked) ? s.parked : [],
    meta: { cur: 0, lastExport: 0, ...(s.meta || {}) },
  };
}

let storageOk = true;
let state = load();
let view = 'hoy';
let filter = 'todas';
let mapSort = false;
let sheet = null;
let draft = '';
let lastArea = AREAS[0];
let saveT = 0;
let toastT = 0;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (valid(s)) return norm(s);
    }
  } catch (e) { storageOk = false; }
  const s = seed();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { storageOk = false; }
  return s;
}
function save() {
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; }
}
function saveSoon() {
  clearTimeout(saveT);
  saveT = setTimeout(save, 400);
}
function refresh() {
  save();
  render();
  renderSheet();
}
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2400);
}

const byId = id => state.questions.find(x => x.id === id);
const vivas = () => state.questions.filter(x => x.status === 'viva');
function curViva() {
  const v = vivas();
  if (!v.length) return null;
  const n = v.length;
  return v[((state.meta.cur % n) + n) % n];
}
const areaOpts = sel => AREAS.map(a => `<option${a === sel ? ' selected' : ''}>${a}</option>`).join('');

/* ---------- vistas ---------- */

function evidenceList(q, all) {
  const items = q.evidence.map((e, i) => ({ e, i }));
  const shown = all ? items.slice().reverse() : items.slice(-3).reverse();
  if (!shown.length) return '<p class="muted small">Aún sin evidencia.</p>';
  return shown.map(({ e, i }) => `
    <div class="ev"><time>${fmtDay(e.t)}</time><span>${esc(e.text)}</span>
    ${all ? `<button class="x" data-act="del-ev" data-qid="${q.id}" data-i="${i}" aria-label="Borrar evidencia">×</button>` : ''}</div>`).join('');
}
const evidenceAdd = q => `
  <div class="evadd row">
    <input class="grow" type="text" placeholder="Un dato, una fuente, un contraejemplo…" enterkeyhint="done">
    <button class="btn sm" data-act="add-ev" data-qid="${q.id}">Añadir</button>
  </div>`;
const field = (q, name, label, ph, rows = 2) => `
  <label>${label}</label>
  <textarea rows="${rows}" data-field="${name}" data-qid="${q.id}" placeholder="${ph}">${esc(q[name])}</textarea>`;

function hoyView() {
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const v = vivas();
  if (!v.length) {
    return `<p class="muted">${date}</p>
      <div class="card empty">
        <p class="big">No tienes ninguna pregunta viva.</p>
        <p class="muted">Elige hasta ${MAX_VIVAS}. Son las que tu cabeza visita cuando se queda sin tema.</p>
        <button class="btn" data-go="preguntas">Elegir preguntas</button>
      </div>`;
  }
  const q = curViva();
  const i = v.indexOf(q);
  return `<p class="muted">${date}</p>
    ${state.questions.some(x => x.seed) ? '<p class="note">Estas preguntas son de ejemplo. Edítalas o cámbialas por las tuyas en Preguntas.</p>' : ''}
    <section class="card">
      <div class="meta-row">
        <div class="dots">${v.map((_, k) => `<button class="dot${k === i ? ' on' : ''}" data-act="pick" data-i="${k}" aria-label="Pregunta ${k + 1}"></button>`).join('')}</div>
        <span class="tag">${esc(q.area)}</span>
      </div>
      <p class="big">${esc(q.text)}</p>
      ${field(q, 'hypothesis', 'Mi hipótesis', 'Una frase: lo que creo y por qué')}
      ${field(q, 'refutation', 'Qué la refutaría', 'Qué dato o hecho me haría cambiar de idea')}
      <label>Evidencia</label>
      ${evidenceList(q, false)}
      ${evidenceAdd(q)}
      <div class="row between">
        <button class="btn ghost sm" data-act="open" data-qid="${q.id}">Ficha completa</button>
        ${v.length > 1 ? '<button class="btn ghost sm" data-act="next">Otra pregunta</button>' : ''}
      </div>
    </section>`;
}

function preguntasView() {
  const qs = state.questions;
  const counts = {
    todas: qs.length,
    viva: qs.filter(x => x.status === 'viva').length,
    cola: qs.filter(x => x.status === 'cola').length,
    resuelta: qs.filter(x => x.status === 'resuelta').length,
    consultar: qs.filter(x => x.consult).length,
  };
  const names = { todas: 'Todas', viva: 'Vivas', cola: 'En cola', resuelta: 'Resueltas', consultar: 'Por consultar' };
  const order = { viva: 0, cola: 1, resuelta: 2 };
  const list = qs
    .filter(x => filter === 'todas' || (filter === 'consultar' ? x.consult : x.status === filter))
    .sort((a, b) => order[a.status] - order[b.status] || b.updated - a.updated);
  return `
    <section class="card">
      <textarea id="new-q" rows="2" placeholder="Escribe una pregunta abierta…">${esc(draft)}</textarea>
      <div class="row between">
        <select id="new-area" aria-label="Área">${areaOpts(lastArea)}</select>
        <button class="btn" data-act="add-q">Añadir</button>
      </div>
    </section>
    <div class="chips">${Object.keys(names).map(k => `<button class="chip${k === filter ? ' on' : ''}" data-act="filter" data-f="${k}">${names[k]} ${counts[k]}</button>`).join('')}</div>
    <div class="list">${list.length ? list.map(q => `
      <button class="item" data-act="open" data-qid="${q.id}">
        <div class="t">${esc(q.text)}</div>
        <div class="m"><span class="tag${q.status === 'viva' ? ' accent' : ''}">${STATUS[q.status]}</span><span class="tag">${esc(q.area)}</span>
        ${q.evidence.length ? `<span class="tag">${q.evidence.length} evid.</span>` : ''}${q.consult ? '<span class="tag">consultar</span>' : ''}</div>
      </button>`).join('') : '<p class="muted">Nada aquí todavía.</p>'}</div>`;
}

function mapaView() {
  const nodes = state.map.slice();
  if (mapSort) nodes.sort((a, b) => a.level - b.level);
  return `
    <p class="muted">Puntúa de 1 a 5 lo que sabes. El hueco que escribas puede pasar a ser una pregunta.</p>
    <div class="row between" style="margin:0 0 12px">
      <button class="btn ghost sm" data-act="sort-map">${mapSort ? 'Orden original' : 'Huecos primero'}</button>
    </div>
    ${nodes.map(n => `
      <div class="node">
        <input class="name" type="text" data-mfield="name" data-mid="${n.id}" value="${esc(n.name)}" aria-label="Nombre del área">
        <div class="lvl">${[1, 2, 3, 4, 5].map(l => `<button class="${l <= n.level ? 'on' : ''}" data-act="lvl" data-mid="${n.id}" data-l="${l}" aria-label="Nivel ${l}"></button>`).join('')}<span>${LEVELS[n.level]}</span></div>
        <textarea rows="2" data-mfield="gap" data-mid="${n.id}" placeholder="Hueco principal: lo que no sé y quisiera saber">${esc(n.gap)}</textarea>
        <div class="row between">
          <button class="btn sm" data-act="gap-q" data-mid="${n.id}">Hacer pregunta</button>
          <button class="btn danger sm" data-act="del-node" data-mid="${n.id}">Borrar</button>
        </div>
      </div>`).join('')}
    <div class="card">
      <div class="row" style="margin:0">
        <input class="grow" type="text" id="new-node" placeholder="Nueva área (p. ej. Historia de España)" enterkeyhint="done">
        <button class="btn" data-act="add-node">Añadir</button>
      </div>
    </div>`;
}

function revisionView() {
  const since = Date.now() - 7 * DAY;
  const ev = state.questions.reduce((n, q) => n + q.evidence.filter(e => e.t > since).length, 0);
  const done = state.questions.filter(q => q.resolvedAt > since).length;
  const parked = state.parked.filter(p => !p.done);
  const cons = state.questions.filter(q => q.consult);
  const stale = !state.meta.lastExport || Date.now() - state.meta.lastExport > 14 * DAY;
  return `
    <div class="stats">
      <div class="stat"><b>${ev}</b><span>evidencias en 7 días</span></div>
      <div class="stat"><b>${done}</b><span>resueltas</span></div>
      <div class="stat"><b>${parked.length}</b><span>aparcadas</span></div>
    </div>

    <h3>Por consultar</h3>
    ${cons.length ? cons.map(q => `
      <section class="card">
        <p class="big" style="font-size:1.15rem">${esc(q.text)}</p>
        ${q.missing ? `<p class="muted small">Me falta: ${esc(q.missing)}</p>` : ''}
        ${field(q, 'prediction', '1. Mi predicción (antes de mirar)', 'Qué creo que dirá la fuente o la IA')}
        <label>2. Qué dijo de verdad (¿acerté?)</label>
        <textarea rows="2" id="res-${q.id}" placeholder="Resultado de la consulta"></textarea>
        <div class="row end"><button class="btn sm" data-act="consult-done" data-qid="${q.id}">Registrar y cerrar</button></div>
      </section>`).join('') : '<p class="muted">Nada pendiente. Márcalo en la ficha de una pregunta cuando te falte una variable.</p>'}

    <h3>Aparcado (lo cotidiano)</h3>
    ${parked.length ? `<div class="card">${parked.map(p => `
      <div class="ev"><time>${fmtDay(p.t)}</time><span>${esc(p.text)}</span>
      <button class="x" data-act="unpark" data-pid="${p.id}" aria-label="Quitar">×</button></div>`).join('')}
      <p class="muted small" style="margin:10px 0 0">Si no importa a medio plazo, bórralo.</p></div>` : '<p class="muted">Vacío.</p>'}

    <h3>Reglas</h3>
    <div class="card"><ol class="rules">
      <li>Si caigo en lo trivial: pulso «Estoy en ruido», lo aparco y vuelvo a la pregunta.</li>
      <li>Máximo ${MAX_VIVAS} preguntas vivas.</li>
      <li>Antes de consultar una IA, escribo mi predicción.</li>
    </ol></div>

    <h3>Copia de seguridad</h3>
    <div class="card">
      ${stale ? `<p class="note">Última copia: ${ago(state.meta.lastExport)}. Haz una.</p>` : `<p class="muted small">Última copia: ${ago(state.meta.lastExport)}.</p>`}
      <div class="row">
        <button class="btn" data-act="export">Exportar</button>
        <button class="btn ghost" data-act="import">Importar</button>
      </div>
    </div>`;
}

function render() {
  const body = { hoy: hoyView, preguntas: preguntasView, mapa: mapaView, revision: revisionView }[view]();
  $('#app').innerHTML = `
    ${storageOk ? '' : '<p class="warn">No puedo guardar en este navegador. Exporta tus datos en Revisión.</p>'}
    <header class="top"><h1>${VIEWS[view]}</h1><button class="pill" data-act="ruido">Estoy en ruido</button></header>
    <main>${body}</main>
    <nav class="tabs">${Object.keys(VIEWS).map(k => `<button class="${k === view ? 'on' : ''}" data-go="${k}">${VIEWS[k]}</button>`).join('')}</nav>`;
}

/* ---------- hoja (ficha y ruido) ---------- */

function sheetBody() {
  if (sheet.type === 'ruido') {
    const q = curViva();
    if (!q) {
      return `<h2>Estoy en ruido</h2>
        <p class="muted">No tienes preguntas vivas a las que volver.</p>
        <button class="btn" data-go="preguntas" data-act="close-sheet">Elegir preguntas</button>`;
    }
    return `<h2>Vuelve a esto</h2>
      <p class="big">${esc(q.text)}</p>
      ${field(q, 'hypothesis', 'Mi hipótesis ahora mismo', 'Una frase, aunque sea mala', 3)}
      <div class="parkbox">
        <label>¿Qué te ronda? Se queda aparcado, no se pierde.</label>
        <input type="text" id="park-input" placeholder="p. ej. qué le digo a…" enterkeyhint="done">
        <div class="row between">
          <button class="btn" data-act="park-return">Aparcar y volver</button>
          ${vivas().length > 1 ? '<button class="btn ghost" data-act="next">Otra pregunta</button>' : ''}
        </div>
      </div>`;
  }
  const q = byId(sheet.id);
  if (!q) return '<p class="muted">Pregunta no encontrada.</p>';
  return `<h2>Ficha</h2>
    <textarea rows="3" data-field="text" data-qid="${q.id}" aria-label="Pregunta" style="font:400 1.15rem/1.35 var(--serif)">${esc(q.text)}</textarea>
    <div class="row">
      <select data-field="area" data-qid="${q.id}" aria-label="Área">${areaOpts(q.area)}</select>
      ${Object.keys(STATUS).map(s => `<button class="chip${q.status === s ? ' on' : ''}" data-act="status" data-qid="${q.id}" data-s="${s}">${STATUS[s]}</button>`).join('')}
    </div>
    ${field(q, 'hypothesis', 'Mi hipótesis', 'Una frase: lo que creo y por qué')}
    ${field(q, 'refutation', 'Qué la refutaría', 'Qué dato o hecho me haría cambiar de idea')}
    ${field(q, 'prediction', 'Qué creo que dirá la IA o la fuente', 'Predicción antes de consultar')}
    ${field(q, 'missing', 'Variable que me falta', 'Lo que no sé y bloquea mi razonamiento')}
    <label style="display:flex;gap:10px;align-items:center;color:var(--text)">
      <input type="checkbox" data-field="consult" data-qid="${q.id}"${q.consult ? ' checked' : ''} style="width:22px;height:22px">
      Consultar en la revisión
    </label>
    <label>Evidencia</label>
    ${evidenceList(q, true)}
    ${evidenceAdd(q)}
    <div class="row between" style="margin-top:20px">
      <button class="btn danger sm" data-act="del-q" data-qid="${q.id}">Borrar pregunta</button>
      <button class="btn" data-act="close-sheet">Listo</button>
    </div>`;
}

function renderSheet() {
  const root = $('#sheet');
  if (!sheet) {
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('lock');
    return;
  }
  const prev = $('.panel', root);
  const top = prev ? prev.scrollTop : 0;
  root.innerHTML = `<div class="backdrop" data-act="close-sheet"></div>
    <section class="panel" role="dialog" aria-modal="true">
      <button class="x close" data-act="close-sheet" aria-label="Cerrar">×</button>
      ${sheetBody()}
    </section>`;
  root.hidden = false;
  document.body.classList.add('lock');
  if (prev) $('.panel', root).scrollTop = top;
}
function openSheet(s) { sheet = s; renderSheet(); }
function closeSheet() {
  save();
  sheet = null;
  renderSheet();
  render();
}

/* ---------- acciones ---------- */

function go(v) {
  if (!VIEWS[v]) return;
  view = v;
  try { history.replaceState(null, '', '#' + v); } catch (e) { /* ignorar */ }
  render();
  window.scrollTo(0, 0);
}

function setStatus(q, s) {
  if (s === 'viva' && q.status !== 'viva' && vivas().length >= MAX_VIVAS) {
    return toast(`Ya tienes ${MAX_VIVAS} vivas. Pasa una a cola primero.`);
  }
  q.status = s;
  q.resolvedAt = s === 'resuelta' ? Date.now() : 0;
  q.updated = Date.now();
  refresh();
}

function addQuestion() {
  const text = draft.trim();
  if (!text) return toast('Escribe la pregunta primero.');
  const area = $('#new-area').value;
  lastArea = area;
  const live = vivas().length < MAX_VIVAS;
  state.questions.push(mkQ(text, area, live ? 'viva' : 'cola'));
  draft = '';
  save();
  render();
  toast(live ? 'Añadida como viva.' : 'Añadida a la cola (ya tienes 3 vivas).');
}

function act(name, d, el) {
  switch (name) {
    case 'ruido': return openSheet({ type: 'ruido' });
    case 'close-sheet': return closeSheet();
    case 'pick': state.meta.cur = +d.i; return refresh();
    case 'next': state.meta.cur = (state.meta.cur || 0) + 1; return refresh();
    case 'open': return openSheet({ type: 'q', id: d.qid });
    case 'filter': filter = d.f; return render();
    case 'add-q': return addQuestion();
    case 'status': { const q = byId(d.qid); return q && setStatus(q, d.s); }
    case 'del-q': {
      const q = byId(d.qid);
      if (!q || !confirm('¿Borrar esta pregunta y su evidencia?')) return;
      state.questions = state.questions.filter(x => x !== q);
      sheet = null;
      save();
      renderSheet();
      return render();
    }
    case 'add-ev': {
      const q = byId(d.qid);
      const inp = el.closest('.evadd').querySelector('input');
      const text = inp.value.trim();
      if (!q || !text) return;
      q.evidence.push({ t: Date.now(), text });
      q.updated = Date.now();
      return refresh();
    }
    case 'del-ev': {
      const q = byId(d.qid);
      if (q) q.evidence.splice(+d.i, 1);
      return refresh();
    }
    case 'park-return': {
      const inp = $('#park-input');
      const text = inp ? inp.value.trim() : '';
      if (text) state.parked.push({ id: uid(), text, t: Date.now(), done: false });
      toast(text ? 'Aparcado. Ahora, a lo importante.' : 'De vuelta a la pregunta.');
      view = 'hoy';
      sheet = null;
      save();
      renderSheet();
      render();
      return window.scrollTo(0, 0);
    }
    case 'unpark':
      state.parked = state.parked.filter(p => p.id !== d.pid);
      return refresh();
    case 'consult-done': {
      const q = byId(d.qid);
      const res = $(`#res-${d.qid}`).value.trim();
      if (!q) return;
      if (!res) return toast('Escribe qué dijo la fuente.');
      const pred = q.prediction.trim();
      q.evidence.push({ t: Date.now(), text: `Consulta. ${pred ? `Mi predicción: ${pred} → ` : ''}Resultado: ${res}` });
      q.consult = false;
      q.prediction = '';
      q.updated = Date.now();
      refresh();
      return toast('Registrado como evidencia.');
    }
    case 'lvl': {
      const n = state.map.find(x => x.id === d.mid);
      if (!n) return;
      n.level = n.level === +d.l ? 0 : +d.l;
      return refresh();
    }
    case 'gap-q': {
      const n = state.map.find(x => x.id === d.mid);
      const text = n && n.gap.trim();
      if (!text) return toast('Escribe primero el hueco.');
      const area = AREAS.find(a => n.name.toLowerCase().startsWith(a.toLowerCase().slice(0, 4))) || 'Otro';
      state.questions.push(mkQ(text, area, 'cola'));
      save();
      return toast('Añadida a la cola de Preguntas.');
    }
    case 'del-node': {
      const n = state.map.find(x => x.id === d.mid);
      if (!n || !confirm(`¿Borrar «${n.name}»?`)) return;
      state.map = state.map.filter(x => x !== n);
      return refresh();
    }
    case 'add-node': {
      const inp = $('#new-node');
      const name = inp.value.trim();
      if (!name) return;
      state.map.push(mkNode(name));
      return refresh();
    }
    case 'sort-map': mapSort = !mapSort; return render();
    case 'export': return exportData();
    case 'import': return $('#imp').click();
  }
}

async function exportData() {
  const json = JSON.stringify(state, null, 2);
  const name = `pensador-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Pensador' });
      return markExport();
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  markExport();
}
function markExport() {
  state.meta.lastExport = Date.now();
  refresh();
  toast('Copia exportada.');
}

$('#imp').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (!valid(s)) throw new Error('formato');
    if (!confirm('Esto reemplaza todo lo que hay ahora en la app. ¿Seguir?')) return;
    state = norm(s);
    refresh();
    toast('Copia importada.');
  } catch (err) {
    toast('Ese archivo no es una copia de Pensador.');
  }
});

/* ---------- eventos ---------- */

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-go]');
  if (!el) return;
  if (el.dataset.act) act(el.dataset.act, el.dataset, el);
  if (el.dataset.go) go(el.dataset.go);
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'new-q') { draft = t.value; return; }
  if (t.dataset.field) {
    const q = byId(t.dataset.qid);
    if (!q) return;
    q[t.dataset.field] = t.type === 'checkbox' ? t.checked : t.value;
    q.updated = Date.now();
    if (t.dataset.field === 'text') delete q.seed;
    saveSoon();
  } else if (t.dataset.mfield) {
    const n = state.map.find(x => x.id === t.dataset.mid);
    if (n) { n[t.dataset.mfield] = t.value; saveSoon(); }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheet) return closeSheet();
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type !== 'text') return;
  const box = e.target.closest('.evadd, .parkbox, .card');
  const btn = box && box.querySelector('[data-act="add-ev"], [data-act="park-return"], [data-act="add-node"]');
  if (btn) { e.preventDefault(); btn.click(); }
});

addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

/* ---------- arranque ---------- */

const h = location.hash.slice(1);
if (VIEWS[h]) view = h;
render();
if (new URLSearchParams(location.search).has('ruido')) openSheet({ type: 'ruido' });

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
