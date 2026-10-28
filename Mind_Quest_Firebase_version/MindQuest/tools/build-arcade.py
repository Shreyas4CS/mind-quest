"""Builds js/arcade.js and css/arcade.css from the MindQuest v1 sources (the 50-mission single-file version).

Usage:  python3 tools/build-arcade.py <path to v1 source folder>
The v1 game code is wrapped in one function so its names never clash with the rest of the app,
and the v1 styles are scoped under .arcade so they only touch the game missions.
"""
import pathlib, re, sys

here = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else here.parent / 'psychometric-games' / 'source'
read = lambda f: (src / f).read_text()

def lines(f, a, b):
    return '\n'.join(read(f).splitlines()[a - 1:b])

shim = r'''
/* ---------- helpers the v1 games expect (taken from v1 app1.js / app2.js) ---------- */
let S = { seed: 1, cam: { enabled: false }, mic: { ok: true }, profile: { grade: 4 } };
let currentView = 'game';
''' + lines('app1.js', 4, 38) + '\n' + lines('app1.js', 55, 63) + '\n' + lines('app1.js', 64, 72) + '\n' + lines('app1.js', 74, 95) + r'''
const Confetti = { burst(n = 80) { try { confetti(Math.min(160, n)); } catch (e) { /* no confetti here */ } } };
const FX = { burst() {} };
const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
''' + lines('app2.js', 155, 160) + r'''
const toast = (m, ms) => window.toast(m, ms);
''' + lines('app2.js', 244, 287)

body = '\n'.join(read(f) for f in ['data.js', 'content/reading.js', 'content/audio.js', 'content/speech.js', 'content/misc.js', 'content2.js', 'media.js', 'games.js', 'games2.js'])
# v1 data.js points Picture Talk at images/gN/...; keep that folder layout next to quest.html

runner = r'''
/* ================================================================
   Runner: one mission inside a MindQuest v2 quest stage
   ================================================================ */
let done_ = null;
function finishLevel(res) {
  if (G.done) return; G.done = true;
  const q = G.q, rt = Math.round(performance.now() - G.t0); stopGame();
  const out = { game: q.type, key: q.key || null, name: GAME_INFO[q.type].name, measures: q.measures || null, correct: res.correct ?? null, score: res.score ?? null, rt,
    choice: res.choice ?? null, big5: res.big5 || null, ei: res.ei || null, extra: { ...G.extra, ...(res.extra || {}) } };
  if (out.extra && out.extra.transcript) out.extra.transcript = String(out.extra.transcript).slice(0, 1500);
  const card = $('#gameCard');
  let e, h, p;
  if (res.correct === true) { e = pick(Math.random, ['trophy', 'star', 'rocket', 'sparkle', 'gift']); h = pick(Math.random, ['Awesome!', 'Brilliant!', 'Super star!', 'You nailed it!', 'Fantastic!']); p = 'Great thinking!'; sfx.good(); Confetti.burst(70); }
  else if (res.correct === false) { e = pick(Math.random, ['clap', 'sun', 'heart']); h = pick(Math.random, ['Nice try!', 'Good effort!', 'Keep going!', 'Great thinking!']); p = 'Every explorer learns something new.'; sfx.soft(); }
  else { e = 'compass'; h = 'Great choice!'; p = 'There are no wrong answers here.'; sfx.good(); }
  if (card) card.append(el('div', { class: 'feedback' }, el('div', {}, el('span', { class: 'fb-e' }, ico(e)), el('h3', {}, h), el('p', {}, p))));
  const fin = done_; done_ = null;
  setTimeout(() => fin && fin(out), 1500);
}
const KINDS = { speak: ['letter', 'category', 'answer'], quick: ['facts', 'symbols'], path: ['p1', 'p2', 'p3', 'p4', 'p5'] };
window.Arcade = {
  INFO: GAME_INFO, ABILITIES, BIG5, BIG5_ALL, MEASURE_TXT, KINDS,
  measures: measuresOf, measureTxt,
  /* m = { game, key, n }: which game, which variant, and which time it is played (new content each time) */
  run(m, grade, stage, ctx = {}) {
    return new Promise(res => {
      stopGame(); done_ = res;
      const g = clamp(+grade || 4, 4, 9), T = THEMES[g], d = g - 4;
      S = { seed: ctx.seed || 1, cam: { enabled: !!(window.V && V.on) }, mic: ctx.mic || { ok: true }, profile: { grade: g } };
      muted = !!(window.Voice && Voice.muted);
      const slot = { type: m.game, n: m.n || 0, key: m.key || null, kind: m.key || null };
      const r = mulberry32((S.seed ^ (g * 7919)) + (ctx.i || 0) * 104729 + (m.n || 0) * 31);
      const q = BUILD[m.game](T, d, r, slot);
      Object.assign(q, { type: m.game, measures: measuresOf(m.game, m.key), key: m.key || null, n: m.n || 0, i: ctx.i || 0, level: GAME_INFO[m.game].name, T });
      G.q = q; G.done = false; G.extra = {}; G.recent = []; G.active = true;
      const gi = GAME_INFO[m.game];
      stage.innerHTML = '';
      const wrap = el('div', { class: 'arcade', 'data-world': T.key, style: `--w-accent:${T.accent};--w-accent2:${T.accent2};--w-bg1:${T.bg1};--w-bg2:${T.bg2}` },
        el('div', { class: 'game-card', id: 'gameCard' },
          el('div', { class: 'g-top' }, el('span', { class: 'g-badge' }, `${gi.icon} ${gi.name}`), el('span', { class: 'g-badge g-measure' }, `${ico('chart')} ${measureTxt(m.game, m.key)}`),
            el('span', { class: 'g-timer', id: 'gTimer', hidden: true }, ico('timer'), el('b', { id: 'gTimerTxt' }, '0.0s'))),
          el('div', { class: 'g-q' }, el('h2', { class: 'g-prompt', id: 'gPrompt' }, q.prompt), el('button', { class: 'say-btn', id: 'readBtn', type: 'button', 'aria-label': 'Read aloud', onclick: () => speak(G.q.prompt + (G.q.readExtra ? '. ' + G.q.readExtra : ''), { force: true }) }, ico('sound'))),
          el('p', { class: 'g-sub', id: 'gSub' }, q.sub || ''),
          el('div', { class: 'g-stage', id: 'gStage' })));
      stage.append(wrap);
      G.t0 = performance.now();
      if (ctx.say !== false) speak(q.prompt + (q.sub ? '. ' + q.sub : ''));
      RENDER[m.game](q, $('#gStage'));
    });
  },
  stop() { stopGame(); },
  /* the weekly plan: every game type once, with the variant rotating week by week */
  plan(week) {
    const w = Math.max(1, week) - 1, n = w;
    const k = (t) => KINDS[t][w % KINDS[t].length];
    return ['count', 'listenPick', 'pattern', 'path', 'simon', 'emotion', 'spot', 'math', 'flash', 'beeps', 'tapOrder', 'riddle', 'catch', 'reading', 'audio', 'describe', 'speak', 'fingers', 'quick']
      .map(t => ({ game: t, key: KINDS[t] ? k(t) : null, n }));
  }
};
window.Hands = Hands;
})();
'''

