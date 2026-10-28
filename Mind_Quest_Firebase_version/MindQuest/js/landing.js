/* landing page: worlds orbit, marquee, weekly quests, scroll reveals and counters */
(function () {
  const W = { 4: ['Mars Mission', 'Blast off to the Red Planet', '#E8590C', '#FFC9A8'], 5: ['Ocean Odyssey', 'Dive into the Coral Kingdom', '#1C7ED6', '#A5D8FF'], 6: ['Jungle Quest', 'Explore the Emerald Jungle', '#2B8A3E', '#B2F2BB'], 7: ['Arctic Expedition', 'Brave the Frozen North', '#1098AD', '#C5F6FA'], 8: ['Enchanted Kingdom', 'Enter a land of magic', '#9C36B5', '#EEBEFA'], 9: ['Cyber City', 'Hack the future', '#5F3DC4', '#D0BFFF'] };
  $('#lpCore').innerHTML = MASCOT;
  $('#chipFace').innerHTML = faceSvg('happy');
  $('#lpSpin').innerHTML = Object.keys(W).map((g, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return `<div class="lp-planet" style="left:${50 + 50 * Math.cos(a)}%;top:${50 + 50 * Math.sin(a)}%;--wa:${W[g][2]};--wb:${W[g][3]}"><div class="op-in">${worldSvg(WORLDS[g][0])}<small>Grade ${g}</small></div></div>`; }).join('');
  const chips = Object.values(TYPES).map(t => `<span>${ico(t.icon)} ${esc(t.label)}</span>`).join('');
  $('#lpMq').innerHTML = chips + chips;
  $('#lpWeeks').innerHTML = WEEKS.map(w => `<article class="lp-week" style="--qc:${w.color}"><div class="lw-ic">${ico(w.icon)}</div><span class="lw-n">Week ${w.week}</span><h3>${esc(w.title)}</h3><p>${esc(w.sub)}</p>
    <div class="lw-story">${ico('video')} Story: ${esc((w.items.find(i => i.type === 'story') || {}).title || '')}</div></article>`).join('');
  $('#lpWorlds').innerHTML = Object.entries(W).map(([g, x]) => `<article class="lp-world" style="--a:${x[2]};--b:${x[3]};--wa:${x[2]};--wb:${x[3]}"><span class="wc-grade">GRADE ${g}</span><span class="wc-emoji">${worldSvg(WORLDS[g][0])}</span><h3>${x[0]}</h3><div class="wc-tag">${x[1]}</div></article>`).join('');
  $('#lpAreas').innerHTML = Object.values(DOMAINS).map((d, i) => `<span class="chip ${['', 'blue', 'green', 'pink', 'grape'][i % 5]}">${ico(d.icon)} ${esc(d.short)}</span>`).join('');
  fillIcons();

  /* scroll reveals and counting numbers */
  const items = $$('.lp-head, .lp-step, .lp-week, .lp-world, .lp-panel, .lp-privacy, .lp-ctaband, .lp-stat');
  const count = b => { const to = +b.dataset.count, t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / 1300); b.textContent = Math.round(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); }; step(); };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = 'IntersectionObserver' in window && !calm ? new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target); const b = e.target.querySelector('b[data-count]'); if (b) count(b); }), { threshold: .15 }) : null;
  items.forEach(n => { n.style.setProperty('--rd', `${Math.min([...n.parentElement.children].indexOf(n), 6) * .09}s`); n.classList.add('rv'); if (io) io.observe(n); else n.classList.add('in'); });

  /* already signed in: offer the dashboard */
  try {
    const sid = localStorage.getItem('mq.sid');
    if (sid || (MQ_CONFIG.firebase.apiKey && !/^PASTE_/.test(MQ_CONFIG.firebase.apiKey) && Object.keys(localStorage).some(k => k.startsWith('firebase:authUser')))) {
      $('#lpActs').innerHTML = `<a class="btn btn-primary btn-sm" href="login.html">${ico('home')} My dashboard</a>`;
    }
  } catch (e) { /* private mode */ }
})();
