/* ================================================================
   Story videos: animated cartoon scenes drawn in SVG, narrated by the app's voice,
   with subtitles, a progress bar, and automatic pauses where the child answers a question.
   (No video files needed. To use a real video instead, see SETUP.md > "Your own videos".)
   ================================================================ */
const SKINS = ['#F2C7A5', '#E0AC86', '#C68A62', '#A86F4C'];
const HAIR = ['#2E2D30', '#4A3426', '#1F1A17', '#6B4423'];

function faceParts(mood) {
  const eye = (x, y) => {
    if (mood === 'wow') return `<path d="M${x - 5} ${y + 1}q5 -6 10 0" stroke="#2E2D30" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    if (mood === 'sleepy') return `<path d="M${x - 5} ${y}h10" stroke="#2E2D30" stroke-width="2.6" stroke-linecap="round"/>`;
    if (mood === 'fearful' || mood === 'surprised') return `<circle cx="${x}" cy="${y}" r="4.6" fill="#fff" stroke="#2E2D30" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#2E2D30"/>`;
    return `<circle cx="${x}" cy="${y}" r="3.2" fill="#2E2D30"/>`;
  };
  const mouths = {
    happy: '<path d="M-9 14q9 9 18 0" stroke="#2E2D30" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    wow: '<path d="M-10 12q10 14 20 0z" fill="#B5354A" stroke="#2E2D30" stroke-width="2.2" stroke-linejoin="round"/>',
    neutral: '<path d="M-7 15h14" stroke="#2E2D30" stroke-width="2.6" stroke-linecap="round"/>',
    sad: '<path d="M-8 18q8 -8 16 0" stroke="#2E2D30" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    angry: '<path d="M-8 18q8 -6 16 0" stroke="#2E2D30" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    fearful: '<path d="M-9 16q3 -3 6 0t6 0t6 0" stroke="#2E2D30" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    surprised: '<ellipse cx="0" cy="15" rx="4.5" ry="5.5" fill="#B5354A" stroke="#2E2D30" stroke-width="2"/>',
    sleepy: '<path d="M-4 15h8" stroke="#2E2D30" stroke-width="2.4" stroke-linecap="round"/>'
  };
  const brows = mood === 'angry' ? '<path d="M-15 -8l9 4M15 -8l-9 4" stroke="#2E2D30" stroke-width="2.6" stroke-linecap="round"/>'
    : mood === 'sad' || mood === 'fearful' ? '<path d="M-15 -4l9 -4M15 -4l-9 -4" stroke="#2E2D30" stroke-width="2.4" stroke-linecap="round"/>'
    : mood === 'surprised' ? '<path d="M-15 -11q5 -4 10 0M5 -11q5 -4 10 0" stroke="#2E2D30" stroke-width="2.4" fill="none" stroke-linecap="round"/>' : '';
  const extra = mood === 'fearful' ? '<path d="M22 -6q4 6 0 9q-4 -3 0 -9z" fill="#7CC4FF"/>' : mood === 'sleepy' ? '<text x="20" y="-18" font-size="16" font-weight="800" fill="#4D96FF" font-family="Baloo 2, sans-serif">z z</text>' : mood === 'angry' ? '<path d="M18 -22l4 4M24 -20l-2 6" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round"/>' : '';
  const blush = mood === 'happy' || mood === 'wow' ? '<circle cx="-14" cy="9" r="4" fill="#FF8FA3" opacity=".5"/><circle cx="14" cy="9" r="4" fill="#FF8FA3" opacity=".5"/>' : '';
  return eye(-8, 2) + eye(8, 2) + brows + (mouths[mood] || mouths.neutral) + blush + extra;
}
function kidSvg(ch, i) {
  const h = hashStr(ch.n), skin = SKINS[h % SKINS.length], hair = HAIR[(h >> 3) % HAIR.length], long = (h >> 5) % 2 === 0, sc = ch.adult ? 1.22 : 1;
  const mood = ch.mood || 'neutral', anim = mood === 'happy' || mood === 'wow' ? 'bounce' : mood === 'sad' || mood === 'sleepy' ? 'droop' : mood === 'fearful' ? 'shake' : 'sway';
  return `<g class="kid" style="--x:${ch.x}px;--d:${i * .18}s" transform="translate(${ch.x} 300)">
    <g class="kid-in ${anim}"><g transform="scale(${sc})">
      <ellipse cx="0" cy="2" rx="34" ry="7" fill="rgba(0,0,0,.12)"/>
      <rect x="-14" y="-40" width="11" height="40" rx="5" fill="#414042"/><rect x="3" y="-40" width="11" height="40" rx="5" fill="#414042"/>
      <path d="M-30 -42q0 -50 30 -50t30 50z" fill="${ch.c}" stroke="#2E2D30" stroke-width="2.5"/>
      <path class="arm-l" d="M-27 -80q-16 18 -12 38" stroke="${ch.c}" stroke-width="11" fill="none" stroke-linecap="round"/><path class="arm-r" d="M27 -80q16 18 12 38" stroke="${ch.c}" stroke-width="11" fill="none" stroke-linecap="round"/>
      <circle cx="-38" cy="-40" r="6" fill="${skin}"/><circle cx="38" cy="-40" r="6" fill="${skin}"/>
      <g transform="translate(0 -122)">
        ${long ? `<path d="M-30 -2q-4 40 6 46h48q10 -6 6 -46z" fill="${hair}"/>` : ''}
        <circle r="30" fill="${skin}" stroke="#2E2D30" stroke-width="2.5"/>
        <path d="M-31 -4q2 -32 31 -32t31 32q-12 -14 -31 -16q-19 2 -31 16z" fill="${hair}"/>
        ${ch.adult ? '<path d="M-14 -2h10M4 -2h10" stroke="#2E2D30" stroke-width="1.6"/><circle cx="-9" cy="2" r="7" fill="none" stroke="#2E2D30" stroke-width="1.8"/><circle cx="9" cy="2" r="7" fill="none" stroke="#2E2D30" stroke-width="1.8"/>' : ''}
        ${faceParts(mood)}
      </g>
    </g></g>
    <g transform="translate(0 30)"><rect x="-${ch.n.length * 4.6 + 12}" y="-13" width="${ch.n.length * 9.2 + 24}" height="24" rx="12" fill="#fff" stroke="${ch.c}" stroke-width="2.5"/><text text-anchor="middle" y="4" font-size="13" font-weight="800" fill="#2E2D30" font-family="Poppins, sans-serif">${esc(ch.n)}</text></g>
  </g>`;
}
const BGS = {
  class: () => `<rect width="640" height="360" fill="#FFF4E0"/><rect x="0" y="270" width="640" height="90" fill="#E8C79A"/><rect x="150" y="40" width="340" height="140" rx="8" fill="#2F6B4F" stroke="#8B5E34" stroke-width="10"/><path d="M180 80h120M180 105h180M180 130h90" stroke="#E6F2EA" stroke-width="4" stroke-linecap="round" opacity=".8"/><circle cx="420" cy="110" r="22" fill="none" stroke="#FFE08A" stroke-width="4"/><rect x="40" y="60" width="70" height="90" rx="6" fill="#BFE3FF" stroke="#8B5E34" stroke-width="6"/><rect x="540" y="60" width="70" height="90" rx="6" fill="#BFE3FF" stroke="#8B5E34" stroke-width="6"/><circle cx="575" cy="34" r="16" fill="#fff" stroke="#414042" stroke-width="3"/><path d="M575 26v8l6 4" stroke="#414042" stroke-width="2.5" fill="none"/>`,
  home: () => `<rect width="640" height="360" fill="#FDE7EF"/><rect x="0" y="275" width="640" height="85" fill="#D9B48F"/><rect x="420" y="50" width="150" height="120" rx="10" fill="#BDE4FF" stroke="#fff" stroke-width="10"/><circle cx="530" cy="90" r="18" fill="#FFD43B"/><path d="M420 110h150M495 50v120" stroke="#fff" stroke-width="6"/><rect x="40" y="190" width="200" height="85" rx="22" fill="#9B5DE5" opacity=".75"/><rect x="40" y="170" width="200" height="40" rx="18" fill="#B794F4"/><path d="M90 60v70" stroke="#414042" stroke-width="4"/><path d="M68 60h44l-10 -28h-24z" fill="#FFC93C" stroke="#414042" stroke-width="3"/>`,
  park: () => `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD3FF"/><stop offset="1" stop-color="#E8F7FF"/></linearGradient></defs><rect width="640" height="360" fill="url(#sky)"/><circle cx="560" cy="62" r="34" fill="#FFD43B"/><g class="cloud"><ellipse cx="140" cy="70" rx="46" ry="18" fill="#fff"/><ellipse cx="170" cy="58" rx="30" ry="18" fill="#fff"/></g><rect x="0" y="260" width="640" height="100" fill="#7BCB6A"/><rect x="58" y="140" width="22" height="130" fill="#8B5E34"/><circle cx="69" cy="130" r="56" fill="#3FA34D"/><circle cx="40" cy="160" r="32" fill="#4DB85A"/><path d="M500 270V170h100v100M500 170h100" stroke="#E5484D" stroke-width="7" fill="none"/><path d="M535 170v60M565 170v60" stroke="#414042" stroke-width="2"/><rect x="528" y="228" width="44" height="8" rx="3" fill="#FFC93C"/>`,
  canteen: () => `<rect width="640" height="360" fill="#E6F4FF"/><rect x="0" y="270" width="640" height="90" fill="#C9D6E3"/><rect x="40" y="40" width="560" height="60" rx="10" fill="#fff"/><text x="320" y="80" text-anchor="middle" font-size="26" font-weight="800" fill="#4D96FF" font-family="Baloo 2, sans-serif">CANTEEN</text><rect x="30" y="215" width="160" height="16" rx="6" fill="#B07A4A"/><rect x="450" y="215" width="160" height="16" rx="6" fill="#B07A4A"/><rect x="60" y="231" width="10" height="45" fill="#8B5E34"/><rect x="150" y="231" width="10" height="45" fill="#8B5E34"/><rect x="480" y="231" width="10" height="45" fill="#8B5E34"/><rect x="570" y="231" width="10" height="45" fill="#8B5E34"/>`,
  bus: () => `<rect width="640" height="360" fill="#FFE8A3"/><rect x="0" y="280" width="640" height="80" fill="#6B7280"/>${[30, 190, 350, 510].map(x => `<rect x="${x}" y="50" width="120" height="90" rx="12" fill="#BDE4FF" stroke="#F59E0B" stroke-width="8"/><g class="whoosh"><path d="M${x + 10} 80h50M${x + 30} 105h60" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/></g>`).join('')}<rect x="0" y="175" width="640" height="14" fill="#F59E0B"/>`,
  night: () => `<rect width="640" height="360" fill="#1E2A4A"/><rect x="0" y="275" width="640" height="85" fill="#2B3A60"/><rect x="430" y="50" width="150" height="120" rx="10" fill="#0F1730" stroke="#3B4C7A" stroke-width="10"/><circle cx="530" cy="95" r="20" fill="#FFF3B0"/><circle cx="540" cy="88" r="18" fill="#0F1730"/><circle cx="460" cy="75" r="2" fill="#fff"/><circle cx="480" cy="140" r="2" fill="#fff"/><rect x="40" y="215" width="250" height="60" rx="14" fill="#4D5E9A"/><rect x="40" y="195" width="80" height="34" rx="12" fill="#E6ECFF"/><ellipse class="glow" cx="320" cy="200" rx="120" ry="90" fill="#8FD3FF" opacity=".18"/>`
};
function sceneSvg(sc) {
  return `<svg class="scene-svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(sc.line || '')}"><g class="kb">${(BGS[sc.bg] || BGS.class)()}${(sc.chars || []).map(kidSvg).join('')}</g></svg>`;
}

