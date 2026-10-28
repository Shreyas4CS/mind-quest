/* ================================================================
   Weekly quest player: runs one week's activities, speaks to the child,
   times everything, reads the camera and heart sensor if switched on,
   and saves after every activity so the child can stop and continue later.
   ================================================================ */
const Q = { user: null, child: null, week: null, content: null, stage: null, cur: null };

/* ---------- time keeping ----------
   active  = activity on screen, page visible, not paused, child not idle
   idle    = no tap, key, mouse or voice for 30 s during an activity that needs input
   streak  = longest stretch of continuous engaged time (how long the child can stay with it) */
const Timer = {
  last: 0, activeMs: 0, idleMs: 0, hiddenMs: 0, pausedMs: 0, itemMs: 0, itemIdle: 0, streak: 0, longest: 0, lastInput: 0, paused: false, passive: false, running: false,
  init(t) { Object.assign(this, { activeMs: t.activeMs || 0, idleMs: t.idleMs || 0, hiddenMs: t.hiddenMs || 0, pausedMs: t.pausedMs || 0, longest: t.longestStreakMs || 0 }); this.last = performance.now(); this.lastInput = this.last; setInterval(() => this.tick(), 250); },
  poke() { this.lastInput = performance.now(); },
  tick() {
    const now = performance.now(), dt = Math.min(2000, now - this.last); this.last = now;
    if (!this.running) return;
    if (document.hidden) { this.hiddenMs += dt; this.streak = 0; return; }
    if (this.paused) { this.pausedMs += dt; this.streak = 0; return; }
    const idle = !this.passive && now - this.lastInput > 30000;
    if (idle) { this.idleMs += dt; this.itemIdle += dt; this.streak = 0; }
    else { this.activeMs += dt; this.itemMs += dt; this.streak += dt; if (this.streak > this.longest) this.longest = this.streak; }
    const t = document.getElementById('qClock'); if (t) t.textContent = fmtDur(this.activeMs, true);
    const ib = document.getElementById('idleNote'); if (ib) ib.hidden = !idle;
  },
  item() { this.itemMs = 0; this.itemIdle = 0; this.passive = false; this.poke(); },
  json(sittings) { return { activeMs: Math.round(this.activeMs), idleMs: Math.round(this.idleMs), hiddenMs: Math.round(this.hiddenMs), pausedMs: Math.round(this.pausedMs), longestStreakMs: Math.round(this.longest), sittings }; }
};
['pointerdown', 'keydown', 'pointermove', 'input', 'touchstart'].forEach(e => addEventListener(e, () => Timer.poke(), { passive: true }));

/* ---------- Coggy speech bubble ---------- */
function coggy(text, speak = true) {
  const b = $('#coggyTxt'); b.innerHTML = esc(text);
  $('#coggy').classList.remove('pop'); void $('#coggy').offsetWidth; $('#coggy').classList.add('pop');
  $('#coggyAgain').onclick = () => Voice.say(text);
  return speak ? Voice.say(text, { el: $('#coggy') }) : Promise.resolve();
}
const fill = (t) => String(t).replace('{name}', (Q.child.name || '').split(' ')[0]).replace('{like}', (Q.child.likes && Q.child.likes.length ? pick(Q.child.likes) : 'your hobbies').toLowerCase());