js = '\n'.join(['/* ================================================================',
    '   MindQuest game missions: every game type from MindQuest v1 (the 50-mission version).',
    '   GENERATED by tools/build-arcade.py from the v1 sources. Edit those and rebuild.',
    '   Wrapped in one function so the names never clash with the rest of the app.',
    '   ================================================================ */',
    '(function () {', shim, body, runner])
# the runner closes the function: drop its own wrapper lines
js = js.replace("window.Hands = Hands;\n})();\n", "window.Hands = Hands;\n})();\n")
(here / 'js' / 'arcade.js').write_text(js)

# ---------- styles: scope every v1 rule under .arcade ----------
css = read('style.css')
def scope(sel):
    out = []
    for s in sel.split(','):
        s = s.strip()
        if not s: continue
        if s.startswith(('from', 'to')) or re.match(r'^\d+%', s): out.append(s); continue
        s = re.sub(r'^(html|body|:root)\b', '', s).strip()
        out.append('.arcade' + (' ' + s if s else ''))
    return ', '.join(out)

def walk(text):
    res, i = [], 0
    while i < len(text):
        j = text.find('{', i)
        if j < 0: res.append(text[i:]); break
        head = text[i:j]
        # comments before the selector
        m = re.match(r'(\s*(?:/\*.*?\*/\s*)*)(.*)$', head, re.S)
        pre, sel = m.group(1), m.group(2).strip()
        depth, k = 1, j + 1
        while depth and k < len(text):
            if text[k] == '{': depth += 1
            elif text[k] == '}': depth -= 1
            k += 1
        inner = text[j + 1:k - 1]
        if sel.startswith('@media') or sel.startswith('@supports'):
            res.append(pre + sel + ' {' + walk(inner) + '}')
        elif sel.startswith('@'):
            res.append(pre + sel + ' {' + inner + '}')
        else:
            res.append(pre + scope(sel) + ' {' + inner + '}')
        i = k
    return ''.join(res)

out = walk(re.sub(r'/\*.*?\*/', '', css, flags=re.S))
# keyframes are global: give the v1 ones their own names so they never replace the app's
names = sorted(set(re.findall(r'@keyframes\s+([\w-]+)', out)), key=len, reverse=True)
out = re.sub(r'@keyframes\s+([\w-]+)', lambda m: '@keyframes a-' + m.group(1), out)
def ren(m):
    v = m.group(2)
    for n in names: v = re.sub(r'(?<![\w-])' + re.escape(n) + r'(?![\w-])', 'a-' + n, v)
    return m.group(1) + v
out = re.sub(r'(animation(?:-name)?\s*:)([^;}]+)', ren, out)
(here / 'css' / 'arcade.css').write_text('/* Styles of the game missions, from MindQuest v1, scoped under .arcade. GENERATED by tools/build-arcade.py */\n' + out)
print('ok', len(js), len(out))
