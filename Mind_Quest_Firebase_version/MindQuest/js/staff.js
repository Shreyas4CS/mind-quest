/* Teacher & Parent dashboard */
const ST = { user: null, kids: [], cur: null };
const DEFAULT_SUBJECTS = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer'];

(async function boot() {
  ST.user = await guard('staff');
  topBar({ user: ST.user, title: '', extra: `<button class="tb-btn" id="aiBtn">${ico('robot')}<span>AI settings</span></button>` });
  $('#aiBtn').onclick = aiSettings;
  $('#backBtn').innerHTML = `${ico('arrow')} All children`; $('#backBtn').onclick = () => { history.pushState(null, '', 'staff.html'); showClass(); };
  $$('.info-slot').forEach(n => n.innerHTML = info(n.dataset.t));
  addEventListener('popstate', route);
  await loadAll(); route();
})();
function route() { const id = qs('child'); if (id && ST.kids.find(k => k.uid === id)) openChild(id); else showClass(); }

async function loadAll() {
  const list = (await Store.listChildren()).filter(c => c.profileDone);
  ST.kids = await Promise.all(list.map(async c => {
    const [weeks, marks] = await Promise.all([Store.getWeeks(c.uid), Store.getMarks(c.uid)]);
    const results = weeks.filter(w => w.status === 'done' || (w.answers || []).length >= 6).map(w => scoreWeek(w, c.grade));
    const comb = combine(results);
    const lastActive = Math.max(0, ...weeks.map(w => Math.max(w.completedAt || 0, ...(w.answers || []).map(a => a.at || 0))));
    const high = comb ? comb.flags.filter(f => f.level === 'high').length : 0, watch = comb ? comb.flags.filter(f => f.level === 'watch').length : 0;
    return { ...c, weeks, marks, comb, lastActive, high, watch, done: weeks.filter(w => w.status === 'done').length };
  }));
}

/* ================= class overview ================= */
function showClass() {
  $('#childView').hidden = true; $('#classView').hidden = false; scrollTo(0, 0);
  const K = ST.kids, grades = [...new Set(K.map(k => k.grade))].sort((a, b) => a - b);
  const gsel = $('#fGrade'); if (gsel.options.length < 2) grades.forEach(g => gsel.add(new Option('Grade ' + g, g)));
  $('#classSub').textContent = `${K.length} children · ${MQ_CONFIG.school.name} · ${MQ_CONFIG.school.year}`;
  const wbs = K.map(k => k.comb && k.comb.wellbeing).filter(v => v != null), mins = K.map(k => k.comb && k.comb.time.perWeekMs).filter(Boolean);
  $('#classKpis').innerHTML = `<div class="kpi"><b>${K.length}</b><span>${ico('users')} Children</span></div>
    <div class="kpi"><b>${K.reduce((s, k) => s + k.done, 0)}</b><span>${ico('flag')} Weekly quests done</span></div>
    <div class="kpi"><b>${wbs.length ? Math.round(mean(wbs)) : '—'}</b><span>${ico('heart')} Avg well-being ${info('wellbeing')}</span></div>
    <div class="kpi"><b>${mins.length ? Math.round(mean(mins) / 60000) : '—'}<small>min</small></b><span>${ico('clock')} Avg time per week</span></div>
    <div class="kpi ${K.some(k => k.high) ? 'alert' : ''}"><b>${K.filter(k => k.high).length}</b><span>${ico('alert')} Need a check-in ${info('flags')}</span></div>`;
  const draw = () => {
    const q = $('#fSearch').value.trim().toLowerCase(), g = $('#fGrade').value, so = $('#fSort').value;
    let L = K.filter(k => (!q || (k.name || '').toLowerCase().includes(q) || k.username.includes(q)) && (!g || String(k.grade) === g));
    const wb = k => k.comb && k.comb.wellbeing != null ? k.comb.wellbeing : 999;
    L.sort(so === 'name' ? (a, b) => a.name.localeCompare(b.name) : so === 'wb' ? (a, b) => wb(a) - wb(b) : so === 'recent' ? (a, b) => b.lastActive - a.lastActive : (a, b) => (b.high * 10 + b.watch) - (a.high * 10 + a.watch) || wb(a) - wb(b));
    $('#childList').innerHTML = L.length ? L.map(k => {
      const c = k.comb, st = c && c.stress, lv = c && c.wellbeing != null ? levelOf(c.wellbeing / 100) : null;
      return `<button class="kid-row" data-uid="${k.uid}">
        <span class="kr-av">${k.avatar || '🙂'}</span>
        <span class="kr-name"><b>${esc(k.name)}</b><small>Grade ${k.grade}${k.section ? ' ' + esc(k.section) : ''} · @${esc(k.username)}</small></span>
        <span class="kr-weeks"><b>${k.done}</b><small>week${k.done === 1 ? '' : 's'}</small></span>
        <span class="kr-wb">${lv ? `<span class="lv-chip" style="--c:${lv.c}">${c.wellbeing} · ${lv.label}</span>` : '<span class="muted small">No quests yet</span>'}</span>
        <span class="kr-st">${st != null ? `<span class="tag ${st >= 60 ? 'red' : st >= 40 ? 'amber' : 'green'}">${st >= 60 ? 'Under strain' : st >= 40 ? 'Some worry' : 'Calm'}</span>` : ''}</span>
        <span class="kr-time">${c ? Math.round(c.time.perWeekMs / 60000) + ' min/wk' : ''}</span>
        <span class="kr-flag">${k.high ? `<span class="tag red">${ico('alert')} Check-in</span>` : k.watch ? `<span class="tag amber">${k.watch} to watch</span>` : ''}</span>
        <span class="kr-go">${ico('arrow')}</span></button>`;
    }).join('') : `<div class="empty">${ico('users')}<p>No children yet. Children create their own accounts on the login page ("New child account").</p></div>`;
    $$('.kid-row').forEach(b => b.onclick = () => { history.pushState(null, '', 'staff.html?child=' + b.dataset.uid); openChild(b.dataset.uid); });
  };
  ['fSearch', 'fGrade', 'fSort'].forEach(id => $('#' + id).oninput = draw); draw();
  const pts = K.map(k => { const a = alignment(k.comb, k.marks); return a ? { uid: k.uid, name: k.name, x: a.wellbeing, y: a.academic } : null; }).filter(Boolean);
  $('#classQuad').innerHTML = pts.length ? quadrant(pts) : `<div class="empty">${ico('chart')}<p>Add marks for a child (open the child, then the Marks tab) to see this chart.</p></div>`;
}

