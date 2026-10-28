/* The report, in the same layout and order as the MindQuest v1 report (cover with the Champ Profile,
   at a glance, key numbers, key insights, thinking skills | Big Five, feelings | mood, listening & voice,
   camera, heart & body signals, mission details), plus the weekly well-being areas, marks and the
   suggestions for adults. Styles come from css/arcade.css (the v1 report styles, scoped under .arcade).
   Every number has an "i" with its meaning; the full list is in "Download glossary & details". */
const RP = { user: null, child: null, weeks: [], marks: [], notes: {} };
const NEG_EMO = ['sad', 'angry', 'fearful', 'disgusted'];
const abilityBand = v => v >= 80 ? ['Strong', '#16A34A'] : v >= 60 ? ['Good', '#F7941D'] : v >= 40 ? ['Developing', '#D9730A'] : ['Needs support', '#E5484D'];
const traitBand = (k, v) => v >= 67 ? BIG5_INFO[k].hi : v <= 33 ? BIG5_INFO[k].lo : 'Balanced';
const GAZE_TXT = { center: ['At the screen', ico('target')], left: ['Left', ico('arrow', 'rot-l')], right: ['Right', ico('arrow')], up: ['Up', ico('arrow', 'rot-u')], down: ['Down', ico('arrow', 'rot-d')], away: ['Face not visible', ico('eye', 'off')] };
const fmtSec = ms => ms == null ? '—' : ms < 60000 ? (ms / 1000).toFixed(1) + ' s' : Math.round(ms / 60000) + ' min';
const domOf = o => { const e = Object.entries(o || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]; return e ? e[0] : null; };

(async function boot() {
  RP.user = await guard('staff');
  const uid = qs('child'); RP.child = uid && await Store.getChild(uid);
  if (!RP.child) { $('#report').innerHTML = '<div class="card empty">Child not found.</div>'; return; }
  [RP.weeks, RP.marks, RP.notes] = await Promise.all([Store.getWeeks(uid), Store.getMarks(uid), Store.getNotes(uid)]);
  RP.weeks = RP.weeks.filter(w => w.status === 'done' || (w.answers || []).length >= 6);
  $('#rpBack').innerHTML = `${ico('arrow')} Dashboard`; $('#rpBack').href = 'staff.html?child=' + uid;
  $('#rpPdf').innerHTML = `${ico('download')} Download PDF`; $('#rpGloss').innerHTML = `${ico('book')} Download glossary &amp; details`; $('#rpPrint').innerHTML = `${ico('print')} Print`;
  const sel = $('#rpWeek'); sel.add(new Option('All weeks together', 'all')); RP.weeks.forEach(w => sel.add(new Option(`Week ${w.week}: ${w.title || ''}`, w.week)));
  sel.value = qs('week') || 'all'; sel.onchange = render;
  $('#rpPrint').onclick = () => print();
  $('#rpPdf').onclick = () => ReportPDF.save($('#report'), { name: RP.child.name, grade: RP.child.grade, date: fmtDate(Date.now()) }, $('#rpPdf'));
  $('#rpGloss').onclick = () => downloadGlossary(RP.child, RP.weeks, RP.comb, $('#rpGloss'));
  render();
})();

function barRow(icon, label, v, color, tip, unit = '%') {
  return `<div class="bar-row"${tip ? ` data-tip="${esc(tip)}"` : ''}><span>${icon}</span><span class="br-l">${esc(label)}</span><div class="bar-track"><i style="width:${clamp(v || 0, 0, 100)}%;background:${color}"></i></div><span class="br-v">${v == null ? '—' : v + unit}</span></div>`;
}

