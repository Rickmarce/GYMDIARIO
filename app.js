'use strict';

// Imágenes de Free Exercise DB (dominio público, https://github.com/yuhonas/free-exercise-db)
const IMG_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
const STORE_KEY = 'diario-gym-v1';
const PAGE = 50;

const ES = {
  muscles: {
    abdominals: 'Abdominales', abductors: 'Abductores', adductors: 'Aductores', biceps: 'Bíceps',
    calves: 'Gemelos', chest: 'Pecho', forearms: 'Antebrazos', glutes: 'Glúteos',
    hamstrings: 'Isquiotibiales', lats: 'Dorsales', 'lower back': 'Lumbares', 'middle back': 'Espalda media',
    neck: 'Cuello', quadriceps: 'Cuádriceps', shoulders: 'Hombros', traps: 'Trapecios', triceps: 'Tríceps',
  },
  equipment: {
    'body only': 'Peso corporal', machine: 'Máquina', other: 'Otro', 'foam roll': 'Rodillo',
    kettlebells: 'Kettlebell', dumbbell: 'Mancuernas', cable: 'Polea', barbell: 'Barra', bands: 'Bandas',
    'medicine ball': 'Balón medicinal', 'exercise ball': 'Fitball', 'e-z curl bar': 'Barra Z',
  },
  category: {
    strength: 'Fuerza', stretching: 'Estiramiento', plyometrics: 'Pliometría', strongman: 'Strongman',
    powerlifting: 'Powerlifting', cardio: 'Cardio', 'olympic weightlifting': 'Halterofilia',
  },
  level: { beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Avanzado' },
};
const tr = (dict, k) => (k && ES[dict][k]) || k || 'Sin material';

// Términos en español → nombre en inglés de la base de datos (para el buscador)
const SYN = {
  'press banca': 'bench press', 'peso muerto': 'deadlift', 'press militar': 'military press',
  'hip thrust': 'hip thrust', 'buenos dias': 'good morning',
  sentadilla: 'squat', sentadillas: 'squat', banca: 'bench', dominada: 'pull', dominadas: 'pull',
  remo: 'row', zancada: 'lunge', zancadas: 'lunge', fondos: 'dip', fondo: 'dip',
  elevacion: 'raise', elevaciones: 'raise', prensa: 'leg press', jalon: 'pulldown',
  apertura: 'fly', aperturas: 'fly', flexion: 'push-up', flexiones: 'push-up', plancha: 'plank',
  encogimiento: 'shrug', encogimientos: 'shrug', inclinado: 'incline', declinado: 'decline',
  extension: 'extension', extensiones: 'extension', femoral: 'leg curl',
  gemelo: 'calf', hombro: 'shoulder', militar: 'military', martillo: 'hammer', cuerda: 'rope',
  mancuerna: 'dumbbell', barra: 'barbell', polea: 'cable', maquina: 'machine', estiramiento: 'stretch',
};

// ---------- utilidades ----------
const $ = sel => document.querySelector(sel);
const view = $('#view');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : null; };
const fmtNum = n => (Math.round(n * 100) / 100).toLocaleString('es-ES');
const inVal = n => (n == null ? '' : String(n).replace('.', ','));
const fmtDay = ts => new Date(ts).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtLong = ts => new Date(ts).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = ts => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
const setLabel = s => (s.weight ? `${fmtNum(s.weight)} kg × ${s.reps}` : `${s.reps} reps`);
const volume = entries => entries.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.weight || 0) * s.reps, 0), 0);
const countSets = entries => entries.reduce((a, e) => a + e.sets.length, 0);

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- almacenamiento ----------
function blank() { return { routines: [], workouts: [], active: null }; }
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(blank(), JSON.parse(raw));
  } catch (e) { console.warn('No se pudieron leer los datos', e); }
  return blank();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch (e) { toast('⚠️ No se pudo guardar'); }
}
let db = load();