/* ================= one child ================= */
function openChild(uid) {
  const k = ST.cur = ST.kids.find(x => x.uid === uid); if (!k) return showClass();
  $('#classView').hidden = true; $('#childView').hidden = false; scrollTo(0, 0);
  const c = k.comb;
  $('#childHead').innerHTML = `<div class="ch-av">${k.avatar || '🙂'}</div>
    <div class="ch-info"><h1>${esc(k.name)}</h1><p class="muted">${k.age} years · Grade ${k.grade}${k.section ? ' ' + esc(k.section) : ''} · ${STAGES[stageOf(k.grade)]}${k.school ? ' · ' + esc(k.school) : ''} · @${esc(k.username)}</p>
      <div class="chips static">${(k.likes || []).map(l => `<span>${esc(l)}</span>`).join('')}${k.favSubject ? `<span class="b">Loves ${esc(k.favSubject)}</span>` : ''}${k.dream ? `<span class="b">Dream: ${esc(k.dream)}</span>` : ''}</div>
      ${(k.scary || []).length || k.scaryOther ? `<p class="small"><b>Finds scary:</b> ${esc([...(k.scary || []), k.scaryOther].filter(Boolean).join(', '))}</p>` : ''}</div>
    <div class="ch-actions">${c ? `<a class="btn btn-primary" href="report.html?child=${k.uid}">${ico('scroll')} Open report</a>` : ''}<span class="small muted">${k.done} week${k.done === 1 ? '' : 's'} done${k.lastActive ? ' · last active ' + fmtDate(k.lastActive) : ''}</span></div>`;
  $$('#childTabs .tab').forEach(t => t.onclick = () => tab(t.dataset.tab));
  tab('overview');
}
function tab(name) {
  $$('#childTabs .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
  $$('.tabpane').forEach(p => p.hidden = p.dataset.pane !== name);
  ({ overview: paneOverview, wellbeing: paneWellbeing, time: paneTime, marks: paneMarks, notes: paneNotes })[name]($(`.tabpane[data-pane=${name}]`), ST.cur);
}
const noData = k => `<div class="card empty">${ico('flag')}<p>${esc(k.name.split(' ')[0])} has not finished a weekly quest yet. Results appear here after the first one.</p></div>`;

async function paneOverview(p, k) {
  const c = k.comb; if (!c) { p.innerHTML = noData(k); return; }
  p.innerHTML = `<div class="gauges card">${gauge(c.wellbeing, 'Well-being')}${info('wellbeing')}${gauge(c.stress, 'Stress signal', 'low')}${info('stress')}${gauge(c.focus ? Math.round(c.focus.score * 100) : null, 'Focus')}${info('focus')}
      ${gauge(c.memory ? Math.round(c.memory.score * 100) : null, 'Memory')}${info('memory')}
      <div class="gauge"><div class="g-num">${Math.round((c.time.perWeekMs || 0) / 60000)}<small>min</small></div><div class="g-lab">Time per week ${info('active')}</div></div></div>
    ${c.flags.length ? `<div class="card flags"><h2 class="card-h">${ico('alert')} Things to look at ${info('flags')}</h2><ul>${c.flags.map(f => `<li class="${f.level}"><b>Week ${f.week}:</b> ${esc(f.text)}</li>`).join('')}</ul></div>` : ''}
    <div class="card rec-card" id="recBox"><h2 class="card-h">${ico('bulb')} Suggestions ${info('sources')}</h2><div class="loading">${ico('dots')} Writing suggestions for ${esc(k.name.split(' ')[0])}…</div></div>`;
  const out = await Insights.generate(k, c, k.marks, await Store.getNotes(k.uid));
  renderRecs($('#recBox'), out, k, true);
}
function renderRecs(box, r, k, controls) {
  box.innerHTML = `<h2 class="card-h">${ico('bulb')} Suggestions ${info('sources')}<span class="src-tag ${r.source === 'ai' ? 'ai' : ''}">${r.source === 'ai' ? ico('robot') + ' Written by AI' : ico('settings') + ' Built-in engine'}</span></h2>
    <div class="glance"><p>${esc(r.summary)}</p><div class="tags">${(r.tags || []).map(t => `<span class="tag"><b>${esc(t.k)}:</b> ${esc(t.v)}</span>`).join('')}</div></div>
    <div class="rec-cols"><div><h3>${ico('school')} For the teacher</h3>${(r.teacher || []).map(x => `<div class="rec"><b>${esc(x.title)}</b><p>${esc(x.detail)}</p></div>`).join('')}</div>
      <div><h3>${ico('home')} For parents at home</h3>${(r.parent || []).map(x => `<div class="rec"><b>${esc(x.title)}</b><p>${esc(x.detail)}</p></div>`).join('')}</div></div>
    <div class="rec-cols three"><div><h3>${ico('chat')} Talk with ${esc(k.name.split(' ')[0])}</h3><ul>${(r.talk || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div><h3>${ico('book')} Books to try</h3><ul>${(r.books || []).map(b => `<li><b>${esc(b.title)}</b>${b.author ? ' by ' + esc(b.author) : ''}<br><small>${esc(b.why)}</small></li>`).join('')}</ul></div>
      <div><h3>${ico('map')} Places &amp; activities</h3><ul>${(r.places || []).concat(r.activities || []).map(b => `<li><b>${esc(b.name)}</b><br><small>${esc(b.why)}</small></li>`).join('')}</ul></div></div>
    ${r.marks ? `<div class="rec marks-rec"><b>${ico('grad')} Marks and well-being</b><p>${esc(r.marks)}</p></div>` : ''}
    ${controls ? `<div class="rec-foot"><span class="muted small">Updated ${fmtDate(r.at)}</span><button class="btn btn-ghost" id="regen">${ico('replay')} Write again${Insights.aiOn ? ' with AI' : ''}</button></div>` : ''}`;
  const rg = $('#regen', box); if (rg) rg.onclick = async () => { rg.disabled = true; rg.innerHTML = `${ico('dots')} Writing…`; const o = await Insights.generate(k, k.comb, k.marks, await Store.getNotes(k.uid), { force: true }); renderRecs(box, o, k, true); };
}

function paneWellbeing(p, k) {
  const c = k.comb; if (!c) { p.innerHTML = noData(k); return; }
  const R = k.weeks.filter(w => w.status === 'done' || (w.answers || []).length >= 6).map(w => scoreWeek(w, k.grade));
  p.innerHTML = `<div class="grid-2"><div class="card"><h2 class="card-h">${ico('heart')} Well-being areas ${info('scale')}</h2><p class="muted small">All weeks together, on the CBSE-style 4-step scale.</p>${levelBars(c.domains, k.grade)}</div>
    <div class="card"><h2 class="card-h">${ico('trend')} Week by week</h2>${lineChart([{ name: 'Well-being', color: '#16A34A', values: c.trend.map(t => ({ x: t.week, y: t.wellbeing })) }, { name: 'Stress', color: '#E5484D', values: c.trend.map(t => ({ x: t.week, y: t.stress })) }, { name: 'Focus', color: '#4D96FF', values: c.trend.map(t => ({ x: t.week, y: t.focus })) }])}
      <h3 class="sub-h">Mood at start and end ${info('mood')}</h3><div class="moods">${c.moods.map(m => `<div class="mood-chip">${m.start ? faceSvg(m.start) : ''}${ico('arrow')}${m.end ? faceSvg(m.end) : ''}<span>Week ${m.week}</span></div>`).join('')}</div>
      <h3 class="sub-h">Private check-ins ${info('checkin')}</h3><ul class="plain">${c.checkins.map(ci => `<li>Week ${ci.week}: <b>${ci.feel ? { comfortable: 'Comfortable', worried: 'A little worried', talk: 'Needs to talk privately' }[ci.feel] : '—'}</b>${ci.want ? ` · wants a chat: <b>${ci.want}</b>` : ''}</li>`).join('')}</ul></div></div>
    <div class="card"><h2 class="card-h">${ico('chat')} In ${esc(k.name.split(' ')[0])}’s own words ${info('voice')}</h2><div class="quotes">${c.voice.filter(v => v.text).slice(-8).reverse().map(v => `<div class="quote"><small>Week ${v.week} · ${esc(v.q || v.key)}</small><p>"${esc(v.text)}"</p></div>`).join('') || '<p class="muted">No spoken or typed answers yet.</p>'}</div></div>
    <div class="card"><h2 class="card-h">${ico('calendar')} Weekly results</h2><div class="table-wrap"><table class="tbl"><tr><th>Week</th><th>Well-being</th><th>Stress</th><th>Focus</th><th>Memory</th><th>Active time</th><th>Flags</th></tr>
      ${R.map(r => `<tr><td>${r.week}: ${esc(weekContent(r.week, k.grade).title)}</td><td>${r.wellbeing ?? '—'}</td><td>${r.stress ?? '—'}</td><td>${r.focus ? Math.round(r.focus.score * 100) : '—'}</td><td>${r.memory ? Math.round(r.memory.score * 100) : "—"}</td><td>${fmtDur(r.time.activeMs)}</td><td>${r.flags.length}</td></tr>`).join('')}</table></div></div>`;
}

function paneTime(p, k) {
  const c = k.comb; if (!c) { p.innerHTML = noData(k); return; }
  const T = c.time, cols = { game: '#FF6FB5', chat: '#F7941D', story: '#9B5DE5', scenario: '#4D96FF', rate: '#2EC4B6', focus: '#FF6FB5', memory: '#5CC46A', voice: '#FFC93C', breathe: '#14B8A6', mood: '#94A3B8', checkin: '#64748B' };
  const parts = Object.entries(T.byType).map(([t, v]) => ({ label: TYPES[t] ? TYPES[t].label : t, value: v, color: cols[t] }));
  const per = k.weeks.map(w => ({ w: w.week, t: w.timing || {} }));
  p.innerHTML = `<div class="kpis big"><div class="kpi"><b>${Math.round((T.perWeekMs || 0) / 60000)}<small>min</small></b><span>Per weekly quest ${info('active')}</span></div>
      <div class="kpi"><b>${Math.round(T.longestStreakMs / 60000)}<small>min</small></b><span>Longest focused stretch ${info('stamina')}</span></div>
      <div class="kpi"><b>${Math.round(T.idleMs / 60000)}<small>min</small></b><span>Idle in total ${info('idle')}</span></div>
      <div class="kpi"><b>${T.scenarioRt ? Math.round(T.scenarioRt / 1000) : '—'}<small>s</small></b><span>Per situation ${info('pace')}</span></div>
      <div class="kpi"><b>${T.sittings ? T.sittings.toFixed(1) : '1'}</b><span>Sittings per week</span></div></div>
    <div class="grid-2"><div class="card"><h2 class="card-h">${ico('clock')} Where the time went</h2>${donut(parts, { center: Math.round(T.activeMs / 60000) + 'm', sub: 'all weeks' })}</div>
      <div class="card"><h2 class="card-h">${ico('target')} Thinking skills and attention ${info('abilities')}</h2>
        ${c.gs ? Object.entries(c.gs.abil).filter(([, v]) => v).map(([k, v]) => `<div class="bar-row"><span class="br-name">${ico(ABILITIES[k].ic)} ${ABILITIES[k].label}</span><div class="br-bars"><div class="br-b" style="width:${Math.max(4, v.v)}%;background:${v.v >= 70 ? '#16A34A' : v.v >= 45 ? '#F59E0B' : '#E5484D'}"><span>${v.v}</span></div></div></div>`).join('') : ''}
        ${c.focus && c.focus.hitRate != null ? `<div class="bar-row"><span class="br-name">Stars caught ${info('focus')}</span><div class="br-bars"><div class="br-b" style="width:${pct(c.focus.hitRate)}%;background:#16A34A"><span>${pct(c.focus.hitRate)}%</span></div></div></div>
        <div class="bar-row"><span class="br-name">Clouds tapped by mistake</span><div class="br-bars"><div class="br-b" style="width:${Math.max(4, pct(c.focus.falseRate))}%;background:#E5484D"><span>${pct(c.focus.falseRate)}%</span></div></div></div>
        <p class="small muted">Average reaction: ${c.focus.rtMean ? Math.round(c.focus.rtMean) + ' ms' : '—'}</p>` : c.gs ? '' : '<p class="muted">Focus game not played yet.</p>'}
        ${c.cam ? `<div class="bar-row"><span class="br-name">Looking at the screen ${info('attention')}</span><div class="br-bars"><div class="br-b" style="width:${pct(c.cam.attention)}%;background:#4D96FF"><span>${pct(c.cam.attention)}%</span></div></div></div>
          <h3 class="sub-h">Feelings on camera ${info('camera')}</h3>${EMOTIONS.filter(e => c.cam.emo[e] > .01).map(e => `<div class="bar-row"><span class="br-name">${faceSvg(e)} ${EMO_META[e].label}</span><div class="br-bars"><div class="br-b" style="width:${Math.max(3, pct(c.cam.emo[e]))}%;background:${EMO_META[e].c}"><span>${pct(c.cam.emo[e])}%</span></div></div></div>`).join('')}` : '<p class="muted small">Camera was not used.</p>'}
        ${c.heart ? `<h3 class="sub-h">Heart ${info('heart')}</h3><p>Average <b>${c.heart.avg} bpm</b>${c.heart.calm ? ` · calm level ${Math.round(c.heart.calm)} bpm` : ''}${c.heart.hrv ? ` · HRV ${Math.round(c.heart.hrv)} ms` : ''}${c.heart.spo2 ? ` · O₂ ${Math.round(c.heart.spo2)}%` : ''}</p>` : ''}</div></div>
    <div class="card"><h2 class="card-h">${ico('calendar')} Each week</h2><div class="table-wrap"><table class="tbl"><tr><th>Week</th><th>Active</th><th>Idle</th><th>Away from tab</th><th>Longest stretch</th><th>Sittings</th><th>Status</th></tr>
      ${per.map(x => `<tr><td>${x.w}</td><td>${fmtDur(x.t.activeMs)}</td><td>${fmtDur(x.t.idleMs)}</td><td>${fmtDur(x.t.hiddenMs)}</td><td>${fmtDur(x.t.longestStreakMs)}</td><td>${x.t.sittings || 1}</td><td>${k.weeks.find(w => w.week === x.w).status === 'done' ? 'Done' : 'In progress'}</td></tr>`).join('')}</table></div></div>`;
}

async function paneMarks(p, k) {
  const al = alignment(k.comb, k.marks);
  p.innerHTML = `<div class="grid-2"><div class="card"><h2 class="card-h">${ico('edit')} Add marks</h2>
      <form id="marksForm" class="form"><div class="grid2"><label>Exam / term<input name="term" required placeholder="e.g. Unit Test 1, Term 1"></label><label>Date<input name="date" type="date" required></label></div>
        <table class="tbl marks-in"><tr><th>Subject</th><th>Marks got</th><th>Out of</th><th></th></tr>${DEFAULT_SUBJECTS.map(s => markRow(s)).join('')}</table>
        <button type="button" class="btn btn-ghost" id="addSub">${ico('plus')} Add subject</button>
        <p class="form-err"></p><button class="btn btn-primary" type="submit">${ico('save')} Save marks</button></form></div>
    <div class="card"><h2 class="card-h">${ico('trend')} Marks vs well-being ${info('alignment')}</h2>${al ? `<div class="align ${al.status}"><b>${{ aligned: 'Aligned', 'marks-higher': 'Marks higher than well-being', 'marks-lower': 'Marks lower than well-being' }[al.status]}</b><p>${esc(al.text)}</p>
        <div class="kpis"><div class="kpi"><b>${Math.round(al.academic * 100)}%</b><span>Marks (${esc(al.term)})</span></div><div class="kpi"><b>${Math.round(al.wellbeing * 100)}</b><span>Well-being</span></div><div class="kpi"><b>${al.thinking != null ? Math.round(al.thinking * 100) : '—'}</b><span>Focus &amp; memory</span></div>${al.trend ? `<div class="kpi"><b>${al.trend.change >= 0 ? '+' : ''}${Math.round(al.trend.change * 100)}</b><span>Change since last</span></div>` : ''}</div></div>
        <h3 class="sub-h">Subject by subject</h3>${pairBars(al.subjects)}` : `<div class="empty">${ico('chart')}<p>${k.comb ? 'Add marks to compare them with well-being.' : 'Needs at least one finished quest and one set of marks.'}</p></div>`}
      ${k.marks.length > 1 ? `<h3 class="sub-h">Marks over time</h3>${lineChart([{ name: 'Marks', color: '#F7941D', values: k.marks.map((m, i) => ({ x: i + 1, y: Math.round(marksPct(m) * 100) })) }], { unit: '%', xLabel: 'Exam' })}` : ''}</div></div>
    <div class="card"><h2 class="card-h">${ico('book')} Saved marks</h2>${k.marks.length ? `<div class="table-wrap"><table class="tbl"><tr><th>Exam</th><th>Date</th>${[...new Set(k.marks.flatMap(m => Object.keys(m.subjects || {})))].map(s => `<th>${esc(s)}</th>`).join('')}<th>Overall</th><th></th></tr>
      ${k.marks.map(m => `<tr><td>${esc(m.term)}</td><td>${fmtDate(m.date)}</td>${[...new Set(k.marks.flatMap(x => Object.keys(x.subjects || {})))].map(s => `<td>${m.subjects[s] ? `${m.subjects[s].got}/${m.subjects[s].max}` : '—'}</td>`).join('')}<td><b>${Math.round(marksPct(m) * 100)}%</b></td><td><button class="link-btn del" data-id="${m.id}">${ico('close')} Delete</button></td></tr>`).join('')}</table></div>` : '<p class="muted">No marks saved yet.</p>'}</div>`;
  const f = $('#marksForm'); f.date.valueAsDate = new Date();
  $('#addSub').onclick = () => { const n = prompt('Subject name'); if (n) $('.marks-in', f).insertAdjacentHTML('beforeend', markRow(n.trim())); };
  p.addEventListener('click', e => { const r = e.target.closest('.rm-sub'); if (r) r.closest('tr').remove(); });
  f.onsubmit = async e => {
    e.preventDefault(); const subjects = {};
    $$('.marks-in tr[data-s]', f).forEach(tr => { const got = $('[name=got]', tr).value, max = $('[name=max]', tr).value; if (got !== '' && +max > 0) subjects[tr.dataset.s] = { got: +got, max: +max }; });
    if (!Object.keys(subjects).length) { $('.form-err', f).textContent = 'Enter marks for at least one subject.'; return; }
    if (Object.values(subjects).some(x => x.got > x.max || x.got < 0)) { $('.form-err', f).textContent = 'Marks got must be between 0 and "out of".'; return; }
    await Store.saveMarks(k.uid, null, { term: f.term.value.trim(), date: new Date(f.date.value).getTime(), subjects, by: ST.user.username, at: Date.now() });
    k.marks = await Store.getMarks(k.uid); toast(ico('check') + ' Marks saved'); paneMarks(p, k);
  };
  $$('.del', p).forEach(b => b.onclick = async () => { if (!confirm('Delete these marks?')) return; await Store.deleteMarks(k.uid, b.dataset.id); k.marks = await Store.getMarks(k.uid); paneMarks(p, k); });
}
const markRow = s => `<tr data-s="${esc(s)}"><td>${esc(s)}</td><td><input name="got" type="number" min="0" step="0.5" inputmode="decimal"></td><td><input name="max" type="number" min="1" value="100"></td><td><button type="button" class="link-btn rm-sub" aria-label="Remove">${ico('close')}</button></td></tr>`;

async function paneNotes(p, k) {
  const n = await Store.getNotes(k.uid);
  p.innerHTML = `<form class="card form notes" id="notesForm"><h2 class="card-h">${ico('edit')} Observations and support plan</h2><p class="muted small">From the CBSE-style card, sections C, D and E. These notes also feed the suggestions.</p>
    <label>Teacher / mentor: strengths and positive changes observed<textarea name="observations" rows="3">${esc(n.observations || '')}</textarea></label>
    <label>Situations where ${esc(k.name.split(' ')[0])} may need encouragement or support (describe neutrally)<textarea name="support" rows="3">${esc(n.support || '')}</textarea></label>
    <label>Parent / caregiver input: strengths noticed, worries, what helps at home<textarea name="parentInput" rows="3">${esc(n.parentInput || '')}</textarea></label>
    <fieldset><legend>Agreed support plan</legend><div class="grid2"><label>Goal / area of support<input name="goal" value="${esc(n.goal || '')}"></label><label>Small next step<input name="step" value="${esc(n.step || '')}"></label>
      <label>Who will support?<input name="who" value="${esc(n.who || '')}"></label><label>Review date<input name="review" type="date" value="${esc(n.review || '')}"></label></div></fieldset>
    <button class="btn btn-primary" type="submit">${ico('save')} Save notes</button>${n.updatedAt ? `<span class="muted small"> Last saved ${fmtDate(n.updatedAt)}</span>` : ''}</form>`;
  $('#notesForm').onsubmit = async e => { e.preventDefault(); const f = e.target, o = { updatedAt: Date.now(), by: ST.user.username }; ['observations', 'support', 'parentInput', 'goal', 'step', 'who', 'review'].forEach(x => o[x] = f[x].value.trim()); await Store.saveNotes(k.uid, o); toast(ico('check') + ' Notes saved'); };
}

/* AI settings: explains the safe options */
function aiSettings() {
  const fn = MQ_CONFIG.ai.functionUrl, key = Insights.browserKey;
  const m = modal(`<h2>${ico('robot')} AI suggestions</h2>
    <div class="ai-status ${fn ? 'ok' : key ? 'warn' : ''}">${fn ? `${ico('check')} <b>Secure AI is on</b> through your Firebase Function. The API key is stored on Google's servers, not in the app.` : key ? `${ico('alert')} <b>Test mode:</b> using a key saved in this browser only.` : `${ico('info')} <b>Built-in engine.</b> Suggestions are written from each child's scores, words, interests and marks without AI.`}</div>
    <h3>Recommended: Firebase Function</h3><p class="small">Deploy the <code>functions</code> folder and store your Google Gemini API key as a Firebase secret (steps in SETUP.md). Then paste the function URL into <code>js/config.js</code>. Nobody using the app can see the key.</p>
    <h3>For testing on your own computer</h3><p class="small">You can paste a Gemini API key here (get one free at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com</a>). It is kept only in this browser and used to call the AI directly. Do not do this on shared or school computers.</p>
    <label class="small">Gemini API key<input id="aiKey" type="password" placeholder="AIza…" value="${esc(key)}" autocomplete="off"></label>
    <div class="row"><button class="btn btn-primary" id="aiSave">${ico('save')} Save in this browser</button>${key ? `<button class="btn btn-ghost" id="aiClear">${ico('close')} Remove key</button>` : ''}</div>`);
  $('#aiSave', m).onclick = () => { Insights.browserKey = $('#aiKey', m).value.trim(); m.close(); toast(ico('check') + ' Saved. Press "Write again" on a child to use it.'); };
  const cl = $('#aiClear', m); if (cl) cl.onclick = () => { Insights.browserKey = ''; m.close(); toast('Key removed'); };
}