/* ---------- start-up ---------- */
(async function boot() {
  Q.user = await guard('child');
  Q.child = await Store.getChild(Q.user.uid);
  if (!Q.child || !Q.child.profileDone) { location.href = 'child.html#profile'; return; }
  const n = +qs('week') || 1, weeks = await Store.getWeeks(Q.user.uid);
  if (!weekOpen(n, weeks)) { location.href = 'child.html'; return; }
  Q.content = weekContent(n, Q.child.grade);
  Q.week = weeks.find(w => w.week === n) || { week: n, title: Q.content.title, status: 'new', idx: 0, answers: [], timing: {}, sittings: 0 };
  if (Q.week.status === 'done') { location.href = 'child.html'; return; }
  topBar({ user: Q.user, title: `${ico(Q.content.icon)} Week ${n}: ${esc(Q.content.title)}` });
  document.body.dataset.world = (WORLDS[Q.child.grade] || WORLDS[4])[0];
  Timer.init(Q.week.timing || {});
  $('#qWeek').textContent = `Week ${n}`; $('#qTitle').textContent = Q.content.title; $('#qSub').textContent = Q.content.sub;
  $('#qMins').textContent = `About ${estMinutes(Q.content.items)} minutes · ${Q.content.items.length} activities`;
  $('#qStartBtn').innerHTML = `${ico('play')} ${Q.week.idx ? 'Continue my quest' : 'Start my quest'}`;
  drawProgress();
  $('#camBtn').onclick = camOn; $('#qStartBtn').onclick = start;
  $('#bbConnect').onclick = () => Heart.connect(Q.child.name); $('#bbDisc').onclick = () => Heart.disconnect();
  Heart.onChange = st => { $('#bbDisc').hidden = st !== 'on'; }; Heart.paint();
  $('#qPause').onclick = togglePause; $('#qExit').onclick = saveExit;
  coggy(`Hi ${Q.child.name.split(' ')[0]}! Welcome to week ${n}: ${Q.content.title}. ${Q.week.idx ? 'Let’s continue where you stopped.' : 'Press start, then we will check your camera and microphone together!'}`);
})();
function weekOpen(n, weeks) {
  if (n === 1) return true;
  const prev = weeks.find(w => w.week === n - 1);
  if (!prev || prev.status !== 'done') return false;
  return !MQ_CONFIG.calendarLock || Date.now() - (prev.startedAt || 0) >= 7 * 864e5;
}
async function camOn() {
  try { await V.start(); V.mount($('#camView'), 'dock'); $('#camBtn').hidden = true; $('#camView').classList.add('on'); V.load(); }
  catch (e) { toast(ico('lock') + ' The camera is blocked. You can allow it in the browser bar, or play without it.', 4500); }
}
function drawProgress() {
  const N = Q.content.items.length, i = Q.week.idx;
  $('#qBar').style.width = (i / N * 100) + '%';
  $('#qCount').textContent = `${Math.min(i + 1, N)} / ${N}`;
  $('#qDots').innerHTML = Q.content.items.map((it, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}" title="${esc(itemLabel(it).label)}">${ico(itemLabel(it).icon)}</i>`).join('');
}
async function start() {
  try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch (e) { /* not allowed */ }
  Voice.stop(); await Checks.run(Q.user.uid);
  $('#qIntro').hidden = true; $('#qPlay').hidden = false;
  Q.week.status = 'in_progress'; Q.week.startedAt = Q.week.startedAt || Date.now(); Q.week.sittings = (Q.week.sittings || 0) + 1;
  Heart.rec = Heart.rec || { };
  Timer.running = true;
  Heart.send([BIO_CMD.mission, Q.week.idx + 1]);
  next();
}
function togglePause() {
  Timer.paused = !Timer.paused; document.body.classList.toggle('q-paused', Timer.paused);
  $('#qPause').innerHTML = Timer.paused ? `${ico('play')}<span>Resume</span>` : `${ico('pause')}<span>Pause</span>`;
  $('#pauseVeil').hidden = !Timer.paused; if (Timer.paused) Voice.stop();
}
async function saveExit() { Voice.stop(); await persist(); location.href = 'child.html'; }
async function persist() {
  Q.week.timing = Timer.json(Q.week.sittings || 1);
  const hs = Heart.summary(Heart.rec); if (hs) Q.week.heart = hs;
  Q.week.camUsed = Q.week.camUsed || V.on;
  try { await Store.saveWeek(Q.user.uid, Q.week); } catch (e) { console.error(e); toast(ico('alert') + ' Could not save. Check the internet connection.', 4000); }
}

/* ---------- the activity loop ---------- */
async function next() {
  const items = Q.content.items;
  if (Q.week.idx >= items.length) return finish();
  const it = items[Q.week.idx]; drawProgress();
  const stage = $('#qStage'); stage.className = 'q-stage t-' + it.type; stage.innerHTML = '';
  stage.classList.remove('enter'); void stage.offsetWidth; stage.classList.add('enter');
  const lb = itemLabel(it); $('#qType').innerHTML = `${ico(lb.icon)} ${esc(lb.label)}`;
  Timer.item(); const cam = {}; CamRec.start(cam);
  Heart.rec.curType = it.type === 'game' ? it.game.game : it.type; Heart.mark(Q.week.idx); Heart.send([BIO_CMD.mission, Q.week.idx + 1]);
  const t0 = performance.now();
  let ans;
  try { ans = await RUN[it.type](it, stage); } catch (e) { console.error(e); ans = { skipped: true, error: String(e) }; }
  CamRec.stop(); Voice.stop();
  const rec = { id: it.id, type: it.type, domain: it.domain || null, ms: Math.round(Timer.itemMs), idleMs: Math.round(Timer.itemIdle), wallMs: Math.round(performance.now() - t0), at: Date.now(), ...ans };
  if (cam.n) rec.cam = cam;
  Q.week.answers = Q.week.answers.filter(a => a.id !== it.id); Q.week.answers.push(rec);
  Q.week.idx++;
  await persist();
  if (Q.week.idx < items.length && !ans.noCheer) await cheer();
  next();
}
async function cheer() {
  const s = $('#qStage'); const w = pick(['Great job!', 'Awesome!', 'Well done!', 'Super!', 'Nice one!', 'You rock!', 'Brilliant!']);
  s.insertAdjacentHTML('beforeend', `<div class="cheer">${ico('star')}<b>${w}</b></div>`); Sfx.pop(); await sleep(750);
}
async function finish() {
  Q.week.status = 'done'; Q.week.completedAt = Date.now(); Timer.running = false;
  await persist();
  Heart.send([BIO_CMD.end]);
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* fine */ }
  const t = Q.week.timing, n = Q.week.week;
  $('#qStage').className = 'q-stage done';
  $('#qStage').innerHTML = `<div class="finish"><div class="trophy">${ico('trophy')}</div><h2>Week ${n} complete!</h2>
    <p>You spent <b>${fmtDur(t.activeMs)}</b> on your quest and finished <b>${Q.content.items.length}</b> activities.</p>
    <p class="muted">Your teacher and parents can now see how your week went.</p>
    <a class="btn btn-primary btn-xl" href="child.html">${ico('home')} Back to my dashboard</a></div>`;
  confetti(140); Sfx.win();
  coggy(`Hooray ${Q.child.name.split(' ')[0]}! You finished week ${n}. I am so proud of you. See you next week!`);
}

