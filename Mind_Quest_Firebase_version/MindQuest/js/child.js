/* child dashboard and profile */
const C = { user: null, child: null, weeks: [], step: 0, sel: { gender: '', likes: [], scary: [] }, avatar: AVATARS[0] };

(async function boot() {
  C.user = await guard('child');
  C.child = await Store.getChild(C.user.uid) || { username: C.user.username };
  C.weeks = await Store.getWeeks(C.user.uid);
  topBar({ user: C.user, title: '' });
  if (!C.child.profileDone || location.hash === '#profile') openProfile(); else showDash();
})();

/* ================= profile wizard ================= */
const STEP_SAY = [
  'Hi, I am Coggy! Tell me a little about yourself.',
  'Awesome! Now pick the things you love. I will use them to make your quests more fun.',
  'Last step. Everyone feels scared of something sometimes. You can choose some, or just skip.'
];
function openProfile() {
  $('#dashView').hidden = true; $('#profileView').hidden = false;
  const f = $('#profileForm'), c = C.child;
  if (f.age.options.length < 2) { for (let a = 8; a <= 16; a++) f.age.add(new Option(a + ' years', a)); for (let g = 4; g <= 9; g++) f.grade.add(new Option('Grade ' + g + ' · ' + WORLDS[g][1], g)); }
  f.name.value = c.name || ''; f.age.value = c.age || 10; f.grade.value = c.grade || 5; f.section.value = c.section || ''; f.school.value = c.school || MQ_CONFIG.school.name || '';
  f.hobbies.value = c.hobbies || ''; f.favSubject.value = c.favSubject || ''; f.dream.value = c.dream || ''; f.scaryOther.value = c.scaryOther || '';
  C.sel = { gender: c.gender || '', likes: (c.likes || []).slice(), scary: (c.scary || []).slice() }; C.avatar = c.avatar || AVATARS[0];
  $('#likeChips').innerHTML = LIKES.map(l => `<button type="button" data-v="${esc(l)}">${esc(l)}</button>`).join('');
  $('#scaryChips').innerHTML = SCARY.map(l => `<button type="button" data-v="${esc(l)}">${esc(l)}</button>`).join('');
  $('#avatarRow').innerHTML = AVATARS.map(a => `<button type="button" class="av" data-v="${a}" aria-label="Avatar ${a}">${a}</button>`).join('');
  paintChips();
  $$('.chips button, #avatarRow button', f).forEach(b => b.onclick = () => {
    Sfx.pop();
    if (b.classList.contains('av')) C.avatar = b.dataset.v;
    else { const name = b.parentElement.dataset.name; if (name === 'gender') C.sel.gender = b.dataset.v; else { const L = C.sel[name], i = L.indexOf(b.dataset.v); i < 0 ? L.push(b.dataset.v) : L.splice(i, 1); } }
    paintChips();
  });
  $('#pwTitle').textContent = c.profileDone ? 'Edit my profile' : 'Let’s make your profile!';
  setStep(0);
  $('#pwBack').onclick = () => C.step ? setStep(C.step - 1) : (c.profileDone ? (location.hash = '', showDash()) : null);
  f.onsubmit = async e => {
    e.preventDefault(); $('.form-err', f).textContent = '';
    if (C.step === 0 && !f.name.value.trim()) { $('.form-err', f).textContent = 'Please type your name.'; f.name.focus(); return; }
    if (C.step < 2) return setStep(C.step + 1);
    const data = { name: f.name.value.trim(), age: +f.age.value, grade: +f.grade.value, section: f.section.value.trim().toUpperCase(), school: f.school.value.trim(), gender: C.sel.gender, avatar: C.avatar, likes: C.sel.likes, hobbies: f.hobbies.value.trim(), favSubject: f.favSubject.value, dream: f.dream.value.trim(), scary: C.sel.scary, scaryOther: f.scaryOther.value.trim(), profileDone: true, username: C.user.username, updatedAt: Date.now() };
    $('#pwNext').disabled = true;
    try { await Store.saveChild(C.user.uid, data); Object.assign(C.child, data); Sfx.win(); confetti(); history.replaceState(null, '', 'child.html'); location.reload(); }
    catch (x) { $('.form-err', f).textContent = 'Could not save: ' + x.message; $('#pwNext').disabled = false; }
  };
}
function paintChips() {
  $$('#profileForm .chips').forEach(ch => { const name = ch.dataset.name; $$('button', ch).forEach(b => b.classList.toggle('sel', name === 'gender' ? C.sel.gender === b.dataset.v : C.sel[name].includes(b.dataset.v))); });
  $$('#avatarRow button').forEach(b => b.classList.toggle('sel', b.dataset.v === C.avatar));
}
function setStep(s) {
  C.step = s; $$('.pstep').forEach(p => p.hidden = +p.dataset.step !== s);
  $$('.steps li').forEach((li, i) => { li.classList.toggle('on', i === s); li.classList.toggle('done', i < s); });
  $('#pwNext').innerHTML = s < 2 ? `Next ${ico('arrow')}` : `${ico('check')} Save my profile`;
  $('#pwBack').innerHTML = s ? 'Back' : (C.child.profileDone ? 'Cancel' : ''); $('#pwBack').hidden = !s && !C.child.profileDone;
  $('#pwSay').textContent = STEP_SAY[s]; Voice.say(STEP_SAY[s]);
}

