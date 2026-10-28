/* ================================================================
   Scoring: turns a week's answers into well-being levels, focus, memory, mood,
   time patterns, camera and heart summaries, and gentle flags for adults.
   All scores are 0..1 here; the report shows them on the 4-step CBSE-style scale.
   This is a screening picture from games, not a diagnosis.
   ================================================================ */
function textStats(t) {
  t = String(t || '').trim(); const words = t ? t.split(/\s+/).length : 0;
  const pos = (t.match(POS_WORDS) || []).length, neg = (t.match(NEG_WORDS) || []).length;
  return { words, pos, neg, sent: words ? (pos - neg) / (pos + neg + 1) : 0, safety: SAFETY_WORDS.test(t), trust: TRUST_WORDS.test(t), blank: !words || /^(nothing|no|nope|idk|i don'?t know|dont know|don'?t know|no idea|skip|pass)\.?$/i.test(t) };
}
/* a chat or voice answer becomes a 1..4 score for its area: sharing anything real counts, even a worry */
function openScore(key, t) {
  const x = textStats(t);
  if (x.blank) return { s: 1.5, x };
  const rich = x.words >= 12 ? 1 : x.words >= 5 ? .5 : 0;
  let s = 2.5 + rich;
  if (/^(person|trust)$/.test(key)) s = x.trust ? 3.5 + rich / 2 : 2;
  if (/^(helps|whathelps)$/.test(key)) s = /\b(breath|breathe|talk|music|draw|play|walk|hug|sleep|rest|read|pray|water|count|tell|cry|relax|calm|dance|sing|game|run|cycle|write)\w*/i.test(t) ? 3.5 + rich / 2 : 2.2;
  if (/^(mistake|tryagain)$/.test(key)) s = /\b(again|practi[cs]e|tried|try|learn|better|improve|kept|keep|fixed|asked)\w*/i.test(t) ? 3.5 + rich / 2 : 2.4;
  if (/^(alone)$/.test(key)) s = x.trust || /\b(play|talk|friend|read|draw|music)\w*/i.test(t) ? 3.3 : 2.4;
  if (/^(screen)$/.test(key)) { const h = +(t.match(/(\d+(\.\d+)?)\s*(hours?|hrs?)/i) || [])[1]; s = h ? (h <= 2 ? 3.6 : h <= 3 ? 2.8 : h <= 5 ? 2 : 1.4) : 2.6; }
  if (/^(sleep)$/.test(key)) { const late = /\b(11|12|1|2)\s*(pm|am|o'?clock)?\b/i.test(t) || /midnight|late/i.test(t), fresh = /\bfresh|good|yes|well\b/i.test(t), tired = /tired|sleepy|no\b|not/i.test(t); s = late ? 1.8 : 3; if (fresh && !tired) s += .6; if (tired) s -= .6; }
  return { s: clamp(s, 1, 4), x };
}
const n01 = s => (s - 1) / 3;

/* the game missions (all MindQuest v1 game types): thinking skills (CHC abilities), Big Five, emotional
   intelligence and the listening / reading / voice signals. Works on one week or on many weeks together. */
function gameStats(G) {
  G = (G || []).filter(a => a && GAMES[a.game]);
  if (!G.length) return null;
  const abil = {};
  for (const k in ABILITIES) {
    let w = 0, s = 0; const from = new Set();
    G.forEach(a => { const m = a.measures; if (m && m[k] && a.score != null) { w += m[k]; s += m[k] * clamp(a.score, 0, 1); from.add(a.name || GAMES[a.game].name); } });
    abil[k] = w ? { v: Math.round(s / w * 100), n: G.filter(a => a.measures && a.measures[k] && a.score != null).length, from: [...from] } : null;
  }
  const big5 = {};
  for (const k in BIG5_INFO) { const l = G.flatMap(a => (a.big5 || []).filter(x => x.t === k).map(x => x.v)); big5[k] = l.length ? { v: Math.round(mean(l) / 3 * 100), n: l.length } : null; }
  const eiA = G.filter(a => a.ei), ei = eiA.length ? { u: Math.round(mean(eiA.map(a => a.ei.u)) * 100), m: Math.round(mean(eiA.map(a => a.ei.m)) * 100), n: eiA.length } : null;
  const ex = t => G.filter(a => a.game === t && a.extra), av = l => { l = l.filter(v => v != null && !isNaN(v)); return l.length ? mean(l) : null; };
  const L = ex('audio'), Lh = L.filter(a => !a.extra.textFallback);
  const listen = L.length ? { n: L.length, heard: Lh.length, acc: av(L.map(a => a.score)), plays: av(Lh.map(a => a.extra.plays || 1)), once: Lh.filter(a => (a.extra.plays || 1) === 1).length, look: av(Lh.map(a => a.extra.lookPct)) } : null;
  const Rd = ex('reading'), reading = Rd.length ? { n: Rd.length, acc: av(Rd.map(a => a.score)), wpm: av(Rd.map(a => a.extra.wpm || null)), looks: av(Rd.map(a => a.extra.lookbacks || 0)) } : null;
  const Dsc = ex('describe'), talk = Dsc.length ? { n: Dsc.length, words: av(Dsc.map(a => a.extra.words || 0)), hits: av(Dsc.map(a => (a.extra.hits || []).length)), voice: Dsc.filter(a => a.extra.mode === 'voice').length, quotes: Dsc.map(a => a.extra.transcript || a.extra.text).filter(Boolean).slice(-3) } : null;
  const Sp = ex('speak'), say = Sp.length ? { n: Sp.length, acc: av(Sp.map(a => a.score)), words: av(Sp.map(a => a.extra.count != null ? a.extra.count : a.extra.words)), quotes: Sp.map(a => a.extra.transcript).filter(Boolean).slice(-3) } : null;
  const Fg = ex('fingers'), fingers = Fg.length ? { n: Fg.length, acc: av(Fg.map(a => a.score)), hand: Fg.reduce((s, a) => s + (a.extra.hands || 0), 0), total: Fg.reduce((s, a) => s + (a.extra.answers || []).length, 0) } : null;
  const Qk = ex('quick'), quick = Qk.length ? { n: Qk.length, acc: av(Qk.map(a => a.extra.acc)), rt: av(Qk.map(a => a.extra.meanRt)), best: Math.max(...Qk.map(a => a.extra.bestStreak || 0)) } : null;
  const C = G.filter(a => a.game === 'catch' && a.extra && Array.isArray(a.extra.phaseAccuracy) && a.extra.phaseAccuracy.length > 1).map(a => a.extra.phaseAccuracy);
  const sw = C.length ? { before: av(C.map(p => p[0])), after: av(C.map(p => av(p.slice(1)))) } : null;
  const scored = G.filter(a => a.correct != null);
  return { n: G.length, scored: scored.length, right: scored.filter(a => a.correct).length, abil, big5, ei, listen, reading, talk, say, fingers, quick, sw,
    rt: av(G.filter(a => ['count', 'pattern', 'math', 'riddle'].includes(a.game)).map(a => a.rt)) };
}
const trimGame = a => ({ game: a.game, key: a.key || null, name: a.name || GAMES[a.game].name, measures: a.measures || null, correct: a.correct ?? null, score: a.score ?? null, rt: a.rt || null, ms: a.ms || 0, big5: a.big5 || null, ei: a.ei || null, extra: a.extra || null, idx: a.idx });

function scoreWeek(w, grade) {
  const A = w.answers || [], dom = {}, flags = [], voice = [], byType = {};
  const add = (k, s, wgt = 1) => { if (!k || s == null || isNaN(s)) return; const d = dom[k] = dom[k] || { sum: 0, n: 0, items: 0 }; d.sum += n01(s) * wgt; d.n += wgt; d.items++; };
  let mood = {}, checkin = null, focus = null, memory = null, games = [], sentAll = [], camAgg = { n: 0, emo: {}, gaze: {} }, rts = [];
  for (const a of A) {
    byType[a.type] = (byType[a.type] || 0) + (a.ms || 0);
    if (a.cam && a.cam.n) { camAgg.n += a.cam.n; for (const k in a.cam.emo || {}) camAgg.emo[k] = (camAgg.emo[k] || 0) + a.cam.emo[k]; for (const k in a.cam.gaze || {}) camAgg.gaze[k] = (camAgg.gaze[k] || 0) + a.cam.gaze[k]; }
    if (a.skipped) continue;
    switch (a.type) {
      case 'game': games.push(trimGame({ ...a, idx: A.indexOf(a) })); break;
      case 'scenario': add(a.domain, a.s); if (a.rt) rts.push(a.rt); break;
      case 'rate': add(a.domain, a.s, .8); break;
      case 'story': for (const st of a.stops || []) add(st.domain, st.s); break;
      case 'chat': for (const t of a.turns || []) { const o = openScore(t.key, t.text); add(t.domain, o.s, .7); add('communication', o.x.blank ? 1.5 : o.x.words >= 8 ? 3.6 : o.x.words >= 3 ? 2.8 : 2.2, .4); sentAll.push(o.x.sent); if (o.x.safety) flags.push({ level: 'high', area: 'safety', text: `In the chat ("${t.key}") the child wrote or said words that may signal a safety concern: "${String(t.text).slice(0, 140)}". Please follow your school’s safeguarding procedure and check in privately.` }); voice.push({ key: t.key, q: t.q, text: t.text }); } break;
      case 'voice': { const o = openScore(a.key, a.text); add(a.domain, o.s); sentAll.push(o.x.sent); voice.push({ key: a.key, q: a.q, text: a.text }); if (o.x.safety) flags.push({ level: 'high', area: 'safety', text: `In "My voice" the child shared: "${String(a.text).slice(0, 140)}". Please check in privately and follow safeguarding steps.` }); break; }
      case 'mood': mood[a.when] = a.mood; break;
      case 'checkin': checkin = a; break;
      case 'focus': focus = a; break;
      case 'memory': memory = a; break;
    }
  }
  const domains = {}; for (const k in dom) domains[k] = { v: dom[k].sum / dom[k].n, n: dom[k].items };
  const vals = Object.values(domains).filter(d => d.n >= 2).map(d => d.v);
  const wellbeing = vals.length ? Math.round(mean(vals) * 100) : null;

  /* focus: Star Catcher is a go / no-go task (tap stars, hold back on clouds) */
  let focusR = null;
  if (focus && focus.go) {
    const hit = focus.hits / focus.go, fa = focus.nogo ? focus.falseTaps / focus.nogo : 0;
    focusR = { hitRate: hit, falseRate: fa, rtMean: focus.rtMean, rtSd: focus.rtSd, score: clamp(.6 * hit + .4 * (1 - fa) - (focus.rtSd && focus.rtMean ? clamp((focus.rtSd / focus.rtMean - .25) * .5, 0, .15) : 0), 0, 1) };
  }
  let memR = memory && memory.span != null ? { span: memory.span, score: clamp((memory.span - 2) / 5, 0, 1) } : null;
  /* game missions: focus comes from Attention & Self-Control, memory from Working Memory */
  const gs = gameStats(games);
  if (gs && !focusR && gs.abil.EF) focusR = { score: gs.abil.EF.v / 100, hitRate: null, falseRate: null, rtMean: gs.rt };
  if (gs && !memR && gs.abil.Gwm) memR = { span: null, score: gs.abil.Gwm.v / 100 };
  if (gs && gs.ei && gs.ei.u + gs.ei.m < 80) flags.push({ level: 'watch', area: 'feelings', text: 'In the feelings stories the child found it hard both to name how a character felt and to pick a helpful way to handle it.' });

  /* time: how long the quest took, how long the child stayed engaged in one go, idle time */
  const T = w.timing || {}, items = A.filter(a => !a.skipped);
  const time = { activeMs: T.activeMs || items.reduce((s, a) => s + (a.ms || 0), 0), idleMs: T.idleMs || 0, hiddenMs: T.hiddenMs || 0, pausedMs: T.pausedMs || 0, sittings: T.sittings || 1, longestStreakMs: T.longestStreakMs || 0, byType, scenarioRt: rts.length ? Math.round(mean(rts)) : null };
  time.pace = time.scenarioRt == null ? null : time.scenarioRt < 9000 ? 'quick' : time.scenarioRt < 30000 ? 'steady' : 'slow';
  if (time.scenarioRt && time.scenarioRt < 4500) flags.push({ level: 'watch', area: 'focus', text: 'Answered the "What would you do?" situations very fast (under 5 seconds on average). The child may have been rushing; those answers are less certain.' });

  /* camera summary */
  let cam = null;
  if (camAgg.n >= 20) {
    const tot = Object.values(camAgg.emo).reduce((a, b) => a + b, 0) || 1, gz = Object.values(camAgg.gaze).reduce((a, b) => a + b, 0) || 1, emo = {}, gaze = {};
    for (const k of EMOTIONS) emo[k] = (camAgg.emo[k] || 0) / tot;
    for (const k in camAgg.gaze) gaze[k] = camAgg.gaze[k] / gz;
    cam = { emo, gaze, attention: (camAgg.gaze.center || 0) / gz, samples: camAgg.n };
  }
  const heart = w.heart || null;

  /* stress picture: mood, check-in, coping answers, camera tension, heart rate rise */
  const mS = [mood.start, mood.end].filter(Boolean).map(k => MOOD_SCORE[k] != null ? MOOD_SCORE[k] : .5);
  let stress = 0, sw = 0;
  const addS = (v, wt) => { if (v == null || isNaN(v)) return; stress += v * wt; sw += wt; };
  addS(mS.length ? 1 - mean(mS) : null, 2);
  addS(domains.coping ? 1 - domains.coping.v : null, 2);
  addS(domains.feelings ? 1 - domains.feelings.v : null, 1);
  addS(sentAll.length ? clamp(.5 - mean(sentAll) / 2, 0, 1) : null, 1);
  addS(checkin ? ({ comfortable: .1, worried: .65, talk: .95 })[checkin.feel] : null, 2);
  addS(cam ? clamp(((cam.emo.sad || 0) + (cam.emo.fearful || 0) + (cam.emo.angry || 0)) * 2.2, 0, 1) : null, 1);
  addS(heart && heart.calm && heart.avg ? clamp((heart.avg - heart.calm) / 25, 0, 1) : null, 1);
  stress = sw ? Math.round(stress / sw * 100) : null;

  if (checkin && checkin.feel === 'talk') flags.push({ level: 'high', area: 'check-in', text: 'In the check-in the child chose "I need to talk privately to a trusted adult". Please arrange a private, gentle conversation soon.' });
  else if (checkin && checkin.want === 'yes') flags.push({ level: 'high', area: 'check-in', text: 'The child asked for a private check-in with a trusted adult.' });
  else if (checkin && checkin.feel === 'worried') flags.push({ level: 'watch', area: 'check-in', text: 'The child said they feel "a little worried" right now. A friendly check-in would help.' });
  if (mood.start && mood.end && MOOD_SCORE[mood.start] < .3 && MOOD_SCORE[mood.end] < .3) flags.push({ level: 'watch', area: 'mood', text: `Started and finished the quest feeling ${MOODS.find(m => m.k === mood.start).t.toLowerCase()} / ${MOODS.find(m => m.k === mood.end).t.toLowerCase()}.` });
  for (const k in domains) if (domains[k].n >= 3 && domains[k].v < .35) flags.push({ level: 'watch', area: k, text: `${domainName(k, grade)} came out at "Developing" this week.` });

  return { week: w.week, domains, wellbeing, mood, checkin: checkin ? { feel: checkin.feel, want: checkin.want } : null, focus: focusR, memory: memR, games, gs, time, cam, heart, stress, flags, voice, answered: items.length, total: A.length };
}

/* combines several weeks: weighted by how much evidence each week has; also the trend */
function combine(results) {
  const R = results.filter(Boolean); if (!R.length) return null;
  const dom = {};
  for (const r of R) for (const k in r.domains) { const d = dom[k] = dom[k] || { s: 0, n: 0 }; d.s += r.domains[k].v * r.domains[k].n; d.n += r.domains[k].n; }
  const domains = {}; for (const k in dom) domains[k] = { v: dom[k].s / dom[k].n, n: dom[k].n };
  const avg = f => { const v = R.map(f).filter(x => x != null && !isNaN(x)); return v.length ? mean(v) : null; };
  const vals = Object.values(domains).filter(d => d.n >= 2).map(d => d.v);
  const camR = R.filter(r => r.cam), heartR = R.filter(r => r.heart);
  const cam = camR.length ? { emo: Object.fromEntries(EMOTIONS.map(k => [k, mean(camR.map(r => r.cam.emo[k] || 0))])), attention: mean(camR.map(r => r.cam.attention)), gaze: Object.fromEntries(['center', 'left', 'right', 'up', 'down', 'away'].map(k => [k, mean(camR.map(r => r.cam.gaze[k] || 0))])) } : null;
  const hl = heartR.length ? heartR[heartR.length - 1].heart : null;
  const heart = hl ? { ...hl, avg: Math.round(mean(heartR.map(r => r.heart.avg))), min: Math.min(...heartR.map(r => r.heart.min || 999)), max: Math.max(...heartR.map(r => r.heart.max || 0)), calm: avg(r => r.heart && r.heart.calm), hrv: avg(r => r.heart && r.heart.hrv), spo2: avg(r => r.heart && r.heart.spo2), weeks: heartR.length, lastWeek: heartR[heartR.length - 1].week } : null;
  const games = R.flatMap(r => (r.games || []).map(g => ({ ...g, week: r.week }))), gs = gameStats(games);
  const byType = {}; for (const r of R) for (const k in r.time.byType) byType[k] = (byType[k] || 0) + r.time.byType[k];
  return {
    weeks: R.map(r => r.week), domains, wellbeing: vals.length ? Math.round(mean(vals) * 100) : null,
    stress: avg(r => r.stress) != null ? Math.round(avg(r => r.stress)) : null,
    focus: avg(r => r.focus && r.focus.score) != null ? { score: avg(r => r.focus && r.focus.score), hitRate: avg(r => r.focus && r.focus.hitRate), falseRate: avg(r => r.focus && r.focus.falseRate), rtMean: avg(r => r.focus && r.focus.rtMean) } : null,
    memory: avg(r => r.memory && r.memory.score) != null ? { span: avg(r => r.memory && r.memory.span) != null ? Math.round(avg(r => r.memory && r.memory.span) * 10) / 10 : null, score: avg(r => r.memory && r.memory.score) } : null,
    games, gs, lastGames: R[R.length - 1].games || [],
    time: { activeMs: R.reduce((s, r) => s + r.time.activeMs, 0), idleMs: R.reduce((s, r) => s + r.time.idleMs, 0), perWeekMs: avg(r => r.time.activeMs), longestStreakMs: Math.max(...R.map(r => r.time.longestStreakMs || 0)), avgStreakMs: avg(r => r.time.longestStreakMs), scenarioRt: avg(r => r.time.scenarioRt), byType, sittings: avg(r => r.time.sittings) },
    cam, heart, flags: R.flatMap(r => r.flags.map(f => ({ ...f, week: r.week }))), voice: R.flatMap(r => r.voice.map(v => ({ ...v, week: r.week }))),
    moods: R.map(r => ({ week: r.week, ...r.mood })), checkins: R.map(r => ({ week: r.week, ...(r.checkin || {}) })),
    trend: R.map(r => ({ week: r.week, wellbeing: r.wellbeing, stress: r.stress, focus: r.focus ? Math.round(r.focus.score * 100) : null, memory: r.memory ? Math.round(r.memory.score * 100) : null, games: r.gs ? r.gs.n : 0, mins: Math.round(r.time.activeMs / 60000) }))
  };
}

/* marks: average % per entry, per subject; compares with well-being and thinking skills */
const SUBJECT_LINKS = { Mathematics: ['Gq', 'Gf', 'Gwm'], Science: ['Gf', 'Gc', 'focus'], English: ['Grw', 'Gc', 'communication'], Hindi: ['Grw', 'Gc', 'communication'], 'Second language': ['Gc', 'communication'], 'Social Science': ['Grw', 'memory'], Computer: ['Gf', 'Gs', 'digital'], 'Physical Education': ['habits'], Art: ['Gv', 'confidence', 'feelings'] };
const linkName = k => ABILITIES[k] ? ABILITIES[k].label : k;
function marksPct(m) { const v = Object.values(m.subjects || {}).map(x => +x.got / +x.max).filter(x => !isNaN(x)); return v.length ? mean(v) : null; }
function alignment(comb, marks) {
  if (!comb || !marks || !marks.length) return null;
  const last = marks[marks.length - 1], ac = marksPct(last), wb = comb.wellbeing != null ? comb.wellbeing / 100 : null;
  if (ac == null || wb == null) return null;
  const think = mean([comb.focus && comb.focus.score, comb.memory && comb.memory.score].filter(x => x != null)) ;
  const gap = ac - wb;
  let status, text;
  if (Math.abs(gap) < .15) { status = 'aligned'; text = ac >= .7 ? 'Marks and well-being are both strong and match each other.' : ac >= .5 ? 'Marks and well-being are at a similar, middle level. Supporting well-being is likely to help marks too.' : 'Marks and well-being are both on the low side. Emotional support and study support should go together.'; }
  else if (gap > 0) { status = 'marks-higher'; text = 'Marks are higher than the well-being picture. The child is performing, possibly while under pressure: watch for stress, sleep and over-work.'; }
  else { status = 'marks-lower'; text = 'Well-being looks better than marks. The child seems settled, so the gap is more likely about study skills, attention in class, or specific subject gaps.'; }
  const subjects = Object.entries(last.subjects || {}).map(([name, x]) => {
    const p = +x.got / +x.max, links = SUBJECT_LINKS[name] || [], lv = links.map(k => k === 'focus' ? comb.focus && comb.focus.score : k === 'memory' ? comb.memory && comb.memory.score : ABILITIES[k] ? comb.gs && comb.gs.abil[k] && comb.gs.abil[k].v / 100 : comb.domains[k] && comb.domains[k].v).filter(v => v != null);
    const skill = lv.length ? mean(lv) : null, d = skill == null ? null : p - skill;
    return { name, pct: p, skill, links: links.map(linkName), note: skill == null ? '' : Math.abs(d) < .15 ? 'In line with related skills' : d < 0 ? `Below what ${links.map(linkName).join(' and ')} suggest: likely a subject gap or exam nerves` : `Above related skills: working hard here` };
  });
  let trend = null;
  if (marks.length >= 2) { const a = marksPct(marks[marks.length - 2]), b = ac; trend = { from: a, to: b, change: b - a }; }
  return { status, text, academic: ac, wellbeing: wb, thinking: isNaN(think) ? null : think, subjects, trend, term: last.term };
}