// ---------- biblioteca ----------
let EX = [];
const EX_BY_ID = new Map();
const ex = id => EX_BY_ID.get(id);
const exName = id => ex(id)?.name || 'Ejercicio desconocido';
const imgUrl = (e, i = 0) => (e && e.images && e.images[i] ? IMG_BASE + e.images[i] : '');
const mainMuscle = id => { const e = ex(id); return e ? e.primaryMuscles.map(m => tr('muscles', m)).join(', ') : ''; };
function thumb(id) {
  const src = imgUrl(ex(id));
  return src ? `<img class="thumb" src="${src}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="thumb"></div>';
}
const CAT_ORDER = ['strength', 'powerlifting', 'olympic weightlifting', 'strongman', 'plyometrics', 'cardio', 'stretching'];

// ---------- historial por ejercicio ----------
function sessionsWith(exId) {
  const out = [];
  for (let i = db.workouts.length - 1; i >= 0; i--) {
    const w = db.workouts[i], en = w.entries.find(e => e.exId === exId);
    if (en && en.sets.length) out.push({ w, sets: en.sets });
  }
  return out;
}
function newEntry(exId) {
  const prev = sessionsWith(exId)[0];
  const hints = prev ? prev.sets : [{}, {}, {}];
  return { exId, sets: hints.map(h => ({ reps: null, weight: null, hr: h.reps ?? null, hw: h.weight ?? null, done: false })) };
}

// ---------- navegación ----------
function route() {
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  return { name: name || 'entrenar', arg };
}
const TAB_OF = { rutina: 'rutinas', ejercicio: 'ejercicios', elegir: 'ejercicios', sesion: 'historial' };
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

let cleanups = [], lastHash = null, afterRender = null;
function render() {
  cleanups.forEach(f => f()); cleanups = [];
  const r = route();
  if (!EX.length) { view.innerHTML = '<p class="empty">Cargando ejercicios…</p>'; return; }
  const views = {
    entrenar: viewTrain, rutinas: viewRoutines, rutina: viewRoutine, ejercicios: viewLibrary,
    elegir: viewLibrary, ejercicio: viewExercise, historial: viewHistory, sesion: viewSession,
  };
  (views[r.name] || viewTrain)(r);
  const tab = TAB_OF[r.name] || r.name;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  if (location.hash !== lastHash) { window.scrollTo(0, 0); lastHash = location.hash; }
  if (afterRender) { afterRender(); afterRender = null; }
}

// ---------- vista: entrenar ----------
function viewTrain() {
  if (db.active) return viewWorkout();
  const last = db.workouts[db.workouts.length - 1];
  view.innerHTML = `
    <h1>Entrenar</h1>
    <button class="primary block" data-act="start">Empezar entrenamiento libre</button>
    <h2>Desde una rutina</h2>
    ${db.routines.length ? `<div class="list">${db.routines.map(r => {
      const lastR = [...db.workouts].reverse().find(w => w.routineId === r.id);
      return `<button class="item" data-act="start" data-rid="${r.id}">
        <div class="grow"><div class="title">${esc(r.name)}</div>
        <div class="muted small">${r.exercises.length} ejercicios${lastR ? ' · último: ' + fmtDay(lastR.start) : ''}</div></div>
        <span aria-hidden="true">▶</span></button>`;
    }).join('')}</div>`
    : '<p class="empty">Aún no tienes rutinas.<br><a href="#/rutinas">Crea una</a> para empezar más rápido.</p>'}
    ${last ? `<h2>Último entrenamiento</h2>${sessionItem(last)}` : ''}`;
}

function startWorkout({ name, exIds = [], routineId = null }) {
  if (db.active) { toast('Ya tienes un entrenamiento en curso'); return go('#/entrenar'); }
  db.active = { id: uid(), routineId, name, start: Date.now(), entries: exIds.filter(ex).map(newEntry) };
  save(); go('#/entrenar');
}

function viewWorkout() {
  const w = db.active;
  view.innerHTML = `
    <div class="topbar"><h1>${esc(w.name)}</h1></div>
    <p class="timer">⏱ <span id="elapsed">${fmtDur(Date.now() - w.start)}</span> · empezado a las ${fmtTime(w.start)}</p>
    ${w.entries.length ? '' : '<p class="empty">Añade el primer ejercicio de hoy.</p>'}
    ${w.entries.map((en, i) => entryCard(en, i)).join('')}
    <button class="block" data-act="pick" data-target="w">+ Añadir ejercicio</button>
    <div class="row-actions">
      <button class="danger" data-act="discard">Descartar</button>
      <button class="primary" data-act="finish">Terminar</button>
    </div>
    <p class="muted small">Pulsa ✓ al acabar cada serie: si la dejas vacía, usa los valores de la última vez (en gris).</p>`;
  const timer = setInterval(() => { const el = $('#elapsed'); if (el) el.textContent = fmtDur(Date.now() - w.start); }, 1000);
  cleanups.push(() => clearInterval(timer));
}

function entryCard(en, i) {
  const prev = sessionsWith(en.exId)[0];
  return `<div class="card">
    <div class="entry-head">
      <a href="#/ejercicio/${encodeURIComponent(en.exId)}" aria-label="Ver cómo se hace">${thumb(en.exId)}</a>
      <div class="grow"><div class="title">${esc(exName(en.exId))}</div><div class="muted small">${esc(mainMuscle(en.exId))}</div></div>
      <button class="icon-btn" data-act="entry-del" data-i="${i}" aria-label="Quitar ejercicio">🗑</button>
    </div>
    ${prev ? `<div class="prev">Última vez (${fmtDay(prev.w.start)}): ${prev.sets.map(setLabel).join(' · ')}</div>` : ''}
    <table class="sets">
      <thead><tr><th>Serie</th><th>Kg</th><th>Reps</th><th></th><th></th></tr></thead>
      <tbody>${en.sets.map((s, j) => `
        <tr class="${s.done ? 'done' : ''}">
          <td>${j + 1}</td>
          <td><input type="text" inputmode="decimal" data-field="weight" data-i="${i}" data-j="${j}" value="${inVal(s.weight)}" placeholder="${inVal(s.hw)}" aria-label="Peso serie ${j + 1}"></td>
          <td><input type="text" inputmode="numeric" data-field="reps" data-i="${i}" data-j="${j}" value="${inVal(s.reps)}" placeholder="${inVal(s.hr)}" aria-label="Repeticiones serie ${j + 1}"></td>
          <td><button class="check" data-act="set-done" data-i="${i}" data-j="${j}" aria-label="Serie hecha">✓</button></td>
          <td><button class="icon-btn del" data-act="set-del" data-i="${i}" data-j="${j}" aria-label="Borrar serie">×</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <button class="ghost block" data-act="set-add" data-i="${i}">+ Añadir serie</button>
  </div>`;
}

// ---------- vista: rutinas ----------
function viewRoutines() {
  view.innerHTML = `
    <div class="topbar"><h1>Rutinas</h1><button class="primary" data-act="routine-new">+ Nueva</button></div>
    ${db.routines.length ? `<div class="list">${db.routines.map(r => {
      const muscles = [...new Set(r.exercises.flatMap(id => ex(id)?.primaryMuscles || []))].slice(0, 3).map(m => tr('muscles', m));
      return `<a class="item" href="#/rutina/${r.id}">
        <div class="grow"><div class="title">${esc(r.name)}</div>
        <div class="muted small">${r.exercises.length} ejercicios${muscles.length ? ' · ' + esc(muscles.join(', ')) : ''}</div></div>
        <span aria-hidden="true">›</span></a>`;
    }).join('')}</div>`
    : '<p class="empty">Crea tu primera rutina, por ejemplo «Pierna» o «Empuje», y añádele ejercicios de la biblioteca.</p>'}`;
}

function viewRoutine({ arg }) {
  const r = db.routines.find(x => x.id === arg);
  if (!r) return go('#/rutinas');
  view.innerHTML = `
    <div class="topbar"><a class="btn ghost" href="#/rutinas" aria-label="Volver">‹</a><h1 id="rtitle">${esc(r.name)}</h1></div>
    <label class="small muted" for="rname">Nombre</label>
    <input id="rname" data-input="rename" data-rid="${r.id}" value="${esc(r.name)}" maxlength="60">
    <h2>Ejercicios (${r.exercises.length})</h2>
    <div class="list">${r.exercises.map((id, i) => `
      <div class="item">
        <a href="#/ejercicio/${encodeURIComponent(id)}">${thumb(id)}</a>
        <a class="grow" href="#/ejercicio/${encodeURIComponent(id)}" style="color:inherit;text-decoration:none">
          <div class="title">${esc(exName(id))}</div><div class="muted small">${esc(mainMuscle(id))}</div></a>
        <button class="icon-btn" data-act="r-move" data-d="-1" data-i="${i}" aria-label="Subir" ${i ? '' : 'disabled'}>↑</button>
        <button class="icon-btn" data-act="r-move" data-d="1" data-i="${i}" aria-label="Bajar" ${i < r.exercises.length - 1 ? '' : 'disabled'}>↓</button>
        <button class="icon-btn" data-act="r-del" data-i="${i}" aria-label="Quitar">✕</button>
      </div>`).join('') || '<p class="empty">Todavía no tiene ejercicios.</p>'}
    </div>
    <div class="row-actions">
      <button data-act="pick" data-target="r:${r.id}">+ Añadir ejercicios</button>
      ${r.exercises.length ? `<button class="primary" data-act="start" data-rid="${r.id}">▶ Empezar</button>` : ''}
    </div>
    <button class="ghost danger block" data-act="routine-del" data-rid="${r.id}">Eliminar rutina</button>`;
}

// ---------- vista: biblioteca ----------
const lib = { q: '', m: '', e: '*', shown: PAGE }; // e: '*' = todo el material, '' = sin material

function pickTarget(target) {
  if (target === 'w') return db.active ? { label: 'entrenamiento actual', back: '#/entrenar', has: id => db.active.entries.some(e => e.exId === id) } : null;
  const r = target && target.startsWith('r:') && db.routines.find(x => x.id === target.slice(2));
  return r ? { label: r.name, back: '#/rutina/' + r.id, has: id => r.exercises.includes(id) } : null;
}

function viewLibrary({ name, arg }) {
  const picking = name === 'elegir' ? pickTarget(arg) : null;
  if (name === 'elegir' && !picking) return go('#/ejercicios');
  const muscles = Object.keys(ES.muscles).sort((a, b) => ES.muscles[a].localeCompare(ES.muscles[b], 'es'));
  const equip = [...Object.keys(ES.equipment), ''].sort((a, b) => tr('equipment', a).localeCompare(tr('equipment', b), 'es'));
  view.innerHTML = `
    ${picking
      ? `<div class="topbar"><h1>Añadir a «${esc(picking.label)}»</h1><a class="btn primary" href="${picking.back}">Hecho</a></div>`
      : '<div class="topbar"><h1>Ejercicios</h1></div>'}
    <div class="search"><input type="search" id="q" data-input="lib" placeholder="Buscar: sentadilla, pecho, curl…" value="${esc(lib.q)}" autocomplete="off"></div>
    <div class="filters">
      <select id="fm" data-input="lib" aria-label="Músculo"><option value="">Todos los músculos</option>
        ${muscles.map(m => `<option value="${m}" ${lib.m === m ? 'selected' : ''}>${ES.muscles[m]}</option>`).join('')}</select>
      <select id="fe" data-input="lib" aria-label="Material"><option value="*">Todo el material</option>
        ${equip.map(e => `<option value="${esc(e)}" ${lib.e === e ? 'selected' : ''}>${tr('equipment', e)}</option>`).join('')}</select>
    </div>
    <div id="results"></div>`;
  renderResults(picking, arg);
}

function searchMatch(e, words) {
  if (!words.length) return true;
  return words.every(w => e._hay.includes(w) || (SYN[w] && e._hay.includes(SYN[w])));
}
function queryWords(q) {
  let s = fold(q).trim();
  for (const k of Object.keys(SYN)) if (k.includes(' ') && s.includes(k)) s = s.replace(k, SYN[k]);
  return s.split(/\s+/).filter(Boolean);
}

function renderResults(picking, target) {
  const words = queryWords(lib.q);
  const list = EX.filter(e =>
    (!lib.m || e.primaryMuscles.includes(lib.m)) &&
    (lib.e === '*' || (e.equipment || '') === lib.e) &&
    searchMatch(e, words));
  const shown = list.slice(0, lib.shown);
  $('#results').innerHTML = `
    <p class="muted small">${list.length} ejercicios</p>
    <div class="list">${shown.map(e => `
      <div class="item">
        <a href="#/ejercicio/${encodeURIComponent(e.id)}">${thumb(e.id)}</a>
        <a class="grow" href="#/ejercicio/${encodeURIComponent(e.id)}" style="color:inherit;text-decoration:none">
          <div class="title">${esc(e.name)}</div>
          <div class="muted small">${esc(mainMuscle(e.id))} · ${esc(tr('equipment', e.equipment))}</div></a>
        ${picking ? (picking.has(e.id)
          ? '<span class="icon-btn" style="display:inline-flex;align-items:center;justify-content:center;color:var(--done)" aria-label="Añadido">✓</span>'
          : `<button class="icon-btn" data-act="add" data-ex="${esc(e.id)}" data-target="${esc(target)}" aria-label="Añadir">＋</button>`) : ''}
      </div>`).join('') || '<p class="empty">No hay ejercicios con esos filtros.</p>'}
    </div>
    ${list.length > shown.length ? `<button class="block" data-act="more" style="margin-top:12px">Ver más (${list.length - shown.length})</button>` : ''}`;
}

function addExercise(target, id) {
  if (target === 'w' && db.active) {
    db.active.entries.push(newEntry(id));
  } else {
    const r = db.routines.find(x => 'r:' + x.id === target);
    if (!r) return false;
    if (!r.exercises.includes(id)) r.exercises.push(id);
  }
  save(); toast('Añadido: ' + exName(id));
  return true;
}

// ---------- vista: detalle de ejercicio ----------
function viewExercise({ arg }) {
  const e = ex(arg);
  if (!e) { view.innerHTML = '<p class="empty">Ejercicio no encontrado.</p>'; return; }
  const hist = sessionsWith(e.id);
  const best = hist.flatMap(h => h.sets).reduce((b, s) => (!b || s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps) ? s : b), null);
  view.innerHTML = `
    <div class="topbar"><button class="ghost" data-act="back" aria-label="Volver">‹</button><h1>${esc(e.name)}</h1></div>
    <div class="demo">
      ${e.images[0] ? `<img src="${imgUrl(e, 0)}" alt="${esc(e.name)}: posición inicial">` : ''}
      ${e.images[1] ? `<img id="img2" src="${imgUrl(e, 1)}" alt="${esc(e.name)}: posición final" style="opacity:0">` : ''}
      <span class="badge" id="phase">Inicio</span>
    </div>
    <div class="chips">
      <span class="chip">${tr('category', e.category)}</span>
      ${e.level ? `<span class="chip">${tr('level', e.level)}</span>` : ''}
      <span class="chip">${tr('equipment', e.equipment)}</span>
    </div>
    <p><b>Músculo principal:</b> ${esc(mainMuscle(e.id))}</p>
    ${e.secondaryMuscles.length ? `<p class="muted">Secundarios: ${e.secondaryMuscles.map(m => tr('muscles', m)).join(', ')}</p>` : ''}
    <div class="row-actions">
      ${db.active ? '<button class="primary" data-act="add-w">Añadir al entrenamiento</button>' : ''}
      <button data-act="add-r-sheet">Añadir a una rutina…</button>
    </div>
    ${hist.length ? `<h2>Tu progreso</h2>
      ${best ? `<p>Mejor serie: <b>${setLabel(best)}</b></p>` : ''}
      <div class="card">${hist.slice(0, 6).map(h => `<p class="setline"><span class="muted">${fmtDay(h.w.start)}:</span> ${h.sets.map(setLabel).join(' · ')}</p>`).join('')}</div>` : ''}
    <h2>Cómo se hace</h2>
    <p class="muted small">Instrucciones originales en inglés.</p>
    <ol class="steps">${e.instructions.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  const img2 = $('#img2'), phase = $('#phase');
  if (img2) {
    let on = false;
    const t = setInterval(() => { on = !on; img2.style.opacity = on ? 1 : 0; phase.textContent = on ? 'Final' : 'Inicio'; }, 1300);
    cleanups.push(() => clearInterval(t));
  } else phase.remove();
}

function routineSheet(exId) {
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-label="Añadir a una rutina">
    <h2>Añadir a una rutina</h2>
    <div class="list">${db.routines.map(r => `
      <button class="item" data-act="add-r" data-rid="${r.id}" data-ex="${esc(exId)}">
        <div class="grow"><div class="title">${esc(r.name)}</div><div class="muted small">${r.exercises.length} ejercicios</div></div>
        ${r.exercises.includes(exId) ? '<span style="color:var(--done)">✓</span>' : '＋'}</button>`).join('')}
      <button class="item" data-act="add-r-new" data-ex="${esc(exId)}"><div class="grow"><div class="title">+ Nueva rutina</div></div></button>
    </div>
    <button class="block ghost" data-act="sheet-close" style="margin-top:8px">Cancelar</button>
  </div>`;
  bg.addEventListener('click', ev => { if (ev.target === bg) bg.remove(); });
  document.body.appendChild(bg);
}
const closeSheet = () => document.querySelectorAll('.sheet-bg').forEach(s => s.remove());

// ---------- vista: historial ----------
function sessionItem(w) {
  return `<a class="item" href="#/sesion/${w.id}">
    <div class="grow"><div class="title">${esc(w.name)}</div>
    <div class="muted small">${fmtDay(w.start)} · ${fmtDur(w.end - w.start)} · ${w.entries.length} ejercicios · ${fmtNum(volume(w.entries))} kg</div></div>
    <span aria-hidden="true">›</span></a>`;
}

function viewHistory() {
  const week = db.workouts.filter(w => w.start > Date.now() - 7 * 864e5).length;
  view.innerHTML = `
    <h1>Historial</h1>
    <div class="stats">
      <div class="stat"><b>${db.workouts.length}</b><span>entrenamientos</span></div>
      <div class="stat"><b>${week}</b><span>últimos 7 días</span></div>
      <div class="stat"><b>${fmtNum(Math.round(volume(db.workouts.flatMap(w => w.entries))))}</b><span>kg levantados</span></div>
    </div>
    ${db.workouts.length ? `<div class="list">${[...db.workouts].reverse().map(sessionItem).join('')}</div>`
      : '<p class="empty">Cuando termines un entrenamiento aparecerá aquí.</p>'}
    <h2>Copia de seguridad</h2>
    <p class="muted small">Tus datos se guardan solo en este móvil. Exporta una copia de vez en cuando para no perderlos.</p>
    <div class="row-actions">
      <button data-act="export">Exportar</button>
      <label class="btn">Importar<input type="file" id="import" accept="application/json,.json" hidden></label>
    </div>`;
  $('#import').addEventListener('change', importFile);
}

function viewSession({ arg }) {
  const w = db.workouts.find(x => x.id === arg);
  if (!w) return go('#/historial');
  view.innerHTML = `
    <div class="topbar"><a class="btn ghost" href="#/historial" aria-label="Volver">‹</a><h1>${esc(w.name)}</h1></div>
    <p class="muted">${fmtLong(w.start)}<br>${fmtTime(w.start)} – ${fmtTime(w.end)} · ${fmtDur(w.end - w.start)}</p>
    <div class="stats">
      <div class="stat"><b>${w.entries.length}</b><span>ejercicios</span></div>
      <div class="stat"><b>${countSets(w.entries)}</b><span>series</span></div>
      <div class="stat"><b>${fmtNum(volume(w.entries))}</b><span>kg totales</span></div>
    </div>
    ${w.entries.map(en => `<div class="card">
      <div class="entry-head"><a href="#/ejercicio/${encodeURIComponent(en.exId)}">${thumb(en.exId)}</a>
        <div class="grow"><div class="title">${esc(exName(en.exId))}</div><div class="muted small">${esc(mainMuscle(en.exId))}</div></div></div>
      <div style="margin-top:8px">${en.sets.map((s, j) => `<p class="setline"><span class="muted">${j + 1}.</span> ${setLabel(s)}</p>`).join('')}</div>
    </div>`).join('')}
    <div class="row-actions"><button class="primary" data-act="repeat" data-wid="${w.id}">Repetir este entrenamiento</button></div>
    <button class="ghost danger block" data-act="session-del" data-wid="${w.id}">Eliminar del historial</button>`;
}

function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'diario-gym', version: 1, exported: new Date().toISOString(), ...db }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `diario-gym-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importFile(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  file.text().then(txt => {
    const data = JSON.parse(txt);
    if (!Array.isArray(data.routines) || !Array.isArray(data.workouts)) throw new Error('formato');
    if (!confirm(`Se cargarán ${data.routines.length} rutinas y ${data.workouts.length} entrenamientos, sustituyendo los datos actuales. ¿Continuar?`)) return;
    db = { routines: data.routines, workouts: data.workouts, active: data.active || null };
    save(); toast('Copia importada'); render();
  }).catch(() => toast('⚠️ El archivo no es una copia válida'));
  ev.target.value = '';
}

// ---------- acciones ----------
const ACTIONS = {
  start: d => {
    const r = d.rid && db.routines.find(x => x.id === d.rid);
    startWorkout(r ? { name: r.name, exIds: r.exercises, routineId: r.id } : { name: 'Entrenamiento libre' });
  },
  pick: d => go('#/elegir/' + d.target),
  'set-done': d => {
    const s = db.active.entries[d.i].sets[d.j];
    if (!s.done) {
      if (s.reps == null) s.reps = s.hr;
      if (s.weight == null) s.weight = s.hw;
      if (!s.reps) { toast('Escribe las repeticiones'); return; }
    }
    s.done = !s.done; save(); render();
  },
  'set-add': d => {
    const sets = db.active.entries[d.i].sets, l = sets[sets.length - 1] || {};
    sets.push({ reps: null, weight: null, hr: l.reps ?? l.hr ?? null, hw: l.weight ?? l.hw ?? null, done: false });
    save(); render();
  },
  'set-del': d => { db.active.entries[d.i].sets.splice(d.j, 1); save(); render(); },
  'entry-del': d => {
    const en = db.active.entries[d.i];
    if (en.sets.some(s => s.reps) && !confirm(`¿Quitar ${exName(en.exId)} y sus series?`)) return;
    db.active.entries.splice(d.i, 1); save(); render();
  },
  finish: () => {
    const w = db.active;
    const entries = w.entries
      .map(en => ({ exId: en.exId, sets: en.sets.filter(s => s.reps > 0).map(s => ({ reps: s.reps, weight: s.weight || 0 })) }))
      .filter(en => en.sets.length);
    if (!entries.length) {
      if (confirm('No hay ninguna serie con repeticiones. ¿Descartar el entrenamiento?')) { db.active = null; save(); render(); }
      return;
    }
    if (!confirm('¿Terminar y guardar el entrenamiento?')) return;
    const done = { id: w.id, routineId: w.routineId, name: w.name, start: w.start, end: Date.now(), entries };
    db.workouts.push(done); db.active = null; save();
    toast('¡Entrenamiento guardado! 💪');
    go('#/sesion/' + done.id);
  },
  discard: () => { if (confirm('¿Descartar este entrenamiento? Se perderán las series.')) { db.active = null; save(); render(); } },
  'routine-new': () => {
    const r = { id: uid(), name: 'Nueva rutina', exercises: [] };
    db.routines.push(r); save();
    afterRender = () => { const i = $('#rname'); if (i) { i.focus(); i.select(); } };
    go('#/rutina/' + r.id);
  },
  'routine-del': d => {
    const r = db.routines.find(x => x.id === d.rid);
    if (!confirm(`¿Eliminar la rutina «${r.name}»? Tu historial no se borra.`)) return;
    db.routines = db.routines.filter(x => x.id !== d.rid); save(); go('#/rutinas');
  },
  'r-move': d => {
    const r = db.routines.find(x => x.id === route().arg), i = +d.i, k = i + +d.d;
    [r.exercises[i], r.exercises[k]] = [r.exercises[k], r.exercises[i]]; save(); render();
  },
  'r-del': d => { db.routines.find(x => x.id === route().arg).exercises.splice(d.i, 1); save(); render(); },
  add: d => { if (addExercise(d.target, d.ex)) renderResults(pickTarget(d.target), d.target); },
  more: () => { lib.shown += PAGE; const r = route(); renderResults(r.name === 'elegir' ? pickTarget(r.arg) : null, r.arg); },
  back: () => (history.length > 1 ? history.back() : go('#/ejercicios')),
  'add-w': () => { addExercise('w', route().arg); go('#/entrenar'); },
  'add-r-sheet': () => routineSheet(route().arg),
  'add-r': d => { addExercise('r:' + d.rid, d.ex); closeSheet(); },
  'add-r-new': d => {
    const r = { id: uid(), name: 'Nueva rutina', exercises: [d.ex] };
    db.routines.push(r); save(); closeSheet();
    afterRender = () => { const i = $('#rname'); if (i) { i.focus(); i.select(); } };
    go('#/rutina/' + r.id);
  },
  'sheet-close': closeSheet,
  'session-del': d => {
    if (!confirm('¿Eliminar este entrenamiento del historial? No se puede deshacer.')) return;
    db.workouts = db.workouts.filter(w => w.id !== d.wid); save(); go('#/historial');
  },
  repeat: d => {
    const w = db.workouts.find(x => x.id === d.wid);
    startWorkout({ name: w.name, exIds: w.entries.map(e => e.exId), routineId: w.routineId });
  },
  export: exportData,
};

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const fn = ACTIONS[b.dataset.act];
  if (fn) { ev.preventDefault(); fn(b.dataset, b); }
});

view.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.field && db.active) {
    const s = db.active.entries[el.dataset.i].sets[el.dataset.j];
    const v = num(el.value);
    s[el.dataset.field] = el.dataset.field === 'reps' && v != null ? Math.round(v) : v;
    save();
  } else if (el.dataset.input === 'rename') {
    const r = db.routines.find(x => x.id === el.dataset.rid);
    r.name = el.value.trim() || 'Sin nombre'; $('#rtitle').textContent = r.name; save();
  } else if (el.dataset.input === 'lib') {
    lib.q = $('#q').value; lib.m = $('#fm').value; lib.e = $('#fe').value; lib.shown = PAGE;
    const r = route();
    renderResults(r.name === 'elegir' ? pickTarget(r.arg) : null, r.arg);
  }
});

window.addEventListener('hashchange', render);

// ---------- arranque ----------
render();
fetch('data/exercises.json')
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(list => {
    for (const e of list) {
      e._hay = fold([e.name, e.equipment, ...e.primaryMuscles, ...e.primaryMuscles.map(m => tr('muscles', m)), tr('equipment', e.equipment)].join(' '));
      EX_BY_ID.set(e.id, e);
    }
    const rank = c => { const i = CAT_ORDER.indexOf(c); return i < 0 ? 99 : i; };
    EX = list.sort((a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name));
    render();
  })
  .catch(() => { view.innerHTML = '<p class="empty">No se pudo cargar la biblioteca de ejercicios. Comprueba la conexión y vuelve a abrir la app.</p>'; });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
