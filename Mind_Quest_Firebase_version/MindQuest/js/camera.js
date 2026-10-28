/* ================================================================
   Camera: facial expression (face-api + MediaPipe blendshapes) and gaze.
   Carried over from MindQuest v1 with its tuned rules (raised brows alone are not
   "surprised"; held surprise re-learns the child's relaxed face).
   Everything runs in the browser: video frames are never stored or sent anywhere;
   only the counts (how often each feeling / gaze direction) are saved with the week.
   ================================================================ */
const CDN = {
  faceapi: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js',
  faModels: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/',
  mpBundle: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
  mpWasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  mpModel: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
};
/* ---------------- Expression engine (v2) ----------------
   1. MediaPipe blendshapes are turned into FACS Action Units (AU) and measured against
      the child's OWN relaxed face, so small real muscle movements count.
   2. The face-api expression network reads an upscaled, light-balanced crop of the face.
   3. Both are fused, lightly smoothed and labelled with hysteresis (no flicker, no lag). */
const AU_KEYS = { AU1: ['browInnerUp'], AU2: ['browOuterUpLeft', 'browOuterUpRight'], AU4: ['browDownLeft', 'browDownRight'], AU5: ['eyeWideLeft', 'eyeWideRight'], AU6: ['cheekSquintLeft', 'cheekSquintRight'], AU7: ['eyeSquintLeft', 'eyeSquintRight'], AU9: ['noseSneerLeft', 'noseSneerRight'], AU10: ['mouthUpperUpLeft', 'mouthUpperUpRight'], AU12: ['mouthSmileLeft', 'mouthSmileRight'], AU15: ['mouthFrownLeft', 'mouthFrownRight'], AU17: ['mouthShrugLower'], AU20: ['mouthStretchLeft', 'mouthStretchRight'], AU23: ['mouthPressLeft', 'mouthPressRight'], AU26: ['jawOpen'] };
const AU_REST = { AU1: .2, AU2: .25, AU4: .05, AU5: .03, AU6: .02, AU7: .25, AU9: .02, AU10: .08, AU12: .04, AU15: .02, AU17: .08, AU20: .04, AU23: .05, AU26: .03 };
const AU_RANGE = { AU1: .4, AU2: .4, AU4: .4, AU5: .3, AU6: .4, AU7: .4, AU9: .3, AU10: .4, AU12: .5, AU15: .2, AU17: .3, AU20: .3, AU23: .3, AU26: .45 };
const NON_NEUTRAL = ['happy', 'surprised', 'sad', 'angry', 'fearful', 'disgusted'];
const norm = o => { const t = Object.values(o).reduce((a, c) => a + c, 0) || 1; const r = {}; for (const k in o) r[k] = o[k] / t; return r; };
const Expr = {
  base: null, gain: {}, calibrated: false, warm: [], cnn: null, cnnT: 0, p: null, dom: 'neutral', cand: null, candN: 0, lastAU: null, lastB: null, fmax: 0, lastT: 0, holdMs: 0,
  reset() { Object.assign(this, { base: null, gain: {}, calibrated: false, warm: [], warmT: 0, cnn: null, cnnT: 0, p: null, dom: 'neutral', cand: null, candN: 0, lastAU: null, lastB: null, lastT: 0, holdMs: 0 }); },
  au(b) { const o = {}; for (const k in AU_KEYS) o[k] = AU_KEYS[k].reduce((s, n) => s + (b[n] || 0), 0) / AU_KEYS[k].length; return o; },
  act(au) { const B = this.base || AU_REST, o = {}; for (const k in au) o[k] = clamp((au[k] - B[k]) / (this.gain[k] || AU_RANGE[k]), 0, 1); return o; },
  /* EMFACS-style prototypes: which action units make up each basic emotion */
  facs(a) {
    // raised brows alone are not surprise (many children rest with high brows, and head tilt lifts them): surprise also needs wide eyes or a dropped jaw
    const brow = Math.max(a.AU1, a.AU2), cue = Math.min(1, Math.max(a.AU5 / .45, a.AU26 / .4, (a.AU5 + a.AU26) / .65)), s = {
      happy: a.AU12 * (.8 + .2 * a.AU6) * (a.AU26 > .5 && Math.max(brow, a.AU5) > .3 ? .6 : 1),
      surprised: (.4 * brow + .3 * a.AU5 + .3 * a.AU26) * (cue >= 1 ? 1 : brow > .9 ? .5 : .2 + .5 * cue) * (Math.max(brow, a.AU5) > .25 ? 1 : .4),
      sad: (.4 * a.AU1 + .4 * Math.max(a.AU15, a.AU17) + .2 * a.AU4) * (1 - .8 * a.AU12) * (a.AU26 > .5 ? .5 : 1) * (Math.max(a.AU15, a.AU17) > .12 || a.AU4 > .25 ? 1 : .55),   // inner brows alone are not sadness
      angry: (.55 * a.AU4 + .25 * a.AU7 + .2 * Math.max(a.AU23, a.AU9)) * (1 - .6 * a.AU1) * (1 - .8 * a.AU12),
      fearful: (.3 * a.AU1 + .15 * a.AU2 + .25 * a.AU5 + .3 * a.AU20) * (1 - .5 * a.AU12) * (a.AU20 > .2 || a.AU5 > .45 ? 1 : .45),
      disgusted: (.5 * Math.max(a.AU9, a.AU10) + .3 * a.AU7 + .2 * a.AU15) * (1 - .7 * a.AU12)
    };
    this.fmax = Math.max(...Object.values(s)); s.neutral = clamp(1 - 2.2 * this.fmax, .02, 1);
    return norm(s);
  },
  /* the network over-predicts "neutral" on natural webcam faces, so its neutral vote is halved */
  debias(c) { const o = {}; for (const k of EMOTIONS) o[k] = (c[k] || 0) * (k === 'neutral' ? .5 : 1); return norm(o); },
  classify(b, cnn, fresh = 1) {
    const f = b ? this.facs(this.act(this.au(b))) : null, c = cnn ? this.debias(cnn) : null;
    // a clear muscle movement outweighs a "neutral" network vote; a confident non-neutral network vote is trusted
    const cTop = cnn ? Math.max(...NON_NEUTRAL.map(k => cnn[k] || 0)) : 0, wf = f ? 1 - (1 - clamp(.35 + .6 * this.fmax - .5 * cTop, .2, .75)) * fresh : 0;   // an older network vote counts less
    const p = f && c ? Object.fromEntries(EMOTIONS.map(k => [k, (1 - wf) * c[k] + wf * f[k]])) : (f || c);
    const top = NON_NEUTRAL.reduce((m, k) => p[k] > p[m] ? k : m, 'happy');
    return { p, top, dom: p[top] >= .25 && p[top] >= p.neutral * .5 ? top : 'neutral' };
  },
  update(b) {
    const now = performance.now(), age = now - this.cnnT, cnn = this.cnn && age < 1500 ? this.cnn : null;   // cnnT = when that frame was captured
    if (!b && !cnn) return null;
    const au = b ? this.au(b) : null; this.lastAU = au; this.lastB = b;
    const { p } = this.classify(b, cnn, clamp(1 - (age - 300) / 1200, 0, 1)), dt = this.lastT ? Math.min(2000, now - this.lastT) : 1000; this.lastT = now;
    const a = 1 - Math.exp(-dt / 180);   // time-based smoothing: same feel at 30 fps or on a slow laptop
    this.p = this.p ? Object.fromEntries(EMOTIONS.map(k => [k, this.p[k] * (1 - a) + p[k] * a])) : p;
    const top = NON_NEUTRAL.reduce((m, k) => this.p[k] > this.p[m] ? k : m, 'happy'), int = this.p[top];
    if (au && !this.calibrated) this.autoBase(au);
    else if (au && this.base && int < .15) for (const k in this.base) this.base[k] += .01 * (au[k] - this.base[k]);
    // real surprise lasts a second or two; a "surprised" or "fearful" face held for seconds is the resting face from a new angle, so the baseline catches up
    if (au && this.base && (this.dom === 'surprised' || this.dom === 'fearful')) { this.holdMs += dt; if (this.holdMs > 4000) { const k2 = 1 - Math.exp(-dt / 1200); for (const k of ['AU1', 'AU2', 'AU5', 'AU20', 'AU26']) this.base[k] += k2 * (au[k] - this.base[k]); } } else this.holdMs = 0;
    const want = int >= (this.dom === top ? .2 : .25) && int >= this.p.neutral * .5 ? top : this.dom !== 'neutral' && this.p[this.dom] >= .18 ? this.dom : 'neutral';
    if (want === this.dom) this.cand = null;
    else { if (this.cand === want) this.candN++; else { this.cand = want; this.candN = 1; } if (this.candN >= (dt >= 350 ? 1 : 2)) { this.dom = want; this.cand = null; } }
    return { p: this.p, dom: this.dom, int };
  },
  /* until the face warm-up runs, learn the relaxed face from the first 3 seconds (low percentile, capped) */
  autoBase(au) {
    if (this.base) return; const now = performance.now(); this.warm.push(au); this.warmT = this.warmT || now;
    if (now - this.warmT >= 3000 && this.warm.length >= 6) { const o = {}; for (const k in AU_REST) { const v = this.warm.map(x => x[k]).sort((a, b) => a - b); o[k] = Math.min(v[Math.floor(v.length * .3)], AU_REST[k] + .6 * AU_RANGE[k]); } this.base = o; this.warm = []; }
  },
  /* face warm-up: relaxed face → baseline; big smile and surprised face → personal range */
  tune(rest, smile, wow) {
    const q = (list, k, f) => { const v = list.map(x => x[k]).sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.floor(v.length * f))]; };
    const base = {}; for (const k in AU_REST) base[k] = q(rest, k, .5);
    const gain = {}, got = { smile: false, wow: false };
    const fit = (list, keys, flag) => keys.forEach(k => { const d = q(list, k, .9) - base[k]; if (d >= .3 * AU_RANGE[k]) { gain[k] = clamp(d, .5 * AU_RANGE[k], 1.2 * AU_RANGE[k]); got[flag] = true; } });
    if (smile.length) fit(smile, ['AU12', 'AU6'], 'smile');
    if (wow.length) fit(wow, ['AU1', 'AU2', 'AU5', 'AU26'], 'wow');
    Object.assign(this, { base, gain, calibrated: true, p: null, dom: 'neutral' });
    return got;
  }
};
const V = {
  stream: null, video: null, canvas: null, mode: 'setup', loadP: null, faReady: false, mp: null, aiFailed: false,
  live: { face: false, t: 0, emo: null, dom: 'neutral', int: 0, gaze: 'center', raw: null, box: null, pts: null },
  base: null, autoBase: [], closed: false, onBlink: null, running: false, lastVT: -1, mpT: 0, gs: { x: 0, y: 0 }, cropC: null,
  get on() { return !!(this.stream && this.stream.active); },
  get aiReady() { return this.faReady || !!this.mp; },
  async start() {
    if (this.on) return true;
    this.video = $('#camVideo'); this.canvas = $('#camOverlay');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    this.video.srcObject = this.stream; this.video.hidden = false; this.canvas.hidden = false;
    try { await this.video.play(); } catch (e) { /* autoplay muted should be fine */ }
    this.stream.getVideoTracks()[0].addEventListener('ended', () => { this.live.face = false; });
    if (!this.running) { this.running = true; this.fastLoop(); this.slowLoop(); }
    return true;
  },
  stop() { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.stream = null; this.live.face = false; if (this.video) this.video.srcObject = null; },
  mount(container, mode) {
    this.mode = mode; const v = this._v = $('#camVideo') || this._v, c = this._c = $('#camOverlay') || this._c;   // kept even if a container holding them was removed
    if (v.parentElement !== container) { container.prepend(c); container.prepend(v); }
    v.hidden = !this.on; c.hidden = !this.on; if (this.on) v.play().catch(() => {});
  },
  load() {
    if (this.loadP) return this.loadP;
    const fa = loadScript(CDN.faceapi).then(async () => {
      const tf = window.faceapi.tf;
      if (tf) { let ok = false; try { ok = await tf.setBackend('webgl'); } catch (e) { ok = false; } if (!ok) await tf.setBackend('cpu'); await tf.ready(); }
      const N = window.faceapi.nets;
      await Promise.all([N.tinyFaceDetector.loadFromUri(CDN.faModels), N.faceLandmark68TinyNet.loadFromUri(CDN.faModels), N.faceExpressionNet.loadFromUri(CDN.faModels)]);
      this.faCrop = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: .3 }); this.faFull = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: .35 });
      this.faReady = true;
    }).catch(e => console.warn('[MindQuest] expression model unavailable', e));
    const mp = (async () => {
      const vis = await import(CDN.mpBundle);
      const files = await vis.FilesetResolver.forVisionTasks(CDN.mpWasm);
      const opt = d => ({ baseOptions: { modelAssetPath: CDN.mpModel, delegate: d }, outputFaceBlendshapes: true, runningMode: 'VIDEO', numFaces: 1, minFaceDetectionConfidence: .35, minFacePresenceConfidence: .35, minTrackingConfidence: .35 });
      try { this.mp = await vis.FaceLandmarker.createFromOptions(files, opt('GPU')); } catch (e) { this.mp = await vis.FaceLandmarker.createFromOptions(files, opt('CPU')); }
    })().catch(e => console.warn('[MindQuest] gaze model unavailable', e));
    this.loadP = Promise.all([fa, mp]).then(() => { this.aiFailed = !this.aiReady; return this.aiReady; });
    return this.loadP;
  },
  /* MediaPipe: landmarks + blendshapes, ~9 fps → gaze, blinks, action units for expressions */
  fastLoop() {
    const step = () => {
      try {
        const v = this.video;
        if (this.on && this.mp && v && v.readyState >= 2 && v.currentTime !== this.lastVT) {
          this.lastVT = v.currentTime;
          const res = this.mp.detectForVideo(v, performance.now());
          if (res.faceLandmarks && res.faceLandmarks.length) {
            const lm = res.faceLandmarks[0], b = {};
            (res.faceBlendshapes[0]?.categories || []).forEach(c => { b[c.categoryName] = c.score; });
            const hx = .5 - (lm[1].x - lm[234].x) / ((lm[454].x - lm[234].x) || 1);
            const hy = -((lm[1].y - lm[10].y) / ((lm[152].y - lm[10].y) || 1));
            const ex = ((b.eyeLookInLeft || 0) + (b.eyeLookOutRight || 0) - (b.eyeLookOutLeft || 0) - (b.eyeLookInRight || 0)) / 2;
            const ey = ((b.eyeLookUpLeft || 0) + (b.eyeLookUpRight || 0) - (b.eyeLookDownLeft || 0) - (b.eyeLookDownRight || 0)) / 2;
            this.setGaze({ hx, hy, ex, ey });
            const bl = ((b.eyeBlinkLeft || 0) + (b.eyeBlinkRight || 0)) / 2;
            if (!this.closed && bl > .55) { this.closed = true; this.onBlink && this.onBlink(); } else if (this.closed && bl < .3) this.closed = false;
            this.mpT = performance.now(); this.setEmo(Expr.update(b));
            let x0 = 1, y0 = 1, x1 = 0, y1 = 0; for (const p of lm) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
            this.live.box = [x0, y0, x1 - x0, y1 - y0]; this.live.pts = lm; this.live.face = true; this.live.t = performance.now();
          } else if (performance.now() - this.live.t > 700) { this.live.face = false; this.live.pts = null; }
          this.draw();
        }
      } catch (e) { console.warn(e); }
      setTimeout(step, 110);
    };
    step();
  },
  /* face-api: expression network (~4 fps) on a face crop; also gaze fallback when MediaPipe is missing */
  async slowLoop() {
    let wait = 180;
    for (;;) {
      await new Promise(r => setTimeout(r, wait));
      const v = this.video;
      if (!(this.on && this.faReady && v && v.readyState >= 2) || this.pauseSlow) continue;   // paused while the hand reader runs
      try {
        const crop = this.mp && this.fresh() && this.live.box ? this.faceCrop() : null;
        const t0 = performance.now(), det = await window.faceapi.detectSingleFace(crop || v, crop ? this.faCrop : this.faFull).withFaceLandmarks(true).withFaceExpressions();
        wait = this.mp ? clamp(performance.now() - t0, 120, 900) : 100;   // on slow devices, leave time for the face tracker
        if (det) {
          Expr.cnn = { ...det.expressions }; Expr.cnnT = t0;
          if (this.mp && Expr.lastB && performance.now() - this.mpT > 300) this.setEmo(Expr.update(Expr.lastB));
          if (!this.mp) {
            this.setEmo(Expr.update(null));
            const p = det.landmarks.positions, vw = v.videoWidth, vh = v.videoHeight;
            const eyeY = p.slice(36, 48).reduce((a, q) => a + q.y, 0) / 12;
            this.setGaze({ hx: .5 - (p[30].x - p[0].x) / ((p[16].x - p[0].x) || 1), hy: -((p[30].y - eyeY) / ((p[8].y - eyeY) || 1)), ex: 0, ey: 0 });
            const bx = det.detection.box; this.live.box = [bx.x / vw, bx.y / vh, bx.width / vw, bx.height / vh]; this.live.pts = null;
            this.live.face = true; this.live.t = performance.now(); this.draw();
          }
        } else if (!this.mp && performance.now() - this.live.t > 900) { this.live.face = false; this.draw(); }
      } catch (e) { console.warn(e); }
    }
  },
  /* square crop around the tracked face, upscaled to 256 px; dark or washed-out faces are light-balanced */
  faceCrop() {
    const v = this.video, [bx, by, bw, bh] = this.live.box, W = v.videoWidth, H = v.videoHeight;
    const side = Math.max(bw * W, bh * H) * 1.6, sx = (bx + bw / 2) * W - side / 2, sy = (by + bh / 2) * H - side / 2;
    const c = this.cropC || (this.cropC = document.createElement('canvas')); c.width = c.height = 256;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.filter = 'none'; x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256); x.drawImage(v, sx, sy, side, side, 0, 0, 256, 256);
    const d = x.getImageData(80, 80, 96, 96).data; let L = 0; for (let i = 0; i < d.length; i += 16) L += d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; L /= d.length / 16;
    if (L < 95 || L > 185) { x.filter = `brightness(${clamp(125 / Math.max(L, 1), .7, 2.4).toFixed(2)}) contrast(1.15)`; x.drawImage(v, sx, sy, side, side, 0, 0, 256, 256); x.filter = 'none'; }
    return c;
  },
  setEmo(r) { if (r) { this.live.emo = r.p; this.live.dom = r.dom; this.live.int = r.int; } },
  setGaze(raw) {
    this.live.raw = raw;
    if (!this.base) { this.autoBase.push(raw); if (this.autoBase.length >= 15) this.base = avgRaw(this.autoBase); }
    const b = this.base || raw;
    const gx = (raw.hx - b.hx) * 2.0 + (raw.ex - b.ex) * .9, gy = (raw.hy - b.hy) * 2.4 + (raw.ey - b.ey) * .9;
    this.gs.x = this.gs.x * .5 + gx * .5; this.gs.y = this.gs.y * .5 + gy * .5;
    const X = this.gs.x, Y = this.gs.y, TH = .28;
    this.live.gaze = Math.max(Math.abs(X), Math.abs(Y)) < TH ? 'center' : Math.abs(X) > Math.abs(Y) ? (X > 0 ? 'right' : 'left') : (Y > 0 ? 'up' : 'down');
  },
  fresh() { return this.on && this.live.face && performance.now() - this.live.t < 1500; },
  draw() {
    const c = this.canvas, v = this.video; if (!c || !v || !v.videoWidth) return;
    if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
    const W = c.width, H = c.height;
    if (this.mode === 'fingers') {   // hand skeletons for Finger Math
      const bones = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
      x.lineWidth = 5; x.lineCap = 'round';
      for (const h of (typeof Hands !== 'undefined' ? Hands.pts : [])) {
        x.strokeStyle = 'rgba(247,148,29,.9)'; x.beginPath(); for (const [a, b] of bones) { x.moveTo(h[a].x * W, h[a].y * H); x.lineTo(h[b].x * W, h[b].y * H); } x.stroke();
        x.fillStyle = '#fff'; for (const i of [4, 8, 12, 16, 20]) { x.beginPath(); x.arc(h[i].x * W, h[i].y * H, 7, 0, 7); x.fill(); }
      }
      return;
    }
    if (!this.fresh()) return;
    if (this.mode === 'setup' && this.live.pts) {
      x.fillStyle = 'rgba(242,140,40,.85)';
      for (let i = 0; i < this.live.pts.length; i += 4) { const p = this.live.pts[i]; x.beginPath(); x.arc(p.x * W, p.y * H, 1.6, 0, 7); x.fill(); }
      x.fillStyle = '#4D96FF'; for (const i of [468, 473]) { const p = this.live.pts[i]; if (p) { x.beginPath(); x.arc(p.x * W, p.y * H, 4, 0, 7); x.fill(); } }
    } else if (this.live.box) {
      const [bx, by, bw, bh] = this.live.box; x.strokeStyle = '#FFC93C'; x.lineWidth = 4; x.setLineDash([14, 8]);
      x.beginPath(); if (x.roundRect) x.roundRect(bx * W, by * H, bw * W, bh * H, 18); else x.rect(bx * W, by * H, bw * W, bh * H); x.stroke();
    }
  }
};
function avgRaw(list) { const o = { hx: 0, hy: 0, ex: 0, ey: 0 }; for (const r of list) for (const k in o) o[k] += r[k] / list.length; return o; }


