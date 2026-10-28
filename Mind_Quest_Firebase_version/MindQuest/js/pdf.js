/* ================================================================
   Report PDF: lays the report out on A4 pages in a hidden frame, draws
   each page with html2canvas (bundled in the file, so it works offline)
   and writes the PDF itself, so Download PDF saves a file straight away
   ================================================================ */
const ReportPDF = (() => {
  const W = 794, H = 1123, HEAD = 44, FOOT = 46, SCALE = 2;   // A4 at 96 px per inch; header strip on pages 2+, footer strip on every page
  const SITE = 'https://www.cognospace.in';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let busy = false;

  // a desktop-width frame (so the phone layout never applies) holding a copy of the report, one A4 page wide
  async function makeFrame(root) {
    const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.style.cssText = 'position:fixed;left:-12000px;top:0;width:1100px;height:1200px;border:0';
    document.body.append(f);
    const d = f.contentDocument, h = document.documentElement, arc = !!root.querySelector('.arcade');
    const css = $$('style').map(s => s.textContent).join('\n'), links = $$('link[rel="stylesheet"]').map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
    d.open();
    d.write(`<!DOCTYPE html><html lang="en" class="${esc(h.className)}" style="${esc(h.getAttribute('style') || '')}"><head><meta charset="utf-8">${links}<style>${css}</style></head><body class="${esc(document.body.className)}" style="margin:0;background:#fff">${arc ? '<div class="arcade">' : ''}<div class="${arc ? 'report' : esc(root.className)} pdf-sheet"></div>${arc ? '</div>' : ''}</body></html>`);
    d.close();
    const sheet = d.querySelector('.pdf-sheet');
    sheet.innerHTML = root.querySelector('.rp-cover').outerHTML + root.querySelector('.rp-body').outerHTML;
    sheet.querySelectorAll('audio, .rp-close, .info-i, .no-pdf').forEach(n => n.remove());
    sheet.querySelectorAll('details').forEach(n => { n.open = true; });
    // html2canvas paints one box for a highlighted phrase that wraps onto two lines, so highlight word by word
    sheet.querySelectorAll('.glance p b').forEach(b => { if (!b.children.length) b.replaceWith(...(b.textContent.match(/\S+\s*/g) || []).map(w => Object.assign(document.createElement('b'), { textContent: w }))); });
    for (let i = 0; i < 40 && [...d.querySelectorAll('link')].some(l => !l.sheet); i++) await wait(100);   // web fonts stylesheet (cached; skipped when offline)
    void sheet.offsetHeight;
    await Promise.race([d.fonts.ready, wait(4000)]);
    iconsToImages(d);
    await Promise.all([...sheet.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    return { f, d, sheet };
  }

  // icons are <use> links into the page's sprite, which html2canvas cannot follow (and it is slow with many
  // svg nodes): turn each into a picture of the symbol, coloured the way the CSS colours it
  function iconsToImages(d) {
    const win = d.defaultView, keep = ['display', 'position', 'top', 'left', 'right', 'bottom', 'margin', 'vertical-align', 'transform', 'flex', 'align-self', 'justify-self', 'grid-row', 'grid-column', 'order', 'opacity', 'z-index'];
    [...d.querySelectorAll('svg')].filter(svg => svg.querySelector('use')).forEach(svg => {
      const sym = document.getElementById((svg.querySelector('use').getAttribute('href') || '').slice(1)), r = svg.getBoundingClientRect();
      if (!sym || !r.width) return;
      const cs = win.getComputedStyle(svg), body = sym.innerHTML.replace(/var\((--[\w-]+),\s*([^)]+)\)/g, (m, v, dflt) => cs.getPropertyValue(v).trim() || dflt).replace(/currentColor/g, cs.color);
      const img = d.createElement('img');
      img.src = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sym.getAttribute('viewBox') || '0 0 24 24'}" width="${Math.round(r.width * SCALE * 2)}" height="${Math.round(r.height * SCALE * 2)}" overflow="visible">${body}</svg>`);
      img.alt = ''; img.style.cssText = keep.map(k => `${k}:${cs.getPropertyValue(k)}`).join(';') + `;width:${r.width}px;height:${r.height}px;max-width:none`;
      svg.replaceWith(img);
    });
  }

  // page breaks: between blocks where possible, else between rows or text lines (never through a row, line,
  // picture or chart in either column, and never right under a heading)
  const ROWS = 'tr, li, .lv-row, .bar-row, .kpi, .kpis, .tags, .rec, .quote, .chart, .disclaimer, .sec-head, .ab-row, .b5-row, .bio-row, .sk-row, .talk-log, .sum-tags, .bio-kpis, .gaze-wrap, .mood-journey, .bio-chart, .bio-legend, .bio-strip, .align';
  function paginate(sheet) {
    const top = sheet.getBoundingClientRect().top, R = n => n.getBoundingClientRect(), total = Math.ceil(sheet.scrollHeight);
    const box = n => { const r = R(n); return [r.top - top, r.bottom - top]; };
    const lines = n => { const rg = n.ownerDocument.createRange(); rg.selectNodeContents(n); const out = []; for (const r of rg.getClientRects()) { const l = out.find(o => Math.abs(o[0] - (r.top - top)) < 6); if (l) l[1] = Math.max(l[1], r.bottom - top); else out.push([r.top - top, r.bottom - top]); } return out; };
    const body = sheet.querySelector('.rp-body'), clean = [...body.children].filter(b => !b.matches('.rp-credit')).map(b => box(b)[0] - 8), inner = [];   // the credit stays with the note above it
    const atoms = [box(sheet.querySelector('.rp-cover')), ...[...body.querySelectorAll(`${ROWS}, img, svg, canvas, h4, h5, .rc-sub, .rp-credit`)].map(box)];
    body.querySelectorAll(ROWS).forEach(n => inner.push(box(n)[1] + 2));
    body.querySelectorAll('h4, h5').forEach(n => inner.push(box(n)[0] - 4));
    body.querySelectorAll('p:not(.rc-sub), .disclaimer').forEach(n => lines(n).forEach(l => { atoms.push(l); inner.push(l[1] + 2); }));
    const cr = sheet.querySelector('.rp-credit'); if (cr && cr.previousElementSibling) atoms.push([box(cr.previousElementSibling)[0], box(cr)[1]]);
    const ok = c => !atoms.some(([t, b]) => t + 2 < c && c < b - 2), inn = inner.filter(ok);
    const best = (list, lo, hi) => Math.max(-1, ...list.filter(c => c > lo && c <= hi));
    const pages = []; let s = 0;
    while (s < total - 4) {
      const cap = H - FOOT - (pages.length ? HEAD : 0), lim = s + cap;
      let e = total <= lim ? total : best(clean, s + cap * .72, lim);
      if (e < 0) e = best(inn, s + cap * .3, lim);
      if (e < 0) e = best(clean, s + cap * .15, lim);
      if (e < 0) e = lim;
      pages.push([s, Math.round(e)]); s = Math.round(e);
    }
    const links = [...sheet.querySelectorAll('a[href^="http"]')].map(a => { const r = R(a); return { href: a.href, x: r.left - R(sheet).left, y: r.top - top, w: r.width, h: r.height }; });
    return { pages, links };
  }

  // running header (pages 2+) and footer with the CognoSpace credit and page number; returns the website link box
  function decorate(g, i, n, info) {
    g.save(); g.scale(SCALE, SCALE); g.textBaseline = 'alphabetic';
    const run = (parts, x, y) => { for (const [t, font, col] of parts) { g.font = font; g.fillStyle = col; g.fillText(t, x, y); x += g.measureText(t).width; } return x; };
    if (i) {
      let x = run([['Mind', '800 17px "Baloo 2", sans-serif', '#414042'], ['Quest', '800 17px "Baloo 2", sans-serif', '#F7941D'], [`   ·   ${info.name}'s report`, '500 11px Poppins, sans-serif', '#8E8D94']], 30, 27);
      g.font = '500 11px Poppins, sans-serif'; const r = `Grade ${info.grade}  ·  ${info.date}`; g.fillStyle = '#8E8D94'; g.fillText(r, W - 30 - g.measureText(r).width, 27);
      g.fillStyle = '#ECE7E0'; g.fillRect(30, 35, W - 60, 1); g.fillStyle = '#F7941D'; g.fillRect(30, 34.5, 54, 2);
    }
    const y = H - 18;
    g.fillStyle = '#ECE7E0'; g.fillRect(30, H - 36, W - 60, 1); g.fillStyle = '#F7941D'; g.fillRect(30, H - 36.5, 54, 2);
    const x0 = run([['Designed & developed by ', '400 10.5px Poppins, sans-serif', '#8E8D94'], ['Cogno', '700 10.5px Poppins, sans-serif', '#F7941D'], ['Space', '700 10.5px Poppins, sans-serif', '#414042'], ['   ·   ', '400 10.5px Poppins, sans-serif', '#B5B4BA']], 30, y);
    const x1 = run([['www.cognospace.in', '600 10.5px Poppins, sans-serif', '#D9730A']], x0, y);
    g.font = '600 10.5px Poppins, sans-serif'; g.fillStyle = '#414042'; const pg = `Page ${i + 1} of ${n}`; g.fillText(pg, W - 30 - g.measureText(pg).width, y);
    g.restore();
    return { href: SITE, x: x0, y: y - 11, w: x1 - x0, h: 15 };
  }

  // a small PDF writer: one full-page JPEG per page, plus link boxes
  function writePDF(pages, title) {
    const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
    const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); body(); put('\nendobj\n'); };
    const str = s => '<FEFF' + Array.from({ length: s.length }, (_, i) => s.charCodeAt(i).toString(16).padStart(4, '0')).join('') + '>';
    const PW = 595.28, PH = 841.89, kx = PW / W, ky = PH / H, d = new Date(), p2 = v => String(v).padStart(2, '0');
    const nPage = pages.length, annBase = 4 + nPage * 3; let ann = annBase;
    put('%PDF-1.4\n%âãÏÓ\n');
    obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => put(`<< /Type /Pages /Count ${nPage} /Kids [${pages.map((_, i) => `${4 + i * 3} 0 R`).join(' ')}] >>`));
    obj(3, () => put(`<< /Title ${str(title)} /Author ${str('CognoSpace')} /Subject ${str('MindQuest report')} /Creator ${str('MindQuest by CognoSpace (www.cognospace.in)')} /Producer ${str('MindQuest')} /CreationDate (D:${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}) >>`));
    pages.forEach((p, i) => {
      const o = 4 + i * 3, refs = p.links.map(() => `${ann++} 0 R`).join(' '), cs = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
      obj(o, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${o + 2} 0 R >> >> /Contents ${o + 1} 0 R${refs ? ` /Annots [${refs}]` : ''} >>`));
      obj(o + 1, () => put(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
      obj(o + 2, () => { put(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`); put(p.jpg); put('\nendstream'); });
    });
    ann = annBase;
    pages.forEach(p => p.links.forEach(l => obj(ann++, () => put(`<< /Type /Annot /Subtype /Link /Rect [${(l.x * kx).toFixed(2)} ${(PH - (l.y + l.h) * ky).toFixed(2)} ${((l.x + l.w) * kx).toFixed(2)} ${(PH - l.y * ky).toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${l.href.replace(/[\\()]/g, '\\$&')}) >> >>`))));
    const xref = len, count = ann;
    put(`xref\n0 ${count}\n0000000000 65535 f \n` + Array.from({ length: count - 1 }, (_, i) => `${String(offs[i + 1]).padStart(10, '0')} 00000 n \n`).join(''));
    put(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  async function build(root, info, progress) {
    if (typeof html2canvas !== 'function') throw new Error('html2canvas is missing');
    await Promise.all(['800 17px "Baloo 2"', '400 11px Poppins', '500 11px Poppins', '600 11px Poppins', '700 11px Poppins'].map(f => document.fonts.load(f).catch(() => {})));
    const { f, sheet } = await makeFrame(root);
    try {
      const { pages, links } = paginate(sheet), out = [], MAXH = Math.floor(14e6 / (W * SCALE * SCALE));   // keep each drawing under the 16.7-megapixel canvas limit of iPhones
      for (let k = 0; k < pages.length;) {
        let j = k; while (j + 1 < pages.length && pages[j + 1][1] - pages[k][0] <= MAXH) j++;
        progress(Math.round(k / pages.length * 100));
        const y0 = pages[k][0], shot = await html2canvas(sheet, { scale: SCALE, x: 0, y: y0, width: W, height: pages[j][1] - y0, backgroundColor: '#ffffff', logging: false, imageTimeout: 5000 });
        for (let i = k; i <= j; i++) {
          const [a, b] = pages[i], top = i ? HEAD : 0, cv = Object.assign(document.createElement('canvas'), { width: W * SCALE, height: H * SCALE }), g = cv.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
          g.drawImage(shot, 0, (a - y0) * SCALE, W * SCALE, (b - a) * SCALE, 0, top * SCALE, W * SCALE, (b - a) * SCALE);
          const pl = [decorate(g, i, pages.length, info), ...links.filter(l => l.y >= a && l.y + l.h <= b).map(l => ({ ...l, y: l.y - a + top }))];
          // toDataURL, not toBlob: Chrome encodes toBlob in idle time, which a page with live animations hardly has
          const b64 = atob(cv.toDataURL('image/jpeg', .9).split(',')[1]), jpg = new Uint8Array(b64.length);
          for (let n = 0; n < b64.length; n++) jpg[n] = b64.charCodeAt(n);
          out.push({ jpg, w: cv.width, h: cv.height, links: pl });
        }
        k = j + 1; await wait(0);
      }
      return writePDF(out, info.title || `MindQuest Report: ${info.name}`);
    } finally { f.remove(); }
  }

  async function save(root, info, btn) {
    if (busy) return; busy = true;
    const label = ico('download') + ' Download PDF'; btn.disabled = true; btn.classList.add('busy');
    try {
      const blob = await build(root, info, v => (btn.innerHTML = `${ico('download')} Making PDF… ${v}%`));
      const name = info.file || `MindQuest_Report_${String(info.name).trim().replace(/[^\p{L}\p{N}]+/gu, '_') || 'Champ'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const url = URL.createObjectURL(blob), a = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast(`${ico('download')} PDF saved: ${name}`, 3500);
    } catch (e) {
      console.error('PDF failed', e);
      toast(`${ico('print')} The PDF could not be made on this device. Use Print and choose “Save as PDF”.`, 5000);
    } finally { btn.innerHTML = label; btn.disabled = false; btn.classList.remove('busy'); busy = false; }
  }
  return { save };
})();