/* ---------- shared bits ---------- */
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function choiceList(host, opts, { cls = '', letters = true } = {}) {
  return new Promise(res => {
    const wrap = document.createElement('div'); wrap.className = 'choices ' + cls;
    opts.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice';
      b.innerHTML = `${letters ? `<span class="ch-l">${'ABCD'[i]}</span>` : ''}${o.f ? faceSvg(o.f) : ''}<span class="ch-t">${esc(o.t)}</span>`;
      b.onclick = () => { $$('.choice', wrap).forEach(x => x.disabled = true); b.classList.add('picked'); Sfx.click(); setTimeout(() => res(o), 380); };
      wrap.append(b);
    });
    host.append(wrap);
  });
}
function speakBtn(text) { return `<button class="say-btn" type="button" onclick="Voice.say(${esc(JSON.stringify(text))})" aria-label="Read aloud">${ico('sound')}</button>`; }

/* answer box for open questions: big talk button (speech to text) plus typing */
function answerBox(host, { placeholder = 'Type your answer here…', allowSkip = true } = {}) {
  return new Promise(res => {
    const box = document.createElement('div'); box.className = 'ans-box';
    box.innerHTML = `${Voice.canListen ? `<button type="button" class="talk-btn">${ico('mic')}<span>Tap and talk</span></button>` : ''}
      <div class="ans-row"><textarea rows="2" placeholder="${esc(placeholder)}" aria-label="Your answer"></textarea><button type="button" class="btn btn-primary send-btn">${ico('send')}<span>Send</span></button></div>
      ${allowSkip ? '<button type="button" class="skip-link">I don’t want to answer this one</button>' : ''}`;
    host.append(box);
    const ta = $('textarea', box), tb = $('.talk-btn', box); let spoken = false;
    const done = (skip) => { Voice.stopListen(); const t = ta.value.trim(); if (!t && !skip) { ta.focus(); ta.classList.add('shake'); setTimeout(() => ta.classList.remove('shake'), 500); return; } box.remove(); res(skip ? { skipped: true, text: '' } : { text: t, spoken }); };
    $('.send-btn', box).onclick = () => done(false);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(false); } });
    if (allowSkip) $('.skip-link', box).onclick = () => done(true);
    if (tb) tb.onclick = async () => {
      if (tb.classList.contains('on')) { Voice.stopListen(); return; }
      tb.classList.add('on'); tb.querySelector('span').textContent = 'Listening… tap to stop'; Timer.passive = true;
      const before = ta.value ? ta.value + ' ' : '';
      const t = await Voice.listen({ onPartial: p => { ta.value = before + p; Timer.poke(); } });
      Timer.passive = false; tb.classList.remove('on'); tb.querySelector('span').textContent = 'Tap and talk';
      if (t) { ta.value = before + t; spoken = true; } else if (!ta.value) toast(ico('mic') + ' I could not hear you. Try again, or type your answer.');
    };
  });
}

