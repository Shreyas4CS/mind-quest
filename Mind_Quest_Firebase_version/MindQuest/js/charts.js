/* ================================================================
   Small SVG charts for dashboards and reports (no library needed)
   ================================================================ */
const CH = { ink: '#2E2D30', mute: '#8E8D94', grid: '#ECEBEF', brand: '#F7941D', series: ['#F7941D', '#4D96FF', '#2EC4B6', '#9B5DE5', '#FF6FB5'] };

/* line chart over weeks: series = [{name, color, values:[{x, y}]}], y in 0..max */
function lineChart(series, { w = 560, h = 220, max = 100, unit = '', xLabel = 'Week' } = {}) {
  const xs = [...new Set(series.flatMap(s => s.values.map(v => v.x)))].sort((a, b) => a - b);
  if (!xs.length) return '<p class="muted">No weeks finished yet.</p>';
  const L = 38, R = 128, T = 14, B = 30, iw = w - L - R, ih = h - T - B;
  const X = x => L + (xs.length === 1 ? iw / 2 : (xs.indexOf(x) / (xs.length - 1)) * iw), Y = y => T + ih - (y / max) * ih;
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; g += `<line x1="${L}" x2="${L + iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="${CH.grid}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="${CH.mute}">${Math.round(v)}${unit}</text>`; }
  xs.forEach(x => { g += `<text x="${X(x)}" y="${h - 8}" text-anchor="middle" font-size="11" fill="${CH.mute}">${xLabel} ${x}</text>`; });
  const labels = [];
  series.forEach((s, i) => {
    const pts = s.values.filter(v => v.y != null), c = s.color || CH.series[i % 5];
    if (!pts.length) return;
    g += `<polyline fill="none" stroke="${c}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(v => `${X(v.x)},${Y(v.y)}`).join(' ')}"/>`;
    pts.forEach(v => { g += `<circle cx="${X(v.x)}" cy="${Y(v.y)}" r="5" fill="#fff" stroke="${c}" stroke-width="3"><title>${esc(s.name)}, ${xLabel.toLowerCase()} ${v.x}: ${Math.round(v.y)}${unit}</title></circle>`; });
    const last = pts[pts.length - 1]; labels.push({ y: Y(last.y), x: X(last.x), t: `${s.name} ${Math.round(last.y)}${unit}`, c });
  });
  labels.sort((a, b) => a.y - b.y); for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 15) labels[i].y = labels[i - 1].y + 15;
  labels.forEach(l => { g += `<text x="${L + iw + 10}" y="${l.y + 4}" font-size="12" font-weight="700" fill="${l.c}">${esc(l.t)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trend over weeks">${g}</svg>`;
}

/* horizontal level bars for well-being areas */
function levelBars(domains, grade, { infoBtns = true } = {}) {
  const rows = Object.keys(DOMAINS).filter(k => domains[k]).map(k => {
    const d = domains[k], enough = d.n >= 2, lv = enough ? levelOf(d.v) : null;
    return `<div class="lv-row">
      <div class="lv-name">${ico(DOMAINS[k].icon)}<span>${esc(domainName(k, grade))}</span>${infoBtns ? info('d_' + k) : ''}</div>
      <div class="lv-track">${LEVELS.map((L, i) => `<i class="${lv && LEVELS.indexOf(lv) >= i ? 'on' : ''}" style="--c:${lv ? lv.c : '#ddd'}"></i>`).join('')}</div>
      <div class="lv-lab" style="color:${lv ? lv.c : CH.mute}">${lv ? lv.label : 'Not enough evidence'}</div></div>`;
  });
  return rows.join('') || '<p class="muted">No answers yet.</p>';
}

/* donut: parts = [{label, value, color}] */
function donut(parts, { size = 170, center = '', sub = '' } = {}) {
  const tot = parts.reduce((s, p) => s + p.value, 0) || 1, r = size / 2 - 14, c = size / 2, C = 2 * Math.PI * r;
  let off = 0, arcs = '';
  parts.forEach((p, i) => { const len = p.value / tot * C; arcs += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${p.color || CH.series[i % 5]}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})"><title>${esc(p.label)}: ${Math.round(p.value / tot * 100)}%</title></circle>`; off += len; });
  return `<div class="donut"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(sub)}">${arcs}<text x="${c}" y="${c + 2}" text-anchor="middle" font-size="22" font-weight="800" fill="${CH.ink}" font-family="Baloo 2, sans-serif">${esc(center)}</text><text x="${c}" y="${c + 20}" text-anchor="middle" font-size="11" fill="${CH.mute}">${esc(sub)}</text></svg>
    <ul class="legend">${parts.filter(p => p.value > 0).map((p, i) => `<li><i style="background:${p.color || CH.series[i % 5]}"></i>${esc(p.label)} <b>${Math.round(p.value / tot * 100)}%</b></li>`).join('')}</ul></div>`;
}

/* gauge for a 0..100 index; good = 'high' (green when high) or 'low' (green when low) */
function gauge(v, label, good = 'high') {
  if (v == null) return `<div class="gauge"><div class="g-num">—</div><div class="g-lab">${esc(label)}</div></div>`;
  const ok = good === 'high' ? v : 100 - v, col = ok >= 70 ? '#16A34A' : ok >= 50 ? '#2EC4B6' : ok >= 35 ? '#F59E0B' : '#E5484D';
  const a = Math.PI * (1 - v / 100), x = 60 + 46 * Math.cos(a), y = 60 - 46 * Math.sin(a);
  return `<div class="gauge"><svg viewBox="0 0 120 70" width="150"><path d="M14 60a46 46 0 0 1 92 0" fill="none" stroke="${CH.grid}" stroke-width="12" stroke-linecap="round"/><path d="M14 60A46 46 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/></svg><div class="g-num" style="color:${col}">${v}</div><div class="g-lab">${esc(label)}</div></div>`;
}

/* scatter of children: marks % (y) vs well-being (x), with the "aligned" band */
function quadrant(points, { w = 420, h = 300, hi = null } = {}) {
  const L = 44, R = 16, T = 16, B = 40, iw = w - L - R, ih = h - T - B, X = v => L + v * iw, Y = v => T + ih - v * ih;
  let g = `<polygon points="${X(0)},${Y(.15)} ${X(0)},${Y(0)} ${X(.15)},${Y(0)} ${X(1)},${Y(.85)} ${X(1)},${Y(1)} ${X(.85)},${Y(1)}" fill="#2EC4B6" opacity=".12"/>`;
  for (let k = 0; k <= 4; k++) { const v = k / 4; g += `<line x1="${X(0)}" x2="${X(1)}" y1="${Y(v)}" y2="${Y(v)}" stroke="${CH.grid}"/><line y1="${Y(0)}" y2="${Y(1)}" x1="${X(v)}" x2="${X(v)}" stroke="${CH.grid}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="${CH.mute}">${v * 100}%</text><text x="${X(v)}" y="${h - 22}" text-anchor="middle" font-size="11" fill="${CH.mute}">${v * 100}</text>`; }
  g += `<text x="${L + iw / 2}" y="${h - 4}" text-anchor="middle" font-size="12" fill="${CH.ink}" font-weight="600">Well-being index</text><text x="12" y="${T + ih / 2}" transform="rotate(-90 12 ${T + ih / 2})" text-anchor="middle" font-size="12" fill="${CH.ink}" font-weight="600">Marks</text>`;
  g += `<text x="${X(.03)}" y="${Y(.95)}" font-size="11" fill="#B45309">Marks higher: watch pressure</text><text x="${X(.97)}" y="${Y(.05)}" text-anchor="end" font-size="11" fill="#1D4ED8">Marks lower: study support</text>`;
  points.forEach(p => { const me = hi && p.uid === hi; g += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${me ? 9 : 6}" fill="${me ? CH.brand : '#4D96FF'}" stroke="#fff" stroke-width="2.5"><title>${esc(p.name)}: well-being ${Math.round(p.x * 100)}, marks ${Math.round(p.y * 100)}%</title></circle>${me || points.length <= 8 ? `<text x="${X(p.x) + 11}" y="${Y(p.y) + 4}" font-size="11" font-weight="700" fill="${CH.ink}">${esc(p.name.split(' ')[0])}</text>` : ''}`; });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Marks against well-being">${g}</svg>`;
}

/* simple grouped bars: subjects marks vs related skill */
function pairBars(rows) {
  return rows.map(r => `<div class="bar-row"><span class="br-name">${esc(r.name)}</span><div class="br-bars"><div class="br-b" style="width:${Math.round(r.pct * 100)}%;background:${CH.brand}"><span>${Math.round(r.pct * 100)}%</span></div>${r.skill != null ? `<div class="br-b sk" style="width:${Math.round(r.skill * 100)}%;background:#4D96FF"><span>${Math.round(r.skill * 100)}</span></div>` : ''}</div><small>${esc(r.note || '')}</small></div>`).join('') + '<div class="legend inline"><span><i style="background:#F7941D"></i>Marks</span><span><i style="background:#4D96FF"></i>Related skills from MindQuest</span></div>';
}
