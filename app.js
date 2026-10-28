(() => {
'use strict';

const KEY = 'pensador.v1';
const MAX_VIVAS = 3;
const DAY = 864e5;
const PALS = ['ember', 'ocean', 'violet', 'forest', 'gold', 'rose'];
const LEVELS = ['Sin puntuar', 'Casi nada', 'Lo básico', 'Defendible', 'Sólido', 'Podría enseñarlo'];
const TABS = { pensar: 'Pensar', preguntas: 'Preguntas', mapa: 'Mapa' };
const STEPS = [
  { key: 'hypothesis', n: 1, name: 'Hipótesis', title: 'Tu hipótesis', help: 'Una frase. Aunque sea mala.', ph: 'Creo que…' },
  { key: 'refutation', n: 2, name: 'Refutación', title: 'Qué la refutaría', help: '¿Qué dato te haría cambiar de idea?', ph: 'Cambiaría de opinión si…' },
];

const svg = d => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const IC = {
  pensar: svg('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5v3.2M16.9 18.1h3.2"/>'),
  preguntas: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.5 2.1c-.8.4-1.2 1-1.2 1.8"/><path d="M12 16.8v.2"/>'),
  mapa: svg('<path d="M12 3.5l8 5.8-3 9.4H7l-3-9.4z"/><path d="M12 3.5v8.7M12 12.2L4 9.3M12 12.2l8-2.9M12 12.2l-5 6.5M12 12.2l5 6.5"/>'),
  wave: svg('<path d="M4 11.5v1M8 8.5v7M12 5v14M16 8.5v7M20 11.5v1"/>'),
};

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const fmtDay = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const short = t => (t.length > 42 ? t.slice(0, 41) + '…' : t);
const ago = t => {
  if (!t) return 'nunca';
  const d = Math.floor((Date.now() - t) / DAY);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
};

const mkQ = (text, status = 'cola', pal = 'violet', extra = {}) => ({
  id: uid(), text, status, pal,
  hypothesis: '', refutation: '', evidence: [],
  missing: '', prediction: '', consult: false, conclusion: '',
  created: Date.now(), updated: Date.now(), touched: 0, closedAt: 0, ...extra,
});
const mkNode = name => ({ id: uid(), name, level: 0, gap: '' });

function seed() {
  return {
    v: 2,
    questions: [
      mkQ('¿Por qué cae la República romana: instituciones débiles o ambiciones personales?', 'viva', 'ember', { seed: true }),
      mkQ('¿Qué depende de mí de verdad y qué solo creo que depende de mí?', 'viva', 'ocean', { seed: true }),
      mkQ('¿Por qué las sociedades más ricas tienen menos hijos?', 'viva', 'violet', { seed: true }),
    ],
    map: ['Historia antigua', 'Historia moderna', 'Filosofía estoica', 'Filosofía política', 'Economía', 'Ciencia y método', 'Psicología', 'Literatura'].map(mkNode),
    parked: [],
    meta: { cur: null, lastExport: 0 },
  };
}

function valid(s) {
  return s && typeof s === 'object' && Array.isArray(s.questions) && Array.isArray(s.map);
}
function norm(s) {
  return {
    v: 2,
    questions: s.questions.map(x => {
      const q = { ...mkQ('', 'cola'), ...x };
      if (q.status === 'resuelta') q.status = 'cerrada';
      if (!PALS.includes(q.pal)) q.pal = 'violet';
      if (!Array.isArray(q.evidence)) q.evidence = [];
      return q;
    }),
    map: s.map.map(x => ({ ...mkNode(''), ...x })),
    parked: Array.isArray(s.parked) ? s.parked : [],
    meta: { cur: null, lastExport: 0, ...(s.meta || {}) },
  };
}

let storageOk = true;
let state = load();
let view = 'pensar';
let sheet = null;
let editing = null;
let draft = '';
const folds = new Set();
const gapOpen = new Set();
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
function refresh(animate) {
  save();
  render(animate);
  renderSheet();
}
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

const byId = id => state.questions.find(x => x.id === id);
const vivas = () => state.questions.filter(x => x.status === 'viva');
const stageOf = q => (!q.hypothesis.trim() ? 'hypothesis' : !q.refutation.trim() ? 'refutation' : 'evidence');
const progress = q => (q.hypothesis.trim() ? 1 : 0) + (q.refutation.trim() ? 1 : 0) + (q.evidence.length ? 1 : 0);

// La pregunta que más tiempo lleva sin visitarse. Sin decidir nada.
function pickCurrent(skip) {
  const v = vivas();
  if (!v.length) { state.meta.cur = null; return null; }
  const pool = v.length > 1 ? v.filter(q => q.id !== skip) : v;
  pool.sort((a, b) => (a.touched || 0) - (b.touched || 0));
  const q = pool[0];
  q.touched = Date.now();
  state.meta.cur = q.id;
  return q;
}
function current() {
  const q = byId(state.meta.cur);
  if (q && q.status === 'viva') return q;
  const n = pickCurrent();
  saveSoon();
  return n;
}

/* ---------- vistas ---------- */

function fit(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 2 + 'px';
}
const fitAll = root => (root || document).querySelectorAll('textarea.auto').forEach(fit);

const field = (q, key, ph, extra = '') =>
  `<textarea class="auto ${extra}" rows="2" data-f="${key}" data-qid="${q.id}" placeholder="${ph}">${esc(q[key])}</textarea>`;

const stepCard = (q, s, editMode) => `
  <section class="glass step">
    <div class="step-h"><b>${s.n}</b><span>${s.title}</span></div>
    <p class="help">${s.help}</p>
    ${field(q, s.key, s.ph)}
    ${editMode
      ? '<button class="btn primary wide" data-act="done-edit">Listo</button>'
      : `<button class="btn primary wide" data-act="next-step" data-gate${q[s.key].trim() ? '' : ' disabled'}>Seguir</button>`}
  </section>`;

const quoteBtn = (q, s) => `
  <button class="quote" data-act="edit-step" data-step="${s.key}">
    <small>${s.name}</small><span>${esc(q[s.key])}</span>
  </button>`;

function evidenceCard(q) {
  const n = q.evidence.length;
  const last = q.evidence.slice(-3).reverse();
  return `
  <section class="glass step">
    <div class="step-h"><b>3</b><span>Evidencia</span>${q.consult ? '<em class="tag">por consultar</em>' : ''}</div>
    <p class="help">Un dato, una fuente o un contraejemplo.</p>
    ${last.map(e => `<div class="ev"><time>${fmtDay(e.t)}</time><span>${esc(e.text)}</span></div>`).join('')}
    ${n > 3 ? `<button class="link" data-act="open" data-qid="${q.id}">Ver las ${n}</button>` : ''}
    <div class="evadd">
      <input type="text" placeholder="Añadir un dato…" enterkeyhint="done" aria-label="Nueva evidencia">
      <button class="btn primary icon" data-act="add-ev" data-qid="${q.id}" aria-label="Añadir">+</button>
    </div>
  </section>
  <div class="actions">
    <button class="btn ghost sm" data-act="falta" data-qid="${q.id}">Me falta un dato</button>
    <button class="btn ghost sm" data-act="cerrar" data-qid="${q.id}">Cerrar pregunta</button>
  </div>`;
}

function pensarView(q) {
  if (!q) {
    return `
      <p class="eyebrow">Para empezar</p>
      <h2 class="hero">¿Qué te gustaría entender de verdad?</h2>
      <section class="glass step">
        <textarea class="auto" id="first-q" rows="2" placeholder="Escribe una pregunta abierta…">${esc(draft)}</textarea>
        <button class="btn primary wide" data-act="add-q">Empezar a pensar</button>
      </section>`;
  }
  const v = vivas();
  const stage = stageOf(q);
  const idx = { hypothesis: 0, refutation: 1, evidence: 2 }[stage];
  const rail = ['Hipótesis', 'Refutación', 'Evidencia']
    .map((n, k) => `<li class="${k < idx ? 'done' : k === idx ? 'now' : ''}"><i></i>${n}</li>`).join('');
  const quotes = STEPS.slice(0, idx)
    .map(s => (editing === s.key ? stepCard(q, s, true) : quoteBtn(q, s))).join('');
  const now = stage === 'evidence' ? evidenceCard(q) : stepCard(q, STEPS[idx], false);
  return `
    <div class="top-eyebrow">
      <span class="eyebrow">Pregunta ${v.indexOf(q) + 1} de ${v.length}</span>
      <div class="dots">${v.map(x => `<button class="dot${x === q ? ' on' : ''}" data-act="pick" data-qid="${x.id}" aria-label="Ir a la pregunta"></button>`).join('')}</div>
    </div>
    <h2 class="hero">${esc(q.text)}</h2>
    ${q.seed ? '<p class="tip">Pregunta de ejemplo. Cámbiala por la tuya en Preguntas.</p>' : ''}
    <ol class="rail">${rail}</ol>
    ${quotes}
    ${now}
    ${v.length > 1 ? '<div class="center"><button class="link" data-act="next">Otra pregunta</button></div>' : ''}`;
}

const qCard = q => `
  <button class="qcard" data-act="open" data-qid="${q.id}" data-pal="${q.pal}">
    <i class="swatch"></i>
    <div>
      <div class="t">${esc(q.text)}</div>
      <div class="m">
        <span class="pips">${[0, 1, 2].map(k => `<i class="${k < progress(q) ? 'on' : ''}"></i>`).join('')}</span>
        ${q.evidence.length ? `<span>${q.evidence.length} evid.</span>` : ''}
        ${q.consult ? '<span>por consultar</span>' : ''}
        ${q.seed ? '<span>ejemplo</span>' : ''}
      </div>
    </div>
  </button>`;

const fold = (id, title, count, inner) => `
  <details class="fold" data-fold="${id}"${folds.has(id) ? ' open' : ''}>
    <summary><div>${title}<span>${count}</span></div></summary>
    ${inner}
  </details>`;

function preguntasView() {
  const qs = state.questions;
  const vi = qs.filter(q => q.status === 'viva');
  const co = qs.filter(q => q.status === 'cola');
  const ce = qs.filter(q => q.status === 'cerrada').sort((a, b) => b.closedAt - a.closedAt);
  const consult = qs.filter(q => q.consult && q.status !== 'cerrada');
  const parked = state.parked;
  const stale = !state.meta.lastExport || Date.now() - state.meta.lastExport > 14 * DAY;
  return `
    <h1 class="title">Preguntas</h1>
    <div class="glass addbar">
      <input type="text" id="new-q" placeholder="Nueva pregunta…" value="${esc(draft)}" enterkeyhint="done" aria-label="Nueva pregunta">
      <button class="btn primary icon" data-act="add-q" aria-label="Añadir">+</button>
    </div>

    <div class="sec"><h2>Vivas</h2><span>${vi.length} de ${MAX_VIVAS}</span></div>
    <div class="qlist">${vi.length ? vi.map(qCard).join('') : '<p class="empty">Ninguna. Añade una arriba.</p>'}</div>

    ${consult.length ? `
      <div class="sec"><h2>Por consultar</h2><span>${consult.length}</span></div>
      ${consult.map(q => `
        <section class="glass consult">
          <p class="qt">${esc(q.text)}</p>
          <p class="miss">Me falta: ${esc(q.missing)}</p>
          <label>Tu predicción, antes de mirar</label>
          ${field(q, 'prediction', 'Qué creo que dirá')}
          <label>Qué dijo de verdad</label>
          <textarea class="auto" rows="2" id="res-${q.id}" placeholder="Resultado de la consulta"></textarea>
          <button class="btn primary wide" data-act="consult-done" data-qid="${q.id}">Guardar como evidencia</button>
        </section>`).join('')}` : ''}

    ${co.length ? `<div class="sec"><h2>En cola</h2><span>${co.length}</span></div><div class="qlist">${co.map(qCard).join('')}</div>` : ''}

    ${ce.length ? fold('cerradas', 'Cerradas', ce.length, `<div class="qlist">${ce.map(qCard).join('')}</div>`) : ''}

    ${fold('parked', 'Aparcado', parked.length, parked.length
      ? `<div class="glass">${parked.map(p => `<div class="ev"><time>${fmtDay(p.t)}</time><span>${esc(p.text)}</span><button class="x" data-act="unpark" data-pid="${p.id}" aria-label="Quitar">×</button></div>`).join('')}<p class="tip" style="margin:10px 0 0">Si no importa a medio plazo, bórralo.</p></div>`
      : '<p class="empty">Nada aparcado.</p>')}

    ${fold('backup', 'Copia de seguridad', stale ? '!' : ago(state.meta.lastExport), `
      <div class="glass">
        <p class="help">Tus datos viven solo en este móvil. Guarda una copia de vez en cuando.</p>
        <div class="row"><button class="btn primary sm" data-act="export">Exportar</button><button class="btn ghost sm" data-act="import">Importar</button></div>
      </div>`)}`;
}

function radar() {
  const m = state.map;
  const n = m.length;
  if (n < 3) return '';
  const cx = 180, cy = 142, R = 84;
  const ang = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const f = a => a.map(v => v.toFixed(1)).join(',');
  const poly = r => m.map((_, i) => f(pt(i, r))).join(' ');
  const rings = [1, 2, 3, 4, 5].map(l => `<polygon class="ring" points="${poly((R * l) / 5)}"/>`).join('');
  const axes = m.map((_, i) => { const [x, y] = pt(i, R); return `<line class="axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const shape = m.map((a, i) => f(pt(i, (R * a.level) / 5))).join(' ');
  const dots = m.map((a, i) => { if (!a.level) return ''; const [x, y] = pt(i, (R * a.level) / 5); return `<circle class="vtx" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"/>`; }).join('');
  const lines = name => {
    const t = name.trim();
    if (t.length <= 12) return [t];
    const mid = t.length / 2;
    const cut = [...t.matchAll(/ /g)].map(x => x.index).sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid))[0];
    const parts = cut === undefined ? [t] : [t.slice(0, cut), t.slice(cut + 1)];
    return parts.map(p => (p.length > 13 ? p.slice(0, 12) + '…' : p));
  };
  const labels = m.map((a, i) => {
    const [x, y] = pt(i, R + 14);
    const c = Math.cos(ang(i)), s = Math.sin(ang(i));
    const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
    const ls = lines(a.name);
    const first = s > 0.3 ? 10 : s < -0.3 ? -3 - (ls.length - 1) * 11.5 : 4 - (ls.length - 1) * 5.75;
    const spans = ls.map((l, k) => `<tspan x="${x.toFixed(1)}" dy="${k ? 11.5 : first}">${esc(l)}</tspan>`).join('');
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${spans}</text>`;
  }).join('');
  return `<svg viewBox="0 0 360 284" role="img" aria-label="Mapa de lo que sabes">${rings}${axes}<polygon class="shape" points="${shape}"/>${dots}${labels}</svg>`;
}

function mapaView() {
  const rated = state.map.filter(n => n.level).length;
  return `
    <h1 class="title">Mapa</h1>
    <p class="lead">${rated ? 'Lo que sabes, de un vistazo. Los huecos se convierten en preguntas.' : 'Puntúa cada área de 1 a 5 y verás tu mapa. Sé honesto.'}</p>
    <div class="glass radar">${radar()}</div>
    ${state.map.map(n => `
      <div class="glass node">
        <div class="node-h">
          <input class="nname" type="text" data-mf="name" data-mid="${n.id}" value="${esc(n.name)}" aria-label="Nombre del área">
          <button class="x" data-act="del-node" data-mid="${n.id}" aria-label="Borrar área">×</button>
        </div>
        <div class="segs">${[1, 2, 3, 4, 5].map(l => `<button class="seg${l <= n.level ? ' on' : ''}" data-act="lvl" data-mid="${n.id}" data-l="${l}" aria-label="Nivel ${l}"></button>`).join('')}</div>
        <p class="lvl-name">${LEVELS[n.level]}</p>
        ${gapOpen.has(n.id) || n.gap.trim()
          ? `<textarea class="auto" rows="2" data-mf="gap" data-mid="${n.id}" placeholder="Lo que no sé y quisiera saber">${esc(n.gap)}</textarea>
             <button class="btn ghost sm" data-act="gap-q" data-mid="${n.id}">Convertir en pregunta</button>`
          : `<button class="link" data-act="gap-open" data-mid="${n.id}">+ Hueco</button>`}
      </div>`).join('')}
    <div class="glass addbar">
      <input type="text" id="new-node" placeholder="Nueva área…" enterkeyhint="done" aria-label="Nueva área">
      <button class="btn primary icon" data-act="add-node" aria-label="Añadir">+</button>
    </div>`;
}

function render(animate) {
  const q = current();
  document.body.dataset.pal = q ? q.pal : 'violet';
  const body = { pensar: () => pensarView(q), preguntas: preguntasView, mapa: mapaView }[view]();
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  $('#app').innerHTML = `
    ${storageOk ? '' : '<p class="warn">No puedo guardar en este navegador. Exporta una copia en Preguntas.</p>'}
    <header class="bar"><span class="date">${date}</span><button class="pill" data-act="ruido">${IC.wave}<span>Ruido</span></button></header>
    <main class="view${animate ? ' enter' : ''}">${body}</main>
    <nav class="tabs" aria-label="Secciones">${Object.keys(TABS).map(k => `<button class="${k === view ? 'on' : ''}" data-go="${k}">${IC[k]}<span>${TABS[k]}</span></button>`).join('')}</nav>`;
  fitAll($('#app'));
}

/* ---------- hojas ---------- */

function sheetBody() {
  const q = sheet.id ? byId(sheet.id) : current();
  if (sheet.type === 'ruido') {
    if (!q) {
      return `<p class="eyebrow">Ruido</p><h2 class="hero sm">Aún no tienes preguntas a las que volver.</h2>
        <button class="btn primary wide" data-go="preguntas" data-act="close-sheet">Crear una</button>`;
    }
    return `<p class="eyebrow">Vuelve a esto</p>
      <h2 class="hero sm">${esc(q.text)}</h2>
      <div class="parkbox">
        <label>¿Qué te ronda? Queda aparcado, no se pierde.</label>
        <input type="text" id="park-input" placeholder="p. ej. qué le digo a…" enterkeyhint="done">
        <button class="btn primary wide" style="margin-top:14px" data-act="park-return">Aparcar y pensar</button>
      </div>
      <div class="center"><button class="link" data-act="close-sheet">Solo volver</button></div>`;
  }
  if (!q) return '<p class="empty">Pregunta no encontrada.</p>';
  if (sheet.type === 'falta') {
    return `<p class="eyebrow">Me falta un dato</p>
      <h2 class="hero sm">${esc(q.text)}</h2>
      <label>¿Qué dato te falta?</label>
      ${field(q, 'missing', 'Lo que no sé y bloquea mi razonamiento', 'sheet-serif')}
      <label>¿Qué crees que dirá la fuente o la IA?</label>
      ${field(q, 'prediction', 'Mi predicción antes de mirar', 'sheet-serif')}
      <button class="btn primary wide" style="margin-top:18px" data-act="falta-save" data-qid="${q.id}">Guardar para consultar</button>`;
  }
  if (sheet.type === 'cerrar') {
    return `<p class="eyebrow">Cerrar pregunta</p>
      <h2 class="hero sm">${esc(q.text)}</h2>
      <label>Tu conclusión, en una frase</label>
      ${field(q, 'conclusion', 'Lo que pienso ahora…', 'sheet-serif')}
      <button class="btn primary wide" style="margin-top:18px" data-act="close-q" data-qid="${q.id}">Cerrar</button>`;
  }
  const ro = (label, t) => (t.trim() ? `<label>${label}</label><div class="ro"><p>${esc(t)}</p></div>` : '');
  return `<p class="eyebrow">Ficha</p>
    <textarea class="auto sheet-serif" rows="2" data-f="text" data-qid="${q.id}" aria-label="Pregunta" style="margin-top:12px">${esc(q.text)}</textarea>
    <div class="chips">
      ${[['viva', 'Viva'], ['cola', 'En cola'], ['cerrada', 'Cerrada']].map(([s, l]) => `<button class="chip${q.status === s ? ' on' : ''}" data-act="status" data-qid="${q.id}" data-s="${s}">${l}</button>`).join('')}
    </div>
    ${ro('Hipótesis', q.hypothesis)}${ro('Qué la refutaría', q.refutation)}${ro('Conclusión', q.conclusion)}
    ${q.evidence.length ? `<label>Evidencia</label>${q.evidence.map((e, i) => `<div class="ev"><time>${fmtDay(e.t)}</time><span>${esc(e.text)}</span><button class="x" data-act="del-ev" data-qid="${q.id}" data-i="${i}" aria-label="Borrar">×</button></div>`).join('')}` : ''}
    <div class="row between" style="margin-top:22px">
      <button class="link danger" data-act="del-q" data-qid="${q.id}">Borrar</button>
      <button class="btn primary" data-act="close-sheet">Listo</button>
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
    <section class="panel" role="dialog" aria-modal="true"><div class="handle"></div>${sheetBody()}</section>`;
  root.hidden = false;
  document.body.classList.add('lock');
  const panel = $('.panel', root);
  fitAll(panel);
  if (prev) panel.scrollTop = top;
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
  if (!TABS[v]) return;
  view = v;
  editing = null;
  try { history.replaceState(null, '', '#' + v); } catch (e) { /* ignorar */ }
  render(true);
  window.scrollTo(0, 0);
}

function focusStep() {
  const el = $('.step textarea, .step input');
  if (!el) return;
  el.focus();
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
}

function setStatus(q, s) {
  if (s === q.status) return;
  if (s === 'cerrada') return openSheet({ type: 'cerrar', id: q.id });
  if (s === 'viva' && vivas().length >= MAX_VIVAS) return toast(`Ya tienes ${MAX_VIVAS} vivas. Pasa una a cola primero.`);
  q.status = s;
  q.closedAt = 0;
  q.updated = Date.now();
  if (state.meta.cur === q.id && s !== 'viva') state.meta.cur = null;
  refresh();
}

function addQuestion() {
  const text = draft.trim();
  if (!text) return toast('Escribe la pregunta primero.');
  const live = vivas().length < MAX_VIVAS;
  state.questions.push(mkQ(text, live ? 'viva' : 'cola', PALS[state.questions.length % PALS.length]));
  draft = '';
  refresh(true);
  toast(live ? 'Añadida a tus vivas.' : `Añadida a la cola. Ya tienes ${MAX_VIVAS} vivas.`);
}

function act(name, d, el) {
  switch (name) {
    case 'ruido': return openSheet({ type: 'ruido' });
    case 'close-sheet': return closeSheet();
    case 'pick': {
      const q = byId(d.qid);
      if (q) { state.meta.cur = q.id; q.touched = Date.now(); editing = null; }
      return refresh(true);
    }
    case 'next': editing = null; pickCurrent(state.meta.cur); return refresh(true);
    case 'next-step': render(); return focusStep();
    case 'edit-step': editing = d.step; render(); return focusStep();
    case 'done-edit': editing = null; return render();
    case 'open': return openSheet({ type: 'q', id: d.qid });
    case 'falta': return openSheet({ type: 'falta', id: d.qid });
    case 'cerrar': return openSheet({ type: 'cerrar', id: d.qid });
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
      refresh();
      const next = $('.evadd input');
      return next && next.focus();
    }
    case 'del-ev': {
      const q = byId(d.qid);
      if (q) q.evidence.splice(+d.i, 1);
      return refresh();
    }
    case 'falta-save': {
      const q = byId(d.qid);
      if (!q) return;
      if (!q.missing.trim()) return toast('Escribe qué dato te falta.');
      q.consult = true;
      q.updated = Date.now();
      sheet = null;
      save();
      renderSheet();
      render();
      return toast('Guardado en Preguntas → Por consultar.');
    }
    case 'close-q': {
      const q = byId(d.qid);
      if (!q) return;
      q.status = 'cerrada';
      q.closedAt = Date.now();
      q.updated = Date.now();
      q.consult = false;
      if (state.meta.cur === q.id) state.meta.cur = null;
      const next = state.questions.filter(x => x.status === 'cola').sort((a, b) => a.created - b.created)[0];
      const promote = next && vivas().length < MAX_VIVAS;
      if (promote) next.status = 'viva';
      sheet = null;
      save();
      renderSheet();
      render(true);
      return toast(promote ? `Cerrada. «${short(next.text)}» pasa a viva.` : 'Pregunta cerrada.');
    }
    case 'park-return': {
      const inp = $('#park-input');
      const text = inp ? inp.value.trim() : '';
      if (text) state.parked.push({ id: uid(), text, t: Date.now() });
      view = 'pensar';
      try { history.replaceState(null, '', '#pensar'); } catch (e) { /* ignorar */ }
      editing = null;
      sheet = null;
      save();
      renderSheet();
      render(true);
      window.scrollTo(0, 0);
      return toast(text ? 'Aparcado. Ahora, a lo importante.' : 'De vuelta a la pregunta.');
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
      q.evidence.push({ t: Date.now(), text: `Consulta${pred ? ` · predije: ${pred}` : ''} · resultado: ${res}` });
      q.consult = false;
      q.prediction = '';
      q.missing = '';
      q.updated = Date.now();
      refresh();
      return toast('Guardado como evidencia.');
    }
    case 'lvl': {
      const n = state.map.find(x => x.id === d.mid);
      if (!n) return;
      n.level = n.level === +d.l ? 0 : +d.l;
      return refresh();
    }
    case 'gap-open': gapOpen.add(d.mid); render(); return $(`[data-mf=gap][data-mid="${d.mid}"]`).focus();
    case 'gap-q': {
      const n = state.map.find(x => x.id === d.mid);
      const text = n && n.gap.trim();
      if (!text) return toast('Escribe primero el hueco.');
      state.questions.push(mkQ(text, 'cola', PALS[state.questions.length % PALS.length]));
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
    refresh(true);
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
  if (t.id === 'new-q' || t.id === 'first-q') draft = t.value;
  if (t.classList.contains('auto')) fit(t);
  if (t.dataset.f) {
    const q = byId(t.dataset.qid);
    if (!q) return;
    q[t.dataset.f] = t.value;
    q.updated = Date.now();
    if (t.dataset.f === 'text') delete q.seed;
    const gate = t.closest('.step') && t.closest('.step').querySelector('[data-gate]');
    if (gate) gate.disabled = !t.value.trim();
    saveSoon();
  } else if (t.dataset.mf) {
    const n = state.map.find(x => x.id === t.dataset.mid);
    if (n) { n[t.dataset.mf] = t.value; saveSoon(); }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheet) return closeSheet();
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type !== 'text') return;
  const box = e.target.closest('.evadd, .addbar, .parkbox');
  const btn = box && box.querySelector('[data-act]');
  if (btn) { e.preventDefault(); btn.click(); }
});

document.addEventListener('toggle', e => {
  const id = e.target.dataset && e.target.dataset.fold;
  if (!id) return;
  if (e.target.open) folds.add(id); else folds.delete(id);
}, true);

addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

/* ---------- arranque ---------- */

// Al abrir: sigues con la última pregunta si la tocaste hace poco; si no, otra.
(() => {
  const q = byId(state.meta.cur);
  const fresh = q && q.status === 'viva' && Date.now() - (q.updated || 0) < 6 * 36e5;
  if (!fresh) pickCurrent(state.meta.cur);
  save();
})();

const h = location.hash.slice(1);
if (TABS[h]) view = h;
render(true);
if (new URLSearchParams(location.search).has('ruido')) openSheet({ type: 'ruido' });

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
