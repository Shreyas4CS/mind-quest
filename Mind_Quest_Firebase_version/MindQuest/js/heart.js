/* ================================================================
   Heart sensor: HW-605 finger sensor (MAX30102) on an Arduino UNO R4 WiFi, over Bluetooth
   (Web Bluetooth: Chrome or Edge). Same board sketch as before:
   arduino/MindQuestSensors/MindQuestSensors.ino (UUIDs and packets must match).
   Live on screen: heart rate, blood oxygen, beat-to-beat gaps (HRV), a stress meter against the
   child's own calm level and the pulse wave. For the report: heart rate through the quest, by
   activity, after right and wrong answers, HRV, blood oxygen and a 5-second pulse strip.
   Optional: everything works without it.
   ================================================================ */
const BIO_UUID = { svc: '6d710000-4d51-4b8e-9c3a-2f5c0a1b7e01', vit: '6d710001-4d51-4b8e-9c3a-2f5c0a1b7e01', wave: '6d710002-4d51-4b8e-9c3a-2f5c0a1b7e01', beat: '6d710003-4d51-4b8e-9c3a-2f5c0a1b7e01', cmd: '6d710004-4d51-4b8e-9c3a-2f5c0a1b7e01' };
const BIO_CMD = { mission: 1, right: 2, wrong: 3, mirror: 4, end: 5, calm: 6, text: 7, view: 8, hello: 9 };
function rmssd(rr, min = 15) {   // beat-to-beat variability; jumps over 20% are a moving finger, not the heart
  const d = []; for (let k = 1; k < rr.length; k++) { const a = rr[k - 1], b = rr[k]; if (Math.abs(b - a) < .2 * a) d.push((b - a) ** 2); }
  return d.length >= min ? Math.round(Math.sqrt(mean(d))) : null;
}
const Heart = {
  dev: null, ch: {}, state: 'off', userOff: false, tries: 0, rt: 0, q: Promise.resolve(), timer: 0,
  live: { hr: 0, spo2: 0, finger: false, sensor: false, found: false, pi: 0, t: 0 },
  wave: new Uint8Array(300).fill(128), wi: 0, waveAt: 0, snip: [], rrLive: [],
  rec: null, onChange: null,
  get can() { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); },
  async connect(name = '') {
    if (!this.can) return toast(ico('info') + ' This browser cannot use Bluetooth. Use Chrome or Edge on a laptop or Android tablet.', 5000);
    this.userOff = false; clearTimeout(this.rt);
    try {
      this.set('connecting');
      const dev = await navigator.bluetooth.requestDevice({ filters: [{ services: [BIO_UUID.svc] }, { namePrefix: 'MindQuest' }], optionalServices: [BIO_UUID.svc] });
      if (dev !== this.dev) { this.dev = dev; dev.addEventListener('gattserverdisconnected', () => this.lost()); }
      await this.link(name);
    } catch (e) {
      this.set('off');
      if (e && e.name !== 'NotFoundError') toast(ico('info') + ' Could not connect to the sensor board. Check it is on and close by.', 4500);
    }
  },
  async link(name) {
    this.set('connecting');
    const server = await this.dev.gatt.connect(), svc = await server.getPrimaryService(BIO_UUID.svc);
    for (const k of ['vit', 'beat', 'cmd']) this.ch[k] = await svc.getCharacteristic(BIO_UUID[k]);
    try { this.ch.wave = await svc.getCharacteristic(BIO_UUID.wave); } catch (e) { this.ch.wave = null; }   // older sketches have no pulse wave
    const on = (k, fn) => { const c = this.ch[k], h = this['_' + k] || (this['_' + k] = e => fn.call(this, e.target.value)); c.removeEventListener('characteristicvaluechanged', h); c.addEventListener('characteristicvaluechanged', h); return c.startNotifications(); };
    await on('vit', this.onVit); await on('beat', this.onBeat); if (this.ch.wave) await on('wave', this.onWave).catch(() => {});
    this.tries = 0; this.set('on'); this.send([BIO_CMD.hello]);
    if (name) setTimeout(() => this.text('HI ' + name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 12)), 1000);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1000);
    if (!this.drawT) { const loop = () => { this.draw(); this.drawT = requestAnimationFrame(loop); }; this.drawT = requestAnimationFrame(loop); }
    toast(ico('heart') + ' Heart sensor connected', 2500);
  },
  lost() { this.ch = {}; this.live.hr = 0; if (this.userOff) return this.set('off'); this.set('lost'); this.retry(); },
  retry() {
    if (this.userOff || !this.dev || this.tries >= 6) return this.set('off');
    const wait = [1, 2, 3, 5, 8, 8][this.tries++] * 1000; clearTimeout(this.rt);
    this.rt = setTimeout(() => this.link().catch(() => this.retry()), wait);
  },
  disconnect() { this.userOff = true; clearTimeout(this.rt); try { if (this.dev && this.dev.gatt.connected) this.dev.gatt.disconnect(); } catch (e) { /* gone */ } this.ch = {}; this.live.hr = 0; this.set('off'); },
  send(bytes) { const c = this.ch.cmd; if (!c || this.state !== 'on') return; const d = new Uint8Array(bytes); this.q = this.q.then(() => c.writeValueWithoutResponse ? c.writeValueWithoutResponse(d) : c.writeValue(d)).catch(() => {}); },
  text(t) { this.send([BIO_CMD.text, ...[...t.slice(0, 18)].map(c => c.charCodeAt(0) & 127)]); },
  onVit(dv) {   // [2, flags, bpm, oxygen %, seq, beats, gap lo, hi, pulse strength (0.01 %) lo, hi, light / 4 lo, hi]
    if (dv.getUint8(0) !== 2) return;
    const f = dv.getUint8(1), hr = dv.getUint8(2), ox = dv.getUint8(3), L = this.live;   // flags: 1 sensor, 2 finger, 4 heartbeat found, 16 oxygen ready
    L.sensor = !!(f & 1); L.finger = !!(f & 2); L.found = !!(f & 4);
    L.hr = L.found && hr >= 40 && hr <= 210 ? hr : 0; L.spo2 = (f & 16) && ox >= 70 && ox <= 100 ? ox : 0;
    L.pi = dv.byteLength >= 10 ? dv.getUint16(8, true) / 100 : 0; L.t = performance.now();
    this.paint();
  },
  onBeat(dv) {   // [2, seq, gap since the last beat (ms) lo, hi, bpm, oxygen %]
    const rr = dv.getUint16(2, true);
    for (const h of $$('#hbHeart, #qHr .i')) { h.classList.remove('beat'); void h.offsetWidth; h.classList.add('beat'); }
    if (rr < 300 || rr > 1500) return;
    this.rrLive.push(rr); if (this.rrLive.length > 40) this.rrLive.shift();
    if (!this.rec) return;
    (this.rec.rr = this.rec.rr || []).push(rr); if (this.rec.rr.length > 4000) this.rec.rr.shift();
  },
  onWave(dv) {   // [seq, 2, 18 pulse-wave points]: 100 points a second while a finger is on the sensor
    const now = performance.now();
    if (now - this.waveAt > 400) { this.wave.fill(128); this.snip = []; }   // the finger was lifted: start a fresh line
    this.waveAt = now;
    for (let k = 2; k < dv.byteLength; k++) { const v = dv.getUint8(k); this.wave[this.wi] = v; this.wi = (this.wi + 1) % this.wave.length; this.snip.push(v); }
    if (this.snip.length >= 500) {   // keep one clean 5-second pulse strip for the report, refreshed each minute
      const lo = Math.min(...this.snip), hi = Math.max(...this.snip), r = this.rec;
      if (r && this.live.found && hi - lo > 60 && lo > 4 && hi < 251 && (!r.stripAt || now - r.stripAt > 60000)) { r.strip = this.snip.slice(0, 500).filter((_, k) => k % 2 === 0); r.stripAt = now; }
      this.snip = [];
    }
  },
  /* the child's own calm level: a low point of this quest's heart rate */
  calm() { const t = (this.rec && this.rec.trace || []).filter(Boolean); if (t.length < 20) return null; const s = t.slice().sort((a, b) => a - b); return s[Math.floor(s.length * .2)]; },
  mark(i) { if (this.rec) this.rec.item = i; },
  event(correct) { const r = this.rec; if (!r || this.state !== 'on') return; (r.ev = r.ev || []).push([(r.trace || []).length, correct ? 1 : 0]); this.send([correct ? BIO_CMD.right : BIO_CMD.wrong]); },
  /* once a second while a quest runs: heart rate tagged with the activity */
  tick() {
    const r = this.rec, L = this.live; if (!r || this.state !== 'on') return;
    const hr = performance.now() - L.t < 2500 ? L.hr : 0;
    (r.trace = r.trace || []).push(hr); (r.items = r.items || []).push(r.item == null ? -1 : r.item);
    if (r.trace.length > 3600) { r.trace.shift(); r.items.shift(); }
    if (!hr) return;
    const k = r.curType || 'between'; r.byType = r.byType || {}; const b = r.byType[k] = r.byType[k] || { n: 0, sum: 0 }; b.n++; b.sum += hr;
    r.n = (r.n || 0) + 1; r.sum = (r.sum || 0) + hr; r.min = Math.min(r.min || 999, hr); r.max = Math.max(r.max || 0, hr);
    if (L.spo2) { r.oxN = (r.oxN || 0) + 1; r.oxSum = (r.oxSum || 0) + L.spo2; r.oxMin = Math.min(r.oxMin || 100, L.spo2); }
  },
  set(st) { this.state = st; this.paint(); this.onChange && this.onChange(st); },
  /* the live panel next to the camera, and the heart chip in the quest bar */
  paint() {
    const b = document.getElementById('heartBox'), L = this.live, on = this.state === 'on', fresh = on && performance.now() - L.t < 2500, hr = fresh && L.hr ? L.hr : 0;
    const chip = document.getElementById('qHr');
    if (chip) { chip.hidden = !on; chip.querySelector('b').textContent = hr || '--'; chip.title = hr ? `Heart rate ${hr} bpm${L.spo2 ? `, blood oxygen ${L.spo2}%` : ''}` : 'Heart sensor connected'; }
    if (!b) return;
    b.dataset.state = this.state; b.classList.toggle('nobt', !this.can);
    const set = (id, v) => { const n = document.getElementById(id); if (n && n.innerHTML !== String(v)) n.innerHTML = v; };
    set('bbStatus', { off: 'Not connected', connecting: 'Connecting…', on: 'Connected', lost: 'Reconnecting…' }[this.state]);
    $('#bbOff').hidden = on; $('#bbOn').hidden = !on; $('#bbConnect').hidden = this.state === 'connecting' || this.state === 'lost';
    if (!on) return;
    set('bbHr', hr || '--');
    set('bbHrSrc', hr ? 'from the fingertip' : !fresh ? 'waiting for the board' : !L.sensor ? 'sensor not found: check the 3V3 jumper' : !L.finger ? 'place a fingertip on the sensor' : 'finding the heartbeat, keep still');
    set('bbSpo2', fresh && L.spo2 ? L.spo2 : '--');
    const hrv = rmssd(this.rrLive, 8); set('bbHrv', hrv != null ? hrv : '--');
    const calm = this.calm(), rise = hr && calm ? hr - calm : null;
    const lv = rise == null ? null : rise < 8 ? ['Low', 'ok', 25] : rise < 18 ? ['Medium', 'mid', 60] : ['High', 'bad', 92];
    set('bbCalm', calm ? calm + ' bpm' : 'learning…'); set('bbStress', lv ? lv[0] : '--');
    $('#bbStressRow').dataset.lv = lv ? lv[1] : ''; $('#bbMeter').style.width = (lv ? lv[2] : 0) + '%';
    const fc = !fresh ? ['na', 'info', 'Waiting'] : !L.sensor ? ['bad', 'info', 'Sensor not found'] : L.finger ? ['ok', 'check', 'Finger on'] : ['warn', 'hand', 'Place finger'];
    const sc = !(fresh && L.finger) ? ['na', 'heart', 'No pulse yet'] : !L.found ? ['warn', 'info', 'Keep still'] : L.pi >= .3 || !L.pi ? ['ok', 'heart', 'Strong pulse'] : ['warn', 'heart', 'Weak pulse'];
    $('#bbFinger').className = fc[0]; set('bbFinger', `${ico(fc[1])} ${fc[2]}`);
    $('#bbSignal').className = sc[0]; set('bbSignal', `${ico(sc[1])} ${sc[2]}`);
  },
  draw() {   // live pulse wave from the fingertip
    const c = document.getElementById('bbWave'); if (!c || this.state !== 'on' || !c.offsetParent) return;
    const x = c.getContext('2d'), w = c.width, h = c.height, n = this.wave.length, L = this.live;
    x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(247,148,29,.16)'; x.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 11) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, h); x.stroke(); }
    const live = performance.now() - this.waveAt < 1500, fresh = performance.now() - L.t < 2500;
    x.font = '600 20px Poppins, sans-serif'; x.textAlign = 'center';
    if (!live) { x.fillStyle = fresh && !L.sensor ? '#C0262D' : '#8E8D94'; x.fillText(!this.ch.wave ? (L.hr ? `${L.hr} bpm` : 'Waiting for a heartbeat') : fresh && !L.sensor ? 'Sensor not found: check the 4 wires' : 'Place a fingertip on the sensor', w / 2, h / 2 + 7); return; }
    let lo = 255, hi = 0; for (let k = 0; k < n; k++) { lo = Math.min(lo, this.wave[k]); hi = Math.max(hi, this.wave[k]); }
    const span = Math.max(hi - lo, 30); x.strokeStyle = '#F7941D'; x.lineWidth = 3; x.lineJoin = 'round'; x.beginPath();
    for (let k = 0; k < n; k++) { const v = this.wave[(this.wi + k) % n], px = k / (n - 1) * w, py = h - 4 - (v - lo) / span * (h - 8); k ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke(); x.font = '700 16px Poppins, sans-serif'; x.textAlign = 'left'; x.fillStyle = '#D9730A'; x.fillText('PULSE', 8, 20);
  },
  /* what is saved with the week (small: the trace is thinned to at most 360 points) */
  summary(r) {
    if (!r || !r.n) return null;
    const byType = {}; for (const k in r.byType || {}) if (r.byType[k].n >= 5) byType[k] = Math.round(r.byType[k].sum / r.byType[k].n);
    const tr = r.trace || [], it = r.items || [], step = Math.max(1, Math.ceil(tr.length / 360));
    const trace = [], items = []; for (let k = 0; k < tr.length; k += step) { trace.push(tr[k]); items.push(it[k]); }
    const ok = tr.filter(Boolean).sort((a, b) => a - b), calm = ok.length > 20 ? ok[Math.floor(ok.length * .2)] : null;
    const react = c => { const d = (r.ev || []).filter(e => e[1] === c).map(([at]) => { const before = tr.slice(Math.max(0, at - 5), at).filter(Boolean), after = tr.slice(at + 2, at + 9).filter(Boolean); return before.length >= 2 && after.length >= 2 ? Math.max(...after) - mean(before) : null; }).filter(v => v != null); return d.length >= 2 ? { bpm: Math.round(mean(d)), n: d.length } : null; };
    const perItem = {}; tr.forEach((h, k) => { if (!h || it[k] < 0) return; const p = perItem[it[k]] = perItem[it[k]] || [0, 0]; p[0] += h; p[1]++; });
    const items2 = Object.fromEntries(Object.entries(perItem).filter(([, p]) => p[1] >= 5).map(([k, p]) => [k, Math.round(p[0] / p[1])]));
    return { avg: Math.round(r.sum / r.n), min: r.min, max: r.max, calm, byType, hrv: rmssd(r.rr || []), spo2: r.oxN ? Math.round(r.oxSum / r.oxN) : null, spo2Low: r.oxMin || null, secs: r.n,
      trace, traceStep: step, traceItems: items, perItem: items2, ev: (r.ev || []).map(([at, c]) => ({ at: Math.floor(at / step), ok: c })), wrong: react(0), right: react(1), strip: r.strip || null };
  }
};
setInterval(() => { if (Heart.state === 'on') Heart.paint(); }, 1000);
