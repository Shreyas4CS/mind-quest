/* ================================================================
   Glossary: short meanings behind every "i" button, and the full
   "Glossary & details" download (a PDF with every term plus this
   child's detailed answers, area by area).
   ================================================================ */
const GLOSSARY = {
  scale: { t: 'The 4-step scale', d: 'Developing: needs regular guidance. Progressing: shows the skill sometimes, with reminders. Consistent: shows it in familiar situations. Strength: shows it independently and often helps others.', how: 'Same scale as the CBSE-style Holistic Well-being Report Card.' },
  wellbeing: { t: 'Well-being index', d: 'One number (0 to 100) that averages all the well-being areas with enough evidence. Higher is better.', how: 'Average of the area scores; an area needs at least 2 answers to count.' },
  stress: { t: 'Stress signal', d: 'How much worry or strain showed up across the quest (0 = very calm, 100 = a lot of strain). It combines mood check-ins, the private check-in, calming and coping answers, words in the chat, and camera and heart signals when used.', how: '0-39 mostly calm · 40-59 some worry · 60+ needs attention.' },
  focus: { t: 'Focus', d: 'Steady attention and impulse control, from the attention games (Quick Catch, Flash Count, Beep Count and others that load on Attention & Self-Control). 0 to 100, higher is better.', how: 'Older weeks used Star Catcher (tap stars, hold back on clouds); those results still count.' },
  memory: { t: 'Memory', d: 'Working memory: holding information in mind and using it, from Simon Says, Tap in Order, Listen & Pick and other memory games. 0 to 100, higher is better.', how: 'Older weeks used Light Trail (the longest sequence repeated); those results still count.' },
  stamina: { t: 'Focus stamina', d: 'The longest stretch the child stayed engaged without going idle, switching away or pausing. It shows how long they can stay with one thing.', how: 'Idle = no tap, key or voice for 30 seconds during an activity that needs an answer.' },
  active: { t: 'Active time', d: 'Time the child actually spent on the activities, not counting pauses, idle time or time on other tabs.', how: 'A weekly quest is planned for about 20 to 25 minutes.' },
  idle: { t: 'Idle time', d: 'Time when an activity waited for an answer but the child did not interact for over 30 seconds. A lot of idle time can mean distraction, tiredness or that a question was hard.', how: 'Videos, breathing and listening do not count as idle.' },
  pace: { t: 'Answer pace', d: 'Average seconds to answer a "What would you do?" situation. Very fast (under 5 s) may mean rushing; very slow may mean reading difficulty, careful thinking or hesitation.', how: 'quick < 9 s · steady 9-30 s · slow > 30 s' },
  camera: { t: 'Camera feelings', d: 'With permission, the camera reads facial expressions twice a second while the child plays. Only the counts are saved, never photos or video.', how: 'Facial expression reading is approximate, especially for worry; treat it as a hint, not a fact.' },
  attention: { t: 'Looking at the screen', d: 'Share of camera readings in which the child’s face was turned to the screen.', how: 'Low values can also mean poor lighting or camera angle.' },
  heart: { t: 'Heart rate', d: 'Beats per minute from the optional HW-605 finger sensor. Compared with the child’s own calm level (their lowest 20%), a rise during an activity can mean excitement or stress.', how: 'Children 9 to 14 typically rest at 70 to 100 bpm.' },
  hrv: { t: 'Heart rate variability (HRV)', d: 'The small differences between heartbeats. Higher usually means more relaxed; lower can mean stress or effort. Only meaningful with a still finger.', how: 'Measured as RMSSD in milliseconds.' },
  spo2: { t: 'Blood oxygen', d: 'Oxygen level from the finger sensor. Healthy children are usually 95 to 100%. This is not a medical device; finger movement and cold hands lower the reading.' },
  checkin: { t: 'Private check-in', d: 'At the end of each week the child says how they feel (comfortable, a little worried, or needs to talk privately) and whether they want a chat with a trusted adult. This is taken from the CBSE-style card’s Student Check-in.', how: 'Any "need to talk" or "yes" is shown as a flag for the teacher and parent.' },
  flags: { t: 'Things to look at', d: 'Gentle alerts for adults: a check-in request, worrying words in the chat, a low mood at both start and end, or an area at "Developing".', how: 'Safety words trigger an alert even if everything else looks fine. Follow your school’s safeguarding procedure.' },
  alignment: { t: 'Marks vs well-being', d: 'Compares the latest marks (as a %) with the well-being index and thinking skills. "Aligned" means they match. "Marks higher" can mean doing well while under pressure. "Marks lower" points to study skills or subject gaps.', how: 'A gap of 15 points or more counts as not aligned.' },
  sources: { t: 'Where the suggestions come from', d: 'With AI switched on, a summary of the results (no photos, video or audio) is sent to Google’s Gemini AI model, which writes the suggestions. Without it, the built-in engine writes them from this child’s scores, words, interests, fears and marks.' },
  abilities: { t: 'Thinking skills', d: 'Ten thinking abilities from the CHC model used by modern intelligence tests (reasoning, verbal, number, memory, visual, listening, speed, attention, reading and idea fluency). Each game mission loads on one or more of them; the bar is the weighted average of those missions (0 to 100).', how: 'Short games give a screening picture. A low bar is a hint for practice, not a label.' },
  big5: { t: 'Personality (Big Five)', d: 'Choose Your Path asks what the child would do in little stories. Each choice leans towards one end of a trait: Openness, Conscientiousness, Extraversion, Agreeableness and Emotional Stability. Neither end is better.', how: 'Each choice is 0 to 3; the bar is the average as 0 to 100. Needs several choices per trait to mean much.' },
  ei: { t: 'Emotional intelligence', d: 'From Feelings Detective: understanding = naming how a character feels; managing = picking a helpful way to handle that feeling.', how: '0 to 100 for each part.' },
  missions: { t: 'Game missions', d: 'Every week has all 19 MindQuest game types (counting, patterns, memory, listening, reading, Picture Talk, speaking, finger maths, quick-fire and more), with new content each week. Each mission records right or wrong, a score, the time taken and extra signals such as replays.' },
  heartchart: { t: 'Heart rate through the quest', d: 'Heart rate every second during the quest, from the finger sensor. The dashed line is the child’s own calm level; red dots are wrong answers, green dots right answers. A rise after wrong answers can show frustration or worry about mistakes.', how: 'Only shown when the sensor was used. Moving the finger or a cold hand can give gaps.' },
  mood: { t: 'Mood check', d: 'The child picks how they feel at the start and end of each weekly quest, and how strong the feeling is.' },
  voice: { t: 'In their own words', d: 'Answers the child typed or spoke in the chat with Coggy, Picture Talk and the speaking games, based on the Student Voice section of the CBSE-style card.' }
};
for (const k in DOMAINS) GLOSSARY['d_' + k] = { t: DOMAINS[k].m + ' (' + DOMAINS[k].short + ')', d: DOMAINS[k].what, how: `Called "${DOMAINS[k].p}" for Grades 3-5, "${DOMAINS[k].m}" for 6-8, "${DOMAINS[k].s}" for 9-12. Scored from situations, "About me" statements, story questions and chat answers.` };