/* ---------------- recording for the report: twice a second, which feeling and where the child looks ---------------- */
const CamRec = {
  cur: null, timer: 0,
  start(rec) { this.cur = rec; if (!this.timer) this.timer = setInterval(() => this.tick(), 500); },
  stop() { this.cur = null; },
  tick() {
    const r = this.cur; if (!r || !V.on) return;
    r.n = (r.n || 0) + 1;
    if (V.fresh()) {
      r.emo = r.emo || {}; r.emo[V.live.dom] = (r.emo[V.live.dom] || 0) + 1;
      r.gaze = r.gaze || {}; r.gaze[V.live.gaze] = (r.gaze[V.live.gaze] || 0) + 1;
    } else { r.gaze = r.gaze || {}; r.gaze.away = (r.gaze.away || 0) + 1; }
    CamDock.paint();
  }
};
const CamDock = {
  paint() {
    const d = document.getElementById('camState'); if (!d) return;
    if (!V.on) { d.innerHTML = `${ico('camera')} Camera off`; return; }
    if (!V.aiReady) { d.innerHTML = `${ico('dots')} Loading face reader`; return; }
    if (!V.fresh()) { d.innerHTML = `${ico('eye')} Looking for your face`; return; }
    const m = EMO_META[V.live.dom];
    d.innerHTML = `${faceSvg(V.live.dom === 'neutral' ? 'neutral' : V.live.dom)} ${m.label} · ${V.live.gaze === 'center' ? 'Focused' : 'Looking ' + V.live.gaze}`;
  }
};
setInterval(() => CamDock.paint(), 600);
