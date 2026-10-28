/* ================================================================
   Get ready: the camera and microphone checks before a quest starts
   (carried over from MindQuest v1).
   Step 1 camera: allow it, wake the face reader, find the face, look at the star
     (gaze calibration), then copy three faces (tunes the expression reader to this child).
   Step 2 microphone: blow up the balloon by talking or clapping (the mic hears),
     say the magic words (speech-to-text works), then hear your own voice (speakers work).
   The calibration is kept on this device only, so later weeks can reuse it.
   Nothing is recorded: the voice clip lives in memory and is thrown away after the check.
   ================================================================ */
const Checks = {
  micOk: null, done: null, uid: '', step: '', timer: 0, calib: null, warm: null,

  /* shows the checks and resolves when the child presses Start (or skips) */
  run(uid) {
    this.uid = uid; this.load();
    $('#qIntro').hidden = true; $('#qSetup').hidden = false; document.body.classList.add('q-checking');
    return new Promise(res => { this.done = res; this.goCam(); });
  },
  key() { return 'mq.cal.' + this.uid; },
  load() {
    try {
      const c = JSON.parse(localStorage.getItem(this.key()) || 'null'); if (!c) return null;
      if (c.gaze) V.base = c.gaze;
      if (c.expr) Object.assign(Expr, { base: c.expr.base, gain: c.expr.gain || {}, calibrated: true });
      return c;
    } catch (e) { return null; }
  },
  keep(part) { try { const c = JSON.parse(localStorage.getItem(this.key()) || '{}'); localStorage.setItem(this.key(), JSON.stringify({ ...c, ...part, at: Date.now() })); } catch (e) { /* private mode */ } },
  ck(list, k, state, txt) {
    const li = $(`#${list} li[data-k="${k}"]`), ck = li.querySelector('.ck'), t = li.querySelector('.ct');
    if (!li.dataset.t) li.dataset.t = t.textContent;
    li.className = state || ''; ck.innerHTML = state === 'done' ? ico('check') : state === 'fail' ? '!' : state === 'doing' ? '' : ck.dataset.n;
    t.textContent = txt || li.dataset.t;
  },
  finish() {
    clearInterval(this.timer); this.calib = null; this.warm = null; this.step = '';
    Mic2.leave();
    $('#qSetup').hidden = true; document.body.classList.remove('q-checking');
    if (V.on) { V.mount($('#camView'), 'dock'); $('#camBtn').hidden = true; $('#camView').classList.add('on'); }
    const r = this.done; this.done = null; r && r();
  },

  /* ---------- Step 1: camera ---------- */
  goCam() {
    this.step = 'cam'; $('#ckCam').hidden = false; $('#ckMic').hidden = true;
    $$('#camList .ck').forEach((c, i) => { c.dataset.n = i + 1; });
    ['perm', 'ai', 'face', 'calib', 'expr'].forEach(k => this.ck('camList', k, ''));
    $('#camGo').disabled = true;
    coggy('First, let’s wake up the magic camera. It notices your smiles and where you look. Nothing is recorded.');
    if (V.on) this.camReady();
    else { $('#ckPlace').hidden = false; $('#faceGuide').hidden = true; $('#setupPill').hidden = true; $('#camOn').hidden = false; }
  },
  async camOn() {
    Sfx.click(); this.ck('camList', 'perm', 'doing');
    try { await V.start(); this.camReady(); }
    catch (e) {
      console.warn(e); this.ck('camList', 'perm', 'fail', 'Camera blocked or not found');
      toast(ico('lock') + ' We could not open the camera. Allow it in the browser bar, or continue without it.', 4500);
    }
  },
  camReady() {
    this.ck('camList', 'perm', 'done', 'Camera is on'); V.mount($('#ckStage'), 'setup');
    $('#ckPlace').hidden = true; $('#faceGuide').hidden = false; $('#setupPill').hidden = false; $('#camOn').hidden = true;
    this.ck('camList', 'ai', V.aiReady ? 'done' : 'doing', V.aiReady ? 'Face reader is awake' : 'Waking up the face reader…');
    V.load().then(ok => {
      if (this.step !== 'cam') return;
      if (ok) this.ck('camList', 'ai', 'done', V.faReady && V.mp ? 'Face reader is awake' : 'Face reader ready (basic mode)');
      else { this.ck('camList', 'ai', 'fail', 'Face reader could not load (check the internet)'); ['face', 'calib', 'expr'].forEach(k => this.ck('camList', k, 'fail', 'Skipped')); }
      $('#camGo').disabled = false;
    });
    clearInterval(this.timer); let seen = 0, gazeOk = false;
    this.timer = setInterval(() => {
      if (this.step !== 'cam') { clearInterval(this.timer); return; }
      const pill = $('#setupPillTxt');
      if (!V.aiReady) { pill.textContent = V.aiFailed ? 'Camera on (face reader offline)' : 'Waking up…'; return; }
      if (V.fresh()) {
        seen++; this.ck('camList', 'face', 'done', 'Found you!'); $('#faceGuide').classList.add('ok');
        pill.innerHTML = `${faceSvg(V.live.dom)} ${EMO_META[V.live.dom].label} · ${V.live.gaze === 'center' ? 'looking at me' : 'looking ' + V.live.gaze}`;
        if (!gazeOk && !this.calib && seen > 3) this.startCalib().then(ok => { gazeOk = ok; });
        else if (gazeOk && !this.warm && !this.tuned && seen > 3) this.startWarm();
      } else { seen = 0; $('#faceGuide').classList.remove('ok'); pill.textContent = 'Move into the circle'; if (!gazeOk) this.ck('camList', 'face', 'doing', 'Looking for your face…'); }
    }, 300);
    this.tuned = false;
  },
  /* look at the star for 3 seconds: the head and eye position there is "looking at the screen" */
  startCalib() {
    this.calib = []; this.ck('camList', 'calib', 'doing', 'Look at the star…'); $('#calibStar').classList.add('on'); Sfx.pop();
    coggy('Look at the star!', true);
    const smp = setInterval(() => { if (this.calib && V.fresh() && V.live.raw) this.calib.push({ ...V.live.raw }); }, 100);
    return new Promise(res => setTimeout(() => {
      clearInterval(smp); $('#calibStar').classList.remove('on');
      const list = this.calib || []; this.calib = null;
      if (this.step !== 'cam') return res(false);
      if (list.length >= 8) { V.base = avgRaw(list); this.keep({ gaze: V.base }); this.ck('camList', 'calib', 'done', 'Eyes calibrated'); Sfx.good(); $('#camGo').disabled = false; res(true); }
      else { this.ck('camList', 'calib', '', 'Look at the star for 3 seconds'); res(false); }
    }, 3200));
  },
  /* face warm-up: a relaxed face, a big smile and a surprised face tune the expression reader to this child */
  startWarm() {
    if (!V.mp) { this.tuned = true; this.ck('camList', 'expr', 'done', 'Basic mode: the network reads expressions'); return; }
    const steps = [['rest', 'neutral', 'Relax your face', 2200], ['smile', 'happy', 'Now a BIG smile!', 2600], ['wow', 'wow', 'Look surprised! Eyebrows up!', 2600]];
    const w = this.warm = { rest: [], smile: [], wow: [] }; this.ck('camList', 'expr', 'doing', 'Copy the faces on the camera…');
    const cue = $('#warmCue'); let i = 0;
    const run = () => {
      if (this.warm !== w) { cue.hidden = true; return; }
      if (i === steps.length) {
        cue.hidden = true; this.warm = null;
        if (w.rest.length >= 8) {
          const got = Expr.tune(w.rest, w.smile.slice(6), w.wow.slice(6)); this.tuned = true;
          this.keep({ expr: { base: Expr.base, gain: Expr.gain } }); Sfx.win(); confetti(60);
          this.ck('camList', 'expr', 'done', `Face reader tuned to you${got.smile ? ' · smile ✓' : ''}${got.wow ? ' · surprise ✓' : ''}`);
          coggy('Super! Your magic camera is ready. Now let’s test the microphone.');
        } else this.ck('camList', 'expr', '', 'Make three quick faces (stay in the circle)');
        return;
      }
      const [k, f, t, ms] = steps[i]; cue.hidden = false; cue.innerHTML = `${faceSvg(f)}<b>${t}</b>`;
      cue.classList.remove('go'); void cue.offsetWidth; cue.classList.add('go'); Sfx.pop(); Voice.say(t);
      const smp = setInterval(() => { if (this.warm === w && V.fresh() && Expr.lastAU) w[k].push({ ...Expr.lastAU }); }, 100);
      setTimeout(() => { clearInterval(smp); i++; run(); }, ms);
    };
    run();
  },
  camNext() { clearInterval(this.timer); this.warm = null; this.calib = null; $('#warmCue').hidden = true; $('#calibStar').classList.remove('on'); this.goMic(); },
  camSkip() {
    const m = modal(`<h2>${ico('camera')} Play without the camera?</h2><p>Every activity still works. The camera only helps notice feelings and focus.</p>
      <div class="row"><button class="btn btn-ghost" data-a="back">Try the camera</button><button class="btn btn-primary" data-a="go">Continue without it</button></div>`);
    $('[data-a=back]', m).onclick = () => m.close();
    $('[data-a=go]', m).onclick = () => { m.close(); if (V.on) V.stop(); this.camNext(); };
  },

  /* ---------- Step 2: microphone ---------- */
  goMic() {
    this.step = 'mic'; $('#ckCam').hidden = true; $('#ckMic').hidden = false;
    $$('#micList .ck').forEach((c, i) => { c.dataset.n = i + 1; });
    if (!$('#micBars').childElementCount) $('#micBars').innerHTML = '<i></i>'.repeat(14);
    Mic2.reset();
    coggy('Now the magic microphone! Some activities let you answer out loud. Tap “Turn on microphone” and blow up the balloon by talking or clapping.');
    $('#qSetup').scrollIntoView({ block: 'start', behavior: 'smooth' });
  },
  micSkip() {
    const m = modal(`<h2>${ico('mic')} Play without the microphone?</h2><p>Every activity still works. When Coggy asks you to talk, you can type your answer instead.</p>
      <div class="row"><button class="btn btn-ghost" data-a="back">Try the microphone</button><button class="btn btn-primary" data-a="go">Continue without it</button></div>`);
    $('[data-a=back]', m).onclick = () => m.close();
    $('[data-a=go]', m).onclick = () => { m.close(); if (!this.micOk) this.micOk = false; this.finish(); };
  }
};

