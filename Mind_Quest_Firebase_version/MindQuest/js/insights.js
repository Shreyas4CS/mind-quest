/* ================================================================
   Recommendations for teachers and parents.
   Order of preference:
   1. AI through your Firebase Function (MQ_CONFIG.ai.functionUrl): the Gemini API key is a
      Firebase secret on Google's servers, never in these files.  <- recommended
   2. AI with a key a teacher typed into THIS browser (Settings on the dashboard). For testing
      on your own device only: the key stays in that browser's storage.
   3. The built-in engine below: no AI, works offline. It builds the advice from this child's
      own scores, words, interests, fears, timing and marks, so every child gets different advice.
   The AI only receives a summary (scores, short quotes, interests): never photos, video or audio.
   ================================================================ */
const Insights = {
  get browserKey() { try { return localStorage.getItem('mq.aiKey') || ''; } catch (e) { return ''; } },
  set browserKey(v) { try { v ? localStorage.setItem('mq.aiKey', v) : localStorage.removeItem('mq.aiKey'); } catch (e) { /* private */ } },
  get aiOn() { return !!(MQ_CONFIG.ai.functionUrl || this.browserKey); },

  pron(child) { return child.gender === 'boy' ? { s: 'he', o: 'him', p: 'his', S: 'He', P: 'His' } : child.gender === 'girl' ? { s: 'she', o: 'her', p: 'her', S: 'She', P: 'Her' } : { s: 'they', o: 'them', p: 'their', S: 'They', P: 'Their' }; },

  /* the compact summary that goes to the AI (and that the built-in engine reads) */
  facts(child, comb, marks, notes) {
    const g = child.grade, lv = {};
    for (const k in comb.domains) if (comb.domains[k].n >= 2) lv[domainName(k, g)] = { level: levelOf(comb.domains[k].v).label, score: Math.round(comb.domains[k].v * 100) };
    const al = alignment(comb, marks);
    return {
      child: { firstName: (child.name || '').split(' ')[0], age: child.age, grade: g, stage: STAGES[stageOf(g)], pronouns: this.pron(child).s, likes: child.likes || [], hobbies: child.hobbies || '', favouriteSubject: child.favSubject || '', thingsThatScareThem: child.scary || [], dream: child.dream || '' },
      weeksCompleted: comb.weeks, wellbeingIndex: comb.wellbeing, stressIndex: comb.stress, areas: lv,
      focus: comb.focus ? { score: Math.round(comb.focus.score * 100), missedStarsPct: comb.focus.hitRate != null ? Math.round((1 - comb.focus.hitRate) * 100) : null, impulsiveTapsPct: comb.focus.falseRate != null ? Math.round(comb.focus.falseRate * 100) : null } : null,
      memory: comb.memory ? { score: Math.round(comb.memory.score * 100), span: comb.memory.span } : null,
      thinkingSkills: comb.gs ? Object.fromEntries(Object.entries(comb.gs.abil).filter(([, v]) => v).map(([k, v]) => [ABILITIES[k].label, v.v])) : null,
      personalityBigFive: comb.gs ? Object.fromEntries(Object.entries(comb.gs.big5).filter(([, v]) => v).map(([k, v]) => [BIG5_INFO[k].label, v.v])) : null,
      emotionalIntelligence: comb.gs && comb.gs.ei ? { understandingFeelings: comb.gs.ei.u, managingFeelings: comb.gs.ei.m } : null,
      gameMissions: comb.gs ? { played: comb.gs.n, right: comb.gs.right, scored: comb.gs.scored } : null,
      time: { minutesPerWeek: Math.round((comb.time.perWeekMs || 0) / 60000), longestFocusedStretchMin: Math.round((comb.time.longestStreakMs || 0) / 60000), idleMinutes: Math.round(comb.time.idleMs / 60000), secondsPerSituation: comb.time.scenarioRt ? Math.round(comb.time.scenarioRt / 1000) : null },
      camera: comb.cam ? { mostCommonFeelings: Object.entries(comb.cam.emo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${EMO_META[k].label} ${Math.round(v * 100)}%`), lookingAtScreenPct: Math.round(comb.cam.attention * 100) } : null,
      heart: comb.heart ? { avgBpm: comb.heart.avg, calmBpm: comb.heart.calm, hrvMs: comb.heart.hrv, bloodOxygenPct: comb.heart.spo2, riseAfterWrongAnswer: comb.heart.wrong ? comb.heart.wrong.bpm : null } : null,
      moods: comb.moods, checkIns: comb.checkins,
      childsOwnWords: comb.voice.filter(v => v.text).slice(-10).map(v => ({ about: v.key, said: String(v.text).slice(0, 200) })),
      flags: comb.flags.map(f => f.text),
      marks: marks && marks.length ? marks.slice(-3).map(m => ({ term: m.term, percent: Math.round(marksPct(m) * 100), subjects: Object.fromEntries(Object.entries(m.subjects || {}).map(([s, x]) => [s, Math.round(+x.got / +x.max * 100)])) })) : null,
      marksVsWellbeing: al ? al.text : null,
      teacherNotes: notes && notes.observations || '', parentNotes: notes && notes.parentInput || ''
    };
  },

  prompt(f) {
    return `You are a warm, practical school counsellor helping a teacher and a parent in India support a child, using results from MindQuest, a game-based well-being screening (CBSE-style holistic well-being areas, 4-step scale Developing / Progressing / Consistent / Strength). It is a screening picture, not a diagnosis: never diagnose or name disorders. Be specific to THIS child: use their interests, fears, own words, timing and marks. Simple English, short sentences, kind and non-judgemental. If there are safety flags, the first teacher action must be a private check-in following the school's safeguarding procedure.

Child data (JSON):
${JSON.stringify(f)}

Reply with ONLY a JSON object, no other text, in exactly this shape:
{"summary":"3-4 sentences for parents and teachers: feelings/stress, focus, strengths, one thing to watch",
"tags":[{"k":"Feelings","v":"2-3 words"},{"k":"Focus","v":"..."},{"k":"Mood","v":"..."},{"k":"Strength","v":"..."}],
"teacher":[{"title":"short action","detail":"1-2 sentences: exactly what to do or say in class"}] (4 to 6 items),
"parent":[{"title":"short action","detail":"1-2 sentences: what to do at home, routines, precautions"}] (4 to 6 items),
"talk":["3 conversation starters an adult can use with this child"],
"books":[{"title":"real, age-appropriate book","author":"author","why":"why for this child"}] (3 items),
"places":[{"name":"type of place to visit (e.g. planetarium, nature park)","why":"why for this child"}] (3 items),
"activities":[{"name":"activity","why":"why"}] (3 items),
"marks":"1-2 sentences on how marks and well-being line up and what to do, or null if no marks"}`;
  },

  parse(txt) { const m = String(txt).match(/\{[\s\S]*\}/); if (!m) throw new Error('No JSON in AI reply'); return JSON.parse(m[0]); },

  async callAI(body) {
    if (MQ_CONFIG.ai.functionUrl) {
      const tok = await Store.idToken();
      const r = await fetch(MQ_CONFIG.ai.functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('AI function error ' + r.status);
      return (await r.json()).text;
    }
    const key = this.browserKey; if (!key) throw new Error('No AI configured');
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MQ_CONFIG.ai.model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(this.gemini(body))
    });
    if (!r.ok) throw new Error('AI error ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return this.geminiText(await r.json());
  },

  /* Google Gemini request: turns must alternate user / model and start with user */
  gemini({ kind, system, messages }) {
    const contents = [];
    for (const x of messages) {
      const role = x.role === 'assistant' ? 'model' : 'user', text = String(x.content || '');
      const last = contents[contents.length - 1];
      if (last && last.role === role) last.parts[0].text += '\n' + text; else contents.push({ role, parts: [{ text }] });
    }
    if (contents.length && contents[0].role === 'model') contents.unshift({ role: 'user', parts: [{ text: '(start)' }] });
    const chat = kind === 'chat';
    return {
      systemInstruction: { parts: [{ text: system }] }, contents,
      generationConfig: chat ? { maxOutputTokens: 300, temperature: 0.8, thinkingConfig: { thinkingBudget: 0 } } : { maxOutputTokens: 4096, temperature: 0.7, responseMimeType: 'application/json' }
    };
  },
  geminiText(j) {
    const c = (j.candidates || [])[0];
    if (!c || !c.content) throw new Error('AI gave no answer' + (c && c.finishReason ? ' (' + c.finishReason + ')' : ''));
    return (c.content.parts || []).map(p => p.text || '').join('');
  },

  /* main entry: returns recommendations; caches per child + weeks + marks */
  async generate(child, comb, marks, notes, { force = false } = {}) {
    const f = this.facts(child, comb, marks, notes);
    const key = 'rec_' + comb.weeks.join('-') + '_m' + (marks || []).length + '_' + (notes && notes.updatedAt || 0);
    if (!force) { const c = await Store.getInsight(child.uid, key).catch(() => null); if (c) return c; }
    let out = null;
    if (this.aiOn) {
      try {
        const txt = await this.callAI({ kind: 'insights', system: 'You write careful, kind, practical guidance for teachers and parents. Output JSON only.', messages: [{ role: 'user', content: this.prompt(f) }] });
        out = { ...this.parse(txt), source: 'ai', model: MQ_CONFIG.ai.model };
      } catch (e) { console.warn('[MindQuest] AI unavailable, using built-in engine', e); toast(ico('info') + ' AI could not be reached, so the built-in engine wrote these suggestions.', 4000); }
    }
    if (!out) out = { ...this.local(child, comb, marks, notes), source: 'built-in' };
    out.at = Date.now(); out.key = key;
    Store.saveInsight(child.uid, key, out).catch(() => {});
    return out;
  },

  async chatReply(hist, child) {
    if (!this.aiOn) return null;
    const sys = `You are Coggy, a friendly robot buddy in a children's well-being game. You are chatting with ${(child.name || '').split(' ')[0]}, age ${child.age}, grade ${child.grade}, who likes ${(child.likes || []).join(', ') || 'many things'}. Reply in ONE or TWO short, warm sentences a child can understand. Reflect what they said, be encouraging, never give medical advice, never ask for personal details like address or phone. Do not ask a new question: the game asks the next one.`;
    const txt = await this.callAI({ kind: 'chat', system: sys, messages: hist.map(h => ({ role: h.role, content: h.content })).concat(hist[hist.length - 1].role === 'assistant' ? [{ role: 'user', content: '(no answer)' }] : []) });
    return String(txt).trim().slice(0, 300) || null;
  },

  /* ================= built-in engine ================= */
  local(child, comb, marks, notes) {
    const g = child.grade, st = stageOf(g), P = this.pron(child), first = (child.name || 'Your child').split(' ')[0];
    let seed = hashStr(child.uid + comb.weeks.join()); const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296); const one = a => a[Math.floor(rnd() * a.length)];
    const D = Object.entries(comb.domains).filter(([, d]) => d.n >= 2).sort((a, b) => a[1].v - b[1].v);
    const weak = D.filter(([, d]) => d.v < .6).slice(0, 3).map(([k]) => k), strong = D.slice().reverse().filter(([, d]) => d.v >= .7).slice(0, 2).map(([k]) => k);
    const said = k => { const v = comb.voice.filter(x => x.key === k && x.text).pop(); return v ? String(v.text).slice(0, 90) : null; };
    const stress = comb.stress, foc = comb.focus, mem = comb.memory, streak = comb.time.longestStreakMs / 60000;
    const likes = (child.likes || []), like = likes[0] ? likes[0].toLowerCase() : null, scary = child.scary || [];
    const highFlags = comb.flags.filter(f => f.level === 'high');

    /* summary */
    const feel = stress == null ? 'not enough data on feelings yet' : stress >= 60 ? `${first} seems to be carrying quite a lot of worry or stress right now` : stress >= 40 ? `${first} shows some everyday worry, mostly handled with support` : `${first} seems mostly calm and settled`;
    const fo = foc ? (foc.score >= .75 ? 'focus is a clear strength' : foc.score >= .55 ? 'focus is steady with occasional drifts' : 'attention drifts often, especially in longer tasks') : 'focus has not been measured yet';
    const sumParts = [`${feel}, and ${fo}.`];
    if (strong.length) sumParts.push(`Strong areas: ${strong.map(k => DOMAINS[k].short.toLowerCase()).join(' and ')}.`);
    if (weak.length) sumParts.push(`The main thing to support is ${DOMAINS[weak[0]].short.toLowerCase()}${weak[1] ? `, then ${DOMAINS[weak[1]].short.toLowerCase()}` : ''}.`);
    if (highFlags.length) sumParts.push('There is a check-in request or safety note below that needs a private conversation soon.');
    sumParts.push('This is a screening picture from games, not a diagnosis.');

    const tags = [
      { k: 'Feelings', v: stress == null ? 'Not yet known' : stress >= 60 ? 'Under strain' : stress >= 40 ? 'Some worry' : 'Mostly calm' },
      { k: 'Focus', v: !foc ? 'Not measured' : foc.score >= .75 ? 'Sharp' : foc.score >= .55 ? 'Steady' : 'Drifts' },
      { k: 'Mood', v: (() => { const m = comb.moods.flatMap(x => [x.start, x.end]).filter(Boolean); if (!m.length) return '—'; const s = mean(m.map(k => MOOD_SCORE[k])); return s >= .75 ? 'Bright' : s >= .5 ? 'Okay' : 'Low'; })() },
      { k: 'Strength', v: strong.length ? DOMAINS[strong[0]].short : likes[0] || '—' }
    ];

    /* teacher actions */
    const T = [], Pa = [];
    if (highFlags.length) T.push({ title: 'Private check-in this week', detail: `${first} asked for (or hinted at needing) a trusted adult. Find a quiet moment, ask open questions like "How have things been for you lately?", listen without judging, and follow the school’s safeguarding steps if anything worrying comes up.`, area: 'check-in' });
    const TB = {
      feelings: [`Start the day with a 1-minute "feelings check" (thumbs, colours or faces) and invite ${first} to name ${P.p} feeling. Model it yourself: "I feel a bit tired today."`, `When ${first} is upset, name the feeling for ${P.o} ("You look frustrated") before solving the problem.`],
      coping: [`Teach one calming tool in class (box breathing, counting to 10, a "calm corner") and quietly remind ${first} to use it before tests or when frustrated.`, `Before tests, give ${first} a 2-minute warm-up and a clear plan. Praise how ${P.s} handled the stress, not only the marks.`],
      resilience: [`When ${first} makes a mistake, say "Mistakes help your brain grow. What will you try next?" and give a second chance on small tasks.`, `Share short stories of people who failed before they succeeded, and celebrate ${first}’s effort publicly.`],
      confidence: [`Give ${first} small, low-risk speaking roles first (reading a line, answering in pairs) before whole-class speaking. Praise specific effort.`, `Assign ${first} a classroom responsibility linked to ${like || P.p + ' interests'} to build a sense of "I am good at this".`],
      friendship: [`Seat ${first} with a kind, patient buddy for group work and change groups gradually.`, `Use short role-plays about joining a game or solving a disagreement; let ${first} practise the words.`],
      inclusion: [`Give ${first} cooperative tasks with children from different groups, and praise inclusive behaviour when you see it.`, `Discuss "how would you feel if…" stories so ${first} practises seeing others’ view.`],
      communication: [`Use turn-taking signals (talking stick, hand up) and coach ${first} to say "I feel… when… I need…".`, `Check understanding with ${first} privately after instructions; some children don’t ask in front of others.`],
      helpseeking: [`Tell ${first} directly: "You can always come to me." Name 2-3 trusted adults at school with ${P.o}.`, `Use a "help card" or private signal ${first} can show when ${P.s} needs help without speaking up in front of everyone.`],
      belonging: [`Greet ${first} by name every morning and give ${P.o} a small role in class, so ${P.s} feels needed and welcome.`, `Check break times: is ${first} often alone? Help ${P.o} join a club or group activity linked to ${like || 'something ' + P.s + ' enjoys'}.`],
      habits: [`Notice signs of tiredness (yawning, low energy) and share them with parents. Build short movement breaks into lessons.`, `Help ${first} use a simple homework planner with 2-3 tasks a day.`],
      digital: [`Run a short class talk on online safety (never share address, school or photos with strangers; tell an adult).`, `Encourage screen-free hobbies by asking ${first} to share an offline project with the class.`],
      decisions: [`Before tasks, ask ${first} "What is your plan?" and "What could happen if…?" to practise thinking ahead.`, `Help ${first} set one small weekly goal and check it on Friday.`]
    };
    for (const k of weak) T.push({ title: `Support ${DOMAINS[k].short.toLowerCase()}`, detail: one(TB[k]), area: k });
    if (foc && foc.score < .6) T.push({ title: 'Help attention in class', detail: `${first} ${foc.hitRate != null ? `missed ${Math.round((1 - foc.hitRate) * 100)}% of targets${foc.falseRate > .25 ? ' and often tapped too quickly' : ''} in the focus game` : `scored ${Math.round(foc.score * 100)}/100 on the attention and self-control games`}. Seat ${P.o} near the front, break work into short chunks with clear checkpoints, and use ${P.p} name before giving instructions.`, area: 'focus' });
    if (streak && streak < 6) T.push({ title: 'Keep tasks short', detail: `${first} stayed engaged for about ${Math.max(1, Math.round(streak))} minutes at a stretch. Plan 5-7 minute chunks with a quick change of activity in between.`, area: 'time' });
    else if (streak >= 12) T.push({ title: 'Use the long attention span', detail: `${first} stayed with the quest for ${Math.round(streak)} minutes without a break. Offer extension tasks and projects ${P.s} can go deep into.`, area: 'time' });
    if (comb.time.scenarioRt && comb.time.scenarioRt < 5000) T.push({ title: 'Encourage slowing down', detail: `${first} answered situations in about ${Math.round(comb.time.scenarioRt / 1000)} seconds. Teach "stop, think, then answer" and praise careful work.`, area: 'time' });
    for (const s of scary.slice(0, 1)) { const t = this.fearTeacher[s]; if (t) T.push({ title: `Be gentle about: ${s.toLowerCase()}`, detail: t.replace(/\{n\}/g, first).replace(/\{o\}/g, P.o).replace(/\{s\}/g, P.s).replace(/\{p\}/g, P.p), area: 'fear' }); }
    if (strong.length) T.push({ title: `Build on ${DOMAINS[strong[0]].short.toLowerCase()}`, detail: `${first} is strong in ${DOMAINS[strong[0]].short.toLowerCase()}. Let ${P.o} help a classmate or lead a small group: using a strength builds confidence everywhere else.`, area: strong[0] });

    /* parent actions */
    const PB = {
      feelings: `At dinner, play "high and low of the day": everyone shares one good and one hard moment. ${first} learns that all feelings are okay to talk about.`,
      coping: `Practise one calming habit together every night (3 slow breaths, a short walk, or music). ${said('helps') || said('whathelps') ? `${first} told us "${said('helps') || said('whathelps')}" helps, so build on that.` : ''}`,
      resilience: `Share your own small mistakes and what you did next. When ${first} struggles, say "Not yet" instead of "You can’t".`,
      confidence: `Praise effort and specific actions ("You kept trying on that sum") rather than only results. Let ${first} make small family decisions.`,
      friendship: `Invite one classmate home for a playdate, or join a weekend activity where ${first} can make friends around ${like || 'a shared interest'}.`,
      inclusion: `Talk about people who are different from us in positive ways, and volunteer together once a month (e.g. donating books or toys).`,
      communication: `Give ${first} 10 minutes of full attention daily, phone away. Listen first, advise later.`,
      helpseeking: `Tell ${first} clearly: "You can tell me anything and you won’t be in trouble for telling." Agree on 2-3 trusted adults together.`,
      belonging: `Ask about school with specific questions ("Who did you sit with at lunch?"). If ${first} often feels left out, tell the class teacher.`,
      habits: `Keep a fixed sleep time (${+g <= 6 ? 'about 9 pm, 9-11 hours of sleep' : 'about 10 pm, 8-10 hours of sleep'}), screens off an hour before bed, and 60 minutes of play or movement every day.`,
      digital: `Set family screen rules together: devices out of the bedroom at night, a daily limit, and a rule that ${first} tells you about any stranger online. Use parental controls.`,
      decisions: `Before ${first} decides something, ask "What are your options? What might happen?" Then let ${P.o} choose and learn from it.`
    };
    for (const k of weak) Pa.push({ title: `At home: ${DOMAINS[k].short.toLowerCase()}`, detail: PB[k].trim(), area: k });
    if (stress != null && stress >= 50) Pa.push({ title: 'Lower the pressure', detail: `${first} is showing signs of stress. Avoid comparing ${P.o} with siblings or classmates, keep weekends relaxed, and spend calm one-to-one time each day. If worry continues for weeks, consider speaking to the school counsellor.`, area: 'stress' });
    for (const s of scary.slice(0, 2)) { const t = this.fearParent[s]; if (t) Pa.push({ title: `Helping with ${s.toLowerCase()}`, detail: t.replace(/\{n\}/g, first).replace(/\{o\}/g, P.o).replace(/\{s\}/g, P.s).replace(/\{p\}/g, P.p), area: 'fear' }); }
    if (foc && foc.score < .6) Pa.push({ title: 'Homework in short bursts', detail: `Use a timer: 15 minutes of work, 5 minutes break. A quiet, clutter-free desk without a phone nearby helps ${first} focus.`, area: 'focus' });
    if (like) Pa.push({ title: `Use ${P.p} love of ${like}`, detail: `Make ${like} a reward and a confidence-builder: a weekly ${like} time with you, or a small class or club for it.`, area: 'interest' });
    if (Pa.length < 4) Pa.push({ title: 'Keep the routine steady', detail: `Regular meals, sleep and play time help ${first} feel secure. Keep doing what works.`, area: 'habits' });

    /* conversation starters */
    const talk = [
      `"What was the best part of your day, and what was the hardest part?"`,
      weak.includes('helpseeking') || highFlags.length ? `"If something was bothering you, who would you want to tell? I’m always here."` : `"Who did you enjoy being with today?"`,
      like ? `"Can you teach me something about ${like}?"` : `"What is something you are proud of this week?"`,
      scary[0] ? `"Some people feel nervous about ${scary[0].toLowerCase()}. How does it feel for you?"` : `"If you could change one thing about school, what would it be?"`
    ].slice(0, 3);

    /* books, places, activities matched to needs and interests */
    const books = [], seen = new Set();
    for (const k of weak.concat(strong, Object.keys(DOMAINS))) for (const b of (this.books[k] || [])) if (b.st.includes(st) && !seen.has(b.title) && books.length < 3) { seen.add(b.title); books.push({ title: b.title, author: b.author, why: b.why.replace(/\{n\}/g, first) }); break; }
    const places = [], seenP = new Set();
    for (const l of likes) { const p = this.places[l]; if (p && !seenP.has(p[0]) && places.length < 2) { seenP.add(p[0]); places.push({ name: p[0], why: p[1].replace(/\{n\}/g, first) }); } }
    for (const k of weak) { const p = this.placeNeed[k]; if (p && !seenP.has(p[0]) && places.length < 3) { seenP.add(p[0]); places.push({ name: p[0], why: p[1].replace(/\{n\}/g, first) }); } }
    for (const p of [['A nature park or botanical garden', 'Time in nature lowers stress and gives easy chances to talk.'], ['The public library', 'Story sessions and choosing books build reading and confidence.']]) if (places.length < 3 && !seenP.has(p[0])) { seenP.add(p[0]); places.push({ name: p[0], why: p[1] }); }
    const acts = [];
    for (const k of weak) if (this.acts[k] && acts.length < 3) acts.push({ name: this.acts[k][0], why: this.acts[k][1].replace(/\{n\}/g, first) });
    if (foc && foc.score < .6 && acts.length < 3) acts.push({ name: 'Focus games together', why: 'Spot-the-difference, memory card games and jigsaw puzzles train attention in a fun way.' });
    if (acts.length < 3) acts.push({ name: 'A weekly family "no-screen" hour', why: 'Board games, cooking or a walk together build connection and calm.' });

    let marksTxt = null; const al = alignment(comb, marks);
    if (al) marksTxt = al.text + (al.trend ? ` Marks ${al.trend.change >= 0 ? 'went up' : 'went down'} by ${Math.abs(Math.round(al.trend.change * 100))} points since the last term.` : '') + (al.status === 'marks-higher' ? ` Make sure ${first} gets rest and hears that ${P.s} is valued beyond marks.` : al.status === 'marks-lower' ? ` A short weekly study plan and checking specific subject gaps with ${P.o} should help.` : '');

    return { summary: sumParts.join(' '), tags, teacher: T.slice(0, 6), parent: Pa.slice(0, 6), talk, books, places, activities: acts, marks: marksTxt };
  },

  fearTeacher: {
    'Speaking in front of class': 'Let {n} answer in pairs or small groups first, give questions in advance, and never force {o} to speak on the spot.',
    'Exams and tests': 'Explain the test format in advance, allow a short calm-breathing moment before starting, and talk about tests as practice, not judgement.',
    'Making mistakes': 'Make mistakes normal in class ("Favourite mistake of the day"). Mark effort and corrections, not only final answers.',
    'Being scolded': 'Correct {n} privately and calmly; explain what to do instead. A harsh public correction can make {o} shut down.',
    'New people': 'Introduce {n} to new classmates or teachers personally, and pair {o} with a familiar buddy at first.',
    'Losing friends': 'Watch friendship changes at break time and help {n} join new groups gently.'
  },
  fearParent: {
    'The dark': 'Use a soft night-light and a calm bedtime routine (story, chat, lights low). Play "torch games" to make the dark fun, and never tease {n} about it.',
    'Exams and tests': 'Make a simple revision timetable with breaks, praise effort, and avoid comparing marks. Do a "practice test" at home in a relaxed way.',
    'Speaking in front of class': 'Practise "show and tell" at home: {n} explains something to the family for 1 minute. Clap and praise. Grow it slowly to relatives or friends.',
    'Being alone': 'Keep routines predictable and tell {n} when you will be back. Short, safe practice times alone (in another room) build confidence.',
    'Making mistakes': 'Laugh at your own small mistakes and show how you fix them. Say "What did we learn?" instead of "Why did you do that?"',
    'Heights': 'Build up slowly at the playground: one step higher each visit, with you close by. Praise every brave try.',
    'Dogs or animals': 'Read animal books and watch calm animals from a distance first, then visit a petting zoo together. Never force contact.',
    'Insects': 'Explore a garden together with a magnifying glass; learning about insects often turns fear into curiosity.',
    'Loud noises': 'Warn {n} before loud events, keep ear muffs handy, and give {o} a quiet space to recover.',
    'Water / swimming': 'Start with fun water play in shallow water, then gentle lessons with a patient coach.',
    'New people': 'Arrange small, short meet-ups with one new child at a time, at home where {n} feels safe.',
    'Being scolded': 'Use a calm voice when correcting {n}, explain the reason, and end with a hug or kind word. Fear of scolding can stop children from telling you things.',
    'Getting hurt': 'Teach simple safety steps so {n} feels in control, and praise careful, brave tries in sport and play.',
    'Losing friends': 'Help {n} keep friendships going: playdates, calls, shared activities. Talk about how friendships change and that it is okay.'
  },
  books: {
    feelings: [{ title: 'The Color Monster', author: 'Anna Llenas', st: 'p', why: 'Helps {n} name and sort feelings.' }, { title: 'The Boy, the Mole, the Fox and the Horse', author: 'Charlie Mackesy', st: 'pms', why: 'Gentle messages about feelings, kindness and asking for help.' }],
    coping: [{ title: 'What to Do When You Worry Too Much', author: 'Dawn Huebner', st: 'pm', why: 'A child-friendly workbook to manage worry step by step.' }, { title: 'The Anxiety Workbook for Teens', author: 'Lisa M. Schab', st: 's', why: 'Practical exercises for stress and worry.' }, { title: 'What to Do When Your Temper Flares', author: 'Dawn Huebner', st: 'pm', why: 'Tools for calming anger.' }],
    resilience: [{ title: 'The Most Magnificent Thing', author: 'Ashley Spires', st: 'p', why: 'About frustration, failing and trying again.' }, { title: 'Your Fantastic Elastic Brain', author: 'JoAnn Deak', st: 'pm', why: 'Shows {n} that the brain grows through mistakes.' }, { title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', st: 'ms', why: 'A true story of hard work and bouncing back.' }],
    confidence: [{ title: 'The Dot', author: 'Peter H. Reynolds', st: 'p', why: 'Encourages {n} to make a mark and believe in themselves.' }, { title: 'Matilda', author: 'Roald Dahl', st: 'pm', why: 'A small child finding her voice and courage.' }, { title: 'I Am Malala (Young Readers Edition)', author: 'Malala Yousafzai', st: 'ms', why: 'Courage to speak up for what matters.' }],
    friendship: [{ title: 'Swami and Friends', author: 'R.K. Narayan', st: 'pms', why: 'Funny, warm stories of friendship and school life in India.' }, { title: 'The Recess Queen', author: 'Alexis O’Neill', st: 'p', why: 'How kindness changes a playground bully.' }],
    inclusion: [{ title: 'Wonder', author: 'R.J. Palacio', st: 'pms', why: 'Builds empathy and respect for differences.' }, { title: 'The Invisible Boy', author: 'Trudy Ludwig', st: 'p', why: 'Noticing and including quiet children.' }],
    communication: [{ title: 'Grandma’s Bag of Stories', author: 'Sudha Murty', st: 'pm', why: 'Stories to read and talk about together.' }, { title: 'The 7 Habits of Highly Effective Teens', author: 'Sean Covey', st: 's', why: 'Listening, understanding others and win-win thinking.' }],
    helpseeking: [{ title: 'The Invisible String', author: 'Patrice Karst', st: 'p', why: 'Reassures {n} that loved ones are always connected and reachable.' }, { title: 'The Boy, the Mole, the Fox and the Horse', author: 'Charlie Mackesy', st: 'ms', why: '"Asking for help is not giving up." A message worth repeating.' }],
    belonging: [{ title: 'Same, Same but Different', author: 'Jenny Sue Kostecki-Shaw', st: 'p', why: 'Friendship across cultures and feeling you belong.' }, { title: 'Wonder', author: 'R.J. Palacio', st: 'ms', why: 'About fitting in, being seen and finding your people.' }],
    habits: [{ title: 'The 7 Habits of Happy Kids', author: 'Sean Covey', st: 'p', why: 'Simple stories about routines and good choices.' }, { title: 'The 7 Habits of Highly Effective Teens', author: 'Sean Covey', st: 'ms', why: 'Planning, balance and self-management.' }],
    digital: [{ title: 'Chicken Clicking', author: 'Jeanne Willis', st: 'p', why: 'A funny story about online safety.' }, { title: 'The Technology Tail', author: 'Julia Cook', st: 'pm', why: 'About digital footprints and posting kindly.' }],
    decisions: [{ title: 'What Should Danny Do?', author: 'Ganit and Adir Levy', st: 'p', why: '{n} picks the choices and sees the results.' }, { title: 'How I Taught My Grandmother to Read', author: 'Sudha Murty', st: 'pms', why: 'Stories about values and good choices.' }]
  },
  places: {
    Space: ['A planetarium (e.g. Nehru Planetarium)', 'Feeds {n}’s love of space and sparks curiosity.'], Science: ['A science centre or museum', 'Hands-on exhibits build curiosity and confidence.'], Animals: ['A zoo or animal shelter visit', 'Caring for animals builds empathy and calm.'],
    Nature: ['A bird-watching walk or botanical garden', 'Nature time lowers stress.'], Drawing: ['An art gallery or kids’ art workshop', 'Lets {n} express feelings through art.'], Crafts: ['A craft fair or pottery class', 'Hands-on making is calming and builds pride.'],
    Music: ['A live music show or music class', 'Music is a great mood booster for {n}.'], Singing: ['A children’s choir or music class', 'Singing with others builds belonging.'], Dance: ['A dance class or cultural performance', 'Movement plus music releases stress.'],
    Cricket: ['A local sports club or stadium match', 'Team sport builds friendship and resilience.'], Football: ['A local football club', 'Team play builds friendship and handling wins and losses.'], Badminton: ['A badminton court with family', 'Active play together builds connection.'],
    Swimming: ['A swimming class', 'Great for energy, sleep and confidence.'], Reading: ['The public library’s story sessions', 'Builds reading, imagination and calm.'], Stories: ['A storytelling session or children’s theatre', 'Stories help {n} understand feelings.'],
    Coding: ['A robotics or coding club', 'Builds problem-solving with friends who share the interest.'], Chess: ['A chess club', 'Builds focus and patience.'], Acting: ['A children’s theatre workshop', 'Drama is a safe way to build confidence and voice.'],
    Cooking: ['A local market, then cook together at home', 'Planning and cooking builds independence.'], Cycling: ['A safe cycling track or park', 'Exercise outdoors improves mood and sleep.'], Photography: ['A heritage walk with a camera', 'Builds observation and calm attention.'], 'Lego & building': ['A science centre’s maker space', 'Building challenges grow persistence.'], 'Maths puzzles': ['A puzzle or board-game café', 'Fun thinking games with family.'], 'Video games': ['A science centre gaming / coding exhibit', 'Turns screen interest into creating, not just playing.']
  },
  placeNeed: {
    coping: ['A quiet park or garden for weekly walks', 'Regular calm time outdoors helps {n} manage stress.'], belonging: ['A hobby club or community group', 'A group with shared interests gives {n} a place to belong.'],
    friendship: ['A weekend group activity (sports, art or scouts)', 'Easy chances to make friends.'], confidence: ['A children’s theatre or public-speaking club', 'Safe practice speaking up.'],
    inclusion: ['Volunteering together (food drive, old-age home visit)', 'Builds empathy for others.'], habits: ['A morning sports or yoga class', 'Builds routine, sleep and energy.'], digital: ['Outdoor adventure park or trekking', 'Exciting offline fun to balance screen time.']
  },
  acts: {
    feelings: ['A feelings journal or drawing diary', '{n} writes or draws one feeling a day: it builds the habit of naming feelings.'],
    coping: ['Belly breathing or kids’ yoga, 5 minutes daily', 'Gives {n} a ready tool for stressful moments.'],
    resilience: ['A "try it" challenge each week', 'Something new and slightly hard (a recipe, a trick) teaches that practice works.'],
    confidence: ['Family "show and tell" nights', '{n} presents a hobby for 2 minutes; everyone claps.'],
    friendship: ['Team board games', 'Practise turn-taking, winning and losing kindly.'],
    inclusion: ['A kindness jar', 'Add a note each time someone in the family does something kind.'],
    communication: ['"Walk and talk" after dinner', 'Side-by-side walks make talking easier for children.'],
    helpseeking: ['A "trusted adults" hand drawing', '{n} traces a hand and writes a trusted adult on each finger.'],
    belonging: ['Joining a club or team', 'Being part of a group builds belonging.'],
    habits: ['A picture routine chart', 'Morning and bedtime steps on the wall make routines easy.'],
    digital: ['A family screen plan', 'Agree times, places and limits together and stick it on the fridge.'],
    decisions: ['Weekly goal card', 'One small goal, one step, checked on Sunday.']
  }
};
