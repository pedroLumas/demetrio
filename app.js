(() => {
'use strict';

const KEY = 'pensador.v1';
const MAX_VIVAS = 8;
const DAY = 864e5;
const PALS = ['ember', 'ocean', 'violet', 'forest', 'gold', 'rose', 'indigo'];
const LEVELS = ['Sin puntuar', 'Casi nada', 'Lo básico', 'Defendible', 'Sólido', 'Podría enseñarlo'];
const TABS = { pensar: 'Pensar', preguntas: 'Preguntas', mapa: 'Mapa' };
const STATUS = { viva: 'Viva', cola: 'En cola', cerrada: 'Cerrada' };

// Cada tema tiene su color. El fondo de la app toma el color del tema de la pregunta actual.
const TAGS = {
  'Yo': { c: '#ff6b8b', pal: 'rose' },
  'Poder': { c: '#a78bff', pal: 'violet' },
  'Roma': { c: '#ff8a4c', pal: 'ember' },
  'Crimen': { c: '#f4b942', pal: 'gold' },
  'Dinero': { c: '#3fd69a', pal: 'forest' },
  'EE. UU.': { c: '#36c8dc', pal: 'ocean' },
  'Europa': { c: '#7d8cff', pal: 'indigo' },
};

const TYPES = {
  gran: {
    name: 'Gran pregunta',
    short: 'Gran pregunta',
    icon: 'layers',
    hint: 'Para volver a ella muchas veces. Sin prisa por cerrarla.',
    steps: [
      { key: 'hypothesis', name: 'Hipótesis', title: 'Tu hipótesis', help: 'Una frase. Aunque sea mala.', ph: 'Creo que…' },
      { key: 'refutation', name: 'Refutación', title: 'Qué la refutaría', help: '¿Qué dato te haría cambiar de idea?', ph: 'Cambiaría de opinión si…' },
    ],
    evName: 'Evidencia',
    evTitle: 'Evidencia',
    evHelp: 'Un dato, una fuente o un contraejemplo.',
    closeLabel: 'Tu conclusión, en una frase',
    closePh: 'Lo que pienso ahora…',
    conclLabel: 'Conclusión',
  },
  detalle: {
    name: 'Detalle → mapa',
    short: 'Detalle → mapa',
    icon: 'zoom',
    hint: 'De algo concreto que viste al plano general. Se resuelve y se cierra.',
    steps: [
      { key: 'hypothesis', name: 'Explicación', title: 'Tu primera explicación', help: '¿Cómo es posible? Lo primero que se te ocurra.', ph: 'Es posible porque…' },
      { key: 'chain', name: 'Quién y cuándo', title: '¿Quién lo hizo posible y cuándo?', help: 'Tu apuesta, antes de buscarlo.', ph: 'Creo que lo hizo… en…' },
    ],
    evName: 'Comprobado',
    evTitle: 'Lo que comprobé',
    evHelp: 'Qué buscaste, qué encontraste y si acertaste.',
    closeLabel: '¿Qué revela del mundo?',
    closePh: 'El plano general que esto me enseña…',
    conclLabel: 'Qué revela del mundo',
  },
};

// Ideas sugeridas: se añaden con un toque desde Preguntas.
const BANK = [
  { type: 'detalle', text: '¿Por qué el crack se castigaba mucho más que la cocaína en polvo en EE. UU.? ¿Quién lo decidió y a quién afectó?' },
  { type: 'detalle', text: '¿Por qué la mafia siciliana vendía «protección»? ¿Qué le faltaba al Estado para que ese negocio existiera?' },
  { type: 'detalle', text: '¿Por qué los cárteles mexicanos acabaron controlando la cocaína que antes dominaba Colombia?' },
  { type: 'detalle', text: '¿Por qué Napoleón vendió Luisiana a EE. UU. en 1803 si acababa de recuperarla?' },
  { type: 'detalle', text: 'Las Meditaciones de Marco Aurelio se escribieron en campaña, junto al Danubio. ¿Qué le pasaba al imperio mientras tanto?' },
  { type: 'detalle', text: 'Séneca era de los hombres más ricos de Roma y escribía contra la riqueza. ¿Cómo se explica y qué dice de su relación con Nerón?' },
  { type: 'detalle', text: 'En los barrios obreros de tu ciudad hay bloques casi idénticos de los años 60. ¿Quién los construyó, para quién y por qué así?' },
  { type: 'detalle', text: '¿Por qué hay pueblos enteros vacíos en el interior de España? ¿Qué decisiones y qué fechas los vaciaron?' },
  { type: 'detalle', text: '¿Qué hizo caer a Pablo Escobar, con tanto dinero y tanta violencia? ¿Quién lo derrotó de verdad?' },
  { type: 'detalle', text: '¿Por qué TikTok o Instagram son gratis? ¿Quién paga y qué es lo que compran de ti?' },
  { type: 'detalle', text: '¿Por qué los ricos de la Roma antigua regalaban banquetes y juegos al pueblo? ¿Qué compraban?' },
  { type: 'detalle', text: '¿Por qué casi todo el petróleo se compra y se vende en dólares? ¿Cuándo empezó y a quién beneficia?' },
  { type: 'detalle', text: 'Un bolso de lujo cuesta cientos de veces lo que cuesta fabricarlo. ¿Qué se está vendiendo realmente?' },
  { type: 'detalle', text: '¿Por qué las ciudades de EE. UU. siguen separadas por barrios según la raza si la segregación legal acabó hace décadas?' },
  { type: 'gran', text: '¿Existe de verdad el libre albedrío o solo la sensación de elegir?' },
  { type: 'gran', text: '¿El poder corrompe a quien lo tiene o solo atrae a quien ya era corruptible?' },
  { type: 'gran', text: '¿Qué hace que una civilización se derrumbe?' },
];

/* ---------- iconos ---------- */
const svg = (d, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const IC = {
  pensar: svg('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5v3.2M16.9 18.1h3.2"/>'),
  preguntas: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.5 2.1c-.8.4-1.2 1-1.2 1.8"/><path d="M12 16.8v.2"/>'),
  mapa: svg('<path d="M12 3.5l8 5.8-3 9.4H7l-3-9.4z"/><path d="M12 3.5v8.7M12 12.2L4 9.3M12 12.2l8-2.9M12 12.2l-5 6.5M12 12.2l5 6.5"/>'),
  wave: svg('<path d="M4 11.5v1M8 8.5v7M12 5v14M16 8.5v7M20 11.5v1"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  chevR: svg('<path d="M9 6l6 6-6 6"/>'),
  chevD: svg('<path d="M6 9l6 6 6-6"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  more: svg('<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>', 'fill'),
  layers: svg('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/>', 'sm'),
  zoom: svg('<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4M11 8.5v5M8.5 11h5"/>', 'sm'),
};

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const fmtDay = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const short = t => (t.length > 42 ? t.slice(0, 41) + '…' : t);
const fold1 = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ago = t => {
  if (!t) return 'nunca';
  const d = Math.floor((Date.now() - t) / DAY);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
};

// Adivina el tema por palabras clave. Se puede cambiar a mano en la ficha.
function guessTag(text) {
  const t = ' ' + fold1(text).replace(/[^a-z0-9. ]+/g, ' ') + ' ';
  const has = (...w) => w.some(x => t.includes(x));
  if (has(' mi ', ' mis ', ' yo ', ' me ', ' debo ', ' prefiero ', ' quiero ', 'importarme', 'nuestra atencion', ' sigo ', 'cotidiano')) return 'Yo';
  if (has('ee. uu', 'ee uu', 'estados unidos', 'washington', 'lincoln', 'rockefeller', 'padres fundadores', 'standard oil')) return 'EE. UU.';
  if (has(' roma', 'romano', 'romana', ' cesar', 'trajano', 'adriano', ' sila ', 'pretoriano', ' severo', 'caracalla', ' decio', 'maximino', 'marco aurelio', 'seneca', ' neron', 'pompeyo', 'augusto', 'senado', 'legion', 'emperador')) return 'Roma';
  if (has('escobar', 'capone', 'ley seca', 'chapo', 'provenzano', 'mafia', ' maras', 'carteles', 'padrino', 'narco', 'cocaina', 'crack', ' gta')) return 'Crimen';
  if (has('felipe ii', 'franco', 'napoleon', 'prusia', 'bismarck', 'espana', 'alemania', 'junkers', 'imperio espanol')) return 'Europa';
  if (has(' rico', 'riqueza', 'dinero', 'banco', 'bancarrota', 'amazon', 'zara', 'ortega', 'marketplace', 'apuestas', 'movil', 'cobalto', 'suez', 'casinos', 'lehman', 'carnegie', 'petroleo', 'dolar', 'bolso', 'tiktok', 'herederos', 'deuda', 'economia')) return 'Dinero';
  return 'Poder';
}

const mkQ = (text, status = 'cola', pal = 'violet', extra = {}) => ({
  id: uid(), text, status, pal, tag: guessTag(text),
  type: 'gran', hypothesis: '', refutation: '', chain: '', evidence: [],
  missing: '', prediction: '', consult: false, conclusion: '',
  created: Date.now(), updated: Date.now(), touched: 0, closedAt: 0, ...extra,
});
const mkNode = name => ({ id: uid(), name, level: 0, gap: '' });

function seed() {
  return {
    v: 2,
    questions: [
      mkQ('En un tráiler de GTA 6 sale un bloque de pisos tumbados y unidos para cocinar droga. ¿Por qué existen esos bloques, quién los construyó y por qué acabaron en manos de bandas?', 'viva', 'ember', { seed: true, type: 'detalle' }),
      mkQ('¿Qué depende de mí de verdad y qué solo creo que depende de mí?', 'viva', 'ocean', { seed: true }),
      mkQ('¿Por qué cae la República romana: instituciones débiles o ambiciones personales?', 'viva', 'violet', { seed: true }),
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
      if (!TAGS[q.tag]) q.tag = guessTag(q.text);
      return q;
    }),
    map: s.map.map(x => ({ ...mkNode(''), ...x })),
    parked: Array.isArray(s.parked) ? s.parked : [],
    meta: { cur: null, lastExport: 0, ...(s.meta || {}) },
  };
}

/* ---------- estado ---------- */
let storageOk = true;
let state = load();
let view = 'pensar';
let sheet = null;
let editing = null;
let draft = '';
let newType = 'gran';
let bankOffset = 0;
let query = '';
let fType = 'todas';
let fTag = 'todas';
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
const typeOf = q => TYPES[q.type] || TYPES.gran;
const tagOf = q => (TAGS[q.tag] ? q.tag : 'Poder');
const palOf = q => TAGS[tagOf(q)].pal;
const stageIdx = q => {
  const i = typeOf(q).steps.findIndex(s => !q[s.key].trim());
  return i < 0 ? typeOf(q).steps.length : i;
};
const progress = q => typeOf(q).steps.filter(s => q[s.key].trim()).length + (q.evidence.length ? 1 : 0);

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
function step(dir) {
  const v = vivas();
  if (v.length < 2) return;
  const i = Math.max(0, v.findIndex(x => x.id === state.meta.cur));
  const n = v[(i + dir + v.length) % v.length];
  state.meta.cur = n.id;
  n.touched = Date.now();
  editing = null;
  refresh(true);
  window.scrollTo(0, 0);
}

/* ---------- piezas ---------- */
function fit(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 2 + 'px';
}
const fitAll = root => (root || document).querySelectorAll('textarea.auto').forEach(fit);

const field = (q, key, ph, extra = '') =>
  `<textarea class="auto ${extra}" rows="2" data-f="${key}" data-qid="${q.id}" placeholder="${ph}">${esc(q[key])}</textarea>`;
const tagPill = q => `<span class="tagpill" style="--c:${TAGS[tagOf(q)].c}"><i></i>${esc(tagOf(q))}</span>`;
const typePill = q => `<span class="typepill">${IC[typeOf(q).icon]}${typeOf(q).short}</span>`;
const pips = q => `<span class="pips">${[0, 1, 2].map(k => `<i class="${k < progress(q) ? 'on' : ''}"></i>`).join('')}</span>`;

const group = (id, titleHtml, count, inner) => `
  <details class="group" data-fold="${id}"${folds.has(id) ? ' open' : ''}>
    <summary>${titleHtml}<span class="n">${count}</span>${IC.chevD}</summary>
    <div class="gbody">${inner}</div>
  </details>`;

/* ---------- pensar ---------- */
const stepCard = (q, s, editMode) => `
  <section class="glass step">
    <div class="step-h"><b>${typeOf(q).steps.indexOf(s) + 1}</b><span>${s.title}</span></div>
    <p class="help">${s.help}</p>
    ${field(q, s.key, s.ph)}
    ${editMode
      ? '<button class="btn primary wide" data-act="done-edit">Listo</button>'
      : `<button class="btn primary wide" data-act="next-step" data-gate${q[s.key].trim() ? '' : ' disabled'}>Seguir ${IC.arrow}</button>`}
  </section>`;

const quoteBtn = (q, s) => `
  <button class="quote hair" data-act="edit-step" data-step="${s.key}">
    <small>${s.name}</small><span>${esc(q[s.key])}</span>
  </button>`;

function evidenceCard(q) {
  const n = q.evidence.length;
  const last = q.evidence.slice(-3).reverse();
  return `
  <section class="glass step">
    <div class="step-h"><b>${typeOf(q).steps.length + 1}</b><span>${typeOf(q).evTitle}</span>${q.consult ? '<em class="tag">por consultar</em>' : ''}</div>
    <p class="help">${typeOf(q).evHelp}</p>
    ${last.map(e => `<div class="ev"><time>${fmtDay(e.t)}</time><span>${esc(e.text)}</span></div>`).join('')}
    ${n > 3 ? `<button class="link" data-act="open" data-qid="${q.id}">Ver las ${n}</button>` : ''}
    <div class="evadd">
      <input type="text" data-enter="add-ev" placeholder="Añadir un dato…" enterkeyhint="done" aria-label="Nueva evidencia">
      <button class="btn primary icon" data-act="add-ev" data-qid="${q.id}" aria-label="Añadir">${IC.plus}</button>
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
        <button class="btn primary wide" data-act="add-q">Empezar a pensar ${IC.arrow}</button>
      </section>`;
  }
  const v = vivas();
  const T = typeOf(q);
  const idx = stageIdx(q);
  const rail = [...T.steps.map(s => s.name), T.evName]
    .map((n, k) => `<li class="${k < idx ? 'done' : k === idx ? 'now' : ''}"><i></i>${n}</li>`).join('');
  const quotes = T.steps.slice(0, idx)
    .map(s => (editing === s.key ? stepCard(q, s, true) : quoteBtn(q, s))).join('');
  const now = idx >= T.steps.length ? evidenceCard(q) : stepCard(q, T.steps[idx], false);
  return `
    <div class="top-eyebrow">
      <span class="eyebrow">${v.indexOf(q) + 1} / ${v.length}</span>
      <div class="dots" style="--dw:${Math.min(26, Math.floor(150 / v.length))}px">${v.map(x => `<button class="dot${x === q ? ' on' : ''}" data-act="pick" data-qid="${x.id}" aria-label="Ir a la pregunta"></button>`).join('')}</div>
    </div>
    <div class="chips-row">${tagPill(q)}${typePill(q)}</div>
    <h2 class="hero${q.text.length > 110 ? ' xl' : q.text.length > 70 ? ' lg' : ''}">${esc(q.text)}</h2>
    ${q.seed ? '<p class="tip" style="margin:-12px 0 18px">Pregunta de ejemplo. Cámbiala por la tuya en Preguntas.</p>' : ''}
    <ol class="rail">${rail}</ol>
    ${quotes}
    ${now}
    ${v.length > 1 ? `<div class="center"><button class="link" data-act="next">Otra pregunta ${IC.arrow.replace('class="ic ', 'class="ic sm ')}</button></div>` : ''}`;
}

/* ---------- preguntas ---------- */
const qRow = (q, showStatus) => `
  <button class="qrow hair" data-act="open" data-qid="${q.id}">
    <i class="dotc" style="--c:${TAGS[tagOf(q)].c}"></i>
    <span class="qr-body">
      <span class="qr-t">${esc(q.text)}</span>
      <span class="qr-m">${esc(tagOf(q))} · ${typeOf(q).short}${q.evidence.length ? ` · ${q.evidence.length} evid.` : ''}${q.consult ? ' · por consultar' : ''}${q.seed ? ' · ejemplo' : ''}</span>
    </span>
    <span class="qr-r">${showStatus ? `<em class="st st-${q.status}">${STATUS[q.status]}</em>` : progress(q) ? pips(q) : ''}${IC.chevR}</span>
  </button>`;

const vcard = q => `
  <article class="vcard hair" data-pal="${palOf(q)}">
    <button class="vc-main" data-act="think" data-qid="${q.id}">
      ${tagPill(q)}
      <span class="vc-t">${esc(q.text)}</span>
      <span class="vc-b">${pips(q)}${typePill(q)}<span class="go">${IC.arrow}</span></span>
    </button>
    <button class="vc-more" data-act="open" data-qid="${q.id}" aria-label="Abrir ficha">${IC.more}</button>
  </article>`;

function ideasSection() {
  const have = new Set(state.questions.map(q => q.text));
  const free = BANK.filter(b => !have.has(b.text));
  if (!free.length) return '';
  const n = Math.min(5, free.length);
  const start = bankOffset % free.length;
  const shown = Array.from({ length: n }, (_, k) => free[(start + k) % free.length]);
  return `
    <div class="sec"><h2>Ideas para pensar</h2><span>${free.length}</span></div>
    <div class="car">${shown.map(b => `
      <div class="glass idea">
        <span class="kind">${TYPES[b.type].name}</span>
        <p>${esc(b.text)}</p>
        <button class="btn ghost sm" data-act="add-idea" data-i="${BANK.indexOf(b)}">${IC.plus} Añadir</button>
      </div>`).join('')}</div>
    ${free.length > n ? `<div class="center"><button class="link" data-act="more-ideas">Otras ideas</button></div>` : ''}`;
}

function matchQ(q) {
  if (fType !== 'todas' && q.type !== fType) return false;
  if (fTag !== 'todas' && tagOf(q) !== fTag) return false;
  const words = fold1(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold1([q.text, q.hypothesis, q.refutation, q.chain, q.conclusion, tagOf(q), ...q.evidence.map(e => e.text)].join(' '));
  return words.every(w => hay.includes(w));
}

function qBody() {
  const qs = state.questions;
  const filtering = query.trim() || fType !== 'todas' || fTag !== 'todas';
  if (filtering) {
    const order = { viva: 0, cola: 1, cerrada: 2 };
    const res = qs.filter(matchQ).sort((a, b) => order[a.status] - order[b.status] || b.updated - a.updated);
    return `
      <div class="sec"><h2>${res.length} ${res.length === 1 ? 'resultado' : 'resultados'}</h2><button class="link" data-act="f-clear" style="padding:0">Quitar filtros</button></div>
      <div class="qlist">${res.length ? res.map(q => qRow(q, true)).join('') : '<p class="empty">Nada coincide. Prueba con otra palabra o quita un filtro.</p>'}</div>`;
  }
  const vi = qs.filter(q => q.status === 'viva');
  const co = qs.filter(q => q.status === 'cola');
  const ce = qs.filter(q => q.status === 'cerrada').sort((a, b) => b.closedAt - a.closedAt);
  const consult = qs.filter(q => q.consult && q.status !== 'cerrada');
  const parked = state.parked;
  const stale = !state.meta.lastExport || Date.now() - state.meta.lastExport > 14 * DAY;
  const colaGroups = Object.keys(TAGS).map(tag => {
    const items = co.filter(q => tagOf(q) === tag);
    if (!items.length) return '';
    return group('g-' + tag, `<i class="dotc" style="--c:${TAGS[tag].c}"></i>${tag}`, items.length, `<div class="qlist">${items.map(q => qRow(q)).join('')}</div>`);
  }).join('');
  return `
    <div class="sec"><h2>Vivas</h2><span>${vi.length} de ${MAX_VIVAS}</span></div>
    ${vi.length ? `<div class="car">${vi.map(vcard).join('')}</div>` : '<p class="empty">Ninguna. Escribe una arriba.</p>'}

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

    ${ideasSection()}

    ${co.length ? `<div class="sec"><h2>En cola</h2><span>${co.length}</span></div>${colaGroups}` : ''}

    ${ce.length ? `<div class="sec"><h2>Archivo</h2><span></span></div>${group('cerradas', 'Cerradas', ce.length, `<div class="qlist">${ce.map(q => qRow(q)).join('')}</div>`)}` : ''}

    <div class="sec"><h2>Utilidades</h2><span></span></div>
    ${group('parked', 'Aparcado', parked.length, parked.length
      ? `<div class="glass">${parked.map(p => `<div class="ev"><time>${fmtDay(p.t)}</time><span>${esc(p.text)}</span><button class="x" data-act="unpark" data-pid="${p.id}" aria-label="Quitar">${IC.x}</button></div>`).join('')}<p class="tip" style="margin:10px 0 0">Si no importa a medio plazo, bórralo.</p></div>`
      : '<p class="empty">Nada aparcado.</p>')}
    ${group('backup', 'Copia de seguridad', stale ? 'hazla' : ago(state.meta.lastExport), `
      <div class="glass">
        <p class="help">Tus datos viven solo en este móvil. Guarda una copia de vez en cuando.</p>
        <div class="row"><button class="btn primary sm" data-act="export">Exportar</button><button class="btn ghost sm" data-act="import">Importar</button></div>
      </div>`)}`;
}

function preguntasView() {
  const qs = state.questions;
  const vi = qs.filter(q => q.status === 'viva').length;
  const filtering = query.trim() || fType !== 'todas' || fTag !== 'todas';
  return `
    <div class="titlerow">
      <div>
        <h1 class="title">Preguntas</h1>
        <p class="sub" style="margin:0">${qs.length} en total · ${vi} vivas</p>
      </div>
      <button class="btn primary fab" data-act="nueva" aria-label="Nueva pregunta">${IC.plus}</button>
    </div>

    <div class="glass search" style="padding:0 8px 0 16px">
      ${IC.search}
      <input type="search" id="search" placeholder="Buscar entre ${qs.length} preguntas…" value="${esc(query)}" enterkeyhint="search" aria-label="Buscar">
      <button class="x" id="search-x" data-act="search-clear" aria-label="Borrar búsqueda"${query ? '' : ' hidden'}>${IC.x}</button>
    </div>
    <div class="filters">
      <div class="hs">
        <button class="chip${fTag === 'todas' ? ' on' : ''}" data-act="f-tag" data-t="todas">Todos los temas</button>
        ${Object.keys(TAGS).map(t => `<button class="chip${fTag === t ? ' on' : ''}" data-act="f-tag" data-t="${t}" style="--c:${TAGS[t].c}"><i></i>${t}</button>`).join('')}
      </div>
      <div class="seg2 wide" role="group">
        <button class="${fType === 'todas' ? 'on' : ''}" data-act="f-type" data-t="todas">Todas</button>
        <button class="${fType === 'gran' ? 'on' : ''}" data-act="f-type" data-t="gran">Gran pregunta</button>
        <button class="${fType === 'detalle' ? 'on' : ''}" data-act="f-type" data-t="detalle">Detalle → mapa</button>
      </div>
    </div>
    <div id="qbody">${qBody()}</div>`;
}

/* ---------- mapa ---------- */
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
  const rated = state.map.filter(n => n.level);
  const avg = rated.length ? (rated.reduce((a, n) => a + n.level, 0) / rated.length).toFixed(1).replace('.', ',') : '–';
  return `
    <h1 class="title">Mapa</h1>
    <p class="sub">${state.map.length} áreas · nivel medio ${avg}</p>
    <div class="glass radar">${radar()}</div>
    <p class="lead">${rated.length ? 'Los huecos se convierten en preguntas.' : 'Puntúa cada área de 1 a 5 y verás tu mapa. Sé honesto.'}</p>
    ${state.map.map(n => `
      <div class="glass node">
        <div class="node-h">
          <input class="nname" type="text" data-mf="name" data-mid="${n.id}" value="${esc(n.name)}" aria-label="Nombre del área">
          <button class="x" data-act="del-node" data-mid="${n.id}" aria-label="Borrar área">${IC.x}</button>
        </div>
        <div class="segs">${[1, 2, 3, 4, 5].map(l => `<button class="seg${l <= n.level ? ' on' : ''}" data-act="lvl" data-mid="${n.id}" data-l="${l}" aria-label="Nivel ${l}"></button>`).join('')}</div>
        <p class="lvl-name">${LEVELS[n.level]}</p>
        ${gapOpen.has(n.id) || n.gap.trim()
          ? `<textarea class="auto" rows="2" data-mf="gap" data-mid="${n.id}" placeholder="Lo que no sé y quisiera saber">${esc(n.gap)}</textarea>
             <button class="btn ghost sm" data-act="gap-q" data-mid="${n.id}">Convertir en pregunta</button>`
          : `<button class="link" data-act="gap-open" data-mid="${n.id}">${IC.plus.replace('class="ic ', 'class="ic sm ')} Hueco</button>`}
      </div>`).join('')}
    <div class="glass addrow">
      <input type="text" id="new-node" data-enter="add-node" placeholder="Nueva área…" enterkeyhint="done" aria-label="Nueva área">
      <button class="btn primary icon" data-act="add-node" aria-label="Añadir">${IC.plus}</button>
    </div>`;
}

/* ---------- marco ---------- */
function renderTabs() {
  const nav = $('#tabs');
  const keys = Object.keys(TABS);
  if (!nav.children.length) {
    nav.innerHTML = `<i class="ind"></i>${keys.map(k => `<button data-go="${k}" aria-label="${TABS[k]}">${IC[k]}<span>${TABS[k]}</span></button>`).join('')}`;
  }
  nav.style.setProperty('--i', keys.indexOf(view));
  [...nav.querySelectorAll('button')].forEach((b, i) => b.classList.toggle('on', keys[i] === view));
}

function render(animate) {
  const q = current();
  document.body.dataset.pal = q ? palOf(q) : 'violet';
  const body = { pensar: () => pensarView(q), preguntas: preguntasView, mapa: mapaView }[view]();
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  $('#app').innerHTML = `
    ${storageOk ? '' : '<p class="warn">No puedo guardar en este navegador. Exporta una copia en Preguntas.</p>'}
    <header class="bar"><span class="date">${date}</span><button class="pill hair" data-act="ruido">${IC.wave}<span>Ruido</span></button></header>
    <main class="view${animate ? ' enter' : ''}">${body}</main>`;
  renderTabs();
  fitAll($('#app'));
}

/* ---------- hojas ---------- */
function sheetBody() {
  if (sheet.type === 'nueva') {
    return `<div class="newbox">
      <p class="eyebrow">Nueva pregunta</p>
      <textarea class="auto sheet-serif" id="new-q" data-enter="add-q" rows="2" placeholder="Escribe tu pregunta…" aria-label="Nueva pregunta" style="margin-top:14px">${esc(draft)}</textarea>
      <label>Tipo</label>
      <div class="seg2 wide" role="group">${Object.keys(TYPES).map(k => `<button class="${k === newType ? 'on' : ''}" data-act="new-type" data-t="${k}">${TYPES[k].name}</button>`).join('')}</div>
      <p class="tip">${TYPES[newType].hint} El tema se elige solo; puedes cambiarlo después.</p>
      <button class="btn primary wide" data-act="add-q">Añadir ${IC.arrow}</button>
    </div>`;
  }
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
        <input type="text" id="park-input" data-enter="park-return" placeholder="p. ej. qué le digo a…" enterkeyhint="done">
        <button class="btn primary wide" data-act="park-return">Aparcar y pensar ${IC.arrow}</button>
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
      <button class="btn primary wide" data-act="falta-save" data-qid="${q.id}">Guardar para consultar</button>`;
  }
  if (sheet.type === 'cerrar') {
    return `<p class="eyebrow">Cerrar pregunta</p>
      <h2 class="hero sm">${esc(q.text)}</h2>
      <label>${typeOf(q).closeLabel}</label>
      ${field(q, 'conclusion', typeOf(q).closePh, 'sheet-serif')}
      <button class="btn primary wide" data-act="close-q" data-qid="${q.id}">Cerrar pregunta</button>`;
  }
  const ro = (label, t) => (t.trim() ? `<label>${label}</label><div class="ro"><p>${esc(t)}</p></div>` : '');
  return `
    <div class="head">${tagPill(q)}${typePill(q)}<em class="st st-${q.status}">${STATUS[q.status]}</em></div>
    <textarea class="auto sheet-serif" rows="2" data-f="text" data-qid="${q.id}" aria-label="Pregunta" style="margin-top:16px">${esc(q.text)}</textarea>
    <button class="btn primary wide" data-act="think" data-qid="${q.id}">${q.status === 'cerrada' ? 'Retomar' : q.status === 'viva' ? 'Pensar en esta' : 'Hacerla viva y pensar'} ${IC.arrow}</button>
    <label>Estado</label>
    <div class="seg2 wide" role="group">${Object.keys(STATUS).map(s => `<button class="${q.status === s ? 'on' : ''}" data-act="status" data-qid="${q.id}" data-s="${s}">${STATUS[s]}</button>`).join('')}</div>
    <label>Tipo</label>
    <div class="seg2 wide" role="group">${Object.keys(TYPES).map(k => `<button class="${q.type === k ? 'on' : ''}" data-act="set-type" data-qid="${q.id}" data-t="${k}">${TYPES[k].name}</button>`).join('')}</div>
    <label>Tema</label>
    <div class="hs tagscroll">${Object.keys(TAGS).map(t => `<button class="chip${tagOf(q) === t ? ' on' : ''}" data-act="set-tag" data-qid="${q.id}" data-t="${t}" style="--c:${TAGS[t].c}"><i></i>${t}</button>`).join('')}</div>
    ${typeOf(q).steps.map(s => ro(s.title, q[s.key])).join('')}${ro(typeOf(q).conclLabel, q.conclusion)}
    ${q.evidence.length ? `<label>Evidencia</label>${q.evidence.map((e, i) => `<div class="ev"><time>${fmtDay(e.t)}</time><span>${esc(e.text)}</span><button class="x" data-act="del-ev" data-qid="${q.id}" data-i="${i}" aria-label="Borrar">${IC.x}</button></div>`).join('')}` : ''}
    <div class="row between" style="margin-top:26px">
      <button class="link danger" data-act="del-q" data-qid="${q.id}">Borrar pregunta</button>
      <button class="btn ghost sm" data-act="close-sheet">Listo</button>
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
  const q = mkQ(text, live ? 'viva' : 'cola', 'violet', { type: newType });
  state.questions.push(q);
  draft = '';
  sheet = null;
  refresh(true);
  toast(live ? `Añadida a tus vivas · ${tagOf(q)}` : `Añadida a la cola · ${tagOf(q)}`);
}

function think(q) {
  if (q.status !== 'viva') {
    if (vivas().length >= MAX_VIVAS) return toast(`Ya tienes ${MAX_VIVAS} vivas. Pasa una a cola primero.`);
    q.status = 'viva';
    q.closedAt = 0;
  }
  state.meta.cur = q.id;
  q.touched = Date.now();
  q.updated = Date.now();
  editing = null;
  sheet = null;
  view = 'pensar';
  try { history.replaceState(null, '', '#pensar'); } catch (e) { /* ignorar */ }
  save();
  renderSheet();
  render(true);
  window.scrollTo(0, 0);
}

function renderQBody() {
  const el = $('#qbody');
  if (!el) return;
  el.innerHTML = qBody();
  fitAll(el);
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
    case 'next': return step(1);
    case 'prev': return step(-1);
    case 'think': { const q = byId(d.qid); return q && think(q); }
    case 'next-step': render(); return focusStep();
    case 'edit-step': editing = d.step; render(); return focusStep();
    case 'done-edit': editing = null; return render();
    case 'open': return openSheet({ type: 'q', id: d.qid });
    case 'falta': return openSheet({ type: 'falta', id: d.qid });
    case 'cerrar': return openSheet({ type: 'cerrar', id: d.qid });
    case 'add-q': return addQuestion();
    case 'nueva': openSheet({ type: 'nueva' }); { const i = $('#new-q'); if (i) i.focus(); } return;
    case 'new-type': newType = d.t; return renderSheet();
    case 'f-tag': fTag = d.t; return render();
    case 'f-type': fType = d.t; return render();
    case 'f-clear': query = ''; fTag = 'todas'; fType = 'todas'; return render();
    case 'search-clear': query = ''; return render();
    case 'set-type': {
      const q = byId(d.qid);
      if (q) { q.type = d.t; q.updated = Date.now(); }
      return refresh();
    }
    case 'set-tag': {
      const q = byId(d.qid);
      if (q) { q.tag = d.t; q.updated = Date.now(); }
      return refresh();
    }
    case 'more-ideas': bankOffset += 5; return renderQBody();
    case 'add-idea': {
      const b = BANK[+d.i];
      if (!b) return;
      const live = vivas().length < MAX_VIVAS;
      const q = mkQ(b.text, live ? 'viva' : 'cola', 'violet', { type: b.type });
      state.questions.push(q);
      refresh();
      return toast(live ? `Añadida a tus vivas · ${tagOf(q)}` : `Añadida a la cola · ${tagOf(q)}`);
    }
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
      return toast('Guardado en Preguntas → Por consultar');
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
      state.questions.push(mkQ(text, 'cola', 'violet'));
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
  if (t.id === 'search') {
    query = t.value;
    const x = $('#search-x');
    if (x) x.hidden = !query;
    return renderQBody();
  }
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
  if (e.key !== 'Enter') return;
  const t = e.target;
  if (t.id === 'search') { t.blur(); return; }
  const a = t.dataset && t.dataset.enter;
  if (!a) return;
  const box = t.closest('.evadd, .newbox, .parkbox, .addrow');
  const btn = box && box.querySelector(`[data-act="${a}"]`);
  if (btn) { e.preventDefault(); btn.click(); }
});

document.addEventListener('toggle', e => {
  const id = e.target.dataset && e.target.dataset.fold;
  if (!id) return;
  if (e.target.open) folds.add(id); else folds.delete(id);
}, true);

// Gestos: deslizar en Pensar cambia de pregunta; arrastrar el asa cierra la hoja.
let sw = null;
let drag = null;
document.addEventListener('touchstart', e => {
  const t = e.touches[0];
  const h = e.target.closest('.handle');
  if (h) {
    const p = $('.panel');
    if (p) { drag = { y: t.clientY, p, dy: 0 }; p.style.transition = 'none'; p.style.animation = 'none'; }
    return;
  }
  sw = null;
  if (view !== 'pensar' || sheet) return;
  if (e.target.closest('textarea, input, button, .dots')) return;
  sw = { x: t.clientX, y: t.clientY };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!drag) return;
  drag.dy = Math.max(0, e.touches[0].clientY - drag.y);
  drag.p.style.transform = `translateY(${drag.dy}px)`;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (drag) {
    const { p, dy } = drag;
    drag = null;
    p.style.transition = 'transform .35s cubic-bezier(.22,.9,.3,1)';
    if (dy > 110) { p.style.transform = 'translateY(100%)'; setTimeout(closeSheet, 180); } else p.style.transform = '';
    return;
  }
  if (!sw) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - sw.x;
  const dy = t.clientY - sw.y;
  sw = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) step(dx < 0 ? 1 : -1);
}, { passive: true });

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