/* key insights, the way v1 wrote them, from the games, the PDF questions, the camera and the heart sensor */
function keyInsights(c, comb, name) {
  const ins = [], gs = comb.gs, ab = gs ? gs.abil : {};
  const abList = Object.entries(ab).filter(([, v]) => v).sort((a, b) => b[1].v - a[1].v);
  if (abList.length >= 2) {
    const [bk, bv] = abList[0], [wk, wv] = abList[abList.length - 1];
    ins.push([ico('star'), `<b>Strongest thinking skill: ${ABILITIES[bk].label}</b> (${bv.v}/100), ${ABILITIES[bk].desc}.`]);
    if (bv.v - wv.v >= 15) ins.push([ico('arrow', 'rot-u'), `<b>Room to grow: ${ABILITIES[wk].label}</b> (${wv.v}/100). Short, playful practice in ${ABILITIES[wk].desc} can help.`]);
  }
  if (ab.Gs && ab.Gf && ab.Gs.v - ab.Gf.v >= 25) ins.push([ico('bolt'), `${name} works <b>fast</b> but scored lower on reasoning puzzles. Slowing down to check answers may help.`]);
  if (ab.Ga && ab.Gv && Math.abs(ab.Ga.v - ab.Gv.v) >= 20) ins.push(ab.Ga.v > ab.Gv.v ? [ico('ear'), `${name} did better with <b>sounds and spoken words</b> than with pictures, which hints at an auditory learning preference.`] : [ico('image'), `${name} did better with <b>pictures and positions</b> than with sounds, which hints at a visual learning preference.`]);
  if (gs && gs.sw && gs.sw.before != null && gs.sw.after != null) ins.push(gs.sw.after < gs.sw.before - .2 ? [ico('replay'), `When the Quick Catch rule <b>switched</b>, accuracy dropped from ${pct(gs.sw.before)}% to ${pct(gs.sw.after)}%. Switching between rules is still developing.`] : [ico('replay'), `${name} <b>adapted well</b> when the Quick Catch rule switched (${pct(gs.sw.before)}% before, ${pct(gs.sw.after)}% after), a sign of good flexible thinking.`]);
  const L = gs && gs.listen;
  if (L && L.heard) ins.push(L.acc >= .7 ? [ico('ear'), `<b>Keen listener:</b> ${name} answered ${pct(L.acc)}% of the Listen Closely questions correctly${L.plays ? `, with ${L.plays.toFixed(1)} listens on average` : ''}.`] : [ico('ear'), `Listening to stories without words on the screen was <b>harder</b> (${pct(L.acc)}% correct). Reading aloud together and asking "what happened next?" builds listening attention.`]);
  if (gs && gs.talk) ins.push([ico('image'), `In Picture Talk ${name} used about <b>${Math.round(gs.talk.words)} words</b> per picture and mentioned about ${Math.round(gs.talk.hits)} details. ${gs.talk.hits >= 7 ? 'That shows sharp observation and good expression.' : 'Describing everyday scenes together ("what else can you see?") builds observation and vocabulary.'}`]);
  const b5 = gs ? Object.entries(gs.big5).filter(([, v]) => v) : [];
  if (b5.length) { const clear = b5.filter(([, v]) => v.v >= 67 || v.v <= 33).map(([k, v]) => `${BIG5_INFO[k].label}: <b>${traitBand(k, v.v).toLowerCase()}</b>`); ins.push([ico('compass'), clear.length ? `The Choose Your Path choices showed clear leanings in ${clear.join('; ')}. Traits have no right or wrong end.` : `${name}'s Choose Your Path answers sit in the <b>balanced</b> middle on the Big Five traits so far.`]); }
  const ei = gs && gs.ei;
  if (ei) ins.push(ei.u + ei.m >= 150 ? [ico('heart'), `<b>Emotional intelligence:</b> ${name} read the characters' feelings and chose helpful ways to handle them.`] : ei.u >= 50 && ei.m < 50 ? [ico('heart'), `${name} <b>understood</b> how the character felt, but picked a less helpful way to handle it. Talking through calm-down ideas can help.`] : ei.u < 50 && ei.m >= 50 ? [ico('heart'), `${name} knew a <b>good way to handle</b> the feeling, but found it harder to name what the character felt.`] : [ico('heart'), `Reading and handling feelings in the stories was <b>tricky</b> for ${name}. Naming feelings together in everyday moments builds this skill.`]);
  const D = Object.entries(comb.domains).filter(([, d]) => d.n >= 2).sort((a, b) => b[1].v - a[1].v);
  if (D.length) { const [k, d] = D[0]; ins.push([ico(DOMAINS[k].icon), `In the well-being questions (CBSE holistic card), <b>${esc(domainName(k, c.grade))}</b> came out strongest (${levelOf(d.v).label}).`]); }
  if (D.length > 1 && D[D.length - 1][1].v < .6) { const [k, d] = D[D.length - 1]; ins.push([ico('leaf'), `<b>${esc(domainName(k, c.grade))}</b> is the area to support next (${levelOf(d.v).label}).`]); }
  if (comb.cam) {
    const e = comb.cam.emo, neg = NEG_EMO.reduce((s, k) => s + (e[k] || 0), 0);
    if (e.happy >= .3) ins.push([faceSvg('happy'), `<b>Lots of smiles!</b> ${name} looked happy ${pct(e.happy)}% of the time, a sign of enjoyment.`]);
    else if (e.neutral >= .6) ins.push([faceSvg('neutral'), `${name}'s face was mostly <b>calm</b> (${pct(e.neutral)}%), which often means quiet concentration.`]);
    if (neg >= .18) ins.push([ico('chat'), `<b>Some stress signals:</b> ${name} looked sad, worried or annoyed ${pct(neg)}% of the time.`]);
    const f = comb.cam.attention; ins.push(f >= .8 ? [ico('target'), `<b>Excellent attention:</b> eyes on the screen ${pct(f)}% of the time.`] : f >= .6 ? [ico('eye'), `<b>Generally focused</b> (${pct(f)}% on screen).`] : [ico('eye', 'off'), `<b>Attention drifted often</b> (${pct(f)}% on screen). Shorter sittings or small breaks may help.`]);
  } else ins.push([ico('camera'), 'The camera was off or no face was seen, so feelings and attention from the camera are not included.']);
  const H = comb.heart;
  if (H && H.wrong && H.wrong.bpm >= 5) ins.push([ico('heart'), `After a wrong answer the heart rate <b>rose by about ${H.wrong.bpm} bpm</b>${H.right ? ` (after right answers: ${H.right.bpm >= 0 ? '+' : ''}${H.right.bpm})` : ''}. Mistakes may feel stressful for ${name}.`]);
  else if (H && H.calm && H.avg - H.calm >= 15) ins.push([ico('heart'), `Heart rate stayed <b>well above the calm level</b> (${H.avg} vs ${Math.round(H.calm)} bpm), which can mean excitement or strain.`]);
  return ins;
}