/* ---------- Coggy's replies in the chat (built-in; the AI is used when switched on) ---------- */
function localReply(turn, text) {
  const x = textStats(text), first = (Q.child.name || '').split(' ')[0];
  if (x.safety) return 'Thank you for trusting me with that. It sounds really serious, and you deserve to feel safe. Please tell a grown-up you trust today, like your teacher or a parent. I have let your teacher know you might want to talk.';
  if (x.blank) return pick(['That is okay, you do not have to know right now.', 'No problem! Sometimes it is hard to think of an answer.', 'That is fine. Let’s keep going!']);
  const like = (Q.child.likes || []).find(l => new RegExp(l.split(' ')[0], 'i').test(text));
  const echo = text.split(/[.!?]/)[0].split(/\s+/).slice(0, 8).join(' ');
  if (x.neg > x.pos) return pick([`That sounds hard, ${first}. Thank you for telling me about it.`, `I hear you. Feeling that way is okay, and talking about it is brave.`, `Hmm, that does not sound easy. You are doing well by sharing it.`]) + (turn.key === 'worry' ? ' Lots of children feel the same way.' : '');
  if (like) return `Oh, ${like.toLowerCase()}! ${pick(['That is so cool.', 'I love that.', 'You must be good at it!'])}`;
  if (x.words >= 10) return pick([`Wow, thank you for telling me so much! "${echo}…" sounds interesting.`, `I really like how you explained that, ${first}.`, `That is a great answer. You think about things carefully!`]);
  return pick(['Nice! Thanks for sharing.', 'Got it! That is interesting.', 'Cool! I like learning about you.', `Thank you, ${first}!`]);
}