/* ================= dashboard ================= */
function nextWeekInfo() {
  const done = C.weeks.filter(w => w.status === 'done').map(w => w.week), maxDone = done.length ? Math.max(...done) : 0;
  const inprog = C.weeks.find(w => w.status === 'in_progress');
  const n = inprog ? inprog.week : maxDone + 1, prev = C.weeks.find(w => w.week === n - 1);
  let opensAt = 0; if (MQ_CONFIG.calendarLock && prev) opensAt = (prev.startedAt || 0) + 7 * 864e5;
  return { n, inprog, open: !opensAt || Date.now() >= opensAt, opensAt };
}
function showDash() {
  $('#profileView').hidden = true; $('#dashView').hidden = false;
  const c = C.child, first = c.name.split(' ')[0], W = WORLDS[c.grade] || WORLDS[4];
  document.body.dataset.world = W[0];
  $('#heroAv').textContent = c.avatar || AVATARS[0];
  $('#heroWorld').innerHTML = `${worldSvg(W[0])} Grade ${c.grade}${c.section ? ' ' + esc(c.section) : ''} · ${W[1]}`;
  $('#heroHi').textContent = `Hi ${first}!`;
  $('#heroDoodle').innerHTML = worldSvg(W[0]);
  const nx = nextWeekInfo(), cnt = weekContent(nx.n, c.grade);
  const doneN = C.weeks.filter(w => w.status === 'done').length;
  const greet = nx.inprog ? `Welcome back, ${first}! Your week ${nx.n} quest is waiting. Let’s finish it!` : nx.open ? `Hi ${first}! A new quest is ready: week ${nx.n}, ${cnt.title}. Shall we play?` : `Great work, ${first}! You finished this week’s quest. The next one opens on ${fmtDate(nx.opensAt)}.`;
  $('#heroSay').innerHTML = `${esc(greet)} <button class="say-btn" aria-label="Hear it">${ico('sound')}</button>`;
  $('#heroSay .say-btn').onclick = () => Voice.say(greet);
  setTimeout(() => Voice.say(greet), 500);

  /* this week's quest */
  const w = nx.inprog, pctDone = w ? Math.round(w.idx / cnt.items.length * 100) : 0;
  $('#questCard').style.setProperty('--qc', cnt.color);
  $('#questCard').innerHTML = `<div class="qc-badge">${ico(cnt.icon)}</div><p class="eyebrow">This week’s quest · Week ${nx.n}</p><h2>${esc(cnt.title)}</h2><p class="muted">${esc(cnt.sub)}</p>
    <div class="qc-meta"><span>${ico('clock')} About ${estMinutes(cnt.items)} min</span><span>${ico('gamepad')} ${cnt.items.length} activities</span></div>
    <div class="qc-types">${[...new Set(cnt.items.map(i => i.type))].filter(t => t !== 'mood').map(t => `<span>${ico(TYPES[t].icon)}${TYPES[t].label}</span>`).join('')}</div>
    ${w ? `<div class="qc-prog"><i style="width:${pctDone}%"></i></div><p class="small">${pctDone}% done · ${fmtDur((w.timing || {}).activeMs)} so far</p>` : ''}
    ${nx.open ? `<a class="btn btn-primary btn-xl" href="quest.html?week=${nx.n}">${ico('play')} ${w ? 'Continue quest' : 'Start quest'}</a>` : `<button class="btn btn-ghost btn-xl" disabled>${ico('lock')} Opens ${fmtDate(nx.opensAt)}</button>`}`;

  /* time */
  const done = C.weeks.filter(x => x.status === 'done'), totalMs = C.weeks.reduce((s, x) => s + ((x.timing || {}).activeMs || 0), 0), longest = Math.max(0, ...C.weeks.map(x => (x.timing || {}).longestStreakMs || 0));
  $('#kpis').innerHTML = `<div class="kpi"><b>${doneN}</b><span>Weeks done</span></div><div class="kpi"><b>${Math.round(totalMs / 60000)}</b><span>Minutes played</span></div><div class="kpi"><b>${Math.round(longest / 60000)}</b><span>Best focus (min)</span></div>`;
  $('#timeChart').innerHTML = C.weeks.length ? `<div class="mini-bars">${C.weeks.map(x => { const m = Math.round(((x.timing || {}).activeMs || 0) / 60000); return `<div><i style="height:${Math.min(100, m * 4)}%"></i><b>${m}m</b><span>Wk ${x.week}</span></div>`; }).join('')}</div>` : '<p class="muted">Play your first quest to see your time here.</p>';

  /* journey: weeks 1..max(4, next) */
  const last = Math.max(4, nx.n + 1);
  $('#journey').innerHTML = Array.from({ length: last }, (_, i) => {
    const n = i + 1, wk = C.weeks.find(x => x.week === n), ct = weekContent(n, c.grade), st = wk && wk.status === 'done' ? 'done' : n === nx.n ? (nx.open ? 'now' : 'wait') : 'locked';
    return `<div class="jw ${st}" style="--qc:${ct.color}"><div class="jw-dot">${ico(st === 'done' ? 'check' : st === 'locked' ? 'lock' : ct.icon)}</div><b>Week ${n}</b><span>${esc(ct.title)}</span>${st === 'done' ? `<small>${fmtDate(wk.completedAt)}</small>` : st === 'now' ? '<small class="go">Ready!</small>' : ''}</div>`;
  }).join('<i class="jw-line"></i>');

  /* moods */
  const moods = C.weeks.flatMap(x => (x.answers || []).filter(a => a.type === 'mood').map(a => ({ w: x.week, ...a })));
  $('#moods').innerHTML = moods.length ? moods.map(m => `<div class="mood-chip">${faceSvg(m.mood)}<span>Wk ${m.w} ${m.when === 'start' ? 'start' : 'end'}</span></div>`).join('') : '<p class="muted">Your moods will show up here.</p>';

  $('#aboutMe').innerHTML = `<p><b>${esc(c.name)}</b>, ${c.age} years · Grade ${c.grade}${c.section ? ' ' + esc(c.section) : ''}${c.school ? ' · ' + esc(c.school) : ''}</p>
    ${c.likes && c.likes.length ? `<div class="chips static">${c.likes.map(l => `<span>${esc(l)}</span>`).join('')}</div>` : ''}${c.dream ? `<p class="muted">Dream: ${esc(c.dream)}</p>` : ''}`;
  $('#editProfile').innerHTML = `${ico('edit')} Edit my profile`;
  $('#editProfile').onclick = () => { location.hash = 'profile'; openProfile(); };
}