/* the heart card: same parts as v1 (numbers, heart rate through the quest, by activity, reaction to answers, pulse strip) */
function heartCard(H, name, answers) {
  if (!H) return '';
  const kpi = (l, v, sub) => `<div class="bio-kpi"><small>${l}</small><b>${v}</b><span>${sub}</span></div>`;
  const calm = H.calm ? Math.round(H.calm) : null, hrv = H.hrv != null ? Math.round(H.hrv) : null;
  const hrvTxt = hrv == null ? 'Needs a still finger' : hrv >= 50 ? 'Relaxed range' : hrv >= 25 ? 'Moderate' : 'Low: effort or stress';
  const label = i => { const a = answers[i]; return a ? (a.type === 'game' ? (a.name || GAMES[a.game].name) : (TYPES[a.type] || {}).label || a.type) : 'Activity'; };
  const top = Object.entries(H.perItem || {}).map(([i, hr]) => ({ i: +i, hr })).sort((a, b) => b.hr - a.hr).slice(0, 3);
  const rise = calm ? H.avg - calm : null, lvl = rise == null ? '' : rise >= 15 ? 'high' : rise >= 6 ? 'raised' : 'steady';
  let chart = '';
  const T = (H.trace || []).map((v, k) => [k, v, (H.traceItems || [])[k]]).filter(x => x[1]);
  if (T.length > 5) {
    const W = 640, Ht = 150, n = H.trace.length, lo = Math.min(...T.map(x => x[1]), calm || 999) - 5, hi = Math.max(...T.map(x => x[1])) + 5;
    const X = k => (k / Math.max(1, n - 1) * W).toFixed(1), Y = v => (Ht - 14 - (v - lo) / Math.max(1, hi - lo) * (Ht - 24)).toFixed(1);
    const zones = []; let z = null; (H.traceItems || []).forEach((it, k) => { if (it >= 0 && (!z || z.i !== it)) { z = { i: it, a: k, b: k }; zones.push(z); } else if (z && it === z.i) z.b = k; else if (it < 0) z = null; });
    const near = k => { let best = T[0]; for (const x of T) if (Math.abs(x[0] - k) < Math.abs(best[0] - k)) best = x; return best[1]; };
    const dots = (H.ev || []).map(({ at: k, ok }) => `<circle cx="${X(k)}" cy="${Y(near(k))}" r="4.5" fill="${ok ? '#16A34A' : '#E5484D'}" stroke="#fff" stroke-width="1.5"><title>${ok ? 'Right' : 'Wrong'} answer</title></circle>`).join('');
    chart = `<svg class="bio-chart" viewBox="0 0 ${W} ${Ht}" preserveAspectRatio="none" role="img" aria-label="Heart rate during the quest">${zones.map((q, k) => `<rect x="${X(q.a)}" y="0" width="${Math.max(1, X(q.b) - X(q.a))}" height="${Ht}" fill="${k % 2 ? '#FFF1DF' : '#FFF8EF'}"><title>${esc(label(q.i))}${H.perItem && H.perItem[q.i] ? ': ' + H.perItem[q.i] + ' bpm' : ''}</title></rect>`).join('')}${calm ? `<line x1="0" x2="${W}" y1="${Y(calm)}" y2="${Y(calm)}" stroke="#16A34A" stroke-dasharray="5 5" stroke-width="1.5"/>` : ''}<polyline points="${T.map(x => `${X(x[0])},${Y(x[1])}`).join(' ')}" fill="none" stroke="#E5484D" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${dots}</svg>
      <div class="bio-legend"><span><i style="background:#E5484D"></i>Heart rate</span>${calm ? `<span><i class="dash"></i>Calm level ${calm} bpm</span>` : ''}<span><i style="background:#FFE2C4"></i>Activities</span>${(H.ev || []).some(e => !e.ok) ? '<span><i class="dot"></i>Wrong answer</span>' : ''}${(H.ev || []).some(e => e.ok) ? '<span><i class="dot" style="background:#16A34A"></i>Right answer</span>' : ''}</div>`;
  }
  const acts = Object.entries(H.byType || {}).map(([k, hr]) => ({ k, hr, l: GAMES[k] ? GAMES[k].name : TYPES[k] ? TYPES[k].label : k === 'between' ? 'Between activities' : k, ic: GAMES[k] ? GAMES[k].ic : TYPES[k] ? TYPES[k].icon : 'dots' })).sort((a, b) => b.hr - a.hr).slice(0, 10);
  const mx = Math.max(...acts.map(a => a.hr), (calm || 60) + 10), mn = Math.min((calm || 80) - 10, ...acts.map(a => a.hr));
  const rows = acts.map(a => `<div class="bio-row"><span>${ico(a.ic)}</span><span class="br-l">${esc(a.l)}</span><div class="bar-track"><i style="width:${Math.round(8 + (a.hr - mn) / Math.max(1, mx - mn) * 92)}%;background:${calm && a.hr - calm >= 15 ? '#E5484D' : calm && a.hr - calm >= 6 ? '#F7941D' : '#16A34A'}"></i></div><span class="br-v">${a.hr}<small> bpm</small></span></div>`).join('');
  const strip = H.strip && H.strip.length > 20 ? (() => { const v = H.strip, l2 = Math.min(...v), h2 = Math.max(...v); return `<div class="bio-strip"><h5>${ico('heart')} Pulse wave (5 seconds)</h5><svg viewBox="0 0 ${v.length} 90" preserveAspectRatio="none" role="img" aria-label="Five seconds of pulse wave"><polyline points="${v.map((y, k) => `${k},${(84 - (y - l2) / Math.max(1, h2 - l2) * 78).toFixed(1)}`).join(' ')}" fill="none" stroke="#D9730A" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></div>`; })() : '';
  return `<div class="rp-card bio-card"><h4>${ico('heart')} Heart &amp; body signals ${info('heart')}</h4><p class="rc-sub">From the fingertip sensor (HW-605, MAX30102) · ${Math.round((H.secs || 0) / 60)} min recorded${H.weeks > 1 ? ` · ${H.weeks} weeks (chart: week ${H.lastWeek})` : ''}</p>
    <div class="bio-kpis">${kpi('Calm level', calm ? calm + '<small> bpm</small>' : '—', `${esc(name)}'s own resting rate`)}${kpi('While playing', H.avg + '<small> bpm</small>', rise != null ? `${rise >= 0 ? '+' : ''}${rise} over calm · ${lvl}` : 'average')}${kpi('Busiest activity', top[0] ? top[0].hr + '<small> bpm</small>' : '—', top[0] ? esc(label(top[0].i)) : '—')}${kpi('Heart rate variability', hrv != null ? hrv + '<small> ms</small>' : '—', hrvTxt)}${H.spo2 ? kpi('Blood oxygen', Math.round(H.spo2) + '<small>%</small>', H.spo2Low ? `lowest ${H.spo2Low}%` : '') : kpi('Highest', H.max + '<small> bpm</small>', 'peak heart rate')}</div>
    ${chart ? `<h5 class="bio-h">Heart rate through the quest ${info('heartchart')}</h5>${chart}` : ''}
    <div class="bio-split"><div><h5 class="bio-h">Heart rate by activity</h5><div class="bars">${rows || '<p class="rc-sub">Not enough readings yet.</p>'}</div></div>
    <div><h5 class="bio-h">Reaction to answers</h5><p class="bio-react">${H.wrong ? `After a <b>wrong</b> answer: <b class="${H.wrong.bpm >= 5 ? 'up' : ''}">${H.wrong.bpm >= 0 ? '+' : ''}${H.wrong.bpm} bpm</b> (${H.wrong.n} times)<br>` : ''}${H.right ? `After a <b>right</b> answer: <b>${H.right.bpm >= 0 ? '+' : ''}${H.right.bpm} bpm</b> (${H.right.n} times)` : ''}${!H.wrong && !H.right ? 'Not enough answers with a heart signal yet.' : ''}</p>
    ${top.length > 1 ? `<h5 class="bio-h">Highest heart rate</h5><ol class="bio-top">${top.map(m => `<li>${esc(label(m.i))} <b>${m.hr} bpm</b></li>`).join('')}</ol>` : ''}${strip}</div></div>
    <p class="rc-sub bio-note">Heart rate rises with excitement as well as with stress, so read it together with the expressions and mood answers. HRV is the RMSSD of beat-to-beat gaps. Blood oxygen from a fingertip is a rough guide. This is a classroom sensor, not a medical device.</p></div>`;
}

async function render() {
  const c = RP.child, scope = $('#rpWeek').value, W = scope === 'all' ? RP.weeks : RP.weeks.filter(w => String(w.week) === scope);
  const comb = RP.comb = combine(W.map(w => scoreWeek(w, c.grade)));
  const first = esc(c.name.split(' ')[0]), g = c.grade, R = $('#report');
  if (!comb) { R.innerHTML = '<div class="card empty">No finished quests yet.</div>'; return; }
  const al = alignment(comb, RP.marks), totalMs = W.reduce((s, w) => s + ((w.timing || {}).activeMs || 0), 0), gs = comb.gs, world = WORLDS[g] || WORLDS[4];
  const lastW = W[W.length - 1], hW = comb.heart ? W.find(w => w.week === comb.heart.lastWeek) || lastW : lastW;
  const dates = W.map(w => w.completedAt || w.startedAt).filter(Boolean);
  const detail = (l, v) => `<div class="rpc-row"><span class="rpc-l">${l}</span><span class="rpc-c">:</span><b class="rpc-v">${v}</b></div>`;
  const kpi = (l, v, s) => `<div class="kpi"><small>${l}</small><b>${v}</b><span>${s}</span></div>`;

  const abilHTML = Object.entries(ABILITIES).map(([k, d]) => {
    const a = gs && gs.abil[k]; if (!a) return `<div class="ab-row muted"><span>${ico(d.ic)}</span><span class="ab-l">${d.label}<small>Not played yet</small></span><div class="bar-track"></div><span class="ab-v">—</span></div>`;
    const [band, col] = abilityBand(a.v);
    return `<div class="ab-row" data-tip="${esc(`${d.label}: ${d.desc}. Measured by ${a.from.join(', ')}.`)}"><span>${ico(d.ic)}</span><span class="ab-l">${d.label}<small>${band} · ${a.n} mission${a.n > 1 ? 's' : ''}</small></span><div class="bar-track"><i style="width:${a.v}%;background:${col}"></i></div><span class="ab-v">${a.v}</span></div>`;
  }).join('');
  const b5HTML = Object.entries(BIG5_INFO).map(([k, t]) => {
    const b = gs && gs.big5[k];
    return `<div class="b5-row${b ? '' : ' muted'}"><div class="b5-top"><span>${ico(t.ic)} <b>${t.label}</b> <small>${t.kid}</small></span><em>${b ? traitBand(k, b.v) : 'Not answered yet'}</em></div>
      <div class="b5-scale"><span>${t.lo}</span><div class="b5-track">${b ? `<i style="left:${b.v}%"></i>` : ''}</div><span>${t.hi}</span></div></div>`;
  }).join('');
  const ei = gs && gs.ei;
  const eiHTML = ei ? barRow(ico('search'), 'Understanding feelings', ei.u, '#E64980', 'Reading what a character really feels', '') + barRow(ico('shield'), 'Managing feelings', ei.m, '#E64980', 'Choosing a helpful way to handle a feeling', '') : '<p class="rc-sub">Play the Feelings Detective mission to see this.</p>';
  const moodName = k => (MOODS.find(m => m.k === k) || {}).t || '';
  const moodHTML = comb.moods.map(m => `<div class="mood-journey"><div class="mj"><span>${m.start ? faceSvg(m.start) : ico('dots')}</span>Start${m.start ? ': ' + moodName(m.start) : ''}</div><div class="arrow">${ico('arrow')}</div><div class="mj"><span>${m.end ? faceSvg(m.end) : ico('dots')}</span>End${m.end ? ': ' + moodName(m.end) : ' (not reached)'}</div><small class="mj-w">Week ${m.week}</small></div>`).join('');
  const ckTxt = { comfortable: 'Comfortable', worried: 'A little worried', talk: 'Needs to talk privately' };
  const checkHTML = comb.checkins.filter(x => x.feel).map(x => `<span class="sum-tag ${x.feel === 'comfortable' ? 'ok' : x.feel === 'worried' ? 'mid' : 'bad'}">${ico('chat')}<small>Week ${x.week} check-in</small><b>${ckTxt[x.feel]}${x.want === 'yes' ? ' · wants a chat' : ''}</b></span>`).join('');

  const li = (icon, label, v, sub) => `<div class="sk-row"><span>${icon}</span><div><b>${label}</b><small>${sub}</small></div><em>${v}</em></div>`;
  const skills = gs ? [
    gs.listen ? li(ico('ear'), 'Listening keenness', pct(gs.listen.acc) + '%', `${gs.listen.n} audio-only stor${gs.listen.n > 1 ? 'ies' : 'y'}${gs.listen.heard && gs.listen.plays ? ` · ${gs.listen.plays.toFixed(1)} listens on average` : ''}${gs.listen.look != null ? ` · eyes on screen ${pct(gs.listen.look)}% while listening` : ''}`) : '',
    gs.reading ? li(ico('scroll'), 'Reading', pct(gs.reading.acc) + '%', `${gs.reading.n} passage${gs.reading.n > 1 ? 's' : ''}${gs.reading.wpm ? (gs.reading.wpm > 450 ? ' · finished very quickly (perhaps skimmed)' : ` · about ${Math.round(gs.reading.wpm)} words per minute`) : ''}${gs.reading.looks != null ? ` · looked back ${gs.reading.looks.toFixed(1)}× per passage` : ''}`) : '',
    gs.talk ? li(ico('image'), 'Picture Talk', Math.round(gs.talk.words) + ' words', `${gs.talk.n} picture${gs.talk.n > 1 ? 's' : ''} · about ${Math.round(gs.talk.hits)} details mentioned each · ${gs.talk.voice ? `${gs.talk.voice} spoken` : 'typed'}`) : '',
    gs.say ? li(ico('mic'), 'Say It! (word and idea fluency)', pct(gs.say.acc) + '%', `${gs.say.n} round${gs.say.n > 1 ? 's' : ''}${gs.say.words ? ` · about ${Math.round(gs.say.words)} words each` : ''}`) : '',
    gs.quick ? li(ico('timer'), 'Fastest Finger', gs.quick.rt ? `${(gs.quick.rt / 1000).toFixed(2)}s` : '—', `${pct(gs.quick.acc)}% right · best streak ${gs.quick.best}`) : '',
    gs.fingers ? li(ico('hand'), 'Finger Math', pct(gs.fingers.acc) + '%', `${gs.fingers.hand} of ${gs.fingers.total} answers shown with fingers`) : ''
  ].join('') : '';
  const quotes = [...(gs && gs.talk ? gs.talk.quotes.map(t => ['Picture Talk', t]) : []), ...(gs && gs.say ? gs.say.quotes.map(t => ['Say It!', t]) : []), ...comb.voice.filter(v => v.text && v.text.split(' ').length >= 3).slice(-4).map(v => [v.q || v.key, v.text])];
  const seenQ = new Set(); for (let k = quotes.length - 1; k >= 0; k--) { const t = String(quotes[k][1]).trim().toLowerCase(); if (seenQ.has(t)) quotes.splice(k, 1); else seenQ.add(t); }

  const emoHTML = comb.cam ? EMOTIONS.map(k => barRow(faceSvg(k), EMO_META[k].label, pct(comb.cam.emo[k] || 0), EMO_META[k].c, `${EMO_META[k].label}: ${pct(comb.cam.emo[k] || 0)}% of the time`)).join('') : '<p class="rc-sub">No camera data for this period.</p>';
  const gz = comb.cam ? comb.cam.gaze || {} : {}, gzT = Object.values(gz).reduce((a, b) => a + b, 0) || 1, gv = k => (gz[k] || 0) / gzT;
  const cell = (k, x, y) => { const v = pct(gv(k)), base = k === 'center' ? '22,163,74' : '59,130,246'; return `<div class="gc-cell" data-tip="${GAZE_TXT[k][0]}: ${v}%" style="left:${x}px;top:${y}px;background:rgba(${base},${(0.1 + gv(k) * 0.9).toFixed(2)});${gv(k) > .5 ? 'color:#fff' : ''}">${GAZE_TXT[k][1]}<br>${v}%</div>`; };
  const gazeHTML = comb.cam ? `<div class="gaze-wrap"><div class="gaze-compass">${cell('up', 57, 0)}${cell('left', 0, 57)}${cell('center', 57, 57)}${cell('right', 114, 57)}${cell('down', 57, 114)}</div><div class="bars">${['center', 'left', 'right', 'up', 'down', 'away'].map(k => barRow(GAZE_TXT[k][1], GAZE_TXT[k][0], pct(gv(k)), k === 'center' ? '#16A34A' : k === 'away' ? '#94A3B8' : '#3B82F6', '')).join('')}</div></div>` : '<p class="rc-sub">No camera data for this period.</p>';

  // mission details: every activity of the latest week in the report (games and PDF questions)
  const items = new Map(weekContent(lastW.week, g).items.map(it => [it.id, it]));
  const perItem = comb.heart && hW === lastW ? comb.heart.perItem || {} : {};
  const rows = (lastW.answers || []).map((a, i) => {
    const it = items.get(a.id) || {}, lab = a.type === 'game' ? (a.name || GAMES[a.game].name) : (TYPES[a.type] || {}).label || a.type;
    const icn = a.type === 'game' ? GAMES[a.game].ic : (TYPES[a.type] || {}).icon || 'dots';
    const meas = a.type === 'game' ? (a.measures ? Object.keys(a.measures).map(k => ABILITIES[k] ? ABILITIES[k].label : k).join(', ') : GAMES[a.game].what) : a.domain ? domainName(a.domain, g) : a.type === 'story' ? 'Well-being story' : a.type === 'chat' ? 'Student voice' : a.type === 'mood' ? 'Mood' : a.type === 'checkin' ? 'Check-in' : a.type === 'breathe' ? 'Calming' : '';
    let res;
    if (a.skipped) res = '<td class="res-no">Skipped</td>';
    else if (a.type === 'game' && a.big5) res = `<td>${ico('compass')} ${a.big5.map(x => BIG5_INFO[x.t].label + ' ' + ['low', 'mid-low', 'mid-high', 'high'][x.v]).join(' · ')}</td>`;
    else if (a.type === 'game' && a.ei) res = `<td class="${a.correct ? 'res-ok' : 'res-no'}">${a.ei.u ? '✓' : '✗'} understand · ${a.ei.m ? '✓' : '✗'} manage</td>`;
    else if (a.type === 'game') res = a.correct === true ? `<td class="res-ok">✓ Correct${a.score != null && a.score < 1 ? ` (${pct(a.score)}%)` : ''}</td>` : a.correct === false ? `<td class="res-no">✗ Not yet${a.score ? ` (${pct(a.score)}%)` : ''}</td>` : `<td>${a.score != null ? pct(a.score) + '%' : 'Choice'}</td>`;
    else if (a.s != null) { const l = LEVELS[clamp(Math.round(a.s), 1, 4) - 1]; res = `<td><span class="lv-chip" style="--c:${l.c}">${l.label}</span></td>`; }
    else if (a.type === 'mood') res = `<td>${a.mood ? faceSvg(a.mood) + ' ' + moodName(a.mood) : '—'}</td>`;
    else if (a.type === 'checkin') res = `<td>${ckTxt[a.feel] || '—'}</td>`;
    else if (a.type === 'story') res = `<td>${(a.stops || []).length} choices</td>`;
    else if (a.type === 'chat') res = `<td>${(a.turns || []).filter(t => t.text).length} answers</td>`;
    else res = '<td>Done</td>';
    const e = a.cam ? domOf(a.cam.emo) : null, gzk = a.cam ? domOf(a.cam.gaze) : null;
    return `<tr><td>${i + 1}</td><td>${ico(icn)} ${esc(lab)}${it.title && a.type !== 'game' ? ` <small>${esc(it.title)}</small>` : ''}</td><td class="q-meas">${esc(meas)}</td>${res}<td>${fmtSec(a.rt || a.ms)}</td><td>${e ? faceSvg(e) + ' ' + EMO_META[e].label : '—'}</td><td>${gzk && GAZE_TXT[gzk] ? GAZE_TXT[gzk][1] + ' ' + GAZE_TXT[gzk][0] : '—'}</td>${comb.heart ? `<td>${perItem[i] ? perItem[i] + ' bpm' : '—'}</td>` : ''}</tr>`;
  }).join('');
  const abVals = gs ? Object.values(gs.abil).filter(Boolean).map(a => a.v) : [];
  const ins = keyInsights(c, comb, first);

  R.innerHTML = `<div class="arcade"><div class="report">
    <div class="rp-cover">
      <div class="rpc-brand"><h1 class="rpc-title"><span>Mind</span><span>Quest</span></h1><div class="rpc-by"><i></i>by<i></i></div><img class="rpc-logo" src="${LOGO_DATA}" alt="CognoSpace"></div>
      <div class="rpc-champ">
        <div class="rpc-info"><div class="rpc-tag">${ico('trophy')} Champ Profile</div>
          <div class="rpc-name"><span class="rpc-l">Champ Name</span><span class="rpc-c">:</span><b class="rpc-v">${esc(c.name)}</b></div><div class="rpc-rows">
          ${detail('Age', `${esc(c.age)} years`)}${detail('Grade', `Grade ${g}${c.section ? ' ' + esc(c.section) : ''}`)}${detail('School', esc(c.school || MQ_CONFIG.school.name))}${detail('Adventure World', esc(world[1]))}${detail('Quest Dates', dates.length ? `${fmtDate(Math.min(...dates))}${dates.length > 1 ? ' to ' + fmtDate(Math.max(...dates)) : ''}` : fmtDate(Date.now()))}${detail('Weekly Quests', `${W.filter(w => w.status === 'done').length} done · ${fmtDur(totalMs)}`)}${detail('Missions Conquered', `${gs ? gs.n : 0} games · ${comb.games.length ? gs.right : 0} solved`)}${detail('Report Type', scope === 'all' ? `All weeks (${comb.weeks.join(', ')})` : `<em>Week ${esc(scope)}</em>`)}
        </div></div>
        <div class="rpc-av"><div>${c.avatar || '🙂'}</div><small>${esc(c.name)}</small></div>
      </div>
    </div>
    <div class="rp-body">
      <div class="rp-card rp-summary" id="rpGlance"><h4>${ico('sparkle')} ${first} at a glance</h4><p class="muted">${ico('dots')} Writing the summary…</p></div>
      <div class="rp-kpis">
        ${kpi('Missions', `${gs ? gs.n : 0}<span style="font-size:1rem;color:var(--muted)"> games</span>`, `${comb.weeks.length} weekly quest${comb.weeks.length > 1 ? 's' : ''} · ${Math.round((comb.time.perWeekMs || 0) / 60000)} min a week ${info('missions')}`)}
        ${kpi('Well-being', comb.wellbeing ?? '—', `Stress signal ${comb.stress ?? '—'} ${info('wellbeing')}`)}
        ${kpi('Thinking skills', abVals.length ? Math.round(mean(abVals)) : '—', `Average across abilities, out of 100 ${info('abilities')}`)}
        ${kpi('Puzzles solved', gs && gs.scored ? `${gs.right}/${gs.scored}` : '—', comb.cam ? `Eyes on screen ${pct(comb.cam.attention)}%` : gs && gs.rt ? `About ${fmtSec(gs.rt)} per puzzle` : 'Right answers')}
      </div>
      ${comb.flags.length ? `<div class="rp-card rp-flags"><h4>${ico('alert')} Things to look at ${info('flags')}</h4><ul class="insights">${comb.flags.map(f => `<li class="${f.level}"><span>${ico(f.level === 'high' ? 'alert' : 'eye')}</span><div><b>Week ${f.week}:</b> ${esc(f.text)}</div></li>`).join('')}</ul></div>` : ''}
      <div class="rp-card"><h4>${ico('sparkle')} Key insights</h4><p class="rc-sub">What the games, the well-being questions, expressions, eye movements and heartbeat suggest</p><ul class="insights">${ins.map(([e, t]) => `<li><span>${e}</span><div>${t}</div></li>`).join('')}</ul></div>
      <div class="rp-card"><h4>${ico('heart')} Well-being areas ${info('scale')}</h4><p class="rc-sub">CBSE holistic well-being areas, from the "What would you do?" situations, ratings, stories and chats</p><div class="lv-legend">${LEVELS.map(l => `<span><i style="background:${l.c}"></i>${l.label}</span>`).join('')}</div>${levelBars(comb.domains, g)}</div>
      <div class="rp-grid">
        <div class="rp-card"><h4>${ico('brain')} Thinking skills ${info('abilities')}</h4><p class="rc-sub">CHC model of cognitive abilities · score out of 100 at this grade's level</p><div class="bars">${abilHTML}</div></div>
        <div class="rp-card"><h4>${ico('compass')} Personality (Big Five) ${info('big5')}</h4><p class="rc-sub">From the Choose Your Path choices · neither end is better</p><div class="b5">${b5HTML}</div></div>
      </div>
      <div class="rp-grid">
        <div class="rp-card"><h4>${ico('heart')} Emotional intelligence ${info('ei')}</h4><p class="rc-sub">Mayer–Salovey model · from the Feelings Detective mission</p><div class="bars">${eiHTML}</div></div>
        <div class="rp-card"><h4>${ico('mood')} Mood journey ${info('mood')}</h4><p class="rc-sub">How ${first} said they felt at the start and end of each quest</p>${moodHTML}${checkHTML ? `<div class="sum-tags">${checkHTML}</div>` : ''}</div>
      </div>
      <div class="rp-card"><h4>${ico('clock')} Time and focus ${info('active')}</h4><p class="rc-sub">How ${first} spent the quest time</p><div class="bars">
          ${barRow(ico('target'), 'Focus', comb.focus ? Math.round(comb.focus.score * 100) : null, '#4D96FF', 'Attention & self-control', '')}
          ${barRow(ico('brain'), 'Memory', comb.memory ? Math.round(comb.memory.score * 100) : null, '#5CC46A', 'Working memory', '')}</div>
          <div class="sk-list">${li(ico('clock'), 'Active time per week', Math.round((comb.time.perWeekMs || 0) / 60000) + ' min', 'Time on activities, without pauses or idle time')}${li(ico('timer'), 'Focus stamina', Math.round(comb.time.longestStreakMs / 60000) + ' min', 'Longest stretch without going idle or switching away')}${li(ico('pause'), 'Idle time', Math.round(comb.time.idleMs / 60000) + ' min', 'In total')}</div></div>
      ${skills || quotes.length ? `<div class="rp-card"><h4>${ico('headphones')} Listening, reading &amp; voice ${info('voice')}</h4><p class="rc-sub">From the audio-only stories, reading passages, Picture Talk, Say It!, Fastest Finger, Finger Math and the chat with Coggy</p><div class="sk-list">${skills}</div>${quotes.length ? `<h5 class="talk-h">In ${first}'s own words</h5>${quotes.slice(-6).map(([q, t]) => `<details class="talk-log" open><summary>${ico('chat')} ${esc(q)}</summary><p>"${esc(t)}"</p></details>`).join('')}` : ''}</div>` : ''}
      <div class="rp-grid">
        <div class="rp-card"><h4>${ico('smile')} Feelings while playing ${info('camera')}</h4><p class="rc-sub">Share of time each facial expression was seen</p><div class="bars">${emoHTML}</div></div>
        <div class="rp-card"><h4>${ico('eye')} Where the eyes looked ${info('attention')}</h4><p class="rc-sub">Gaze and head direction during the activities</p>${gazeHTML}</div>
      </div>
      ${heartCard(comb.heart, first, hW.answers || [])}
      ${comb.trend.length > 1 ? `<div class="rp-card"><h4>${ico('trend')} Week by week</h4><p class="rc-sub">Well-being, stress, focus and memory across the weeks</p>${lineChart([{ name: 'Well-being', color: '#16A34A', values: comb.trend.map(t => ({ x: t.week, y: t.wellbeing })) }, { name: 'Stress', color: '#E5484D', values: comb.trend.map(t => ({ x: t.week, y: t.stress })) }, { name: 'Focus', color: '#4D96FF', values: comb.trend.map(t => ({ x: t.week, y: t.focus })) }, { name: 'Memory', color: '#5CC46A', values: comb.trend.map(t => ({ x: t.week, y: t.memory })) }], { h: 200 })}</div>` : ''}
      ${al ? `<div class="rp-card"><h4>${ico('grad')} Marks and well-being ${info('alignment')}</h4><div class="align ${al.status}"><b>${{ aligned: 'Aligned', 'marks-higher': 'Marks higher than well-being', 'marks-lower': 'Marks lower than well-being' }[al.status]}</b> · Marks ${Math.round(al.academic * 100)}% (${esc(al.term)}) · Well-being ${Math.round(al.wellbeing * 100)}<p>${esc(al.text)}</p></div><div class="v2bars">${pairBars(al.subjects)}</div></div>` : ''}
      <div class="rp-card" id="rpRecs"><h4>${ico('bulb')} What adults can do ${info('sources')}</h4><p class="muted">${ico('dots')} Writing suggestions…</p></div>
      <div class="rp-card"><h4>${ico('cards')} Mission details</h4><p class="rc-sub">Week ${lastW.week}: what each activity measures, the result, timing, expression and gaze${comb.heart && hW === lastW ? ' and heart rate' : ''}</p><div class="qtable-wrap"><table class="qtable"><thead><tr><th>#</th><th>Activity</th><th>Measures</th><th>Result</th><th>Time</th><th>Expression</th><th>Gaze</th>${comb.heart ? '<th>Heart</th>' : ''}</tr></thead><tbody>${rows || '<tr><td colspan="8">No activities yet.</td></tr>'}</tbody></table></div></div>
      ${RP.notes.goal ? `<div class="rp-card"><h4>${ico('flag')} Agreed support plan</h4><p><b>Goal:</b> ${esc(RP.notes.goal)}<br><b>Small next step:</b> ${esc(RP.notes.step || '—')}<br><b>Who:</b> ${esc(RP.notes.who || '—')} · <b>Review:</b> ${esc(RP.notes.review ? fmtDate(RP.notes.review) : '—')}</p></div>` : ''}
      <div class="rp-card about"><h4>${ico('info')} How MindQuest measures</h4><p><b>Thinking skills</b> follow the Cattell–Horn–Carroll (CHC) model used by tests such as WISC-V; each game links to one main ability and sometimes a supporting one. <b>Personality</b> uses the Big Five model with situational choices. <b>Emotional intelligence</b> follows the Mayer–Salovey model. <b>Well-being areas</b> come from "What would you do?" situations, ratings, stories and a chat with Coggy based on the CBSE Holistic Progress Card well-being section, scored on its 4-step scale. <b>Listening, reading and voice</b> come from audio-only stories, timed reading passages, Picture Talk and Say It! (speech turned into text by the browser). <b>Expressions</b> are read on the device, measured against the child's own relaxed face. <b>Heart signals</b> come from the optional HW-605 fingertip sensor.</p></div>
      <div class="disclaimer">${ico('info')} MindQuest is a playful screening tool, not a clinical diagnosis, and not an official CBSE form. Scores compare the child with the difficulty of their grade's missions, not with national norms. Expression, gaze, finger and heart readings are estimates. If a child expresses distress or a safety concern, follow your school's safeguarding procedure. Full meanings and ${first}'s detailed answers: <b>Download glossary &amp; details</b>.</div>
      <div class="rp-credit"><img class="rcr-icon" src="assets/icon.png" alt=""><div class="rcr-text"><small>Designed &amp; developed by</small><b><span>Cogno</span>Space</b><em>Experiential Learning</em></div><a class="rcr-web" href="https://www.cognospace.in" target="_blank" rel="noopener">${ico('globe')} www.cognospace.in</a></div>
    </div></div></div>`;

  const r = await Insights.generate(c, comb, RP.marks, RP.notes);
  const tagCls = v => /strain|stress|high|easily|dipped|low|support|worr|drift|distract|tricky/i.test(v) ? 'bad' : /some|mostly|steady|medium|raised|okay|mixed/i.test(v) ? 'mid' : 'ok';
  const tagIco = { Feelings: 'mood', Focus: 'target', Mood: 'mood', Strength: 'star', Heart: 'heart', Stress: 'heart' };
  $('#rpGlance').innerHTML = `<h4>${ico('sparkle')} ${first} at a glance ${info('sources')}<span class="src-tag ${r.source === 'ai' ? 'ai' : ''}">${r.source === 'ai' ? 'AI' : 'Built-in'}</span></h4><p>${esc(r.summary)}</p>${(r.tags || []).length ? `<div class="sum-tags">${r.tags.map(t => `<span class="sum-tag ${tagCls(t.v)}">${ico(tagIco[t.k] || 'sparkle')}<small>${esc(t.k)}</small><b>${esc(t.v)}</b></span>`).join('')}</div>` : ''}<p class="sum-note">Based on the games, the well-being questions, ${first}'s own mood check-ins${comb.cam ? ', facial expressions and eye movements' : ''}${comb.heart ? ', and the heart sensor' : ''}. A screening picture, not a diagnosis.</p>`;
  $('#rpRecs').innerHTML = `<h4>${ico('bulb')} What adults can do ${info('sources')}</h4>
    <div class="rec-cols"><div><h3>${ico('school')} For the teacher</h3><ul class="recs">${(r.teacher || []).map(x => `<li class="rec"><b>${esc(x.title)}.</b> ${esc(x.detail)}</li>`).join('')}</ul></div>
      <div><h3>${ico('home')} For parents at home</h3><ul class="recs">${(r.parent || []).map(x => `<li class="rec"><b>${esc(x.title)}.</b> ${esc(x.detail)}</li>`).join('')}</ul></div></div>
    <div class="rec-cols three"><div><h3>${ico('chat')} Conversation starters</h3><ul>${(r.talk || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div><h3>${ico('book')} Books</h3><ul>${(r.books || []).map(b => `<li><b>${esc(b.title)}</b>${b.author ? ', ' + esc(b.author) : ''}. <small>${esc(b.why)}</small></li>`).join('')}</ul></div>
      <div><h3>${ico('map')} Places &amp; activities</h3><ul>${(r.places || []).concat(r.activities || []).slice(0, 5).map(b => `<li><b>${esc(b.name)}</b>. <small>${esc(b.why)}</small></li>`).join('')}</ul></div></div>`;
}