/* ================= activity types ================= */
const RUN = {
  /* a game mission from the first MindQuest (arcade.js) */
  async game(it, s) {
    Timer.passive = ['audio', 'reading', 'listenPick', 'beeps'].includes(it.game.game);   // listening or reading time is not idle time
    const res = await Arcade.run(it.game, Q.child.grade, s, { seed: hashStr(Q.user.uid) ^ (Q.week.week * 7919), i: Q.week.idx, mic: Checks.micOk == null ? { ok: true } : { ok: Checks.micOk } });
    Timer.passive = false;
    if (res.correct != null) Heart.event(res.correct);
    coggy(res.correct === true ? pick(['Brilliant!', 'You got it!', 'Super thinking!']) : res.correct === false ? pick(['Good try! On to the next one.', 'Nice effort!']) : 'Thanks! Let’s keep going.', false);
    return { ...res, noCheer: true };
  },
  async mood(it, s) {
    s.innerHTML = `<h2 class="q-h">${esc(it.say)} ${speakBtn(it.say)}</h2><div class="mood-grid"></div>`;
    coggy(it.say);
    const m = await new Promise(res => MOODS.forEach(mo => { const b = document.createElement('button'); b.className = 'mood-btn'; b.innerHTML = `${faceSvg(mo.k)}<span>${mo.t}</span>`; b.onclick = () => { Sfx.pop(); $$('.mood-btn', s).forEach(x => x.classList.toggle('sel', x === b)); res(mo); }; $('.mood-grid', s).append(b); }));
    await sleep(300);
    s.insertAdjacentHTML('beforeend', `<h3 class="q-h2">How strong is that feeling?</h3>`);
    const st = await choiceList(s, [{ t: 'A little', s: 1 }, { t: 'Quite a lot', s: 2 }, { t: 'Very strong', s: 3 }], { cls: 'row3', letters: false });
    if (MOOD_SCORE[m.k] < .3) await coggy(`Thanks for telling me. It is okay to feel ${m.t.toLowerCase()}. ${it.when === 'start' ? 'Let’s take it easy today.' : 'A grown-up you trust can help if you want to talk.'}`);
    return { mood: m.k, intensity: st.s, when: it.when };
  },

  async chat(it, s) {
    s.innerHTML = `<div class="chat"><div class="chat-head">${MASCOT}<div><b>Chat with Coggy</b><small>${esc(it.title)}</small></div></div><div class="chat-log" aria-live="polite"></div><div class="chat-in"></div></div>`;
    const log = $('.chat-log', s), inp = $('.chat-in', s), turns = [], hist = [];
    const bubble = (who, text) => { const b = document.createElement('div'); b.className = 'bub ' + who; b.innerHTML = who === 'bot' ? `<span class="typing"><i></i><i></i><i></i></span>` : esc(text); log.append(b); log.scrollTop = log.scrollHeight; return b; };
    coggy('Let’s have a chat! Answer by talking or typing.', false);
    for (const t of it.turns) {
      const q = fill(t.say), b = bubble('bot'); await sleep(700); b.textContent = q; log.scrollTop = log.scrollHeight;
      hist.push({ role: 'assistant', content: q });
      Voice.say(q, { el: b });
      const t0 = performance.now(), a = await answerBox(inp, { placeholder: 'Talk or type to Coggy…' });
      Voice.stop();
      if (!a.skipped) bubble('me', a.text); else bubble('me', '(skipped)');
      hist.push({ role: 'user', content: a.text || '(skipped)' });
      turns.push({ key: t.key, domain: t.domain, q, text: a.text || '', spoken: !!a.spoken, skipped: !!a.skipped, ms: Math.round(performance.now() - t0) });
      const r = bubble('bot'); await sleep(600);
      let reply = null;
      if (MQ_CONFIG.ai.useForChat && !textStats(a.text).safety) reply = await Insights.chatReply(hist, Q.child).catch(() => null);
      reply = reply || localReply(t, a.text || '');
      r.textContent = reply; log.scrollTop = log.scrollHeight; await Voice.say(reply, { el: r });
      hist.push({ role: 'assistant', content: reply });
    }
    await sleep(400);
    return { turns };
  },

  async scenario(it, s) {
    s.innerHTML = `<div class="sc-card"><div class="sc-tag">${ico('compass')} What would you do?</div><h2 class="q-h">${esc(it.text)} ${speakBtn(it.text)}</h2></div>`;
    coggy(it.text);
    const t0 = performance.now(), o = await choiceList($('.sc-card', s), shuffle(it.opts));
    return { s: o.s, choice: o.t, rt: Math.round(performance.now() - t0) };
  },

  async rate(it, s) {
    s.innerHTML = `<div class="rate-card"><div class="sc-tag">${ico('user')} About me: how much is this like you?</div><h2 class="q-h big">"${esc(it.text)}" ${speakBtn(it.text)}</h2></div>`;
    coggy('How much is this like you? ' + it.text);
    const o = await choiceList($('.rate-card', s), RATE_OPTS, { cls: 'rate4', letters: false });
    return { s: it.reverse ? 5 - o.s : o.s, choice: o.t };
  },

  async story(it, s) {
    s.innerHTML = `<div class="story-wrap"></div>`;
    coggy(`Story time! Watch "${it.title}". The video will pause to ask you questions.`, false);
    await Voice.say(`Story time! Watch ${it.title}. The video will pause to ask you questions.`);
    Timer.passive = true;
    const stops = [];
    await playStory($('.story-wrap', s), it, {
      onStop: async (st, resume) => {
        Timer.passive = false; Timer.poke();
        const ov = document.createElement('div'); ov.className = 'vid-q'; ov.innerHTML = `<h3>${esc(st.q)} ${speakBtn(st.q)}</h3>`;
        $('.vid-screen', s).append(ov); Voice.say(st.q);
        const t0 = performance.now(), o = await choiceList(ov, shuffle(st.opts));
        stops.push({ q: st.q, domain: st.domain, s: o.s, choice: o.t, rt: Math.round(performance.now() - t0) });
        ov.classList.add('out'); await sleep(300); ov.remove(); Timer.passive = true; resume();
      }
    });
    Timer.passive = false;
    return { stops };
  },

  /* Star Catcher: go / no-go. Tap for a star, hold back for a cloud. Measures steady attention and impulse control. */
  async focus(it, s) {
    const N = 32 + it.level * 4, gap = [0, 1000, 880, 780][it.level] || 800, show = gap * .62;
    s.innerHTML = `<div class="game"><h2 class="q-h">Star Catcher</h2><p class="g-help">Tap the big button (or press <kbd>Space</kbd>) as fast as you can when you see a <b class="c-star">${ico('star')} star</b>. <br>Do <b>not</b> tap when you see a <b class="c-cloud">${ico('cloud')} cloud</b>!</p>
      <div class="gng"><div class="gng-show"></div></div><button class="gng-tap" type="button">TAP!</button><div class="g-meter"><i></i></div><button class="btn btn-primary g-go">${ico('play')} I am ready</button></div>`;
    coggy('Tap when you see a star. Do not tap when you see a cloud! Ready?');
    await new Promise(r => $('.g-go', s).onclick = r); $('.g-go', s).remove();
    const show$ = $('.gng-show', s), tap = $('.gng-tap', s), bar = $('.g-meter i', s);
    for (const c of ['3', '2', '1']) { show$.innerHTML = `<b class="count">${c}</b>`; Sfx.tone(520, .08); await sleep(600); }
    const trials = shuffle(Array.from({ length: N }, (_, i) => i < Math.round(N * .72) ? 'go' : 'no'));
    let cur = null, t0 = 0, hits = 0, falseTaps = 0, misses = 0; const rts = [];
    const onTap = () => {
      Timer.poke(); if (!cur || cur.done) return; cur.done = true;
      if (cur.k === 'go') { hits++; rts.push(performance.now() - t0); show$.classList.add('good'); Sfx.tone(880, .05); } else { falseTaps++; show$.classList.add('bad'); Sfx.tone(200, .12, 'square', .04); }
    };
    tap.onpointerdown = onTap; const key = e => { if (e.code === 'Space') { e.preventDefault(); onTap(); } }; addEventListener('keydown', key);
    for (let i = 0; i < trials.length; i++) {
      while (Timer.paused) await sleep(200);
      cur = { k: trials[i], done: false }; show$.className = 'gng-show'; show$.innerHTML = `<span class="st ${cur.k}">${ico(cur.k === 'go' ? 'star' : 'cloud')}</span>`; t0 = performance.now();
      await sleep(show); show$.innerHTML = ''; await sleep(gap - show);
      if (cur.k === 'go' && !cur.done) misses++;
      cur.done = true; bar.style.width = ((i + 1) / trials.length * 100) + '%';
    }
    removeEventListener('keydown', key);
    const go = trials.filter(t => t === 'go').length, rtMean = rts.length ? Math.round(mean(rts)) : null, rtSd = rts.length > 2 ? Math.round(Math.sqrt(mean(rts.map(r => (r - rtMean) ** 2)))) : null;
    show$.innerHTML = `<div class="g-res">${ico('star')} You caught <b>${hits}</b> of ${go} stars!</div>`; Sfx.good(); await sleep(1600);
    return { go, nogo: N - go, hits, misses, falseTaps, rtMean, rtSd, level: it.level };
  },

  /* Light Trail: watch the pads light up, repeat the order. Longest correct trail = memory span. */
  async memory(it, s) {
    const cols = ['#F7941D', '#4D96FF', '#2EC4B6', '#FF6FB5', '#9B5DE5', '#FFC93C', '#5CC46A', '#FF6B6B', '#14B8A6'];
    s.innerHTML = `<div class="game"><h2 class="q-h">Light Trail</h2><p class="g-help">Watch the pads light up. Then tap them in the <b>same order</b>. The trail gets longer each time!</p>
      <div class="pads">${cols.map((c, i) => `<button class="pad" style="--c:${c}" data-i="${i}" disabled aria-label="Pad ${i + 1}"></button>`).join('')}</div><div class="g-status"></div><button class="btn btn-primary g-go">${ico('play')} Start</button></div>`;
    coggy('Watch the lights, then tap them in the same order!');
    await new Promise(r => $('.g-go', s).onclick = r); $('.g-go', s).remove();
    const pads = $$('.pad', s), st = $('.g-status', s);
    const flash = async (i, ms = 520) => { pads[i].classList.add('lit'); Sfx.tone(330 + i * 60, .18); await sleep(ms); pads[i].classList.remove('lit'); await sleep(170); };
    let len = 3, fails = 0, span = 2, rounds = 0;
    while (len <= 9 && fails < 2) {
      while (Timer.paused) await sleep(200);
      rounds++; const seq = []; while (seq.length < len) { const r = Math.floor(Math.random() * 9); if (r !== seq[seq.length - 1]) seq.push(r); }
      st.innerHTML = `${ico('eye')} Watch… (${len} lights)`; Timer.passive = true; await sleep(700);
      for (const i of seq) await flash(i);
      Timer.passive = false; Timer.poke(); st.innerHTML = `${ico('hand')} Your turn!`;
      const ok = await new Promise(res => {
        let k = 0; pads.forEach(p => p.disabled = false);
        const h = e => { const i = +e.currentTarget.dataset.i; Timer.poke(); e.currentTarget.classList.add('lit'); setTimeout(() => pads[i].classList.remove('lit'), 200); Sfx.tone(330 + i * 60, .12);
          if (i !== seq[k]) { end(false); return; } if (++k === seq.length) end(true); };
        const end = r => { pads.forEach(p => { p.disabled = true; p.onclick = null; }); res(r); };
        pads.forEach(p => p.onclick = h);
      });
      if (ok) { span = len; fails = 0; len++; st.innerHTML = `${ico('check')} Correct!`; Sfx.good(); }
      else { fails++; st.innerHTML = fails < 2 ? `${ico('replay')} Oops! Try another one.` : `${ico('star')} Good try!`; Sfx.soft(); }
      await sleep(900);
    }
    st.innerHTML = `${ico('trophy')} Your longest trail: <b>${span}</b> lights!`; await sleep(1500);
    return { span, rounds };
  },

  async breathe(it, s) {
    const n = it.long ? 5 : 3;
    s.innerHTML = `<div class="breathe"><h2 class="q-h">Calm breath break</h2><p class="g-help">Breathe in as the circle grows, out as it shrinks.</p><div class="br-circle"><span>Ready</span></div><div class="br-count"></div></div>`;
    Timer.passive = true; const hr0 = Heart.live.hr;
    await coggy('Time for a calm breath break. Breathe in as the circle grows, and out as it shrinks.');
    const c = $('.br-circle', s), lab = $('span', c);
    for (let i = 0; i < n; i++) {
      $('.br-count', s).textContent = `Breath ${i + 1} of ${n}`;
      c.className = 'br-circle in'; lab.textContent = 'Breathe in…'; Voice.say('Breathe in'); await sleep(4000);
      c.className = 'br-circle out'; lab.textContent = 'Breathe out…'; Voice.say('and out'); await sleep(4500);
    }
    lab.textContent = 'Well done!'; Timer.passive = false;
    return { breaths: n, hrBefore: hr0 || null, hrAfter: Heart.live.hr || null };
  },

  async voice(it, s) {
    s.innerHTML = `<div class="voice-card">${ico('mic', 'big')}<div class="sc-tag">My voice</div><h2 class="q-h">${esc(it.text)} ${speakBtn(it.text)}</h2><div class="v-in"></div></div>`;
    await coggy(it.text);
    const t0 = performance.now(), a = await answerBox($('.v-in', s));
    if (!a.skipped) await coggy(localReply({ key: it.key }, a.text));
    return { key: it.key, q: it.text, text: a.text, spoken: !!a.spoken, skipped: !!a.skipped, rt: Math.round(performance.now() - t0) };
  },

  async checkin(it, s) {
    s.innerHTML = `<div class="ci-card"><div class="sc-tag">${ico('shield')} Private check-in</div><p class="ci-note">${ico('lock')} Only your teacher or parent will see this.</p><h2 class="q-h">At this time, I feel:</h2></div>`;
    await coggy('This is a private check-in. At this time, how do you feel?');
    const a = await choiceList($('.ci-card', s), [{ t: 'Comfortable', k: 'comfortable', f: 'happy' }, { t: 'A little worried', k: 'worried', f: 'fearful' }, { t: 'I need to talk privately to a trusted adult', k: 'talk', f: 'sad' }], { letters: false });
    $('.ci-card', s).insertAdjacentHTML('beforeend', '<h2 class="q-h">Would you like a private chat with a trusted adult?</h2>');
    Voice.say('Would you like a private chat with a trusted adult?');
    const b = await choiceList($('.ci-card', s), [{ t: 'Yes', k: 'yes' }, { t: 'No', k: 'no' }, { t: 'Not sure', k: 'unsure' }], { cls: 'row3', letters: false });
    if (a.k !== 'comfortable' || b.k === 'yes') await coggy('Thank you for telling me. Your teacher or parent will find a quiet time to talk with you. You are not alone.');
    return { feel: a.k, want: b.k };
  }
};
