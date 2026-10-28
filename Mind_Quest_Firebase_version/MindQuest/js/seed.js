/* ================================================================
   Demo data (demo mode only, and setup.html can copy it into Firebase):
   the shared Teacher & Parent account and four made-up children with
   finished weeks, so the dashboards and reports have something to show.
   ================================================================ */
const MQSeed = {
  STAFF: { username: 'teacher.demo', password: 'CognoSpace@2026' },
  KIDS: [
    { username: 'riya.demo', password: 'Riya@2026', name: 'Riya Sharma', age: 10, grade: 5, section: 'B', gender: 'girl', avatar: '🦊', likes: ['Drawing', 'Dance', 'Animals', 'Stories'], hobbies: 'I draw cartoons of my cat and dance to Bollywood songs', favSubject: 'Art', dream: 'an animal doctor', scary: ['Speaking in front of class', 'Exams and tests'], weeks: 3, ab: { Gf: .62, Gc: .7, Gq: .42, Gwm: .6, Gv: .88, Ga: .66, Gs: .58, EF: .7, Grw: .64, Gr: .74 }, b5: { O: 2.6, C: 2, E: .9, A: 2.7, S: 1.1 }, ei: [.9, .5],
      t: { feelings: 3.4, coping: 2.1, resilience: 2.4, confidence: 1.9, friendship: 3.6, inclusion: 3.7, communication: 2.8, helpseeking: 2.6, belonging: 2.7, habits: 3.1, digital: 3.2, decisions: 3 }, focus: .78, span: 5, moods: ['fearful', 'happy', 'neutral', 'happy', 'sad', 'neutral'], checkin: ['comfortable', 'worried', 'worried'], cam: true,
      words: { day: 'It was okay. We had a drawing class and I made a parrot', like: 'I like drawing because I can make anything I want', proud: 'I won second prize in the drawing competition', school: 'The best part is art class. The hard part is when ma’am asks me to read aloud, I get scared', friend: 'Ananya is my best friend, we draw together at break', fight: 'We fought about who will be the leader for the chart project. We did not talk for one day', kind: 'Ananya shared her colours when I forgot mine', alone: 'Sometimes when they play kabaddi, I just sit and draw', worry: 'I get very worried before maths tests and my stomach hurts', helps: 'Hugging my cat and drawing', mistake: 'I got low marks in maths, I cried and hid the paper', trust: 'My mummy', proudv: 'My drawing of a tiger is on the class wall', person: 'Rekha ma’am because she is kind', goodfriend: 'Someone who shares and does not laugh at you', kindact: 'I helped a new girl find the library', whathelps: 'Drawing and talking to my mummy', tryagain: 'Skipping rope, I kept practising and now I can do 50' },
      marks: [{ term: 'Unit Test 1', d: -80, s: { English: 71, Hindi: 78, Mathematics: 52, Science: 66, 'Social Science': 70, Computer: 80 } }, { term: 'Half Yearly', d: -15, s: { English: 74, Hindi: 80, Mathematics: 48, Science: 69, 'Social Science': 72, Computer: 84 } }] },
    { username: 'aarav.demo', password: 'Demo@2026', name: 'Aarav Mehta', age: 12, grade: 7, section: 'A', gender: 'boy', avatar: '🚀', likes: ['Cricket', 'Video games', 'Coding'], hobbies: 'Cricket in the evening and Minecraft', favSubject: 'Computer', dream: 'a game developer', scary: ['Being scolded'], weeks: 2, ab: { Gf: .78, Gc: .5, Gq: .55, Gwm: .55, Gv: .7, Ga: .45, Gs: .86, EF: .42, Grw: .4, Gr: .55 }, b5: { O: 2.2, C: 1, E: 2.6, A: 1.8, S: 2 }, ei: [.6, .6],
      t: { feelings: 2.6, coping: 2.5, resilience: 3, confidence: 3.3, friendship: 3.5, inclusion: 3, communication: 2.4, helpseeking: 2.3, belonging: 3.4, habits: 1.8, digital: 1.7, decisions: 2.3 }, focus: .5, span: 4, moods: ['sleepy', 'happy', 'neutral', 'happy'], checkin: ['comfortable', 'comfortable'], cam: false,
      words: { day: 'Good, we played cricket in PT', like: 'Cricket is fun, I am the best bowler in my class', proud: 'I made my own game in Scratch', school: 'PT and computer class. Hindi is hard', friend: 'Rohan and Dev, we play cricket and online games', fight: 'Dev said I was out but I was not. We argued but then we played again', kind: 'Rohan gave me his bat when mine broke', alone: 'Not really', routine: 'I play cricket, then I play games on the phone till late', screen: 'Maybe 5 hours, games and YouTube', sleep: '12 o clock, I feel sleepy in the morning', goal: 'I want to get better at Hindi. Maybe read one page daily', goodfriend: 'Someone who is fun and helps you', kindact: 'I taught my cousin how to bowl', strength: 'I am good at solving problems in coding' },
      marks: [{ term: 'Half Yearly', d: -20, s: { English: 52, Hindi: 34, Mathematics: 41, Science: 44, 'Social Science': 38, Computer: 78 } }] },
    { username: 'meera.demo', password: 'Demo@2026', name: 'Meera Iyer', age: 14, grade: 9, section: 'C', gender: 'girl', avatar: '🦉', likes: ['Reading', 'Music', 'Science', 'Chess'], hobbies: 'Reading mystery novels and playing the veena', favSubject: 'Science', dream: 'a doctor', scary: ['Exams and tests', 'Making mistakes'], weeks: 4, ab: { Gf: .9, Gc: .88, Gq: .84, Gwm: .9, Gv: .78, Ga: .72, Gs: .7, EF: .9, Grw: .92, Gr: .66 }, b5: { O: 2.7, C: 2.9, E: 1.2, A: 2.2, S: .7 }, ei: [1, .4],
      t: { feelings: 3, coping: 1.7, resilience: 2, confidence: 2.2, friendship: 3, inclusion: 3.6, communication: 3.2, helpseeking: 2.2, belonging: 2.8, habits: 2, digital: 3.5, decisions: 3.6 }, focus: .9, span: 7, moods: ['fearful', 'neutral', 'sleepy', 'neutral', 'fearful', 'fearful', 'neutral', 'happy'], checkin: ['worried', 'comfortable', 'worried', 'worried'], cam: true, heart: true,
      words: { day: 'Tiring, we had two tests and coaching after school', like: 'Reading helps me escape, I love mystery books', proud: 'I topped the science olympiad in school', school: 'I like my teachers but the pressure of board exams next year is too much', worry: 'Marks. If I get less than 95 everyone will be disappointed', helps: 'Music, playing the veena for some time', mistake: 'I got 82 in maths and could not sleep that night, I studied till 2 am', trust: 'My elder sister', whathelps: 'Music and talking to my sister', tryagain: 'Chess openings, I lost many games before I won the inter-school match', routine: 'School, coaching, homework, then sleep', screen: 'About 1 hour', sleep: 'Around 12:30, I wake up tired', goal: 'I want to sleep by 11 and stop comparing myself with others', strength: 'I am hard working and patient' },
      marks: [{ term: 'Unit Test 1', d: -90, s: { English: 92, Hindi: 88, Mathematics: 85, Science: 96, 'Social Science': 90, Computer: 94 } }, { term: 'Half Yearly', d: -12, s: { English: 94, Hindi: 90, Mathematics: 82, Science: 97, 'Social Science': 91, Computer: 95 } }] },
    { username: 'kabir.demo', password: 'Demo@2026', name: 'Kabir Singh', age: 9, grade: 4, section: 'A', gender: 'boy', avatar: '🐯', likes: ['Football', 'Space', 'Lego & building'], hobbies: 'Making Lego rockets', favSubject: 'Science', dream: 'an astronaut', scary: ['The dark', 'Being alone'], weeks: 1, ab: { Gf: .6, Gc: .45, Gq: .55, Gwm: .5, Gv: .66, Ga: .5, Gs: .62, EF: .5, Grw: .38, Gr: .35 }, b5: { O: 2.4, C: 1.4, E: 1.2, A: 1.6, S: .9 }, ei: [.4, .3],
      t: { feelings: 2, coping: 1.9, resilience: 2.6, confidence: 2.4, friendship: 2.2, inclusion: 2.8, communication: 2.2, helpseeking: 1.8, belonging: 1.6, habits: 2.8, digital: 3, decisions: 2.6 }, focus: .6, span: 4, moods: ['sad', 'sad'], checkin: ['talk'], cam: false,
      words: { day: 'Bad', like: 'Lego, I make rockets', proud: 'I dont know', school: 'Football. Some boys say I cannot play with them', proudv: 'nothing', person: 'nobody' } }
  ],

  rng: 1, rand() { this.rng = (this.rng * 16807) % 2147483647; return (this.rng - 1) / 2147483646; },
  pickOpt(opts, t) { let best = opts[0], bd = 9; for (const o of opts) { const d = Math.abs(o.s - (t + (this.rand() - .5) * 1.6)); if (d < bd) { bd = d; best = o; } } return best; },

  /* builds finished week documents for one child, using the real quest content */
  weeks(k) {
    const out = [], now = Date.now();
    for (let n = 1; n <= k.weeks; n++) {
      const cnt = weekContent(n, k.grade), start = now - (k.weeks - n + 1) * 7 * 864e5 + 3600e3 * 15, answers = [];
      let t = start, mi = (n - 1) * 2;
      for (const it of cnt.items) {
        const ms = (itemEst(it) * (0.75 + this.rand() * .6)) * 1000, a = { id: it.id, type: it.type, domain: it.domain || null, ms: Math.round(ms), idleMs: this.rand() < .15 ? 30000 + Math.round(this.rand() * 40000) : 0, at: (t += ms + 4000) };
        const tg = d => k.t[d] || 2.5;
        if (it.type === 'scenario') { const o = this.pickOpt(it.opts, tg(it.domain)); Object.assign(a, { s: o.s, choice: o.t, rt: Math.round(6000 + this.rand() * 14000) }); }
        if (it.type === 'rate') { const want = it.reverse ? 5 - tg(it.domain) : tg(it.domain), o = this.pickOpt(RATE_OPTS, want); Object.assign(a, { s: it.reverse ? 5 - o.s : o.s, choice: o.t }); }
        if (it.type === 'story') a.stops = it.scenes.filter(s => s.stop).map(s => { const o = this.pickOpt(s.stop.opts, tg(s.stop.domain)); return { q: s.stop.q, domain: s.stop.domain, s: o.s, choice: o.t, rt: 7000 }; });
        if (it.type === 'chat') a.turns = it.turns.map(tu => ({ key: tu.key, domain: tu.domain, q: tu.say.replace('{name}', k.name.split(' ')[0]).replace('{like}', (k.likes[0] || '').toLowerCase()), text: k.words[tu.key] || 'I am not sure', spoken: this.rand() < .6, ms: 40000 }));
        if (it.type === 'voice') { const w = k.words[it.key + 'v'] || k.words[it.key] || ''; Object.assign(a, { key: it.key, q: it.text, text: w, spoken: true, skipped: !w }); }
        if (it.type === 'mood') Object.assign(a, { mood: k.moods[mi++ % k.moods.length], intensity: 2, when: it.when });
        if (it.type === 'checkin') { const f = k.checkin[(n - 1) % k.checkin.length]; Object.assign(a, { feel: f, want: f === 'talk' ? 'yes' : f === 'worried' ? 'unsure' : 'no' }); }
        if (it.type === 'focus') { const go = Math.round((32 + it.level * 4) * .72), nogo = 32 + it.level * 4 - go, hits = Math.round(go * clamp(k.focus + (this.rand() - .5) * .1, .3, 1)); Object.assign(a, { go, nogo, hits, misses: go - hits, falseTaps: Math.round(nogo * clamp(1 - k.focus - .05, 0, 1) * .8), rtMean: Math.round(620 - k.focus * 200), rtSd: Math.round(200 - k.focus * 110), level: it.level }); }
        if (it.type === 'memory') Object.assign(a, { span: clamp(k.span + (this.rand() < .3 ? -1 : 0), 2, 9), rounds: 6 });
        if (it.type === 'breathe') Object.assign(a, { breaths: 3 });
        if (it.type === 'game') Object.assign(a, this.game(k, it.game, ms));
        if (k.cam) { const stressy = k.t.coping < 2.2; a.cam = { n: Math.round(ms / 500), emo: { neutral: Math.round(ms / 500 * .55), happy: Math.round(ms / 500 * (stressy ? .12 : .3)), fearful: Math.round(ms / 500 * (stressy ? .14 : .03)), sad: Math.round(ms / 500 * (stressy ? .08 : .04)), surprised: Math.round(ms / 500 * .04) }, gaze: { center: Math.round(ms / 500 * (.7 + k.focus * .2)), left: Math.round(ms / 500 * .05), down: Math.round(ms / 500 * .06), away: Math.round(ms / 500 * .04) } }; }
        answers.push(a);
      }
      const active = answers.reduce((s, a) => s + a.ms, 0);
      out.push({ week: n, title: cnt.title, status: 'done', idx: cnt.items.length, answers, startedAt: start, completedAt: t, sittings: k.focus < .6 ? 2 : 1,
        timing: { activeMs: Math.round(active), idleMs: answers.reduce((s, a) => s + a.idleMs, 0), hiddenMs: k.focus < .6 ? 140000 : 20000, pausedMs: 60000, longestStreakMs: Math.round(active * (k.focus < .6 ? .22 : k.focus > .85 ? .75 : .45)), sittings: k.focus < .6 ? 2 : 1 },
        camUsed: !!k.cam, heart: k.heart ? this.heart(k, answers, n) : null });
    }
    return out;
  },
  /* one game mission: a score near the child's ability for what the game measures */
  game(k, gm, ms) {
    const G = GAMES[gm.game], m = G.m, r = () => this.rand();
    const lv = m ? Object.entries(m).reduce((s, [a, w]) => s + (k.ab[a] || .6) * w, 0) / Object.values(m).reduce((s, w) => s + w, 0) : .6;
    const score = Math.round(clamp(lv + (r() - .5) * .3, 0, 1) * 100) / 100, rt = Math.round(ms * (.6 + r() * .3));
    const a = { game: gm.game, key: gm.key || null, name: G.name, measures: m, score, correct: score >= .6, rt, extra: {} };
    if (gm.game === 'path') { a.correct = null; a.score = null; a.big5 = Object.keys(k.b5).map(t => ({ t, v: clamp(Math.round(k.b5[t] + (r() - .5) * 1.2), 0, 3) })); }
    if (gm.game === 'emotion') { const u = r() < k.ei[0] ? 1 : 0, mm = r() < k.ei[1] ? 1 : 0; Object.assign(a, { ei: { u, m: mm }, correct: !!(u && mm), score: (u + mm) / 2 }); }
    if (gm.game === 'audio') a.extra = { plays: r() < .5 ? 1 : 2, lookPct: k.cam ? .6 + r() * .35 : null };
    if (gm.game === 'reading') a.extra = { wpm: Math.round(70 + k.age * 8 + r() * 30), lookbacks: Math.round(r() * 3) };
    if (gm.game === 'describe') { const w = Math.round(8 + (k.ab.Gr || .5) * 30 + r() * 6); a.extra = { words: w, hits: Array.from({ length: Math.round(2 + (k.ab.Gr || .5) * 8) }, (_, i) => 'detail ' + (i + 1)), mode: r() < .6 ? 'voice' : 'type', transcript: k.words.like ? `I can see ${k.words.like.toLowerCase().split(' ').slice(0, 10).join(' ')} and people playing near a tree` : '' }; a.correct = a.extra.hits.length >= 5; }
    if (gm.game === 'speak') { const c = Math.round(3 + (k.ab.Gr || .5) * 9); a.extra = { count: c, target: 8, valid: [], transcript: '' }; }
    if (gm.game === 'quick') a.extra = { acc: score, meanRt: Math.round(1900 - (k.ab.Gs || .6) * 900), bestStreak: Math.round(2 + score * 8) };
    if (gm.game === 'fingers') a.extra = { hands: k.cam ? 3 : 0, answers: [1, 2, 3, 4] };
    if (gm.game === 'catch') a.extra = { phaseAccuracy: [clamp(score + .1, 0, 1), clamp(score - (k.ab.EF < .6 ? .25 : .05), 0, 1)] };
    return a;
  },
  /* the heart sensor's week summary, shaped like Heart.summary() makes it */
  heart(k, answers, n) {
    const calm = 82, trace = [], items = [], ev = [], rr = [];
    answers.forEach((a, i) => {
      const secs = Math.max(3, Math.round(a.ms / 1000)), bump = a.type === 'breathe' ? -3 : a.type === 'game' ? 4 + (a.game.length * 3) % 13 + (a.correct === false ? 4 : 0) : a.type === 'chat' ? 9 : 6;
      for (let s = 0; s < secs; s++) { const after = trace.length - (ev.length ? ev[ev.length - 1][0] : -99); const wrongBump = ev.length && !ev[ev.length - 1][1] && after < 9 ? 9 : 0; trace.push(Math.round(calm + bump + wrongBump + n + Math.sin(trace.length / 7) * 3 + (this.rand() - .5) * 4)); items.push(i); }
      if (a.type === 'game' && a.correct != null) ev.push([trace.length, a.correct ? 1 : 0]);
    });
    const step = Math.max(1, Math.ceil(trace.length / 360)), tr = [], it = []; for (let x = 0; x < trace.length; x += step) { tr.push(trace[x]); it.push(items[x]); }
    const byType = {}, per = {}; answers.forEach((a, i) => { const v = trace.filter((_, x) => items[x] === i); if (!v.length) return; const key = a.type === 'game' ? a.game : a.type; per[i] = Math.round(mean(v)); (byType[key] = byType[key] || []).push(...v); });
    for (const key in byType) byType[key] = Math.round(mean(byType[key]));
    const react = c => { const d = ev.filter(e => e[1] === c).map(([at]) => Math.max(...trace.slice(at + 2, at + 9)) - mean(trace.slice(at - 5, at))); return d.length >= 2 ? { bpm: Math.round(mean(d)), n: d.length } : null; };
    const strip = Array.from({ length: 250 }, (_, x) => Math.round(128 + 70 * Math.exp(-(((x % 37) - 6) ** 2) / 10) + 25 * Math.exp(-(((x % 37) - 15) ** 2) / 18)));
    return { avg: Math.round(mean(trace)), min: Math.min(...trace), max: Math.max(...trace), calm, byType, hrv: 38 - n * 2, spo2: 98, spo2Low: 96, secs: trace.length,
      trace: tr, traceStep: step, traceItems: it, perItem: per, ev: ev.map(([at, c]) => ({ at: Math.floor(at / step), ok: c })), wrong: react(0), right: react(1), strip };
  },
  profile(k) { const p = { ...k }; ['password', 'weeks', 't', 'focus', 'span', 'moods', 'checkin', 'cam', 'heart', 'words', 'marks', 'ab', 'b5', 'ei'].forEach(x => delete p[x]); return { ...p, school: MQ_CONFIG.school.name, profileDone: true, createdAt: Date.now() - 40 * 864e5 }; },
  marks(k) { return (k.marks || []).map(m => ({ term: m.term, date: Date.now() + m.d * 864e5, subjects: Object.fromEntries(Object.entries(m.s).map(([s, v]) => [s, { got: v, max: 100 }])), by: 'teacher.demo', at: Date.now() })); },

  /* demo mode: fill the browser store */
  async local(S) {
    this.rng = 7;
    const sid = 'staff_demo'; S.db.users[sid] = { username: this.STAFF.username, role: 'staff', pw: await S.hash(this.STAFF.password), createdAt: Date.now() };
    for (const k of this.KIDS) {
      const uid = 'kid_' + k.username.split('.')[0];
      S.db.users[uid] = { username: k.username, role: 'child', pw: await S.hash(k.password), createdAt: Date.now() };
      S.db.children[uid] = this.profile(k);
      S.db.weeks[uid] = {}; for (const w of this.weeks(k)) S.db.weeks[uid]['w' + w.week] = S.check(w);
      S.db.marks[uid] = {}; this.marks(k).forEach((m, i) => { S.db.marks[uid]['t' + i] = m; });
    }
    S.db.notes.kid_riya = { observations: 'Kind and helpful with classmates; lovely artwork. Quiet in whole-class discussions.', parentInput: 'Worries a lot before maths tests; has stomach aches on test days.', updatedAt: Date.now() - 864e5 };
  }
};
