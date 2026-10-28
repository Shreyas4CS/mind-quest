/* ================================================================
   MindQuest core helpers: DOM, icons, toasts, modals, voice, sounds
   ================================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const pct = v => Math.round((v || 0) * 100);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const svgUse = (cls, id) => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
const ico = (n, cls = '') => svgUse('i' + (cls ? ' ' + cls : ''), 'i-' + n);
const faceSvg = (k, cls = '') => svgUse('fc' + (cls ? ' ' + cls : ''), 'f-' + k);
const worldSvg = (k, cls = '') => svgUse('wd' + (cls ? ' ' + cls : ''), 'w-' + k);
const MASCOT = svgUse('mascot-svg', 'm-guide');
const hashStr = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const qs = k => new URLSearchParams(location.search).get(k);

/* minutes and seconds: 75000 ms -> "1 min 15 s"; short form "1:15" */
function fmtDur(ms, short = false) {
  const s = Math.round((ms || 0) / 1000), m = Math.floor(s / 60), r = s % 60;
  if (short) return `${m}:${String(r).padStart(2, '0')}`;
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return m ? `${m} min${r ? ' ' + r + ' s' : ''}` : `${r} s`;
}
const fmtDate = t => t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* ---------- toasts and modals ---------- */
function toast(html, ms = 3000) {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}
function modal(html, { wide = false, onClose } = {}) {
  const wrap = document.createElement('div'); wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true"><button class="modal-x" aria-label="Close">${ico('close')}</button>${html}</div>`;
  const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); onClose && onClose(); };
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.modal-x')) close(); });
  document.body.append(wrap); wrap.close = close; return wrap;
}

/* ---------- the "i" info buttons: short meaning on click; the full glossary is a download ---------- */
function info(term) { return `<button type="button" class="info-i" data-term="${esc(term)}" aria-label="What does this mean?">i</button>`; }
document.addEventListener('click', e => {
  const b = e.target.closest('.info-i'); $$('.info-pop').forEach(p => p.remove());
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const g = (typeof GLOSSARY !== 'undefined' ? GLOSSARY : {})[b.dataset.term] || { t: b.dataset.term, d: 'See the full glossary for details.' };
  const p = document.createElement('div'); p.className = 'info-pop';
  p.innerHTML = `<b>${esc(g.t)}</b><p>${esc(g.d)}</p>${g.how ? `<p class="how">${ico('bulb')} ${esc(g.how)}</p>` : ''}<small>Full details: Download glossary</small>`;
  document.body.append(p);
  const r = b.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
  p.style.width = w + 'px'; p.style.left = clamp(r.left + scrollX - w / 2 + 10, 12 + scrollX, scrollX + innerWidth - w - 12) + 'px'; p.style.top = (r.bottom + scrollY + 8) + 'px';
});

/* ---------- voice: the app speaks (text to speech) and listens (speech to text) ---------- */
const Voice = {
  muted: (() => { try { return localStorage.getItem('mq.muted') === '1'; } catch (e) { return false; } })(),
  voice: null, token: 0,
  pickVoice() {
    if (!window.speechSynthesis) return null;
    const vs = speechSynthesis.getVoices(); if (!vs.length) return null;
    const score = v => (/en-IN/i.test(v.lang) ? 6 : /en-GB/i.test(v.lang) ? 4 : /^en/i.test(v.lang) ? 3 : 0) + (/female|zira|heera|veena|samantha|google/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
    return this.voice = vs.slice().sort((a, b) => score(b) - score(a))[0];
  },
  setMuted(m) { this.muted = m; try { localStorage.setItem('mq.muted', m ? '1' : '0'); } catch (e) { /* private mode */ } if (m) this.stop(); $$('.voice-toggle').forEach(b => { b.innerHTML = ico(m ? 'mute' : 'sound') + `<span>${m ? 'Voice off' : 'Voice on'}</span>`; b.setAttribute('aria-pressed', m ? 'false' : 'true'); }); },
  stop() { this.token++; try { speechSynthesis.cancel(); } catch (e) { /* none */ } $$('.speaking').forEach(n => n.classList.remove('speaking')); },
  /* speaks and resolves when finished (or at once when muted / unsupported) */
  say(text, { rate = .95, pitch = 1.08, el = null } = {}) {
    if (this.muted || !window.speechSynthesis || !text) return Promise.resolve();
    this.stop(); const my = ++this.token;
    const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = clean.match(/[^.!?]+[.!?]*/g) || [clean];   // short chunks: Chrome stops long utterances
    if (el) el.classList.add('speaking');
    return new Promise(res => {
      let i = 0;
      const next = () => {
        if (my !== this.token || i >= parts.length) { if (el) el.classList.remove('speaking'); return res(); }
        const u = new SpeechSynthesisUtterance(parts[i++].trim()); u.rate = rate; u.pitch = pitch; u.lang = 'en-IN';
        const v = this.voice || this.pickVoice(); if (v) { u.voice = v; u.lang = v.lang; }
        let done = false; const fin = () => { if (!done) { done = true; next(); } };
        u.onend = fin; u.onerror = fin; setTimeout(fin, 1500 + parts[i - 1].length * 110);   // some browsers never fire onend
        speechSynthesis.speak(u);
      };
      next();
    });
  },
  get canListen() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
  /* listens once; onPartial(text) while speaking; resolves with the final text ('' if nothing) */
  listen({ onPartial, maxMs = 20000 } = {}) {
    return new Promise(res => {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return res('');
      this.stop();
      const r = new R(); r.lang = 'en-IN'; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
      let finalTxt = '', live = '', quiet = 0, ended = false;
      const end = () => { if (ended) return; ended = true; clearTimeout(quiet); clearTimeout(cap); try { r.stop(); } catch (e) { /* stopped */ } res((finalTxt + ' ' + live).trim()); };
      r.onresult = e => {
        live = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finalTxt += ' ' + t; else live += t; }
        onPartial && onPartial((finalTxt + ' ' + live).trim());
        clearTimeout(quiet); quiet = setTimeout(end, 2600);   // 2.6 s of silence after speech ends the answer
      };
      r.onerror = () => end(); r.onend = () => end();
      const cap = setTimeout(end, maxMs);
      this._stopListen = end;
      try { r.start(); } catch (e) { end(); }
    });
  },
  stopListen() { this._stopListen && this._stopListen(); }
};
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => Voice.pickVoice();
document.addEventListener('click', e => { const b = e.target.closest('.voice-toggle'); if (b) Voice.setMuted(!Voice.muted); });