/* ---------- microphone test: level meter, recording for playback, speech-to-text ---------- */
const MAGIC = { phrase: 'Hello! I am ready to play!', keys: ['hello', 'ready', 'play'] };
const mwords = t => (String(t || '').toLowerCase().replace(/[’']/g, '').match(/[a-z]+/g) || []);
const Mic2 = {
  stream: null, an: null, ac: null, rec: null, chunks: [], sr: null, active: false, text: '', interim: '', lvl: 0,
  raf: 0, t: 0, fill: 0, phase: '', quietMs: 0, hinted: false, wordsT: 0, clip: null, audio: null, hits: new Set(),
  get canUse() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
  get SR() { return window.SpeechRecognition || window.webkitSpeechRecognition; },
  async start() {
    await this.stop(true); this.text = ''; this.interim = ''; this.active = true;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    try { this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)(); await this.ac.resume(); const src = this.ac.createMediaStreamSource(this.stream); this.an = this.ac.createAnalyser(); this.an.fftSize = 512; src.connect(this.an); } catch (e) { this.an = null; }
    try { this.chunks = []; this.rec = new MediaRecorder(this.stream); this.rec.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); }; this.rec.start(500); } catch (e) { this.rec = null; }
    if (this.SR) this.listen();
  },
  listen() {
    const sr = new this.SR(); this.sr = sr; sr.lang = 'en-IN'; sr.continuous = true; sr.interimResults = true;
    sr.onresult = e => {
      let fin = '', mid = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += ' ' + t; else mid += ' ' + t; }
      if (fin) this.text = (this.text + ' ' + fin).replace(/\s+/g, ' ').trim();
      this.interim = mid.trim(); this.heard(this.text, this.interim);
    };
    sr.onerror = e => { if (/not-allowed/.test(e.error)) { this.srBlocked = true; this.heard(this.text, '', e.error); } };
    sr.onend = () => { if (this.active && this.sr === sr && !this.srBlocked) try { sr.start(); } catch (e) { /* running */ } };
    try { sr.start(); } catch (e) { /* ignore */ }
  },
  level() {
    if (!this.an) return 0; const buf = new Uint8Array(256); this.an.getByteTimeDomainData(buf);
    let s = 0; for (const v of buf) s += (v - 128) ** 2; return Math.sqrt(s / buf.length) / 128;
  },
  /* stop; quiet = throw the recording away */
  stop(quiet = false) {
    if (!this.active && !this.stream) return Promise.resolve(null);
    this.active = false; const sr = this.sr; this.sr = null; if (sr) try { sr.stop(); } catch (e) { /* ignore */ }
    const rec = this.rec, stream = this.stream; this.rec = null; this.stream = null; this.an = null;
    return new Promise(res => {
      const done = url => { if (stream) stream.getTracks().forEach(t => t.stop()); res(url); };
      if (!rec || quiet || rec.state === 'inactive') return done(null);
      rec.onstop = () => done(this.chunks.length ? URL.createObjectURL(new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' })) : null);
      try { rec.stop(); } catch (e) { done(null); }
    });
  },
  ck(k, s, t) { Checks.ck('micList', k, s, t); },
  reset() {
    cancelAnimationFrame(this.raf); this.raf = 0; clearTimeout(this.wordsT); this.stopPlay();
    Object.assign(this, { fill: 0, phase: '', quietMs: 0, hinted: false, hits: new Set() });
    ['perm', 'level', 'words', 'hear'].forEach(k => this.ck(k, ''));
    const b = $('#balloon'); b.className = 'balloon'; b.style.setProperty('--s', .42); $('#bFace').dataset.mood = 'sleep'; $('#balloonWrap').hidden = false;
    $('#bFillWrap').hidden = true; $('#bFill').style.width = '0%'; $('#magicCard').hidden = true; $('#micPill').hidden = true; $('#micStage').classList.remove('live', 'playing');
    $('#micOn').hidden = false; $('#micOn').innerHTML = `${ico('mic')} Turn on microphone`; $('#micPlay').hidden = true;
    $('#micGo').disabled = true;
    [...$('#micBars').children].forEach(i => { i.style.transform = ''; });
  },
  async on() {
    Sfx.click(); this.reset(); this.ck('perm', 'doing');
    if (!this.canUse) return this.blocked('This browser cannot use a microphone');
    try { await this.start(); } catch (e) { console.warn(e); return this.blocked('Microphone blocked or not found'); }
    if (Checks.step !== 'mic') return this.stop(true);
    this.ck('perm', 'done', 'Microphone is on'); $('#micOn').hidden = true;
    $('#micPill').hidden = false; $('#micPillTxt').textContent = 'Listening…'; $('#micStage').classList.add('live');
    this.phase = 'level'; $('#bFillWrap').hidden = false; $('#bFace').dataset.mood = 'smile';
    this.ck('level', 'doing', 'Talk, sing or clap to blow up the balloon!');
    this.t = 0; this.raf = requestAnimationFrame(t => this.loop(t));
    const r = $('#micStage').getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight) $('#micStage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  blocked(txt) {
    Checks.micOk = false; this.ck('perm', 'fail', txt); $('#micOn').innerHTML = `${ico('replay')} Try again`; $('#micGo').disabled = false;
    toast(ico('lock') + ' We could not open the microphone. Allow it in the browser bar, or continue without it. You can type answers instead.', 4800);
  },
  /* every frame: level bars; in the balloon phase the balloon grows while the child makes sound */
  loop(t) {
    this.raf = 0; if (Checks.step !== 'mic') return;
    const dt = this.t ? Math.min(64, t - this.t) : 16; this.t = t;
    const playing = $('#micStage').classList.contains('playing'), lvl = playing ? .08 + Math.abs(Math.sin(t / 140)) * .12 : this.active ? this.level() : 0;
    [...$('#micBars').children].forEach((b, k) => { b.style.transform = `scaleY(${clamp(.12 + lvl * (5 + Math.sin(t / 110 + k * .9) * 3), .12, 1)})`; });
    if (this.phase === 'level') {
      if (lvl > .03) { this.fill += dt / 2600 * clamp(lvl * 10, .7, 2.4); this.quietMs = 0; }
      else { this.quietMs += dt; if (this.quietMs > 1500) this.fill = Math.max(0, this.fill - dt / 25000); }   // claps leave gaps, so air leaks out only after a long quiet
      const f = Math.min(1, this.fill), b = $('#balloon');
      b.style.setProperty('--s', (.42 + f * .7).toFixed(3)); b.classList.toggle('loud', lvl > .03);
      $('#bFace').dataset.mood = f < .25 ? 'smile' : f < .5 ? 'oh' : f < .8 ? 'wow' : 'puff';
      $('#bFill').style.width = `${Math.round(f * 100)}%`;
      if (this.quietMs > 9000 && !this.hinted) { this.hinted = true; this.ck('level', 'doing', 'I can’t hear you yet. Is the mic muted? Try clapping!'); }
      if (f >= 1) this.pop();
    }
    if (this.active || playing) this.raf = requestAnimationFrame(x => this.loop(x));
    else [...$('#micBars').children].forEach(b => { b.style.transform = ''; });
  },
  async pop() {
    this.phase = 'popped'; $('#balloon').classList.add('popped'); Sfx.win(); confetti(70);
    this.ck('level', 'done', 'Your microphone can hear you!'); Checks.micOk = true; $('#bFillWrap').hidden = true; $('#micGo').disabled = false;
    // restart the mic so the playback clip holds just the magic words
    await sleep(900); if (Checks.step !== 'mic' || this.phase !== 'popped') return;
    $('#balloonWrap').hidden = true; await this.stop(true);
    try { await this.start(); } catch (e) { return this.wordsDone(false, 'The microphone stopped. Tap Test again'); }
    if (Checks.step !== 'mic') return this.stop(true);
    this.startWords();
  },
  startWords() {
    this.phase = 'words'; this.hits = new Set(); this.raf = this.raf || requestAnimationFrame(t => this.loop(t));
    $('#magicWords').innerHTML = MAGIC.phrase.split(' ').map((w, k) => { const k0 = mwords(w)[0] || ''; return `<span class="mw${MAGIC.keys.includes(k0) ? ' key' : ''}" data-w="${k0}" style="animation-delay:${k * .08}s">${esc(w)}</span>`; }).join(' ');
    $('#magicCard').hidden = false; $('#micHeard').textContent = 'I’m listening…';
    if (this.SR) {
      $('#magicLabel').textContent = 'Say the magic words out loud'; this.ck('words', 'doing', `Say: “${MAGIC.phrase}”`);
      this.wordsT = setTimeout(() => { if (this.phase !== 'words') return; const h = (this.text + ' ' + this.interim).trim(); this.wordsDone(!!h, h ? 'I heard you!' : 'Speech-to-text did not answer, so you can type answers instead'); }, 14000);
    } else {
      $('#magicLabel').textContent = 'Say the magic words, I am recording!'; this.ck('words', 'doing', 'Recording for 5 seconds…');
      this.wordsT = setTimeout(() => this.wordsDone(false, 'This browser cannot turn speech into text, so you will type your answers'), 5000);
    }
  },
  heard(text, interim, err) {
    if (this.phase !== 'words') return;
    if (err) return this.wordsDone(false, 'Speech-to-text is blocked here, so you can type answers instead');
    const all = `${text} ${interim}`.trim(); if (!all) return;
    $('#micHeard').textContent = `I heard: “${all.length > 70 ? '…' + all.slice(-68) : all}”`;
    const ws = mwords(all);
    for (const k of MAGIC.keys) if (!this.hits.has(k) && ws.some(w => w.startsWith(k))) { this.hits.add(k); const s = $(`#magicWords .mw[data-w="${k}"]`); if (s) s.classList.add('hit'); Sfx.pop(); }
    if (this.hits.size >= 2) this.wordsDone(true);
  },
  async wordsDone(ok, txt) {
    if (this.phase !== 'words' && this.phase !== 'popped') return;
    this.phase = 'hear'; clearTimeout(this.wordsT);
    this.ck('words', ok ? 'done' : 'fail', txt || 'Magic words heard!');
    if (ok) { $$('#magicWords .mw').forEach(s => s.classList.add('hit')); Sfx.good(); }
    $('#magicLabel').textContent = ok ? 'Magic words unlocked!' : 'Thanks! Typing will work for voice answers';
    const url = await this.stop(); $('#micPill').hidden = true; $('#micStage').classList.remove('live');
    if (this.clip) URL.revokeObjectURL(this.clip); this.clip = url;
    if (Checks.step !== 'mic') return;
    $('#micOn').hidden = false; $('#micOn').innerHTML = `${ico('replay')} Test again`;
    if (this.clip) { $('#micPlay').hidden = false; this.ck('hear', 'doing', 'Tap “Hear yourself” to listen to your voice'); }
    else this.ck('hear', 'fail', 'No recording to play in this browser');
  },
  play() {
    if (!this.clip) return; this.stopPlay();
    const a = new Audio(this.clip); this.audio = a; $('#micStage').classList.add('playing'); $('#micPlay').innerHTML = `${ico('sound')} Playing…`;
    const end = ok => { if (this.audio !== a) return; this.stopPlay(); this.ck('hear', ok ? 'done' : 'fail', ok ? 'Your voice sounds great!' : 'Could not play the sound. Check the volume'); if (ok) Sfx.good(); };
    a.onended = () => end(true); a.onerror = () => end(false);
    a.play().then(() => { this.t = 0; this.raf = this.raf || requestAnimationFrame(t => this.loop(t)); }).catch(() => end(false));
  },
  stopPlay() {
    const a = this.audio; this.audio = null; if (a) { a.onended = a.onerror = null; try { a.pause(); } catch (e) { /* ignore */ } }
    $('#micStage').classList.remove('playing'); $('#micPlay').innerHTML = `${ico('play')} Hear yourself`;
  },
  /* leaving the step: switch the mic off and forget the clip */
  leave() {
    cancelAnimationFrame(this.raf); this.raf = 0; clearTimeout(this.wordsT); this.phase = ''; this.stopPlay();
    this.stop(true);
    if (this.clip) { URL.revokeObjectURL(this.clip); this.clip = null; }
  }
};

$('#camOn').onclick = () => Checks.camOn();
$('#camGo').onclick = () => Checks.camNext();
$('#camSkip').onclick = () => Checks.camSkip();
$('#micOn').onclick = () => Mic2.on();
$('#micPlay').onclick = () => Mic2.play();
$('#micGo').onclick = () => Checks.finish();
$('#micSkip').onclick = () => Checks.micSkip();