/* plays a story inside `host`; onStop(stop, resume) is called at each pause; resolves when the story ends */
function playStory(host, story, { onStop, onProgress } = {}) {
  const scenes = story.scenes, plays = scenes.filter(s => !s.stop).length;
  host.innerHTML = `<div class="vid">
      <div class="vid-screen"><div class="vid-stage"></div><div class="vid-sub" aria-live="polite"></div><div class="vid-pause" hidden>${ico('pause')}<span>Paused: question time!</span></div>
        <div class="vid-badge">${ico('video')} ${esc(story.title)}</div></div>
      <div class="vid-bar"><button class="vid-btn" data-a="toggle" aria-label="Pause">${ico('pause')}</button><button class="vid-btn" data-a="replay" aria-label="Replay this scene">${ico('replay')}</button>
        <div class="vid-track"><i></i>${scenes.map((s, i) => s.stop ? `<b style="left:${(scenes.slice(0, i).filter(x => !x.stop).length / plays) * 100}%"></b>` : '').join('')}</div><span class="vid-time"></span></div></div>`;
  const stage = $('.vid-stage', host), sub = $('.vid-sub', host), bar = $('.vid-track i', host), tbtn = $('[data-a=toggle]', host);
  let idx = 0, paused = false, token = 0, done = 0, resolveAll;
  const t0 = performance.now();
  const setBar = () => { bar.style.width = (done / plays * 100) + '%'; $('.vid-time', host).textContent = `${Math.min(done + 1, plays)} / ${plays}`; onProgress && onProgress(done / plays); };
  const run = async () => {
    const my = ++token;
    while (idx < scenes.length) {
      if (my !== token) return;
      const sc = scenes[idx];
      if (sc.stop) {
        $('.vid-pause', host).hidden = false; Voice.stop(); host.classList.add('stopped');
        await new Promise(res => onStop(sc.stop, res));
        if (my !== token) return;
        $('.vid-pause', host).hidden = true; host.classList.remove('stopped'); idx++; continue;
      }
      stage.innerHTML = sceneSvg(sc); stage.firstChild.classList.add('in');
      sub.textContent = sc.line; setBar();
      const minMs = 2600 + sc.line.length * 55, st = performance.now();
      await Voice.say(sc.line, { rate: .92 });
      const left = minMs - (performance.now() - st); if (left > 0) await sleep(Voice.muted ? left : Math.min(left, 900));
      while (paused && my === token) await sleep(150);
      if (my !== token) return;
      done++; idx++; setBar();
    }
    resolveAll({ ms: performance.now() - t0 });
  };
  host.addEventListener('click', e => {
    const b = e.target.closest('.vid-btn'); if (!b) return;
    if (b.dataset.a === 'toggle') { paused = !paused; host.classList.toggle('paused', paused); tbtn.innerHTML = ico(paused ? 'play' : 'pause'); if (paused) Voice.stop(); }
    if (b.dataset.a === 'replay' && !scenes[idx].stop) { done = Math.max(0, done); paused = false; tbtn.innerHTML = ico('pause'); host.classList.remove('paused'); run(); }
  });
  return new Promise(res => { resolveAll = res; run(); });
}