/* ---------- small sounds (WebAudio, no files) ---------- */
const Sfx = {
  ctx: null,
  tone(f, d = .12, type = 'sine', g = .07, at = 0) {
    try {
      const c = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)()); const t = c.currentTime + at;
      const o = c.createOscillator(), v = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(v).connect(c.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) { /* no audio */ }
  },
  click() { this.tone(660, .06, 'triangle', .05); },
  pop() { this.tone(880, .08, 'sine', .06); this.tone(1320, .06, 'sine', .04, .05); },
  good() { [523, 659, 784].forEach((f, i) => this.tone(f, .14, 'triangle', .06, i * .08)); },
  soft() { this.tone(440, .12, 'sine', .05); },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .2, 'triangle', .07, i * .11)); }
};

/* ---------- confetti burst (drawn shapes, no emoji) ---------- */
function confetti(n = 80) {
  const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth; c.height = innerHeight; document.body.append(c);
  const x = c.getContext('2d'), cols = ['#F7941D', '#FFC93C', '#4D96FF', '#2EC4B6', '#FF6FB5', '#9B5DE5', '#5CC46A'];
  const P = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 6, r: Math.random() * 7 + 4, c: pick(cols), a: Math.random() * 6, s: Math.random() < .5 }));
  let f = 0;
  (function step() {
    x.clearRect(0, 0, c.width, c.height);
    for (const p of P) { p.x += p.vx; p.y += p.vy; p.vy += .45; p.vx *= .99; p.a += .15; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; if (p.s) x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { x.beginPath(); x.arc(0, 0, p.r / 1.4, 0, 7); x.fill(); } x.restore(); }
    if (++f < 110) requestAnimationFrame(step); else c.remove();
  })();
}

/* ---------- top bar shared by every signed-in page ---------- */
function topBar({ user, title = '', extra = '' }) {
  const bar = document.createElement('header'); bar.className = 'topbar';
  bar.innerHTML = `<a class="tb-brand" href="${user && user.role === 'staff' ? 'staff.html' : 'child.html'}"><img src="assets/logo.png" alt="CognoSpace"><span class="tb-app">Mind<b>Quest</b></span></a>
    <div class="tb-title">${title}</div>
    <div class="tb-right">${extra}
      <button class="tb-btn voice-toggle" aria-pressed="${!Voice.muted}">${ico(Voice.muted ? 'mute' : 'sound')}<span>${Voice.muted ? 'Voice off' : 'Voice on'}</span></button>
      ${user ? `<span class="tb-user">${ico(user.role === 'staff' ? 'school' : 'user')}<span>${esc(user.displayName || user.username)}</span></span>
      <button class="tb-btn" id="tbLogout">${ico('logout')}<span>Log out</span></button>` : ''}
    </div>`;
  document.body.prepend(bar);
  const lo = $('#tbLogout', bar); if (lo) lo.onclick = async () => { Voice.stop(); await Store.signOut(); location.href = 'index.html'; };
  if (Store.mode === 'local') {
    const b = document.createElement('div'); b.className = 'demo-banner';
    b.innerHTML = `${ico('info')} <b>Demo mode:</b> accounts and answers are saved only in this browser. Add your Firebase settings in <code>js/config.js</code> to go live (see SETUP.md).`;
    bar.after(b);
  }
  return bar;
}

/* sends people to the right page for their role; resolves with the signed-in user */
async function guard(role) {
  await Store.init();
  const u = Store.current();
  if (!u) { location.href = 'login.html'; return new Promise(() => {}); }
  if (role && u.role !== role) { location.href = u.role === 'staff' ? 'staff.html' : 'child.html'; return new Promise(() => {}); }
  return u;
}

/* elements with data-i get their doodle icon (empty ones become the icon, titled ones get it in front) */
function fillIcons(root = document) { $$('[data-i]', root).forEach(n => { if (n.dataset.iDone) return; n.dataset.iDone = 1; if (n.childNodes.length) n.insertAdjacentHTML('afterbegin', ico(n.dataset.i) + ' '); else n.innerHTML = ico(n.dataset.i); }); }
fillIcons();
$$('.coggy-av, .pw-coggy').forEach(n => n.innerHTML = MASCOT);
$$('#coggyAgain').forEach(n => n.innerHTML = ico('sound'));