/* builds the "Glossary & details" document and saves it as a PDF */
async function downloadGlossary(child, weeks, comb, btn) {
  const content = new Map(); weeks.forEach(w => weekContent(w.week, child.grade).items.forEach(it => content.set(it.id, it)));
  const byDom = {};
  for (const w of weeks) for (const a of w.answers || []) {
    const it = content.get(a.id); if (!it || a.skipped) continue;
    const push = (k, q, ans, s) => (byDom[k] = byDom[k] || []).push({ w: w.week, q, ans, s });
    if (a.type === 'scenario') push(a.domain, it.text, a.choice, a.s);
    else if (a.type === 'rate') push(a.domain, it.text, a.choice, a.s);
    else if (a.type === 'story') (a.stops || []).forEach(s => push(s.domain, `${it.title}: ${s.q}`, s.choice, s.s));
    else if (a.type === 'chat') (a.turns || []).forEach(t => push(t.domain, t.q, t.text || '(skipped)', null));
    else if (a.type === 'voice') push(a.domain, a.q || it.text, a.text, null);
  }
  const g = child.grade, lvTag = s => s == null ? '' : `<span class="lv-chip" style="--c:${LEVELS[Math.round(s) - 1].c}">${LEVELS[Math.round(s) - 1].label}</span>`;
  const host = document.createElement('div'); host.className = 'report gl-doc'; host.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px';
  host.innerHTML = `<div class="rp-cover gl-cover"><img src="${LOGO_DATA}" alt="CognoSpace"><h1>Mind<b>Quest</b> · Glossary &amp; details</h1><p>${esc(child.name)} · Grade ${esc(g)} · ${STAGES[stageOf(g)]} · ${fmtDate(Date.now())}</p></div>
    <div class="rp-body">
      <section class="rp-sec"><h2 class="sec-head">1. What the words mean</h2>${Object.values(GLOSSARY).map(x => `<div class="rec"><b>${esc(x.t)}</b><p>${esc(x.d)}</p>${x.how ? `<p class="muted">${esc(x.how)}</p>` : ''}</div>`).join('')}</section>
      <section class="rp-sec"><h2 class="sec-head">2. Area by area: what ${esc(child.name.split(' ')[0])} answered</h2>
        ${Object.keys(DOMAINS).filter(k => byDom[k]).map(k => { const d = comb && comb.domains[k]; return `<h3 class="gl-h">${esc(domainName(k, g))} ${d ? `<span class="lv-chip" style="--c:${levelOf(d.v).c}">${levelOf(d.v).label} · ${Math.round(d.v * 100)}</span>` : ''}</h3><p class="muted">${esc(DOMAINS[k].what)}</p>
          <table class="gl-t"><tr><th>Wk</th><th>Question</th><th>Answer</th><th>Level</th></tr>${byDom[k].map(r => `<tr><td>${r.w}</td><td>${esc(r.q)}</td><td>${esc(r.ans)}</td><td>${lvTag(r.s)}</td></tr>`).join('')}</table>`; }).join('')}
      </section>
      ${comb && comb.games && comb.games.length ? `<section class="rp-sec"><h2 class="sec-head">3. Game missions</h2><table class="gl-t"><tr><th>Wk</th><th>Mission</th><th>Measures</th><th>Result</th><th>Time</th></tr>${comb.games.map(a => `<tr><td>${a.week}</td><td>${esc(a.name)}</td><td>${esc(Object.keys(a.measures || {}).map(k => ABILITIES[k] ? ABILITIES[k].label : k).join(', '))}</td><td>${a.correct === true ? 'Right' : a.correct === false ? 'Not this time' : a.score != null ? Math.round(a.score * 100) + '%' : 'Choice'}</td><td>${a.rt ? (a.rt / 1000).toFixed(1) + ' s' : ''}</td></tr>`).join('')}</table></section>` : ''}
      <section class="rp-sec"><h2 class="sec-head">4. Time spent, week by week</h2><table class="gl-t"><tr><th>Week</th><th>Active</th><th>Idle</th><th>Longest focused stretch</th><th>Sittings</th><th>Finished</th></tr>
        ${weeks.map(w => `<tr><td>${w.week}: ${esc(w.title || '')}</td><td>${fmtDur((w.timing || {}).activeMs)}</td><td>${fmtDur((w.timing || {}).idleMs)}</td><td>${fmtDur((w.timing || {}).longestStreakMs)}</td><td>${(w.timing || {}).sittings || 1}</td><td>${w.status === 'done' ? fmtDate(w.completedAt) : 'In progress'}</td></tr>`).join('')}</table>
        <table class="gl-t"><tr><th>Activity type</th><th>Total time</th></tr>${Object.entries((comb && comb.time.byType) || {}).map(([k, v]) => `<tr><td>${TYPES[k] ? TYPES[k].label : GAMES[k] ? GAMES[k].name : k}</td><td>${fmtDur(v)}</td></tr>`).join('')}</table></section>
      <p class="disclaimer">MindQuest is a screening and conversation tool built from games. It is not a psychological diagnostic tool and must not be used to diagnose mental-health conditions. If a student expresses distress or a safety concern, follow the school’s safeguarding and referral procedures.</p>
    </div>`;
  document.body.append(host);
  try { await ReportPDF.save(host, { name: child.name, grade: g, date: fmtDate(Date.now()), file: `MindQuest_Glossary_${String(child.name).replace(/[^\p{L}\p{N}]+/gu, '_')}.pdf`, title: `MindQuest Glossary & details: ${child.name}` }, btn); }
  finally { host.remove(); }
}
