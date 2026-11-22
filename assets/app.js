(function () {
/* قناع الأرض: يُرسم الشكل مرة واحدة، ثم يُختبر كل نقطة بقراءة ألفا، بدل اختبار المسار لكل نقطة */
function landMask(path, m, wPx, hPx) {
  const c = document.createElement('canvas'); c.width = wPx; c.height = hPx;
  const o = c.getContext('2d', { willReadFrequently: true });
  o.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  o.fill(path);
  return { w: wPx, h: hPx, a: o.getImageData(0, 0, wPx, hPx).data };
}
function landHas(mask, x, y, dpr) {
  const px = Math.round(x * dpr), py = Math.round(y * dpr);
  if (px < 0 || py < 0 || px >= mask.w || py >= mask.h) return false;
  return mask.a[(py * mask.w + px) * 4 + 3] > 127;
}
  const D = JSON.parse(document.getElementById('data').textContent);
  /* تفريق النقاط: سجلات الموضع الواحد كانت تقع على نقطة واحدة، فتتوزع الآن حولها بزاوية ذهبية ونصف قطر يتسع مع العدد.
     النقطة الأولى تبقى في مكانها، ويتغيّر الموضع المعروض فقط لا السجل. */
  (function spreadPts8() {
    const groups = new Map();
    D.pts.forEach(p => {
      if (p.x == null || p.y2 == null) return;
      const k = p.x + '|' + p.y2;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    });
    groups.forEach(list => {
      if (list.length < 2) return;
      const cx = list[0].x, cy = list[0].y2;
      list.sort((a, b) => String(a.id).localeCompare(String(b.id), 'en'));
      list.forEach((p, k) => {
        if (k === 0) return;
        const a = k * 2.399963, r = 7 * Math.sqrt(k);
        p.x = +(cx + r * Math.cos(a)).toFixed(1);
        p.y2 = +(cy + r * Math.sin(a)).toFixed(1);
      });
    });
  })();
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const byId = Object.fromEntries(D.fams.map(f => [f.id, f]));
  const key = (p, c) => p + '|' + c;
  const placeBy = Object.fromEntries(D.places.map(p => [key(p.p, p.c), p]));
  const tribeKey = t => !t ? 'other' : (t.indexOf('الأوس') === 0 && t.indexOf('الخزرج') < 0 ? 'aws' : (t.indexOf('الخزرج') >= 0 && t.indexOf('الأوس') < 0 ? 'khazraj' : 'other'));
  const uniq = a => { const s = new Set(); return a.filter(x => { const k = x.b + x.c; if (s.has(k)) return false; s.add(k); return true; }); };

  const S = D.stats;
  $('#stats').innerHTML = [[S.fams, 'أسرة'], [S.places, 'مدينة وموضعًا'], [S.countries, 'دولة'], [S.studies, 'كتابًا ودراسة']].map(([n, l]) => `<span><b>${n}</b>${l}</span>`).join('');

  const st = { country: null, place: null, list: [], idx: 0 };

  /* countries and the ranked city strip */
  const cc = {}; D.places.forEach(p => cc[p.c] = (cc[p.c] || 0) + 1);
  /* الدول بالتسلسل التاريخي لوجود السجلات فيها، وتبدأ بالسعودية. ما لا تاريخ له يأتي بعد ذلك بحسب عدد سجلاته */
  const CR8 = {}, pcMap8 = Object.fromEntries(D.places.map(pl => [pl.p, pl.c]));
  const eraRank8 = e => { if (!e) return null; const m = e.match(/ق(\d+)/); if (/^قبل/.test(e)) return m ? +m[1] - 0.5 : 0; if (m) return +m[1]; return /معاصر/.test(e) ? 99 : null; };
  D.pts.forEach(p => { if (p.l !== 'L6' && p.l !== 'L4') return; const c = pcMap8[p.pp], r = eraRank8(p.era); if (c && r != null) CR8[c] = Math.min(CR8[c] ?? 999, r); });
  const countries = Object.keys(cc).sort((a, b) => {
    const ka = a === 'السعودية' ? -1 : (CR8[a] ?? 200), kb = b === 'السعودية' ? -1 : (CR8[b] ?? 200);
    return ka - kb || cc[b] - cc[a];
  });
  /* الأسر بالتسلسل التاريخي: الأقدم حضورًا في السجل أولًا، ثم بالاسم. ما لا تاريخ له يأتي في آخر القائمة */
  const FE8 = {};
  D.pts.forEach(p => { if ((p.l === 'L6' || p.l === 'L4') && p.fid) { const r = eraRank8(p.era); if (r != null) FE8[p.fid] = Math.min(FE8[p.fid] ?? 999, r); } });
  function famSort8(list) {
    return [...list].sort((a, b) => (FE8[a.id] ?? 999) - (FE8[b.id] ?? 999) || String(a.n).localeCompare(String(b.n), 'ar'));
  }
  function drawCountries() {
    $('#countries').innerHTML = countries.map(c => `<button class="tab" type="button" data-c="${esc(c)}" aria-pressed="${c === st.country}">${esc(c)}<small>${cc[c]}</small></button>`).join('');
  }
  const CS8 = { open: new Set(), last: null };
  function drawStrip() {
    $('#strip').innerHTML = countries.map(c => {
      const list = D.places.filter(p => p.c === c);
      const on = CS8.open.has(c);
      return `<div class="cg${on ? ' on' : ''}"><button type="button" class="gg-h" data-cg="${esc(c)}" aria-expanded="${on}"><span class="gg-t"><b>${esc(c)}</b> <small>${list.length} موضعًا</small></span><span class="gg-a">${on ? 'إخفاء' : 'عرض'}</span></button>${on ? `<div class="cg-b">${list.map(p => `<button class="city" type="button" data-k="${esc(key(p.p, p.c))}" data-tr="${p.tr}" aria-pressed="${key(p.p, p.c) === st.place}">
      <span class="rank">${esc(p.ta)}</span><span class="cn">${esc(p.p)}</span><span class="cf"><b>${p.f.length}</b>${p.f.length === 1 ? 'أسرة' : 'أسر'}${p.cur ? ' · حاضرة اليوم' : ''}</span></button>`).join('')}</div>` : ''}</div>`;
    }).join('');
  }
  function selectCountry(c) {
    st.country = c; drawCountries();
    const first = D.places.find(p => p.c === c); if (first) selectPlace(key(first.p, first.c)); else drawStrip();
  }
  $('#countries').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) selectCountry(b.dataset.c); });
  $('#strip').addEventListener('click', e => {
    const cg = e.target.closest('[data-cg]');
    if (cg) { const c = cg.dataset.cg; if (CS8.open.has(c)) { CS8.open.delete(c); drawStrip(); } else selectCountry(c); return; }
    const b = e.target.closest('[data-k]'); if (b) { const pl = placeBy[b.dataset.k]; if (pl) CS8.open.add(pl.c); selectPlace(b.dataset.k); }
  });
  /* الدول والمدن: كل دولة كوكبة من مدنها، تُضيء بترتيب السجل التاريخي، ونجمة كل مدينة بقدر أسرها */
  function countryLitInit() {
    const cv = $('#csCv'); if (!cv || !cv.getContext || typeof Path2D === 'undefined') return;
    const host = cv.parentElement, tip = $('#csTip'), ctx = cv.getContext('2d');
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const PL = D.places.filter(q => q.x != null && q.y != null && q.x < 700);
    const LAND = new Path2D(D.land);
    const xs = PL.map(q => q.x), ys = PL.map(q => q.y);
    const BX0 = Math.min(...xs) - 24, BY0 = Math.min(...ys) - 24;
    const BW = Math.max(...xs) + 24 - BX0, BH = Math.max(...ys) + 24 - BY0;
    const groups = countries.map((c, i) => ({ c, i, list: PL.filter(q => q.c === c), tot: D.places.filter(q => q.c === c).length })).filter(g => g.list.length)
      .map(g => ({ ...g, n: g.list.reduce((s, q) => s + (q.f ? q.f.length : 0), 0), at: 0.6 + g.i * 0.2 }));
    const T0 = performance.now();
    let W = 1, H = 1, dpr = 1, S = 1, OX = 0, OY = 0, dots = [], END = 8, hot = null, vis = true, raf = 0;
    const toC = q => [OX + (q.x - BX0) * S, OY + (q.y - BY0) * S];
    const tNow = now => (now - T0) / 1000;
    const ease = u => 1 - Math.pow(1 - u, 3);
    const wide = () => W >= 720;

    function layout() {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      S = Math.min((W * 0.94) / BW, (H * 0.8) / BH);
      OX = (W - BW * S) / 2; OY = (H - BH * S) / 2;
      const mask = landMask(LAND, [S * dpr, 0, 0, S * dpr, (OX - BX0 * S) * dpr, (OY - BY0 * S) * dpr], cv.width, cv.height);
      dots = [];
      const g = wide() ? 4 : 3;
      for (let y = 0; y < H; y += g) for (let x = 0; x < W; x += g) {
        const jx = x + (Math.random() - 0.5) * 1.2, jy = y + (Math.random() - 0.5) * 1.2;
        if (landHas(mask, jx, jy, dpr)) dots.push({ x: jx, y: jy, a: 0.3 + Math.random() * 0.7 });
      }
      groups.forEach(gr => {
        gr.pts = gr.list.map(q => ({ q, xy: toC(q), r: 1.8 + Math.sqrt(q.f ? q.f.length : 1) * 1.5 }));
        // شجرة أقصر الوصلات بين مدن الدولة الواحدة
        gr.edges = [];
        const inside = [gr.pts[0]], rest = gr.pts.slice(1);
        while (rest.length) {
          let bi = -1, bd = Infinity, bj = -1;
          rest.forEach((c, j) => inside.forEach(a => { const d = Math.hypot(a.xy[0] - c.xy[0], a.xy[1] - c.xy[1]); if (d < bd) { bd = d; bi = j; bj = a; } }));
          const [c] = rest.splice(bi, 1); gr.edges.push([bj.xy, c.xy]); inside.push(c);
        }
        gr.cx = gr.pts.reduce((s, p) => s + p.xy[0], 0) / gr.pts.length;
        gr.cy = gr.pts.reduce((s, p) => s + p.xy[1], 0) / gr.pts.length;
      });
      END = Math.max(8, ...groups.map(g => g.at + 1.6));
    }

    function draw(now) {
      const t = RM ? END : tNow(now);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#9fd8c6';
      const dawn = Math.min(1, t / 1.6);
      for (const d of dots) { ctx.globalAlpha = (0.1 + 0.12 * d.a) * dawn; ctx.fillRect(d.x, d.y, 1.5, 1.5); }
      ctx.font = '600 13px ThmDisplay, Reem Kufi, Amiri, sans-serif';
      for (const gr of groups) {
        const l = Math.max(0, Math.min(1, (t - gr.at) / 0.9));
        if (l <= 0) continue;
        const isHot = hot === gr.c;
        // حلقة الإشعال
        const u = (t - gr.at) / 1.4;
        if (u > 0 && u < 1) { ctx.globalAlpha = (1 - u) * 0.5; ctx.strokeStyle = '#5fd3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(gr.cx, gr.cy, 6 + 56 * ease(u), 0, 6.2832); ctx.stroke(); }
        ctx.strokeStyle = '#5fd3b8'; ctx.lineWidth = isHot ? 1.8 : 1; ctx.globalAlpha = (isHot ? 0.9 : 0.32) * l;
        ctx.beginPath(); for (const [a, b] of gr.edges) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
        for (const p of gr.pts) {
          const gg = ctx.createRadialGradient(p.xy[0], p.xy[1], 0, p.xy[0], p.xy[1], p.r * 3.4);
          gg.addColorStop(0, 'rgba(228,187,98,.55)'); gg.addColorStop(1, 'rgba(228,187,98,0)');
          ctx.globalAlpha = l; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.xy[0], p.xy[1], p.r * 3.4, 0, 6.2832); ctx.fill();
          ctx.fillStyle = '#fff1cf'; ctx.beginPath(); ctx.arc(p.xy[0], p.xy[1], p.r, 0, 6.2832); ctx.fill();
        }
        if (wide() ? true : (gr.n >= 20 || isHot)) {
          ctx.globalAlpha = l; ctx.textAlign = 'center';
          ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,16,13,.9)'; ctx.lineJoin = 'round';
          ctx.strokeText(gr.c, gr.cx, gr.cy - 16); ctx.fillStyle = '#eef6f2'; ctx.fillText(gr.c, gr.cx, gr.cy - 16);
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = 0;
      if (!vis) return;
      draw(now);
      if (!RM && tNow(now) < END + 0.5) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && vis && !RM) raf = requestAnimationFrame(frame); }
    function redraw() { draw(performance.now()); }
    function refresh() { layout(); draw(performance.now()); kick(); }

    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 18;
      for (const gr of groups) {
        for (const p of gr.pts) {
          const d = Math.hypot(p.xy[0] - x, p.xy[1] - y);
          if (d < bd) { bd = d; best = gr; }
        }
      }
      const prev = hot;
      hot = best ? best.c : null;
      if (!best) { tip.hidden = true; host.style.cursor = ''; }
      else {
        host.style.cursor = 'pointer';
        tip.hidden = false;
        tip.textContent = best.c + ' · ' + best.tot + ' موضعًا · ' + best.n + ' أسرة' + (best.tot > best.list.length ? ' · ' + (best.tot - best.list.length) + ' بلا موقع على الخريطة' : '');
        tip.style.left = best.cx + 'px'; tip.style.top = (best.cy - 26) + 'px';
      }
      if (prev !== hot) redraw();
    });
    host.addEventListener('pointerleave', () => { tip.hidden = true; if (hot) { hot = null; redraw(); } });
    host.addEventListener('click', () => {
      if (!hot) return;
      selectCountry(hot);
      $('#strip').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(host);
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(host);
    else window.addEventListener('resize', refresh);
    refresh();

    /* طبقة القبائل والبطون: مسارات من الأصل المنصوص إلى المواضع المنصوصة، بلون القبيلة، وتُصفّى بالبطن */
    const GL = { mode: 'countries', tribe: 'all', belly: '' };
    const bezT = (p0, p1) => { const dx = p1[0] - p0[0], dy = p1[1] - p0[1], d = Math.hypot(dx, dy); const mx = (p0[0] + p1[0]) / 2 - dy * 0.22, my = (p0[1] + p1[1]) / 2 + dx * 0.22 - d * 0.12; return u => { const v = 1 - u; return [v * v * p0[0] + 2 * v * u * mx + u * u * p1[0], v * v * p0[1] + 2 * v * u * my + u * u * p1[1]]; }; };
    const TLC = { kh: '#5fd3b8', aw: '#e4bb62', unk: '#9db2a9' };
    const TLN = { kh: 'الخزرج', aw: 'الأوس', unk: 'بلا قبيلة مذكورة' };
    const tlCv = document.createElement('canvas');
    tlCv.className = 'cs-cv tl-cv'; tlCv.setAttribute('aria-hidden', 'true'); tlCv.hidden = true;
    host.appendChild(tlCv);
    const tlCtx = tlCv.getContext('2d');
    const glBar = document.createElement('div');
    glBar.className = 'geo-layers'; glBar.setAttribute('role', 'group'); glBar.setAttribute('aria-label', 'طبقة الجغرافيا');
    glBar.innerHTML = '<div class="gl-modes">'
      + '<button type="button" data-gl="countries" aria-pressed="true">الدول والمدن</button>'
      + '<button type="button" data-gl="tribes" aria-pressed="false">القبائل والبطون</button></div>'
      + '<div class="gl-sub" hidden>'
      + '<label>القبيلة <select id="glTribe"><option value="all">الأوس والخزرج</option><option value="الخزرج">الخزرج</option><option value="الأوس">الأوس</option></select></label>'
      + '<label>البطن <select id="glBelly"></select></label>'
      + '<button type="button" id="glText" disabled>نصوص البطن</button>'
      + '<button type="button" id="glTree">إلى الشجرة</button>'
      + '<p class="gl-note">المسار يُرسم بين أصل منصوص وموضع منصوص. وما لا مسار له يظهر موضعًا فقط.</p></div>';
    host.parentElement.insertBefore(glBar, host);
    const glSub = glBar.querySelector('.gl-sub');
    const fillBelly = () => {
      const sel = $('#glBelly');
      const list = D.bellies.bellies.filter(b => GL.tribe === 'all' ? (b.tribe === 'الخزرج' || b.tribe === 'الأوس') : b.tribe === GL.tribe);
      sel.innerHTML = '<option value="">كل البطون</option>' + list.map(b => `<option value="${esc(b.name)}">${esc(b.name)} (${b.people})</option>`).join('');
      sel.value = list.some(b => b.name === GL.belly) ? GL.belly : '';
      GL.belly = sel.value;
      $('#glText').disabled = !GL.belly;
    };
    const famScope = () => D.fams.filter(f => (GL.tribe === 'all' ? (f.t === 'الخزرج' || f.t === 'الأوس') : f.t === GL.tribe) && (!GL.belly || f.b === GL.belly));
    let TL = { stats: [], paths: [], origin: null };
    function buildTribes() {
      const stats = new Map(), paths = new Map();
      famScope().forEach(f => {
        const tr = f.t === 'الخزرج' ? 'kh' : f.t === 'الأوس' ? 'aw' : 'unk';
        const op = f.o && PL.find(q => q.p === f.o.p);
        (f.s || []).filter(x => x.k === 'معاصر').forEach(x => {
          const q = PL.find(y => y.p === x.b && y.c === x.c);
          if (!q) return;
          const k = q.p + '|' + q.c;
          const st = stats.get(k) || { q, n: { kh: 0, aw: 0, unk: 0 } };
          st.n[tr]++; stats.set(k, st);
          if (op && op !== q) {
            const pk = op.p + '>' + q.p + '|' + tr + '|' + (f.dis ? 'd' : 'c');
            const pe = paths.get(pk) || { a: op, b: q, tr, dis: !!f.dis, count: 0 };
            pe.count++; paths.set(pk, pe);
          }
        });
      });
      TL = { stats: [...stats.values()], paths: [...paths.values()], origin: PL.find(q => q.p === 'المدينة المنورة') || null };
    }
    function drawTribes() {
      if (GL.mode !== 'tribes') return;
      const r = host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
      tlCv.width = Math.round(w * dpr); tlCv.height = Math.round(h * dpr);
      tlCv.style.width = w + 'px'; tlCv.style.height = h + 'px';
      tlCtx.setTransform(dpr, 0, 0, dpr, 0, 0); tlCtx.clearRect(0, 0, w, h);
      buildTribes();
      TL.paths.forEach(pe => {
        const pa = toC(pe.a), pb = toC(pe.b), f = bezT(pa, pb);
        tlCtx.beginPath();
        for (let i = 0; i <= 40; i++) { const [x, y] = f(i / 40); if (i === 0) tlCtx.moveTo(x, y); else tlCtx.lineTo(x, y); }
        tlCtx.globalAlpha = 0.55; tlCtx.strokeStyle = TLC[pe.tr]; tlCtx.lineWidth = Math.min(4, 0.9 + 0.5 * pe.count);
        tlCtx.setLineDash(pe.dis ? [5, 5] : []); tlCtx.stroke(); tlCtx.setLineDash([]);
        tlCtx.globalAlpha = 0.9; tlCtx.fillStyle = TLC[pe.tr]; tlCtx.beginPath(); tlCtx.arc(pb[0], pb[1], 2.2, 0, 6.2832); tlCtx.fill();
      });
      if (TL.origin) {
        const [ox, oy] = toC(TL.origin);
        tlCtx.globalAlpha = 1; tlCtx.fillStyle = '#fff6df'; tlCtx.beginPath(); tlCtx.arc(ox, oy, 4, 0, 6.2832); tlCtx.fill();
      }
      TL.stats.forEach(st => {
        const [x, y] = toC(st.q), total = st.n.kh + st.n.aw + st.n.unk;
        const col = st.n.kh && st.n.aw ? '#d9d2a6' : st.n.kh ? TLC.kh : st.n.aw ? TLC.aw : TLC.unk;
        tlCtx.globalAlpha = 1; tlCtx.fillStyle = col;
        tlCtx.beginPath(); tlCtx.arc(x, y, 2.6 + Math.sqrt(total) * 1.3, 0, 6.2832); tlCtx.fill();
        st.x = x; st.y = y;
      });
      tlCtx.globalAlpha = 1;
    }
    function setMode(mode) {
      GL.mode = mode;
      glBar.querySelectorAll('[data-gl]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gl === mode)));
      host.classList.toggle('tribes', mode === 'tribes');
      tlCv.hidden = mode !== 'tribes';
      glSub.hidden = mode !== 'tribes';
      tip.hidden = true;
      if (mode === 'tribes') { fillBelly(); drawTribes(); }
    }
    glBar.addEventListener('click', e => { const b = e.target.closest('[data-gl]'); if (b) setMode(b.dataset.gl); });
    $('#glTribe').addEventListener('change', e => { GL.tribe = e.target.value; GL.belly = ''; fillBelly(); drawTribes(); });
    $('#glBelly').addEventListener('change', e => { GL.belly = e.target.value; $('#glText').disabled = !GL.belly; drawTribes(); });
    $('#glText').addEventListener('click', () => { if (!GL.belly) return; openEntry('texts'); $('#wbel').value = GL.belly; bellyShow(); });
    $('#glTree').addEventListener('click', () => { const t = $('#h-tree'); if (t) t.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    host.addEventListener('pointermove', e => {
      if (GL.mode !== 'tribes') return;
      const rr = host.getBoundingClientRect(), x = e.clientX - rr.left, y = e.clientY - rr.top;
      let best = null, bd = 14;
      TL.stats.forEach(st => { if (st.x == null) return; const d = Math.hypot(st.x - x, st.y - y); if (d < bd) { bd = d; best = st; } });
      if (!best) { tip.hidden = true; return; }
      const n = best.n;
      tip.hidden = false;
      tip.textContent = best.q.p + ' · ' + (n.kh + n.aw + n.unk) + ' أسرة' + (n.kh ? ' · الخزرج ' + n.kh : '') + (n.aw ? ' · الأوس ' + n.aw : '') + (n.unk ? ' · غير مذكورة ' + n.unk : '');
      tip.style.left = best.x + 'px'; tip.style.top = (best.y - 14) + 'px';
    });
    new ResizeObserver(() => { if (GL.mode === 'tribes') drawTribes(); }).observe(host);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => document.body.classList.toggle('geo-in', es[0].isIntersecting), { rootMargin: '-25% 0px -25% 0px' }).observe(host);
  }
  countryLitInit();
  function selectPlace(k, famId) {
    const p = placeBy[k]; if (!p) return;
    LS.picked = true;
    if (st.country !== p.c) { st.country = p.c; drawCountries(); }
    if (CS8.ready) CS8.open.add(p.c);
    st.place = k; drawStrip();
    const el = $('#strip').querySelector(`[data-k="${CSS.escape(k)}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    setList(p.f.map(id => byId[id]), `<b>${esc(p.p)}</b> · ${esc(p.c)} · ${esc(p.ta)}`, famId);
  }

  /* family deck */
  const pattern = '<svg viewBox="0 0 340 66" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1.2">' +
    Array.from({ length: 9 }, (_, i) => `<path d="M${-20 + i * 44} 66 L${22 + i * 44} 0 L${64 + i * 44} 66"/>`).join('') + '</g></svg>';
  function actsHTML(fid) {
    const A = (D.acts || {})[fid] || [], M = (D.moves || {})[fid] || [], T = (D.mtypes || {})[fid] || [];
    if (!A.length && !M.length && !T.length) return '';
    return (A.length ? `<div class="pd-sec"><h4>الأعمال والمناصب (${A.length})</h4>${A.map(a => `<div class="actrow"><b>${esc(a.c)}</b> ${esc(a.t)} <small>${esc(a.p)} · موضع ${esc(a.l)} في النسخة الرقمية للكتاب</small></div>`).join('')}</div>` : '')
      + ((M.length || T.length) ? `<div class="pd-sec"><h4>الحركة من المدينة</h4>${M.map(m => `<div class="actrow">من ${esc(m.f)} إلى ${esc(m.t)} <small>${esc(m.d)} · ${esc(m.c)} · موضع ${esc(m.l)} في النسخة الرقمية للكتاب</small></div>`).join('')}${T.map(x => `<div class="actrow"><b>حكم المحرّر وفق المعيار 21: ${esc(x.n)}</b> <small>${esc(x.m)} · ${esc(x.d)} · ${esc(x.e)}</small></div>`).join('')}</div>` : '');
  }
  function famCard(f) {
    const lineage = [f.t, f.b, f.c].filter(Boolean).join(' ← ');
    const hist = uniq(f.s.filter(s => s.k !== 'معاصر')), now = uniq(f.s.filter(s => s.k === 'معاصر'));
    const steps = uniq([...hist, ...now]);
    const route = steps.length ? steps.map((s, i) => `<span class="${s.k === 'معاصر' ? 'now' : (i === 0 ? 'first' : '')}">${esc(s.pf || s.p)}</span>`).join('<i>←</i>') : '<span>لا مواضع منصوصة</span>';
    const nowChips = now.length ? now.map(s => `<span class="tag go" data-goto="${esc(key(s.b, s.c))}">${esc(s.b)}</span>`).join('') : '<span class="tag">بالتواصل مع الأسرة</span>';
    return `<div class="band">${pattern}<span class="lin">${esc(lineage || 'الأنصار')}</span><i class="deg" style="--dc:${esc(degColor8(f))}" title="${esc(f.bs || 'لم تُعرف درجة الإثبات')}"></i></div>
      <div class="body">
        <h3>${esc(f.n)}</h3>
        ${f.gs && f.gs !== 'مدوّنات ووثائق تاريخية عن الأسرة.' ? `<p class="gs">${esc(f.gs)}</p>` : ''}
        ${f.pa ? `<div class="sub">فرع من ${esc(f.pa)}</div>` : ''}
        <div class="row">${f.o ? `<span class="tag origin">الأصل: ${esc(f.o.p)}</span>` : '<span class="tag">الأصل غير منصوص</span>'}</div>
        <div class="row"><span class="lbl">الحضور اليوم</span>${nowChips}</div>
        <div class="detail">
          <div class="route">${route}</div>
          <div class="basis" style="margin-top:8px"><b>${esc(f.bs)}</b>${f.bn ? ' · ' + esc(f.bn) : ''}</div>
          ${actsHTML(f.id)}
          ${f.dis ? '<p class="gs">اختُلف في نسبها بين المصادر.</p>' : ''}${/^[a-z0-9_]+$/i.test(f.id) ? `<button type="button" class="share-fam" data-share="${esc(f.id)}">انسخ رابط هذه الأسرة</button>` : ''}${f.via ? `<p class="gs">تُنقل عبر: ${esc(f.via)}</p>` : ''}${f.nt ? `<p class="gs">${esc(f.nt)}</p>` : ''}${f.subs && f.subs.length ? `<p class="gs">فروعها: ${esc(f.subs.join('، '))}</p>` : ''}
        </div>
        <div class="cite">في الكتاب: موضع ${esc(f.ln || '—')}${f.o && f.o.l ? ' · الأصل: موضع ' + esc(f.o.l) : ''}</div>
      </div>`;
  }
  function setList(list, label, famId) {
    LS.picked = true;
    st.list = famSort8(list.filter(Boolean));
    st.idx = Math.max(0, famId ? st.list.findIndex(f => f.id === famId) : 0);
    $('#crumb').innerHTML = `${st.list.length} ${st.list.length === 1 ? 'أسرة' : 'أسر'} · ${label}`;
    $('#track').innerHTML = st.list.map((f, i) => `<button class="fc" type="button" data-i="${i}" data-t="${tribeKey(f.t)}" aria-label="${esc(f.n)}">${famCard(f)}</button>`).join('');
    layout();
    pileRender8();
    pickedSync8();
  }
  /* الفقاعة المتحركة: الخيار المختار يُبرز بفقاعة تنزلق تحت الكلمة */
  function bubbleSync() {
    document.querySelectorAll('.mseg').forEach(g => {
      let bub = g.querySelector(':scope > .bub');
      if (!bub) { bub = document.createElement('i'); bub.className = 'bub'; bub.setAttribute('aria-hidden', 'true'); g.prepend(bub); }
      const on = g.querySelector(':scope > button.on');
      if (!on || !on.offsetWidth) { bub.style.opacity = '0'; return; }
      bub.style.opacity = '1';
      bub.style.width = on.offsetWidth + 'px'; bub.style.height = on.offsetHeight + 'px';
      bub.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
    });
  }
  document.addEventListener('click', () => requestAnimationFrame(bubbleSync), true);
  addEventListener('resize', bubbleSync);
  /* كومة الأسر: عند الموضع الكثير الأسر تُعرض كومة، وعند الضغط تتفرّق أسماؤها لتقفز إلى أي أسرة مباشرة */
  function pileRender8() {
    const pb = $('#pilebox'); if (!pb) return;
    if (st.list.length < 2) { pb.hidden = true; pb.innerHTML = ''; return; }
    pb.hidden = false;
    pb.innerHTML = `<button type="button" class="pile" id="pileBtn" aria-expanded="false"><span class="pl pl1" aria-hidden="true"></span><span class="pl pl2" aria-hidden="true"></span><span class="pl pl3" aria-hidden="true"></span><b>${st.list.length} أسرة في هذا الموضع</b><small>اضغط لتفريقها</small></button>`
      + `<div class="fan" id="fan" role="group" aria-label="أسر هذا الموضع">${st.list.map((f, i) => `<button type="button" class="fanc" data-fi="${i}" data-t="${tribeKey(f.t)}" style="--d:${Math.min(i, 14) * 22}ms">${esc(f.n)}</button>`).join('')}</div>`;
  }
  $('#pilebox').addEventListener('click', e => {
    const pb = e.target.closest('#pileBtn');
    if (pb) {
      const fan = $('#fan'), open = !fan.classList.contains('open');
      fan.classList.toggle('open', open); pb.setAttribute('aria-expanded', String(open));
      return;
    }
    const fc = e.target.closest('.fanc');
    if (fc) {
      st.idx = +fc.dataset.fi; layout();
      $('#fan').classList.remove('open'); $('#pileBtn').setAttribute('aria-expanded', 'false');
    }
  });
  /* بعد أي اختيار: تظهر البطاقات وتتحدث الخريطة المفتوحة فورًا */
  function pickedSync8() {
    const d = document.querySelector('.fam-dock'); if (d) d.hidden = mapQuiet();
    if (!$('#sheet').hidden) drawMaps();
  }
  function layout() {
    const n = st.list.length, w = Math.min(340, innerWidth * .82);
    [...$('#track').children].forEach((el, i) => {
      const o = i - st.idx, a = Math.abs(o);
      el.style.transform = `translateX(${-o * w * (innerWidth < 600 ? .78 : .62)}px) translateZ(${-a * 60}px) rotateY(${Math.max(-3, Math.min(3, o)) * 14}deg) scale(${1 - Math.min(a, 3) * .12})`;
      el.style.opacity = a > 3 ? 0 : (a === 0 ? 1 : .78 - a * .12);
      el.style.zIndex = 100 - a; el.style.pointerEvents = a > 3 ? 'none' : 'auto';
      el.style.filter = a ? 'saturate(.7)' : 'none';
      el.classList.toggle('on', a === 0); el.tabIndex = a === 0 ? 0 : -1;
    });
    $('#counter').textContent = n ? `${st.idx + 1} من ${n}` : 'لا توجد أسر هنا';
    $('#prev').disabled = st.idx === 0; $('#next').disabled = st.idx >= n - 1;
    markHot8(); drawMaps(); saveHash();
  }
  const go = d => { st.idx = Math.max(0, Math.min(st.list.length - 1, st.idx + d)); layout(); };
  $('#prev').addEventListener('click', () => go(-1));
  $('#next').addEventListener('click', () => go(1));
  $('#track').addEventListener('click', e => {
    const t = e.target.closest('[data-goto]'); if (t) { e.stopPropagation(); selectPlace(t.dataset.goto, st.list[st.idx] && st.list[st.idx].id); return; }
    const c = e.target.closest('.fc'); if (c && +c.dataset.i !== st.idx) { st.idx = +c.dataset.i; layout(); }
  });
  $('#stage').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(1); if (e.key === 'ArrowRight') go(-1); });
  function swipe(el, cb) {
    let x0 = null;
    el.addEventListener('pointerdown', e => { if (e.target.closest('button.nav')) return; x0 = e.clientX; });
    el.addEventListener('pointerup', e => { if (x0 === null) return; const d = e.clientX - x0; x0 = null; if (Math.abs(d) > 40) cb(d); });
    el.addEventListener('pointercancel', () => x0 = null);
  }
  swipe($('#stage'), d => go(d > 0 ? -1 : 1));

  /* maps: a docked mini-map and a full sheet; both follow the active family */
  function routePts(f) {
    if (!f) return [];
    const pts = [];
    const add = (x, y) => { if (x == null) return; const l = pts[pts.length - 1]; if (!l || Math.hypot(l[0] - x, l[1] - y) > 1) pts.push([x, y]); };
    if (f.o) { const op = D.places.find(p => p.x != null && (p.p === f.o.p || f.o.p.indexOf(p.p) === 0)); if (op) add(op.x, op.y); }
    f.s.filter(s => s.k !== 'معاصر').forEach(s => add(s.x, s.y));
    f.s.filter(s => s.k === 'معاصر').forEach(s => add(s.x, s.y));
    return pts;
  }
  function fit(pts, pad, minW, ratio) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    if (!isFinite(x0)) { x0 = 0; y0 = 0; x1 = 1232; y1 = 600; }
    let w = Math.max(x1 - x0, minW), h = Math.max(y1 - y0, minW / ratio);
    if (w / h < ratio) w = h * ratio; else h = w / ratio;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [cx - w / 2 - pad, cy - h / 2 - pad, w + pad * 2, h + pad * 2];
  }
  function curve(pts) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * .18;
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${bx} ${by}`;
    }
    return d;
  }
  function paint(svg, big) {
    const f = st.list[st.idx];
    /* في «كل الأطلس» قبل اختيار موضع تبقى النقاط وحدها: لا مسارات ولا خطوط أسرة */
    const quiet = mapQuiet();
    const pts = quiet ? [] : routePts(f);
    const here = (LS.all ? D.places : D.places.filter(p => p.c === st.country)).filter(p => p.x != null);
    /* القياس بالتخطيط لا بالمربع المرسوم، لأن نافذة الخريطة تتحرك بتحويل أثناء فتحها */
    const box = svg.getBoundingClientRect(), bw = svg.clientWidth || box.width || (svg.parentElement && svg.parentElement.clientWidth) || 300, bh = svg.clientHeight || box.height || 160;
    const focus = (pts.length && !LS.all) ? pts : (LS.all ? here.filter(p => p.x < 700 && p.f.length) : here).map(p => [p.x, p.y]);
    let vb = fit(focus, big ? 30 : 18, big ? 160 : 90, bw / bh);
    if (big && MV.on && LS.mode !== 'layers') { const hh = MV.w * bh / bw; vb = [MV.cx - MV.w / 2, MV.cy - hh / 2, MV.w, hh]; }
    if (big) MV.lastVB = vb;
    svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' '));
    const k = vb[2] / bw;
    let html = `<path class="land" d="${D.land}" style="stroke-width:${.8 * k}px"/><path class="border" d="${D.border}" style="stroke-width:${.6 * k}px"/>`;
    const rOf = p => (LS.all && big ? 2.2 + Math.sqrt(p.f.length) * 1.1 : big ? 3.4 + Math.sqrt(p.f.length) * 1.6 : 3) * k;
    html += here.map(p => `<circle class="pin${key(p.p, p.c) === st.place ? ' here' : ''}${big ? ' hit' : ''}" data-k="${esc(key(p.p, p.c))}" cx="${p.x}" cy="${p.y}" r="${rOf(p)}"><title>${esc(p.p)} · ${p.f.length} أسرة</title></circle>`).join('');
    if (f && f.o && !quiet) {
      const op = D.places.find(q => q.x != null && q.p === f.o.p);
      if (op) f.s.filter(q => q.k === 'معاصر' && q.x != null).forEach(q => {
        if (Math.hypot(q.x - op.x, q.y - op.y) < 1) return;
        const mx = (op.x + q.x) / 2, my = (op.y + q.y) / 2 - Math.hypot(q.x - op.x, q.y - op.y) * .15;
        html += `<path class="direct" d="M${op.x} ${op.y} Q${mx} ${my} ${q.x} ${q.y}" style="stroke-width:${2.6 * k}px"/>`;
        if (big) html += `<text class="plab" x="${mx}" y="${my - 6 * k}" text-anchor="middle" font-size="${11 * k}" style="stroke-width:${3 * k}px;fill:var(--accent)">الأصل</text>`;
      });
    }
    if (pts.length > 1) html += `<path class="rt" d="${curve(pts)}" style="stroke-width:${2.4 * k}px;stroke-dasharray:${6 * k} ${5 * k}"/>`;
    pts.forEach((q, i) => { const last = i === pts.length - 1; html += `<circle class="${last ? 'rtnow' : 'rtdot'}" cx="${q[0]}" cy="${q[1]}" r="${(last ? 5.5 : 3.6) * k}" style="stroke-width:${1.5 * k}px"/>`; });
    if (big) html += placeLabelHTML(here.filter(p => p.tr <= 3).slice(0, 12).map(p => ({ x: p.x, y: p.y - 9 * k, t: p.p })), 12 * k, 2 * k);
    if (LS.all) {
      if (big) html += placeLabelHTML(here.slice().sort((a, b) => b.f.length - a.f.length).slice(0, 8).map(p => ({ x: p.x, y: p.y - 9 * k, t: p.p })), 12 * k, 3 * k);
    }
    svg.innerHTML = html;
  }
  function drawMaps() {
    if (typeof drawTopCities8 === 'function') drawTopCities8();
    if (LS.mode === 'layers' && !$('#sheet').hidden) updateChipCounts();
    const f = st.list[st.idx];
    if (!$('#sheet').hidden && LS.mode === 'layers') { paintLayers(); $('#sheetTitle').textContent = 'الطبقات والزمن'; }
    if (!$('#mini').hidden) paint($('#miniSvg'), false);
    $('#miniCap').textContent = f ? f.n : '';
    const dock = document.querySelector('.fam-dock'); if (dock) dock.hidden = mapQuiet();
    if (!$('#sheet').hidden && LS.mode !== 'layers') { paint($('#bigSvg'), true); $('#sheetTitle').textContent = LS.all ? 'كل الأطلس: نقاط وجود الأسر' : (f ? `${f.n}: من ${f.o ? f.o.p : 'أصل غير منصوص'} إلى اليوم` : 'الخريطة'); }
  }
  /* عرض يدوي للمدن والكل: سحب للتحريك، وعجلة للتكبير، ونقرتان مزدوجتان للعودة */
  const MV = { on: false, cx: 0, cy: 0, w: 0, lastVB: null, drag: null };
  let lastFocus = null;
  /* الخريطة تفتح على «كل الأطلس» (نقاط وجود الأسر كلها)، إلا إذا طُلب وضع آخر، مثل أسرة محددة من البحث أو الشجرة */
  function openMap(m) {
    lastFocus = document.activeElement;
    const wasHidden = $('#sheet').hidden;
    $('#sheet').hidden = false; $('#mini').hidden = true;
    if (wasHidden) winPlay('#sheet');
    setMapMode(typeof m === 'string' ? m : 'city'); $('#closeMap').focus();
    requestAnimationFrame(() => { drawMaps(); bubbleSync(); });
  }
  function closeMap() { $('#sheet').hidden = true; $('#mini').hidden = false; drawMaps(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('#openMap').addEventListener('click', () => openMap('all'));
  $('#mini').addEventListener('click', () => openMap('all'));
  $('#closeMap').addEventListener('click', closeMap);
  $('#scrim').addEventListener('click', closeMap);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeMap(); });
  /* مواضع متراكبة: النقرة الأولى تختار الأعلى، والتالية تنتقل إلى ما تحته */
  $('#bigSvg').addEventListener('click', e => {
    const c0 = e.target.closest('[data-k]');
    // نقرة بلا إحداثيات (لوحة المفاتيح أو حدث مُرسل): تكفي المدينة التي تحت المؤشر
    if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) { if (c0) selectPlace(c0.getAttribute('data-k')); return; }
    const hits = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el.hasAttribute && el.hasAttribute('data-k') && el.closest('#bigSvg'));
    // كل المواضع داخل دائرة اللمس، لا التي تحت المؤشر وحده: المتقاربة تُعدّ معًا
    const near = [...document.querySelectorAll('#bigSvg [data-k]')].filter(el => { const r = el.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY) <= 18; });
    if (!hits.length && !near.length) { if (c0) selectPlace(c0.getAttribute('data-k')); return; }
    const keys = [...new Set((near.length ? near : hits).map(h => h.getAttribute('data-k')))];
    let k = hits.length ? hits[0].getAttribute('data-k') : keys[0];
    // الترتيب ثابت بالاسم لا بترتيب الرسم، فلا تتبدّل النقرات بعد كل اختيار
    if (keys.length > 1 && keys.includes(st.place)) { const sorted = [...keys].sort((a, b) => a.localeCompare(b, 'ar')); k = sorted[(sorted.indexOf(st.place) + 1) % sorted.length]; }
    if (MV.lastVB && !MV.on) { const vb = MV.lastVB; MV.cx = vb[0] + vb[2] / 2; MV.cy = vb[1] + vb[3] / 2; MV.w = vb[2]; MV.on = true; }
    selectPlace(k);
  });
  $('#bigSvg').addEventListener('dblclick', () => { MV.on = false; drawMaps(); });

  /* search */
  const norm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  const groups = D.groups.filter(g => g.t !== 'غير مذكور');
  $('#q').addEventListener('input', () => {
    const q = norm($('#q').value.trim()), box = $('#results');
    if (q.length < 2) { box.hidden = true; return; }
    const fr = D.fams.filter(f => norm(f.n).includes(q)).slice(0, 6).map(f => ({ t: 'f', id: f.id, label: f.n, sub: 'أسرة' }));
    const pr = D.places.filter(p => norm(p.p).includes(q)).slice(0, 5).map(p => ({ t: 'p', id: key(p.p, p.c), label: p.p, sub: p.c }));
    const gr = groups.map((g, i) => ({ g, i })).filter(({ g }) => norm(g.b || g.t).includes(q)).map(({ g, i }) => ({ t: 'g', id: i, label: g.b || g.t, sub: 'بطن' }));
    const er = Object.entries(D.people || {}).filter(([id, p]) => norm(p.name).includes(q)).slice(0, 5).map(([id, p]) => ({ t: 'e', id, label: p.name, sub: 'شخص' }));
    const rr = ALLR.filter(r => norm(r.n).includes(q)).slice(0, 5).map(r => ({ t: 'r', id: r.id, label: r.n, sub: 'سجل' }));
    const all = [...fr, ...er, ...rr, ...pr, ...gr];
    box.innerHTML = all.length ? all.map(r => `<button type="button" data-t="${r.t}" data-id="${esc(r.id)}"><span>${esc(r.label)}</span><small>${esc(r.sub)}</small></button>`).join('') : '<div class="muted" style="padding:8px 10px">لا نتائج</div>';
    box.hidden = false;
  });
  $('#results').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; $('#results').hidden = true; $('#q').value = '';
    if (b.dataset.t === 'p') selectPlace(b.dataset.id);
    if (b.dataset.t === 'e') { openPerson(b.dataset.id); }
    if (b.dataset.t === 'r') { showRecById(b.dataset.id); }
    if (b.dataset.t === 'g') { showGroup(+b.dataset.id); }
    if (b.dataset.t === 'f') {
      const f = byId[b.dataset.id], s = f.s.find(x => x.k === 'معاصر') || f.s[0];
      if (s && placeBy[key(s.b, s.c)]) selectPlace(key(s.b, s.c), f.id); else setList([f], 'نتيجة البحث');
    }
    openMap();
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) $('#results').hidden = true; });

  /* clans arc */
  function basisBar(g) {
    const fs = D.fams.filter(f => gkey(f) === gkey({ t: g.t, b: g.b }));
    const c = {}; fs.forEach(f => { c[f.bs] = (c[f.bs] || 0) + 1; });
    return Object.entries(c).map(([k, v]) => `<i style="width:${(v / (fs.length || 1) * 100).toFixed(1)}%;background:${BCOL[k] || '#a8977a'}" title="${esc(k)}: ${v}"></i>`).join('');
  }
  function showGroup(i) {
    const g = groups[i]; st.place = null; drawStrip();
    setList(D.fams.filter(f => (f.t || 'غير مذكور') === g.t && (f.b || '') === g.b), `من <b>${esc(g.b || g.t)}</b>`);
    setGF(gkey({ t: g.t, b: g.b }));
  }


  /* library ring */
  let books = D.studies; let ri = 0; let libQuery = ''; let libCat = '';
  const catLabel = c => (c || 'أخرى').split(':')[0].trim();
  /* التصنيفات القليلة (أقل من ثلاثة كتب) تجتمع تحت «أخرى» حتى لا تزدحم الأزرار */
  const CAT_N = new Map();
  D.studies.forEach(b => { const k = catLabel(b.cat); CAT_N.set(k, (CAT_N.get(k) || 0) + 1); });
  const catKey = b => { const k = catLabel(b.cat); return CAT_N.get(k) >= 3 ? k : 'أخرى'; };
  function applyLib() {
    books = D.studies.filter(b => (!libCat || catKey(b) === libCat) && (!libQuery || norm(b.title + ' ' + (b.author || '')).includes(libQuery)));
    ri = 0; drawRing();
    document.querySelectorAll('#libCats [data-lc]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.lc === libCat)));
  }
  function drawLibCats() {
    const counts = new Map();
    D.studies.forEach(b => { const k = catKey(b); counts.set(k, (counts.get(k) || 0) + 1); });
    const keys = [...counts.keys()].sort((a, c) => counts.get(c) - counts.get(a) || a.localeCompare(c, 'ar'));
    $('#libCats').innerHTML = [`<button type="button" class="chipb" data-lc="" aria-pressed="${!libCat}">الكل · ${D.studies.length}</button>`]
      .concat(keys.map(k => `<button type="button" class="chipb" data-lc="${esc(k)}" aria-pressed="${libCat === k}">${esc(k)} · ${counts.get(k)}</button>`)).join('');
  }
  $('#libCats').addEventListener('click', e => { const b = e.target.closest('[data-lc]'); if (!b) return; libCat = b.dataset.lc; applyLib(); });
  drawLibCats();
  function drawRing() {
    $('#ring').innerHTML = books.map(b => `<div class="bk"><span class="spine"></span><span class="bc">${esc(b.cat)}</span><span class="bt">${esc(b.title)}</span><span class="ba">${esc(b.author || 'المؤلف غير مثبت')}${b.year ? ' · ' + esc(b.year) : ''}</span></div>`).join('');
    layoutRing();
  }
  function layoutRing() {
    if (!books.length) { $('#ring').innerHTML = ''; $('#bookNote').textContent = 'لا كتب تطابق البحث'; return; }
    const n = books.length, step = 360 / n, radius = Math.round(100 / Math.tan(Math.PI / n)) + 24;
    [...$('#ring').children].forEach((el, i) => { el.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`; el.classList.toggle('on', i === ri); });
    $('#ring').style.transform = `translateZ(${-radius}px) rotateY(${-ri * step}deg)`;
    const b = books[ri]; $('#bookNote').textContent = [b.src, b.note].filter(Boolean).join(' · ');
  }
  const rgo = d => { if (!books.length) return; ri = (ri + d + books.length) % books.length; layoutRing(); };
  $('#rprev').addEventListener('click', () => rgo(-1));
  $('#rnext').addEventListener('click', () => rgo(1));
  swipe($('#ringbox'), d => rgo(d > 0 ? -1 : 1));


  /* الطبقات والزمن: كل نقاط الأطلس على الخريطة، مع الطبقة والعصر والزمن */
  const $$ = s => [...document.querySelectorAll(s)];
  const LS = { mode: 'city', lay: new Set(D.layers.map(l => l.key)), era: 'all', year: 15, undated: true, src: 'all', picked: false };
  const ERAS = [['all', 'كل العصور'], ['e0', 'قبل الإسلام'], ['e1', 'ق1–5هـ'], ['e2', 'ق6–10هـ'], ['e3', 'ق11–13هـ'], ['e4', 'ق14هـ والمعاصر']];
  const eraOf = p => { if (p.l === 'L6') return 'e4'; const c = p.c; if (c == null) return null; return c === 0 ? 'e0' : c <= 5 ? 'e1' : c <= 10 ? 'e2' : c <= 13 ? 'e3' : 'e4'; };
  /* قبل اختيار موضع أو أسرة: خريطة النقاط وحدها، بلا بطاقات أسر ولا مسارات (في الكل والطبقات والزمن) */
  function mapQuiet() { return !LS.picked; }
  const eraOk = p => LS.era === 'all' || eraOf(p) === LS.era;
  LS.yfrom = 0;
  const cLabel = v => v >= 15 ? 'الآن' : v === 0 ? 'قبل الإسلام' : 'ق' + v + 'هـ';
  const yearOk = p => p.c == null ? (LS.undated || LS.year >= 15) : (LS.year >= 15 || p.c <= LS.year) && p.c >= LS.yfrom;
  const GF = { g: null };
  let GFIDS = new Set();
  const ptOkNoLay = p => eraOk(p) && yearOk(p)
    && (LS.src !== 'fam' || p.k === 'fam')
    && (!GF.g || (p.fid && GFIDS.has(p.fid)))
    && inSpread(p)
    && !LS8.br.has(p.l + '|' + p.b);
  const ptOk = p => LS.lay.has(p.l) && ptOkNoLay(p);
  /* عدّاد كل طبقة يتبع المرشّحات الحالية (العصر والزمن والنوع)، بلا تغيير الطبقات المختارة */
  function updateChipCounts() {
    $$('#layerchips .lchip').forEach(b => { const sm = b.querySelector('small'); if (sm) sm.textContent = D.pts.filter(p => p.l === b.dataset.l && ptOkNoLay(p)).length; });
  }
  const LCOL = Object.fromEntries(D.layers.map(l => [l.key, l.color]));
  const LNAME = Object.fromEntries(D.layers.map(l => [l.key, l.short]));
  function drawLayerChips() {
    $('#layerchips').innerHTML = D.layers.map(l => `<button class="lchip" type="button" data-l="${esc(l.key)}" aria-pressed="${LS.lay.has(l.key)}"><i style="background:${esc(l.color)}"></i>${esc(l.short)} <small>${D.pts.filter(p => p.l === l.key).length}</small></button>`).join('');
  }
  function drawEraChips() {
    $('#erachips').innerHTML = ERAS.map(([k, l]) => `<button class="chipb" type="button" data-era="${k}" aria-pressed="${LS.era === k}">${esc(l)}</button>`).join('');
  }
  function paintLayersOld() {
    const svg = $('#bigSvg'), vis = D.pts.map((p, i) => [p, i]).filter(([p]) => ptOk(p));
    const box = svg.getBoundingClientRect(), bw = box.width || 300, bh = box.height || 200;
    const focus = vis.length ? vis.map(([p]) => [p.x, p.y2]) : D.pts.map(p => [p.x, p.y2]);
    const vb = fit(focus, 30, 200, bw / bh);
    svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' '));
    const k = vb[2] / bw;
    let html = `<path class="land" d="${D.land}" style="stroke-width:${.8 * k}px"/><path class="border" d="${D.border}" style="stroke-width:${.6 * k}px"/>`;
    html += vis.map(([p, i]) => `<circle class="lpt" data-pi="${i}" cx="${p.x}" cy="${p.y2}" r="${3.4 * k}" fill="${esc(LCOL[p.l] || '#888')}" style="stroke-width:${.6 * k}px"><title>${esc(p.n)}</title></circle>`).join('');
    svg.innerHTML = html;
    $('#ylab').textContent = (LS.yfrom > 0 ? 'من ' + cLabel(LS.yfrom) + ' ' : '') + (LS.year >= 15 ? (LS.yfrom > 0 ? 'إلى الآن' : 'كل العصور') : 'حتى ' + cLabel(LS.year));
    $('#yfromlab').textContent = cLabel(LS.yfrom);
  }
  const nz = v => (v == null || v === 'None' || v === '') ? '' : String(v);
  function setMapMode(m) {
    MV.on = false;
    tlStop();
    LS.all = m === 'all';
    LS.mode = m === 'layers' ? 'layers' : 'city';
    $$('#mapmode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    $('#lctl').hidden = m !== 'layers';
    document.querySelector('.sheet .panel').style.height = m === 'layers' ? 'min(92vh, 900px)' : '';
    document.querySelector('.sheet .legend').hidden = m === 'layers';
    drawMaps();
  }
  $('#mapmode').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) setMapMode(b.dataset.m); });
  $('#layerchips').addEventListener('click', e => {
    const b = e.target.closest('[data-l]'); if (!b) return;
    const k = b.dataset.l; LS.lay.has(k) ? LS.lay.delete(k) : LS.lay.add(k);
    drawLayerChips(); drawMaps();
  });
  $('#erachips').addEventListener('click', e => { const b = e.target.closest('[data-era]'); if (!b) return; LS.era = b.dataset.era; drawEraChips(); drawMaps(); });
  $('#srcmode').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    LS.src = b.dataset.s; $$('#srcmode button').forEach(x => x.classList.toggle('on', x === b)); drawMaps();
  });
  $('#year').addEventListener('input', e => { tlStop(); LS.year = +e.target.value; if (LS.yfrom > LS.year) { LS.yfrom = LS.year; $('#yfrom').value = LS.yfrom; } drawMaps(); });
  $('#yfrom').addEventListener('input', e => { tlStop(); LS.yfrom = +e.target.value; if (LS.yfrom > LS.year) { LS.year = LS.yfrom; $('#year').value = LS.year; } drawMaps(); });
  function tlStop() {
    if (LS.tl) clearInterval(LS.tl);
    LS.tl = null;
    const b = $('#yplay');
    if (b) { b.textContent = '▶ تشغيل الزمن'; b.setAttribute('aria-pressed', 'false'); }
  }
  /* تشغيل الزمن من أقدم القرون حتى «كل العصور»، ثم يتوقف */
  $('#yplay').addEventListener('click', () => {
    if (LS.tl) { tlStop(); return; }
    if (LS.year >= 15) LS.year = LS.yfrom;
    $('#yplay').textContent = '■ إيقاف';
    $('#yplay').setAttribute('aria-pressed', 'true');
    const step = () => { LS.year = Math.min(15, LS.year + 1); $('#year').value = LS.year; drawMaps(); if (LS.year >= 15) tlStop(); };
    step();
    if (LS.year < 15) LS.tl = setInterval(step, 900);
  });
  $('#lall').addEventListener('click', () => { LS.lay = new Set(D.layers.map(l => l.key)); drawLayerChips(); drawMaps(); });
  $('#lnone').addEventListener('click', () => { LS.lay = new Set(); drawLayerChips(); drawMaps(); });
  $('#lreset').addEventListener('click', () => {
    tlStop();
    LS.lay = new Set(D.layers.map(l => l.key)); LS.era = 'all'; LS.year = 15; LS.yfrom = 0; LS.undated = true; LS.src = 'all';
    $('#year').value = 15; $('#yfrom').value = 0; $('#undated').checked = true;
    $$('#srcmode button').forEach(x => x.classList.toggle('on', x.dataset.s === 'all'));
    drawLayerChips(); drawEraChips(); drawMaps();
  });
  $('#undated').addEventListener('change', e => { LS.undated = e.target.checked; drawMaps(); });
  $('#bigSvg').addEventListener('click', e => {
    const c = e.target.closest('[data-pi]'); if (!c) return;
    showPoint(+c.dataset.pi);
  });

  /* شجرة الأنساب: الجذور مجمّعة بالطبقة والبطن، وتحت كل جذر فروعه بالترتيب نفسه في الأطلس */
  const BCOL = { 'مصادر قديمة متعددة': '#1f6f4a', 'مصدر مدوّن': '#3f9b62', 'وثيقة أسرية مؤرخة': '#2b8a99', 'جد مسمّى في رواية الأسرة': '#c08a2e', 'فرع من أسرة مقبولة': '#ddb36a', 'نسبة أنصارية عامة': '#a8977a', 'رواية منقولة': '#8a6fb0', 'رواية متوارثة عن تدوين قديم': '#5e7a8a' };
  /* تعريف كل درجة إثبات بجملة واحدة، ويظهر التعريف في بطاقة الأسر */
  const DEG_DEF8 = {
    'مصادر قديمة متعددة': 'الانتساب مذكور في أكثر من مصدر قديم.',
    'مصدر مدوّن': 'الانتساب مذكور في مصدر مدوّن، دون جد مسمّى في رواية الأسرة.',
    'وثيقة أسرية مؤرخة': 'بيد الأسرة وثيقة مؤرخة تثبت الانتساب.',
    'جد مسمّى في رواية الأسرة': 'رواية الأسرة تسمّي جدًا أنصاريًا، ولا يرد فيها نفي صريح.',
    'فرع من أسرة مقبولة': 'فرع متصل بأسرة ثابتة النسبة، فيتبعها.',
    'رواية متوارثة عن تدوين قديم': 'رواية متوارثة، ويعود تدوينها إلى زمن قديم.',
    'رواية منقولة': 'ينقلها كتاب عن كتاب، ولا يرد فيها جد مسمّى.',
    'نسبة أنصارية عامة': 'تُنسب إلى الأنصار دون جد أو مصدر قديم يبيّنها، فتبقى مجردة.',
  };
  const degColor8 = f => (f && BCOL[f.bs]) || '#a8977a';
  const degLegend8 = () => `<div class="deg-legend"><h4>درجات الإثبات</h4><p class="muted">النقطة في زاوية البطاقة تبيّن درجة إثبات الأسرة. ولا نقطة للأسرة التي لم تُعرف درجتها.</p>`
    + Object.keys(BCOL).map(k => `<div class="dl-row"><i style="--dc:${esc(BCOL[k])}"></i><div><b>${esc(k)}</b> <small>${esc(DEG_DEF8[k] || '')}</small></div></div>`).join('') + '</div>';
  const kidsOf = {};
  D.fams.forEach(f => { if (f.par) (kidsOf[f.par] = kidsOf[f.par] || []).push(f.id); });
  const gkey = f => `${f.t || 'غير مذكور'} · ${f.b || 'بلا بطن مسمّى'}`;
  const TR = { q: '', bs: '', open: new Set(), mode: 'belly' };
  const famMatch = f => (!TR.bs || f.bs === TR.bs) && (!TR.q || norm(f.n).includes(TR.q));
  const subtreeOk = f => famMatch(f) || (kidsOf[f.id] || []).some(id => subtreeOk(byId[id]));
  let SPIDER6 = null;
  let HOTF = new Set();
  function treeNode(f, depth) {
    if (!subtreeOk(f)) return '';
    const kids = kidsOf[f.id] || [];
    const open = !!TR.q || TR.open.has(f.id);
    const inner = open ? kids.map(id => treeNode(byId[id], depth + 1)).join('') : '';
    const bulk = kids.length ? `<button class="tg" type="button" data-tg="${esc(f.id)}" aria-expanded="${open}" aria-label="${open ? 'طيّ' : 'توسيع'}">${open ? '−' : '+'}</button>` : '<span class="tg0"></span>';
    return `<div class="tn" style="--d:${depth}"><div class="tr${HOTF.has(f.id) ? ' hot' : ''}">${bulk}<span class="tdot" style="background:${esc(BCOL[f.bs] || '#a8977a')}"></span><span class="tnm">${esc(f.n)}</span>${f.sub ? `<small class="tsub">› ${esc(f.sub)}</small>` : ''}<small class="tmeta">${esc(f.bs)}${f.o ? ' · الأصل: ' + esc(f.o.p) : ''}</small><button class="tc" type="button" data-fid="${esc(f.id)}">بطاقة</button></div>${inner ? `<div class="tk">${inner}</div>` : ''}</div>`;
  }
  const TRIBE_RANK8 = ['الخزرج', 'الأوس'];
  const tribeOfF = f => f.t || 'غير مذكور';
  function drawTree() {
    const roots = D.fams.filter(f => !f.par);
    const rootOpen = !!TR.q || !!GF.g || TR.open.has('root');
    const allCount = roots.reduce((n, f) => n + 1 + countDesc(f.id), 0);
    let html = `<div class="tgp tg-root"><button class="tg tgl" type="button" data-tg="root" aria-expanded="${rootOpen}">${rootOpen ? 'إخفاء' : 'عرض'}</button><b>الأنصار</b> <span>${roots.length} أسرة جذر · ${allCount} أسرة في المجموع</span></div>`;
    let shown = 0;
    if (rootOpen) {
      const rk = t => { const i = TRIBE_RANK8.indexOf(t); return i < 0 ? 9 : i; };
      const tribes = [...new Set(roots.map(tribeOfF))].sort((x, y) => rk(x) - rk(y));
      tribes.forEach(t => {
        if (GF.g && GF.g.split(' · ')[0] !== t) return;
        const tf = roots.filter(f => tribeOfF(f) === t);
        const tOpen = !!TR.q || !!GF.g || TR.open.has('t:' + t);
        html += `<div class="tgp tg-tribe"><button class="tg tgl" type="button" data-tg="t:${esc(t)}" aria-expanded="${tOpen}">${tOpen ? 'إخفاء' : 'عرض'}</button><b>${esc(t)}</b> <span>${tf.length} أسرة جذر</span></div>`;
        if (!tOpen) return;
        const groups = {};
        tf.forEach(f => { const k = TR.mode === 'root' ? rootKey(f) : gkey(f); (groups[k] = groups[k] || []).push(f); });
        Object.keys(groups).sort((x, y) => groups[y].length - groups[x].length).forEach(k => {
          if (GF.g && k !== GF.g) return;
          const list = groups[k].filter(subtreeOk);
          if (!list.length) return;
          const open = !!TR.q || TR.open.has('g:' + k);
          const count = list.reduce((n, f) => n + 1 + countDesc(f.id), 0);
          shown += count;
          html += `<div class="tgp tg-group"><button class="tg tgl" type="button" data-tg="g:${esc(k)}" aria-expanded="${open}">${open ? 'إخفاء النتائج' : 'عرض النتائج'}</button>${TR.mode === 'root' ? (PID_BY_NAME[k] ? '⚑ ' : '') + '<small>الجد الصحابي</small> ' : ''}${esc(k)} <span>${list.length} أسرة جذر · ${count} أسرة في المجموع</span></div>`;
          if (open) html += list.map(f => treeNode(f, 0)).join('');
        });
      });
    }
    $('#tree').innerHTML = html;
    $('#treeNote').textContent = `${rootOpen ? shown : allCount} أسرة تظهر من أصل ${D.fams.length}${TR.mode === 'root' ? ` · ${D.fams.filter(f => f.c).length} أسرة لها جد صحابي مسمّى` : ''} · الألوان تدل على ثبوت النسب كما في البطاقات`;
  }
  function countDesc(id) { return (kidsOf[id] || []).reduce((n, c) => n + 1 + countDesc(c), 0); }
  $('#treeBasis').innerHTML = '<option value="">كل درجات الثبوت</option>' + [...new Set(D.fams.map(f => f.bs).filter(Boolean))].sort().map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  $('#treeBasis').addEventListener('change', e => { TR.bs = e.target.value; drawTree(); });
  $('#treeQ').addEventListener('input', e => { TR.q = norm(e.target.value.trim()); drawTree(); });
  $('#treeOpen').addEventListener('click', () => { TR.open.add('root'); D.fams.forEach(f => TR.open.add('t:' + tribeOfF(f))); D.fams.forEach(f => { if (kidsOf[f.id]) TR.open.add(f.id); }); D.fams.forEach(f => TR.open.add('g:' + gkey(f))); drawTree(); });
  $('#treeClose').addEventListener('click', () => { TR.open.clear(); drawTree(); });
  $('#tree').addEventListener('click', e => {
    const tg = e.target.closest('[data-tg]');
    if (tg) { const k = tg.dataset.tg; TR.open.has(k) ? TR.open.delete(k) : TR.open.add(k); drawTree(); return; }
    const tc = e.target.closest('[data-fid]');
    if (tc) {
      const f = byId[tc.dataset.fid], s = f.s.find(x => x.k === 'معاصر') || f.s[0];
      if (s && placeBy[key(s.b, s.c)]) selectPlace(key(s.b, s.c), f.id); else setList([f], 'من الشجرة');
      openMap();
    }
  });

  function setGF(key) {
    GF.g = key;
    GFIDS = new Set(key ? D.fams.filter(f => gkey(f) === key).map(f => f.id) : []);
    if (key) TR.open.add('g:' + key);
    drawTree(); drawMaps(); saveHash();
  }
  function clearGF() { setGF(null); }
  /* الموسوعة: الصحابة والأعلام، والبطون، والأسر، والمصادر، وبطاقة الشخص */
  const CATL = { badr: 'بدري', badr_disputed: 'بدري (مختلف فيه)', companion: 'صحابي', notable: 'عَلَم', group: 'تكتل ذرية' };
  const CATC = { badr: '#b07d1a', badr_disputed: '#d6a94e', companion: '#2f6b4f', notable: '#3f5f8a', group: '#7a4f8f' };
  const CATS = [['all', 'الكل'], ['badr', '★ البدريون'], ['badr_disputed', '☆ بدري مختلف فيه'], ['companion', 'صحابة'], ['notable', 'أعلام'], ['group', 'تكتلات الذرية']];
  /* لون الصحابي: لون قبيلته، ثم درجة منه تميّز شهوده: العقبة الأولى، ثم الثانية، ثم بدر */
  const SRCQ8 = {};
  D.pts.forEach(q => { if (q.id && q.srcs && q.srcs.length) (SRCQ8[q.id] = SRCQ8[q.id] || []).push(...q.srcs); });
  const TINT8 = {
    kh: { base: '#3f9c86', a1: '#2e9e87', a2: '#6fe0c4', b: '#d2fbef' },
    aw: { base: '#9c7a33', a1: '#b8862c', a2: '#f0cf7a', b: '#fff1c9' },
    unk: { base: '#8fa39b', a1: '#8fa39b', a2: '#8fa39b', b: '#c9d6d0' },
    ally: { base: '#55655f', a1: '#55655f', a2: '#55655f', b: '#77867f' },
  };
  /* شهود العقبة الثانية: قائمة ابن هشام (تسمية من شهد العقبة)، معتمدة من المالك */
  const AQ2_8 = new Set(["U0155", "U0184", "U0288", "U0232", "U0164", "c:سعد بن معاذ", "c:رافع بن خديج", "U0324", "U0239", "U0292", "U0048", "c:حسان بن ثابت", "U0253", "U0169", "U0322", "U0123", "c:زياد بن لبيد البياضي", "U0220", "U0138", "U0313", "U0314", "U0334", "U0139", "U0331", "U0339", "U0315", "U0332", "U0273", "U0330", "c:جابر بن عبد الله بن عمرو بن حرام", "U0095", "U0342", "U0325", "U0255", "U0186", "U0271", "U0114"]);
  /* شهود العقبة الأولى (الاثنا عشر، بيعة النساء) كما في الطبقات الكبرى لابن سعد؛ الموجود منهم في الموسوعة */
  const AQ1_8 = new Set(['U0135', 'U0164', 'U0173', 'U0200', 'U0220', 'U0315', 'U0117', 'U0901', 'U0902', 'U0903', 'U0904', 'U0905']);
  const TRN8 = { kh: 'الخزرج', aw: 'الأوس', unk: 'قبيلة غير مذكورة في السجل', ally: 'حليف' };
  const EVL8 = { b: 'شهد بدرًا', a2: 'شهد العقبة الثانية', a1: 'شهد العقبة الأولى', gen: 'شهد العقبة (دون تعيين)', none: '' };
  function pInfo8(id) {
    const p = D.people[id]; if (!p) return null;
    const allyB = /حليف|حلفاء/.test(p.bc || '') && !/وحلفاؤهم/.test(p.bc || '');
    const tr = allyB ? 'ally' : p.tribe === 'الخزرج' ? 'kh' : p.tribe === 'الأوس' ? 'aw' : 'unk';
    // الاقتباس يُثبت ما يقوله؛ حقل «نفي» يعود إلى دعوى أخرى (كالبدر) فلا يُسقط شهادة العقبة
    const all = (SRCQ8[id] || []).map(x => x.q || '').join(' ');
    const isB = p.cat === 'badr' || p.cat === 'badr_disputed';
    const a2 = AQ2_8.has(id);
    const a1 = AQ1_8.has(id);
    const ev = isB ? 'b' : a2 ? 'a2' : a1 ? 'a1' : /العقب/.test(all) ? 'gen' : 'none';
    const key = ev === 'a1' || ev === 'a2' || ev === 'b' ? ev : 'base';
    const badrPart = EVL8[isB ? 'b' : ev] + (p.cat === 'badr_disputed' ? ' (مختلف فيه)' : '');
    const extra = isB && a2 ? EVL8.a2 : isB && a1 ? EVL8.a1 : '';
    const label = [TRN8[tr], extra ? badrPart + ' · ' + extra : badrPart].filter(x => x && x.trim() && x.trim()[0] !== '(').join(' · ');
    const coreKey = isB && a2 ? 'a2' : isB && a1 ? 'a1' : key;
    return { id, p, tr, ev, disp: p.cat === 'badr_disputed', ally: tr === 'ally', col: TINT8[tr][key], core: TINT8[tr][coreKey], label };
  }
  const ENC = { sec: 'people', cat: 'all', tribe: 'all', q: '' };
  const PEO = D.people || {};
  const pname = id => (PEO[id] && PEO[id].name) || (D.pnames[id] && D.pnames[id][0]) || id;
  const pBtn = id => `<button type="button" data-pp="${esc(id)}">${esc(pname(id).split(' (')[0])}</button>`;
  const famIdsOf = p => [...new Set((p.fam || []).filter(x => String(x).startsWith('st:')).map(x => x.split(':')[1]))].filter(id => byId[id]);
  function openPerson(pid) {
    const p = PEO[pid]; if (!p) return;
    LAST8.type = 'per'; LAST8.id = pid;
    const ups = []; let f = p.father; const seen = new Set([pid]);
    while (f && PEO[f] && !seen.has(f)) { ups.unshift(f); seen.add(f); f = PEO[f].father; }
    const kids = (p.kids || []).filter(k => PEO[k]);
    const grand = kids.flatMap(k => (PEO[k].kids || []).filter(g => PEO[g]));
    const desc = p.desc || [], fams = famIdsOf(p), recs = p.recs || [];
    const L = Object.fromEntries(D.layers.map(l => [l.key, l.short]));
    beginLayer(p.name);
    const stLine = (p.stn ? `<small>${esc(p.stn)}</small>` : '') + (p.cat_src ? ` <small>${esc(p.cat_src)}</small>` : '');
    const PI8 = pInfo8(pid) || { col: 'var(--line)', label: '' };
    $('#pdBody').innerHTML = `
      <div class="pt-line" style="background:${PI8.col}"></div>
      <div class="pd-sec"><span class="chipb" style="border-color:${CATC[p.cat] || 'var(--line)'}">${esc(CATL[p.cat] || '')}</span> <span class="chipb" style="border-color:${PI8.col}">${esc(PI8.label)}</span></div> ${stLine}
      <div class="pd-sec"><h4>النسب</h4>
        <div>القبيلة: ${p.tribe ? esc(p.tribe) : '<small>لم يُذكر في المصادر بعد</small>'}${p.tribe_src ? ` <small>— ${esc(p.tribe_src)}</small>` : ''}</div>
        <div>البطن: ${p.belly ? esc(p.belly) : '<small>لم يُذكر في المصادر بعد</small>'}${p.belly_src ? ` <small>— ${esc(p.belly_src)}</small>` : ''}</div>
        ${p.src ? `<div><small>${esc(p.src)}</small></div>` : ''}${p.desc_gap ? `<div><small>من ذرية ${esc(PEO[p.father] ? PEO[p.father].name.split(' (')[0] : '')} (لا ابنه مباشرة)</small></div>` : ''}</div>
      <div class="pd-sec"><h4>آباؤه في السجل</h4>${ups.length ? `<div class="li">${ups.map(pBtn).join('<span class="muted">←</span>')}</div>` : '<small>لا أب له في السجل</small>'}</div>
      <div class="pd-sec"><h4>أبناؤه${kids.length ? ` (${kids.length})` : ''}</h4>${kids.length ? `<div class="li">${kids.map(pBtn).join('')}</div>` : '<small>لا أبناء له في السجل</small>'}</div>
      <div class="pd-sec"><h4>أحفاده</h4>${grand.length ? `<div class="li">${grand.map(pBtn).join('')}</div>` : '<small>لا أحفاد له في السجل</small>'}</div>
      ${desc.length ? `<div class="pd-sec"><h4>ذريته في المصادر (${desc.length})</h4><div class="li">${desc.map(u => `<span>${esc(pname(u))}</span>`).join('')}</div></div>` : ''}
      ${fams.length ? `<div class="pd-sec"><h4>الأسر المنتسبة إليه اليوم</h4><div class="li">${fams.map(id => `<button type="button" data-fam="${esc(id)}">${esc(byId[id].n)}</button>`).join('')}</div></div>` : ''}
      ${recs.length ? `<div class="pd-sec"><h4>سجلاته في المكتبة</h4><div class="li">${recs.map(u => { const r = ALLREC[u]; return `<button type="button" data-rid="${esc(u)}">${esc((r && r.n) || u)}${r && r.l ? ` <small>· ${esc(LNAME[r.l] || '')}</small>` : ''}</button>`; }).join('')}</div></div>` : ''}`;
    PD_CUR = pid;
    const spreadN = new Set([...(p.desc || []), ...(p.fam || [])]).size;
    $('#pdBody').insertAdjacentHTML('beforeend', `<div class="pd-sec"><div class="li"><button type="button" data-tp="${pid}">في شجرة الأنساب</button>${spreadN ? `<button type="button" id="pdSpread">إظهار انتشار ذريته على الخريطة (${spreadN})</button>` : ''}</div></div><div class="pd-sec"><h4>شجرة ذريته</h4><div class="ptree">${treeSVG(pid)}</div></div>`);
    showLayer();
  }
  function closePerson() { closeDialog(); }
  /* بطاقة الأسرة: تُفتح كورقة فوق ما قبلها، وتحمل نسبها ومواضعها وفروعها والأعلام المنسوبين إليها */
  function openFamLayer(fid) {
    const f = byId[fid]; if (!f) return;
    LAST8.type = 'fam'; LAST8.id = fid;
    const people = Object.entries(PEO).filter(([, p]) => famIdsOf(p).includes(fid)).map(([id]) => id);
    const kids = D.fams.filter(x => x.par === fid);
    const parent = f.par ? byId[f.par] : null;
    const sec = (h, body) => body ? `<div class="pd-sec"><h4>${h}</h4>${body}</div>` : '';
    const chips = `<div class="pd-sec">${f.t ? `<span class="chipb" style="border-color:${TRIBE_C8(f.t)}">${esc(f.t)}</span> ` : ''}${f.b ? `<span class="chipb">${esc(f.b)}${f.sub ? ' › ' + esc(f.sub) : ''}</span> ` : '<span class="chipb nob">البطن: غير منسوب في السجل</span> '}${f.c ? `<span class="chipb">الجدّ المذكور: ${esc(f.c)}</span>` : ''}</div>`;
    const basis = `<p>${esc(f.bs || 'لم يُذكر نوع الثبوت')}</p>${f.gs ? `<small>${esc(f.gs)}</small>` : ''}${f.nt ? `<p><small>${esc(f.nt)}</small></p>` : ''}${f.ln ? `<small>موضع ${esc(String(f.ln))} من الكتاب</small>` : ''}`;
    const places = (f.s || []).map(x => `<li>${esc(x.p || '')}${x.c ? '، ' + esc(x.c) : ''}${x.k ? ` <small>· ${esc(x.k)}</small>` : ''}</li>`).join('');
    beginLayer(f.n);
    $('#pdBody').innerHTML = chips +
      sec('النسب', basis) +
      sec('الفرع من', parent ? `<div class="li"><button type="button" data-fam="${esc(parent.id)}">${esc(parent.n)}</button></div>` : '') +
      sec('فروعها', kids.length ? `<div class="li">${kids.map(k => `<button type="button" data-fam="${esc(k.id)}">${esc(k.n)}</button>`).join('')}</div>` : '') +
      sec('مواضعها', places ? `<ul class="famplaces">${places}</ul>` : '') +
      sec(`الأعلام المنسوبون إليها (${people.length})`, people.length ? `<div class="li">${people.map(pBtn).join('')}</div>` : '<small>لا أعلام منسوبون إليها في السجل</small>') +
      `<div class="pd-sec"><div class="li"><button type="button" class="pri" data-fmap="${esc(fid)}">أرِها على الخريطة والقائمة</button></div></div>`;
    showLayer();
  }
  function openFam(fid) {
    const f = byId[fid]; if (!f) return;
    const s = f.s.find(x => x.k === 'معاصر') || f.s[0];
    if (s && placeBy[key(s.b, s.c)]) selectPlace(key(s.b, s.c), f.id); else setList([f], 'من الموسوعة');
    openMap();
  }
  /* تقسيم الموسوعة: 40 عنصرًا في كل مرة، وزر لعرض الباقي. يعاد الضبط عند تغيّر القسم أو التصفية أو البحث */
  const ENC_PAGE = 40, ENC_N = { n: ENC_PAGE, key: '' };
  const ENC_G = { open: new Set() };
  const ENC_ORDER = ['badr', 'badr_disputed', 'companion', 'notable', 'group'];
  function encGroups(L, rowH) {
    const groups = new Map();
    L.forEach(x => { const c = x[1].cat || 'other'; if (!groups.has(c)) groups.set(c, []); groups.get(c).push(x); });
    const keys = [...groups.keys()].sort((a, b) => (ENC_ORDER.indexOf(a) < 0 ? 99 : ENC_ORDER.indexOf(a)) - (ENC_ORDER.indexOf(b) < 0 ? 99 : ENC_ORDER.indexOf(b)));
    if (ENC.q) keys.forEach(c => ENC_G.open.add(c));
    return keys.map(c => {
      const on = ENC_G.open.has(c), g = groups.get(c);
      return `<div class="eg${on ? ' on' : ''}"><button type="button" class="gg-h" data-eg="${esc(c)}" aria-expanded="${on}"><span class="gg-t"><b>${esc(CATL[c] || c)}</b> <small>${g.length} شخصًا</small></span><span class="gg-a">${on ? 'إخفاء' : 'عرض'}</span></button>${on ? `<div class="gg-b">${g.map(rowH).join('')}</div>` : ''}</div>`;
    }).join('');
  }
  function encPage() {
    const body = $('#encbody');
    const key = [ENC.sec, ENC.cat, ENC.tribe, ENC.q].join('|');
    if (key !== ENC_N.key) { ENC_N.n = ENC_PAGE; ENC_N.key = key; }
    const kids = [...body.children].filter(e => e.matches('button.ec, .actg'));
    kids.forEach((e, i) => { e.hidden = i >= ENC_N.n; });
    let row = $('#encMoreRow');
    if (!row) {
      row = document.createElement('div');
      row.id = 'encMoreRow';
      row.className = 'more-row';
      row.innerHTML = '<button type="button" id="encMore"></button>';
      body.after(row);
      $('#encMore').addEventListener('click', () => { ENC_N.n += ENC_PAGE; encPage(); });
    }
    const rest = kids.length - ENC_N.n;
    row.hidden = rest <= 0;
    $('#encMore').textContent = `عرض ${Math.min(ENC_PAGE, rest)} أخرى (${rest} متبقٍ)`;
  }
  function renderEnc() {
    const q = norm(ENC.q);
    $$('#encsec button').forEach(b => b.classList.toggle('on', b.dataset.s === ENC.sec));
    const people = ENC.sec === 'people';
    $('#enccat').hidden = !people;
    $('#enccat').innerHTML = CATS.map(([k, l]) => `<button class="chipb" type="button" data-cat="${k}" aria-pressed="${ENC.cat === k}">${l}</button>`).join('');
    const tribes = [...new Set(Object.values(PEO).map(p => p.tribe).filter(Boolean))].sort();
    $('#encTribe').innerHTML = `<option value="all">كل القبائل</option>${tribes.map(t => `<option value="${esc(t)}"${ENC.tribe === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}<option value="?"${ENC.tribe === '?' ? ' selected' : ''}>قبيلة غير مذكورة</option>`;
    let html = '', n = 0;
    if (people) {
      const L = Object.entries(PEO).filter(([id, p]) => (ENC.cat === 'all' || p.cat === ENC.cat)
        && (ENC.tribe === 'all' || (ENC.tribe === '?' ? !p.tribe : p.tribe === ENC.tribe))
        && (!q || norm(p.name).includes(q) || norm(p.belly || '').includes(q)))
        .sort((a, b) => (b[1].kids.length + b[1].desc.length + famIdsOf(b[1]).length) - (a[1].kids.length + a[1].desc.length + famIdsOf(a[1]).length) || a[1].name.localeCompare(b[1].name, 'ar'));
      n = L.length;
      const pH = ([id, p]) => {
        const c = [p.kids.length ? `أبناء ${p.kids.length}` : '', p.desc.length ? `ذرية ${p.desc.length}` : '', famIdsOf(p).length ? `أسر ${famIdsOf(p).length}` : ''].filter(Boolean).join(' · ') || 'بلا ذرية في السجل';
        return `<button class="ec" type="button" data-pp="${esc(id)}" style="--c:${(pInfo8(id) || {}).col || 'var(--line)'}"><span class="et">${esc(p.name.split(' (')[0])}</span><span class="em">${esc(CATL[p.cat] || '')} · ${esc(p.tribe || 'قبيلة غير مذكورة')}</span><span class="en">${esc(c)}</span></button>`;
      };
      html = ENC.cat === 'all' ? encGroups(L, pH) : L.map(pH).join('');
    } else if (ENC.sec === 'records') {
      const R = ALLR.filter(r => !q || norm(r.n).includes(q)).sort((a, b) => a.n.localeCompare(b.n, 'ar'));
      n = R.length;
      html = R.map(r => `<button class="ec" type="button" data-rid="${esc(r.id)}"><span class="et">${esc(r.n)}</span><span class="em">${esc(LNAME[r.l] || '')} · ${r.pl ? 'موضع على الخريطة' : 'بلا موضع على الخريطة'}</span><span class="en">${esc(r.b || '')}</span></button>`).join('');
    } else if (ENC.sec === 'bellies') {
      const G = D.groups.filter(g => (ENC.tribe === 'all' || (ENC.tribe === '?' ? g.t === 'غير مذكور' : g.t === ENC.tribe))
        && (!q || norm(g.b || g.t).includes(q)));
      n = G.length;
      html = G.map(g => { const bs = bellyPeople4(g.t, g.b); const badr = bs.filter(([, x]) => x.cat === 'badr').length; return `<button class="ec" type="button" data-gk="${esc(gkey({ t: g.t, b: g.b }))}"><span class="et">${esc(g.b || 'بلا بطن مسمّى')}</span><span class="em">${esc(g.t)}</span><span class="en">${[bs.length ? `${bs.length} صحابيًّا وعلمًا` : '', badr ? `${badr} بدريًّا` : '', `${g.n} أسرة`].filter(Boolean).join(' · ')}</span></button>`; }).join('');
    } else if (ENC.sec === 'families') {
      const Fs = famSort8(D.fams.filter(f => (ENC.tribe === 'all' || (ENC.tribe === '?' ? !f.t : f.t === ENC.tribe)) && (!q || norm(f.n).includes(q))));
      n = Fs.length;
      html = degLegend8() + Fs.map(f => `<button class="ec" type="button" data-fid="${esc(f.id)}"><i class="deg" style="--dc:${esc(degColor8(f))}" title="${esc(f.bs || 'لم تُعرف درجة الإثبات')}"></i><span class="et">${esc(f.n)}</span><span class="em">${f.pa ? 'فرع من ' + esc(f.pa) : esc(f.t || 'قبيلة غير مذكورة')}</span><span class="en">${esc([famKidsLine4(f), f.c ? 'الجد: ' + f.c.split(' ').slice(0, 4).join(' ') : ''].filter(Boolean).join(' · '))}</span></button>`).join('');
    } else if (ENC.sec === 'acts') {
      const rows = Object.entries(D.acts || {}).flatMap(([fid, L]) => L.map(a => Object.assign({ fid, fn: (byId[fid] || {}).n || fid }, a)))
        .filter(a => !q || norm(a.t).includes(q) || norm(a.fn).includes(q));
      n = rows.length;
      const cats = [...new Set(rows.map(a => a.c))];
      html = cats.map(c => {
        const L = rows.filter(a => a.c === c);
        return `<div class="actg"><h4>${esc(c)} <small>${L.length}</small></h4>` + L.map(a => `<button class="ec" type="button" data-fid="${esc(a.fid)}"><span class="et">${esc(a.t)}</span><span class="em">${esc(a.fn)}</span><span class="en">${esc(a.p)} · موضع ${esc(a.l)} في النسخة الرقمية للكتاب</span></button>`).join('') + '</div>';
      }).join('');
    } else {
      const S = D.sources.filter(s => !q || norm(s[0]).includes(q));
      n = S.length;
      html = S.map(s => `<button class="ec" type="button" data-src="${esc(s[0])}"><span class="et">${esc(s[0])}</span><span class="en">شاهد في ${s[1]} سجلًّا</span></button>`).join('');
    }
    $('#enccount').textContent = `${n} ${people ? 'شخصًا' : ENC.sec === 'bellies' ? 'بطنًا' : ENC.sec === 'families' ? 'أسرة' : ENC.sec === 'records' ? 'سجلًّا' : ENC.sec === 'acts' ? 'نشاطًا' : 'كتابًا'}`;
    $('#encbody').innerHTML = html || '<p class="muted">لا نتائج</p>';
    encPage();
    saveHash();
  }
  /* الموسوعة: سماء الصحابة، كل عنقود بطن، ولون كل نجمة لونُ قبيلتها ودرجتُه من شهودها، والحلفاء في عنقود باهت */
  function skyInit() {
    const cv = $('#skyCv'); if (!cv || !cv.getContext || !D.people) return;
    const host = cv.parentElement, tip = $('#skyTip'), ctx = cv.getContext('2d'), tg = $('#skyAlly');
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const PEO = Object.entries(D.people);
    const gm = {};
    PEO.forEach(([id, p]) => { const I = pInfo8(id); const k = I.ally ? 'الحلفاء' : (p.bc || 'بلا بطن'); (gm[k] = gm[k] || []).push(id); });
    const GR = Object.entries(gm).sort((x, y) => (x[0] === 'الحلفاء') - (y[0] === 'الحلفاء') || (x[0] === 'بلا بطن') - (y[0] === 'بلا بطن') || y[1].length - x[1].length);
    const T0 = performance.now();
    const tNow = now => (now - T0) / 1000;
    const gAt = gi => 0.3 + gi * 0.09;
    const clamp = u => Math.max(0, Math.min(1, u));
    let W = 1, H = 1, dpr = 1, stars = [], byId = {}, links = [], groups = [], bg = [], hovered = null, vis = true, raf = 0, showAlly = true;
    for (let i = 0; i < 180; i++) bg.push({ x: Math.random(), y: Math.random(), a: 0.15 + Math.random() * 0.35, s: 0.6 + Math.random() * 1.4, p: Math.random() * 6.28 });
    if (tg) tg.addEventListener('click', () => { showAlly = !showAlly; tg.setAttribute('aria-pressed', String(showAlly)); tg.textContent = showAlly ? 'إخفاء الحلفاء' : 'إظهار الحلفاء'; hovered = null; tip.hidden = true; kick(); });
    const vis2 = s => showAlly || !s.ally;

    function layout() {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const sc = Math.min(W, H) / 520, rx = W * 0.4, ry = H * 0.4;
      stars = []; byId = {}; groups = [];
      GR.forEach(([name, ids], gi) => {
        const th = gi * 2.39996 + 0.7, rr = Math.sqrt((gi + 0.5) / GR.length);
        const rc = (ids.length > 1 ? 9 + 6 * Math.sqrt(ids.length) : 0) * sc;
        const cx = Math.min(W - rc - 16, Math.max(rc + 16, W / 2 + rx * rr * Math.cos(th)));
        const cy = Math.min(H - rc - 30, Math.max(rc + 30, H / 2 + ry * rr * Math.sin(th)));
        groups.push({ name, gi, cx, cy, rc, n: ids.length, ally: name === 'الحلفاء' });
        ids.forEach((id, i) => {
          const q = ids.length === 1 ? 0 : Math.sqrt((i + 0.5) / ids.length), a = i * 2.39996;
          const I = pInfo8(id);
          const st = { id, name: I.p.name, label: I.label, belly: name, g: gi, ally: I.ally, x: cx + rc * q * Math.cos(a), y: cy + rc * q * Math.sin(a), ev: I.ev, disp: I.disp, col: I.col, core: I.core, ph: (i * 1.37 + gi) % 6.28 };
          stars.push(st); byId[id] = st;
        });
      });
      links = [];
      PEO.forEach(([id, p]) => { if (p.father && byId[p.father] && byId[id]) links.push([byId[p.father], byId[id]]); });
    }

    function draw(now) {
      const t = RM ? 8 : tNow(now);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const dawn = clamp(t / 1.4);
      ctx.fillStyle = '#eef6f2';
      for (const b of bg) { ctx.globalAlpha = b.a * (0.5 + 0.5 * Math.sin(t * b.s + b.p)) * dawn; ctx.fillRect(b.x * W, b.y * H, 1.3, 1.3); }
      ctx.lineWidth = 1;
      for (const [a, b] of links) {
        if (!vis2(a) || !vis2(b)) continue;
        const l = Math.min(clamp((t - gAt(a.g)) / 0.8), clamp((t - gAt(b.g)) / 0.8));
        if (l <= 0) continue;
        ctx.globalAlpha = 0.45 * l; ctx.strokeStyle = a.col;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const u = (t * 0.35 + a.ph) % 1;
        ctx.globalAlpha = l; ctx.fillStyle = '#fff6df';
        ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 1.6, 0, 6.2832); ctx.fill();
      }
      for (const s of stars) {
        if (!vis2(s)) continue;
        const l = clamp((t - gAt(s.g)) / 0.6);
        if (l <= 0) continue;
        const tw = 0.78 + 0.22 * Math.sin(t * 1.6 + s.ph);
        const hot = hovered === s.id;
        if (s.ally) {
          ctx.globalAlpha = l * tw * 0.5; ctx.fillStyle = s.col;
          ctx.beginPath(); ctx.arc(s.x, s.y, 1.8, 0, 6.2832); ctx.fill();
        } else if (s.ev === 'b' && s.disp) {
          ctx.globalAlpha = l * tw; ctx.strokeStyle = s.col; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(s.x, s.y, 3.6, 0, 6.2832); ctx.stroke();
        } else if (s.ev === 'b') {
          const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 12);
          hg.addColorStop(0, s.col + '88'); hg.addColorStop(1, s.col + '00');
          ctx.globalAlpha = l * tw; ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, 6.2832); ctx.fill();
          ctx.fillStyle = s.core; ctx.beginPath(); ctx.arc(s.x, s.y, 2.9, 0, 6.2832); ctx.fill();
        } else {
          const soloA = s.ev === 'a1' || s.ev === 'a2';
          ctx.globalAlpha = l * tw * (soloA ? 1 : 0.7); ctx.fillStyle = s.col;
          ctx.beginPath(); ctx.arc(s.x, s.y, soloA ? 2.5 : 2, 0, 6.2832); ctx.fill();
        }
        if (hot) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff6df'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 6.2832); ctx.stroke(); }
      }
      ctx.font = '600 12.5px ThmDisplay, Reem Kufi, Amiri, sans-serif'; ctx.textAlign = 'center';
      for (const g of groups) {
        if (g.ally ? !showAlly : g.n < 12) continue;
        const l = clamp((t - gAt(g.gi) - 0.4) / 0.6);
        if (l <= 0) continue;
        ctx.globalAlpha = l; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,16,13,.9)'; ctx.lineJoin = 'round';
        const yy = g.cy - g.rc - 12;
        ctx.strokeText(g.name, g.cx, yy); ctx.fillStyle = '#eef6f2'; ctx.fillText(g.name, g.cx, yy);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = 0;
      if (!vis) return;
      draw(now);
      if (!RM) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && vis && !RM) raf = requestAnimationFrame(frame); else if (RM) draw(performance.now()); }
    function refresh() { layout(); draw(performance.now()); kick(); }

    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 10;
      for (const s of stars) { if (!vis2(s)) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
      hovered = best ? best.id : null;
      if (!best) { tip.hidden = true; host.style.cursor = ''; }
      else {
        host.style.cursor = 'pointer'; tip.hidden = false;
        tip.textContent = best.name + ' · ' + (best.label || best.belly);
        tip.style.left = best.x + 'px'; tip.style.top = (best.y - 14) + 'px';
      }
      if (!RM) kick();
    });
    host.addEventListener('pointerleave', () => { tip.hidden = true; hovered = null; });
    host.addEventListener('click', () => { if (hovered) openPerson(hovered); });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(host);
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(host);
    else window.addEventListener('resize', refresh);
    refresh();
  }
  skyInit();
  $('#encsec').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { ENC.sec = b.dataset.s; renderEnc(); } });
  $('#enccat').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { ENC.cat = b.dataset.cat; renderEnc(); } });
  $('#encTribe').addEventListener('change', e => { ENC.tribe = e.target.value; renderEnc(); });
  $('#encQ').addEventListener('input', e => { ENC.q = e.target.value; renderEnc(); });
  $('#encbody').addEventListener('click', e => {
    const eg = e.target.closest('[data-eg]');
    if (eg) { const c = eg.dataset.eg; ENC_G.open.has(c) ? ENC_G.open.delete(c) : ENC_G.open.add(c); renderEnc(); return; }
    const rid0 = e.target.closest('[data-rid]'); if (rid0) { showRecById(rid0.dataset.rid); return; }
    const pp = e.target.closest('[data-pp]'); if (pp) { openPerson(pp.dataset.pp); return; }
    const fi = e.target.closest('[data-fid]'); if (fi) { openFamLayer(fi.dataset.fid); return; }
    const gk = e.target.closest('[data-gk]');
    if (gk) { setGF(gk.dataset.gk); $('#tree').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  });
  $('#pdBody').addEventListener('click', e => {
    if (e.target.closest('#pdSpread')) { setSpread(PD_CUR); return; }
    const rd = e.target.closest('[data-rid]'); if (rd) { closePerson(); showRecById(rd.dataset.rid); return; }
    const pp = e.target.closest('[data-pp]'); if (pp) { openPerson(pp.dataset.pp); return; }
    const fm = e.target.closest('[data-fmap]'); if (fm) { closePerson(); openFam(fm.dataset.fmap); return; }
    const fi = e.target.closest('[data-fam]'); if (fi) { openFamLayer(fi.dataset.fam); }
  });
  $('#pdlg').addEventListener('click', e => { if (e.target.closest('[data-close]')) closePerson(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#pdlg').hidden) { if (LAYERS.stack.length) popLayer(); else closeDialog(); } });
  /* المرحلة الثانية: عرض الجذور، وانتشار الذرية على الخريطة، وشجرة الذرية، وحفظ الحالة في الرابط */
  /* الانتشار التفصيلي: ذرية الجد كلها (الأبناء وأبناؤهم)، مع كل أسرهم وفروعها */
  const rootKey = f => f.c || 'بلا جد مسمّى';
  let SPREAD = null, SPREAD_PID = null, PD_CUR = null, saveT = null;
  function spreadSet(pid) {
    const ids = new Set(), fids = new Set(), seen = new Set();
    const addFam = fid => {
      if (fids.has(fid) || !byId[fid]) return;
      fids.add(fid);
      D.fams.filter(c => c.par === fid).forEach(c => addFam(c.id));
    };
    const walk = q => {
      if (!PEO[q] || seen.has(q)) return; seen.add(q);
      const p = PEO[q];
      (p.desc || []).forEach(u => ids.add(u));
      (p.fam || []).forEach(x => ids.add(x));
      famIdsOf(p).forEach(addFam);
      (p.kids || []).forEach(walk);
    };
    walk(pid);
    return { ids, fids, pid };
  }
  const inSpread = p => !SPREAD || SPREAD.ids.has(p.id) || (!!p.fid && SPREAD.fids.has(p.fid));
  function setSpread(pid) {
    if (!PEO[pid]) return;
    SPREAD = spreadSet(pid); SPREAD_PID = pid;
    closePerson();
    openMap(); setMapMode('layers');
    drawSpreadRow(); drawMaps();
  }
  function clearSpread() { SPREAD = null; SPREAD_PID = null; drawSpreadRow(); drawMaps(); }
  function drawSpreadRow() {
    const row = $('#spreadrow');
    if (!SPREAD) { row.innerHTML = ''; row.hidden = true; return; }
    const n = D.pts.filter(inSpread).length;
    row.hidden = false;
    row.innerHTML = `<button class="chipb" type="button" id="spreadx" aria-pressed="true">انتشار ذرية ${esc(PEO[SPREAD_PID].name.split(' (')[0])}: ${n} موضعًا ${SPREAD.fids.size} أسرة ✕</button>`;
  }
  $('#spreadrow').addEventListener('click', e => { if (e.target.closest('#spreadx')) clearSpread(); });

  /* شجرة الذرية: الجد الأعلى في السجل، ثم أبناؤه وأحفاده، وتحت كل شخص أسره المنتسبة */
  function treeSVG(pid) {
    let top = pid; const seen = new Set([pid]);
    while (PEO[top] && PEO[top].father && PEO[PEO[top].father] && !seen.has(PEO[top].father)) { top = PEO[top].father; seen.add(top); }
    let count = 0;
    function build(id, depth) {
      const p = PEO[id]; if (!p || count > 140) return null;
      count++;
      const node = { id, kind: 'p', kids: [] };
      if (depth < 5) (p.kids || []).filter(k => PEO[k]).forEach(k => { const c = build(k, depth + 1); if (c) node.kids.push(c); });
      famIdsOf(p).slice(0, 4).forEach(fid => node.kids.push({ id: fid, kind: 'f', kids: [] }));
      return node;
    }
    const root = build(top, 0);
    if (!root) return '';
    const NW = 150, NH = 34, GX = 18, GY = 58;
    let leaf = 0; const pos = [];
    function place(n, d) {
      n.d = d;
      if (!n.kids.length) { n.x = leaf * (NW + GX); leaf++; }
      else { n.kids.forEach(c => place(c, d + 1)); n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2; }
      pos.push(n);
    }
    place(root, 0);
    const W = Math.max(NW, leaf * (NW + GX)), H = (Math.max(...pos.map(n => n.d)) + 1) * GY + NH;
    let svg = '';
    pos.forEach(n => (n.kids || []).forEach(c => {
      const x1 = n.x + NW / 2, y1 = n.d * GY + NH, x2 = c.x + NW / 2, y2 = c.d * GY;
      svg += `<path class="ed" d="M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}"/>`;
    }));
    pos.forEach(n => {
      const y = n.d * GY;
      if (n.kind === 'p') {
        const name = PEO[n.id].name.split(' (')[0];
        const cur = n.id === pid ? ' cur' : '';
        svg += `<g data-pp="${esc(n.id)}" style="cursor:pointer"><rect class="nd${cur}" x="${n.x}" y="${y}" width="${NW}" height="${NH}" rx="10"/><text x="${n.x + NW / 2}" y="${y + 21}" text-anchor="middle">${esc(name.length > 20 ? name.slice(0, 19) + '…' : name)}</text></g>`;
      } else {
        const fam = byId[n.id];
        svg += `<g data-fam="${esc(n.id)}" style="cursor:pointer"><rect class="nd fm" x="${n.x}" y="${y}" width="${NW}" height="${NH}" rx="10"/><text x="${n.x + NW / 2}" y="${y + 21}" text-anchor="middle">${esc(fam ? (fam.n.length > 20 ? fam.n.slice(0, 19) + '…' : fam.n) : '')}</text></g>`;
      }
    });
    return `<svg viewBox="-6 -6 ${W + 12} ${H + 12}" width="${Math.min(W + 12, 2000)}" height="${H + 12}" role="img" aria-label="شجرة ذرية ${esc(PEO[pid].name)}">${svg}</svg>`;
  }

  /* عرض الجذور داخل الشجرة: حسب الجد الصحابي بدل البطن */
  $('#treeMode').addEventListener('change', e => {
    TR.mode = e.target.value;
    if (TR.mode === 'root' && GF.g) setGF(null);
    drawTree();
  });

  /* لا تُكتب حالة العرض في الرابط: يبقى الرابط نظيفًا، ويُحفظ فقط رابط الأسرة #fam-... عند فتحه */
  function saveHash() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      if (/^#fam-/.test(location.hash)) return;
      if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { /* بيئة مقيّدة */ } }
    }, 150);
  }
  function applyHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (![...h.keys()].length) return false;
    const legacy = ['t', 'g', 'e', 'c', 'p', 'f', 'r'].some(k => h.has(k));
    const nz = h.get('z'), nb = h.get('b'), ns = +h.get('s'), nx = h.get('x'), nq = h.get('q');
    if (nz) {
      const ti = AZ.tribes.findIndex(t => t.name === nz);
      if (ti >= 0) {
        azFocus(ti);
        const bi = nb ? D.bellies.bellies.findIndex(x => x.name === nb) : -1;
        if (bi >= 0) setTimeout(() => azBellyFocus(bi), 900);
        setTimeout(() => cmScrollTo($('#azCanvas')), 60);
      }
    }
    if (ns >= 1 && ns <= STAGES8.length) setTimeout(() => opGo8(ns - 1), 60);
    if (nx && byId[nx]) setTimeout(() => openFamLayer(nx), 350);
    if (nq && PEO[nq]) setTimeout(() => openPerson(nq), 350);
    if (h.get('t') === 'root') { TR.mode = 'root'; $('#treeMode').value = 'root'; }
    if (h.get('g') && TR.mode === 'belly') setGF(h.get('g'));
    if (h.get('e') && ['people', 'bellies', 'families', 'records', 'sources'].includes(h.get('e'))) { ENC.sec = h.get('e'); renderEnc(); }
    if (h.get('g') && TR.mode === 'belly' && !h.get('p') && !h.get('f')) {
      const fs = D.fams.filter(f => gkey(f) === GF.g);
      if (fs.length) setList(fs, `من <b>${esc(GF.g)}</b>`);
    }
    if (h.get('c') && D.places.some(p => p.c === h.get('c'))) selectCountry(h.get('c'));
    if (h.get('p') && placeBy[h.get('p')]) selectPlace(h.get('p'), h.get('f') || undefined);
    else if (h.get('f') && byId[h.get('f')]) openFam(h.get('f'));
    if (h.get('r') && ALLREC[h.get('r')]) showRecById(h.get('r'));
    return legacy;
  }
  /* المرحلة الثالثة: ألوان الخريطة الموحّدة، ومسار الأسرة المختارة مع خط أصلها */
  const LS3 = { col: 'layer', route: 'sel' };
  const PRES = p => /حضور/.test(p.sn || '') ? 'presence' : (/محطة/.test(p.sn || '') ? 'history' : 'other');
  const PCOL3 = { presence: '#0e7c86', history: '#3f5f8a', other: '#9aa5a0' };
  const PLAB3 = { presence: 'حضور اليوم', history: 'محطة تاريخية', other: 'أخرى' };
  function colOf3(p) {
    if (LS3.col === 'basis') { const f = p.fid && byId[p.fid]; return f ? (BCOL[f.bs] || '#a8977a') : '#c9cdca'; }
    if (LS3.col === 'presence') return PCOL3[PRES(p)];
    return LCOL[p.l] || '#888';
  }
  function drawColorLegend3() {
    const items = LS3.col === 'basis'
      ? [...Object.entries(BCOL).map(([k, c]) => [k, c]), ['نقطة بلا أسرة', '#c9cdca']]
      : LS3.col === 'presence'
        ? ['presence', 'history', 'other'].map(k => [PLAB3[k], PCOL3[k]])
        : D.layers.map(l => [l.short, l.color]);
    $('#colorlegend').innerHTML = items.map(([l, c]) => `<span><i style="background:${esc(c)}"></i>${esc(l)}</span>`).join('');
  }
  function routeSVG3(f, k) {
    if (!f || LS3.route !== 'sel') return '';
    let out = '';
    const op = f.o ? D.places.find(q => q.x != null && q.p === f.o.p) : null;
    const now = f.s.filter(q => q.k === 'معاصر' && q.x != null);
    if (op) now.forEach(q => {
      if (Math.hypot(q.x - op.x, q.y - op.y) < 1) return;
      const mx = (op.x + q.x) / 2, my = (op.y + q.y) / 2 - Math.hypot(q.x - op.x, q.y - op.y) * .15;
      out += `<path class="direct" d="M${op.x} ${op.y} Q${mx} ${my} ${q.x} ${q.y}" style="stroke-width:${2.6 * k}px"/>`;
      out += `<text class="plab" x="${mx}" y="${my - 6 * k}" text-anchor="middle" font-size="${11 * k}" style="stroke-width:${3 * k}px;fill:var(--accent)">الأصل</text>`;
    });
    const pts = routePts(f);
    if (pts.length > 1) out += `<path class="rt" d="${curve(pts)}" style="stroke-width:${2.4 * k}px;stroke-dasharray:${6 * k} ${5 * k}"/>`;
    pts.forEach((q, i) => { const last = i === pts.length - 1; out += `<circle class="${last ? 'rtnow' : 'rtdot'}" cx="${q[0]}" cy="${q[1]}" r="${(last ? 5.5 : 3.6) * k}" style="stroke-width:${1.5 * k}px"/>`; });
    return out;
  }
  /* الخريطة الموحّدة: تجميع المتقارب، ومسارات كل الأسر أو المختارة */
  const LS5 = { clus: true };
  let CLUSTERS = [];
  function routeAllSVG(k) {
    let out = '';
    const place = Object.fromEntries(D.places.filter(q => q.x != null).map(q => [q.p, q]));
    D.fams.forEach(f => {
      if (!f.o || !place[f.o.p]) return;
      const op = place[f.o.p];
      f.s.filter(q => q.k === 'معاصر' && q.x != null).forEach(q => {
        if (Math.hypot(q.x - op.x, q.y - op.y) < 1) return;
        const mx = (op.x + q.x) / 2, my = (op.y + q.y) / 2 - Math.hypot(q.x - op.x, q.y - op.y) * .15;
        out += `<path class="direct" d="M${op.x} ${op.y} Q${mx} ${my} ${q.x} ${q.y}" style="stroke-width:${1.1 * k}px;opacity:.6;stroke-dasharray:${4 * k} ${3 * k}"/>`;
      });
    });
    return out;
  }
  /* أعمدة الزمن: كم نقطة تظهر حتى كل خطوة، مع إبراز الخطوة الحالية */
  function drawTBars() {
    const el = $('#tbars'); if (!el) return;
    // الأعمدة للمؤرخ وحده، فالارتفاع يبيّن النمو الزمني؛ غير المؤرخ يُذكر في التلميح
    const keep = LS.year, dated = [], undated = [];
    for (let y = 0; y <= 15; y++) {
      LS.year = y;
      const vis = D.pts.filter(p => LS.lay.has(p.l) && ptOkNoLay(p));
      dated.push(vis.filter(p => p.c != null).length); undated.push(vis.filter(p => p.c == null).length);
    }
    LS.year = keep;
    const max = Math.max(1, ...dated), cur = Math.min(keep, 15);
    el.innerHTML = dated.map((c, y) => `<button type="button" class="tb${y === cur ? ' on' : ''}" data-y="${y}" style="--h:${Math.max(6, Math.round(c / max * 100))}%" aria-label="حتى ${y === 0 ? 'قبل الإسلام' : 'القرن ' + y + ' هـ'}: ${c} نقطة مؤرخة" title="${c} مؤرخة · ${undated[y]} غير مؤرخة"></button>`).join('');
  }
  $('#tbars').addEventListener('click', e => {
    const b = e.target.closest('[data-y]'); if (!b) return;
    tlStop(); LS.year = +b.dataset.y; $('#year').value = LS.year; drawMaps();
  });
  function lsumUpdate(vis) {
    const fams = new Set(vis.map(([p]) => p.fid).filter(Boolean));
    const places = new Set(vis.map(([p]) => p.pp).filter(Boolean));
    $('#lsum').textContent = vis.length ? `${vis.length} نقطة · ${fams.size} أسرة · ${places.size} موضعًا` : 'لا نقاط بهذه المرشّحات: وسّع الزمن أو العصر أو الطبقات';
    const atDefault = LS.lay.size === D.layers.length && LS.era === 'all' && LS.year >= 15 && LS.yfrom === 0 && LS.undated && LS.src === 'all';
    $('#lreset').disabled = atDefault;
  }
  function paintLayers() {
    const svg = $('#bigSvg'), vis = D.pts.map((p, i) => [p, i]).filter(([p]) => ptOk(p));
    const box = svg.getBoundingClientRect(), bw = box.width || 300, bh = box.height || 200;
    const focus = vis.length ? vis.map(([p]) => [p.x, p.y2]) : D.pts.map(p => [p.x, p.y2]);
    lsumUpdate(vis);
    drawTBars();
    const f = mapQuiet() ? null : st.list[st.idx];
    const extra = f && LS3.route === 'sel' ? routePts(f) : [];
    const vb = viewOf6(fit(focus.concat(extra), 30, 200, bw / bh));
    LS8.lastVB = vb;
    svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' '));
    const k = vb[2] / bw;
    let html = `<path class="land" d="${D.land}" style="stroke-width:${.8 * k}px"/><path class="border" d="${D.border}" style="stroke-width:${.6 * k}px"/>`;
    if (LS3.route === 'all') html += routeAllSVG(k);
    CLUSTERS = [];
    if (LS5.clus) {
      // شبكة بحجم ثابت نسبةً للعرض الحالي؛ النقاط في الخلية الواحدة تُجمع في عنقود
      const cell = vb[2] / 42, cells = new Map();
      vis.forEach(([p, i]) => {
        const key = Math.floor(p.x / cell) + ':' + Math.floor(p.y2 / cell);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push([p, i]);
      });
      cells.forEach(list => {
        if (list.length === 1) {
          const [p, i] = list[0];
          html += `<circle class="lpt" data-pi="${i}" cx="${p.x}" cy="${p.y2}" r="${3.4 * k}" fill="${esc(colOf3(p))}" style="stroke-width:${.6 * k}px"><title>${esc(p.n)}</title></circle>`;
          return;
        }
        const ci = CLUSTERS.length; CLUSTERS.push(list.map(([, i]) => i));
        const cx = list.reduce((s, [p]) => s + p.x, 0) / list.length, cy = list.reduce((s, [p]) => s + p.y2, 0) / list.length;
        const r = (4.5 + Math.sqrt(list.length) * 1.6) * k;
        html += `<g class="cl" data-cl="${ci}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--accent)" fill-opacity=".85" stroke="#fff" stroke-width="${.8 * k}"/><text x="${cx}" y="${cy + 3.5 * k}" text-anchor="middle" font-size="${10 * k}" style="fill:#fff;font-weight:700;paint-order:stroke;stroke:none">${list.length}</text><text x="${cx}" y="${cy + r + 10 * k}" text-anchor="middle" font-size="${10 * k}" style="fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:${3 * k}px">${esc(clusterName8(list))}</text><title>${list.length} نقطة في هذا الموضع</title></g>`;
      });
    } else {
      html += vis.map(([p, i]) => `<circle class="lpt" data-pi="${i}" cx="${p.x}" cy="${p.y2}" r="${3.4 * k}" fill="${esc(colOf3(p))}" style="stroke-width:${.6 * k}px"><title>${esc(p.n)}</title></circle>`).join('');
    }
    html += routeSVG3(f, k);
    html += labels6(vis, k) + recOverlay6(k);
    html += geoLabels6(k) + spiderSVG8(k);
    svg.innerHTML = html;
    $('#ylab').textContent = (LS.yfrom > 0 ? 'من ' + cLabel(LS.yfrom) + ' ' : '') + (LS.year >= 15 ? (LS.yfrom > 0 ? 'إلى الآن' : 'كل العصور') : 'حتى ' + cLabel(LS.year));
    $('#yfromlab').textContent = cLabel(LS.yfrom);
    drawColorLegend3();
  }
  function showClusterOld(ci) {
    const list = CLUSTERS[ci] || [];
    $('#ptcard').innerHTML = `<div class="pc"><div class="pch"><b>${list.length} نقطة في هذا الموضع</b></div><div class="pc-sec"><div class="li">${list.map(i => `<button type="button" data-pi="${i}">${esc(D.pts[i].n)}</button>`).join('')}</div></div></div>`;
    $('#ptcard').scrollTop = 0;
  }
  $('#clmode').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    LS5.clus = b.dataset.k === 'on'; $$('#clmode button').forEach(x => x.classList.toggle('on', x === b)); drawMaps();
  });
  $('#bigSvg').addEventListener('click', e => {
    const c = e.target.closest('[data-cl]'); if (c) { showCluster(+c.dataset.cl); }
  });
  $('#colormode').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    LS3.col = b.dataset.c; $$('#colormode button').forEach(x => x.classList.toggle('on', x === b)); drawMaps();
  });
  $('#routemode').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    LS3.route = b.dataset.r; $$('#routemode button').forEach(x => x.classList.toggle('on', x === b)); drawMaps();
  });
  $('#libQ').addEventListener('input', e => { libQuery = norm(e.target.value.trim()); applyLib(); });
  /* الشجرة الكاملة (الرسم): الجذر ← القبيلة ← البطن ← الصحابي ← الذرية والأسر ← الفروع والمحطات */
  const TG = { open: new Set(['T']), thr: false, vb: null, tree: null, seq: 0 };
  const GW4 = { root: 230, tribe: 190, belly: 220, person: 240, desc: 240, family: 240, branch: 270 };
  const GH4 = 40, RH4 = 56, CW4 = 310;
  const GCOL4 = { root: '#5b4636', tribe: '#9c4a2f', belly: '#2f6b4f', desc: '#7a4f8f', family: '#3f5f8a', branch: '#0e7c86' };
  const fitT4 = (t, w, px) => { const m = Math.floor((w - 40) / (px || 7.1)); return t.length > m ? t.slice(0, m - 1) + '…' : t; };
  function buildFullTree() {
    const root = { id: 'T', kind: 'root', label: 'الأنصار: الأوس والخزرج', kids: [], parent: null };
    const mk = (parent, kind, label, extra) => {
      const n = Object.assign({ id: kind + ':' + (++TG.seq), kind, label, kids: [], parent }, extra || {});
      parent.kids.push(n); return n;
    };
    const tribeN = {}, bellyN = {}, PN = {}, FN = {};
    const tribeNode = t => tribeN[t] || (tribeN[t] = mk(root, 'tribe', t === 'غير مذكور' ? 'قبيلة غير مذكورة' : t, { gap: t === 'غير مذكور', key: t === 'غير مذكور' ? 'غير مذكور' : t }));
    const bellyNode = (tn, b) => { const k = tn.id + '|' + (b || ''); return bellyN[k] || (bellyN[k] = mk(tn, 'belly', b || 'بطن غير مذكور', { gap: !b })); };
    const famsOf = pid => famIdsOf(PEO[pid]);
    function person(pid, seen) {
      if (PN[pid]) return PN[pid];
      const p = PEO[pid]; seen = seen || new Set(); seen.add(pid);
      const ally = /حليف|حلفاء/.test((p.belly || '') + ' ' + p.name);
      const parent = p.father && PEO[p.father] && !seen.has(p.father) ? person(p.father, seen)
        : bellyNode(ally ? tribeNode('حلفاء الأنصار') : tribeNode(p.tribe || 'غير مذكور'), p.bc || p.belly);
      return (PN[pid] = mk(parent, 'person', p.name, { pid, cat: p.cat }));
    }
    function fam(parent, fid, ancestors) {
      const f = byId[fid]; if (!f) return null;
      const n = mk(parent, 'family', f.n, { fid });
      (D.fams.filter(c => c.par === fid && !ancestors.has(c.id)).forEach(c => fam(n, c.id, new Set([...ancestors, fid]))));
      f.s.forEach(s => mk(n, 'branch', s.p, { sub: s.k === 'معاصر' ? 'حضور معاصر' : s.k === 'أصل' ? 'أصل' : 'محطة تاريخية', cur: s.k === 'معاصر' }));
      return n;
    }
    Object.keys(PEO).forEach(pid => person(pid));
    Object.entries(PEO).forEach(([pid, p]) => {
      (p.desc || []).forEach(u => { if (D.pnames[u]) mk(PN[pid], 'desc', (D.pnames[u][0] || u), { item: u }); });
      const ids = famsOf(pid);
      ids.forEach(fid => { const f = byId[fid]; if (f && (!f.par || !ids.includes(f.par))) fam(PN[pid], fid, new Set()); });
    });
    const attached = new Set();
    Object.keys(PEO).forEach(pid => famsOf(pid).forEach(f => attached.add(f)));
    D.fams.forEach(f => {
      if (f.par || attached.has(f.id)) return;
      fam(bellyNode(tribeNode(f.t || 'غير مذكور'), f.b || ''), f.id, new Set());
    });
    const cnt = n => {
      n.nFam = n.kind === 'family' ? 1 : 0; n.nPers = n.kind === 'person' && !n.gap ? 1 : 0; n.nBadr = n.kind === 'person' && PEO[n.pid] && PEO[n.pid].cat === 'badr' ? 1 : 0;
      n.kids.forEach(k => { cnt(k); n.nFam += k.nFam; n.nPers += k.nPers; n.nBadr += k.nBadr; });
    };
    cnt(root);
    const ORD = { person: 0, desc: 1, branch: 2, family: 3, belly: 0, tribe: 0 };
    const sortK = n => {
      n.kids.sort((a, b) => (a.gap - b.gap) || (ORD[a.kind] - ORD[b.kind]) || ((b.nFam * 3 + b.nPers) - (a.nFam * 3 + a.nPers)) || String(a.label).localeCompare(b.label, 'ar'));
      n.kids.forEach(sortK);
    };
    sortK(root);
    root.kids.forEach(k => TG.open.add(k.id));
    return root;
  }
  function visKids4(n) { if (!TG.open.has(n.id)) return []; return TG.thr ? n.kids.filter(k => k.nFam > 0 || k.kind === 'branch') : n.kids; }
  function layout4() {
    const vis = []; let row = 0;
    const lay = (n, d) => {
      const kids = visKids4(n);
      if (!kids.length) { n._y = row * RH4; row++; }
      else { kids.forEach(k => lay(k, d + 1)); n._y = (kids[0]._y + kids[kids.length - 1]._y) / 2; }
      n._x = -d * CW4; vis.push(n);
    };
    lay(TG.tree, 0);
    return vis;
  }
  function sub4(n) {
    if (n.kind === 'person') { const p = PEO[n.pid]; return [CATL[p.cat] || '', p.kids.length ? `أبناء ${p.kids.length}` : '', p.desc.length ? `ذرية ${p.desc.length}` : '', famIdsOf(p).length ? `أسر ${famIdsOf(p).length}` : ''].filter(Boolean).join(' · '); }
    if (n.kind === 'tribe' || n.kind === 'belly' || n.kind === 'root') return [n.nPers ? `${n.nPers} صحابيًّا وعلمًا` : '', n.nBadr ? `★${n.nBadr} بدريًّا` : '', n.nFam ? `${n.nFam} أسرة` : ''].filter(Boolean).join(' · ');
    if (n.kind === 'family') { const c = n.kids.filter(k => k.kind === 'family').length; return [c ? `${c} فرع` : '', (byId[n.fid] && byId[n.fid].gs) || ''].filter(Boolean).join(' · '); }
    if (n.kind === 'branch') return n.sub;
    if (n.kind === 'desc') return 'سجل ذرية في المكتبة';
    return '';
  }
  function drawGraph4() {
    if (!TG.tree) TG.tree = buildFullTree();
    const vis = layout4();
    const hotSet = new Set();
    for (let x = TG.sel ? findNode4(TG.tree, TG.sel) : null; x; x = x.parent) hotSet.add(x.id);
    const host = $('#tgsvg'), r = host.getBoundingClientRect();
    if (!TG.vb) TG.vb = { x: -r.width + 60, y: -r.height / 2, w: r.width, h: r.height };
    let links = '', nodes = '';
    vis.forEach(n => {
      const W = GW4[n.kind], x0 = n._x - W, col = GCOL4[n.kind] || '#888', has = n.kids.length > 0, open = TG.open.has(n.id);
      visKids4(n).forEach(k => {
        const a = x0, b = n._y, c = k._x, d = k._y;
        links += `<path class="glink${hotSet.has(k.id) ? ' hot' : ''}" d="M${a} ${b}C${a - 60} ${b} ${c + 60} ${d} ${c} ${d}"/>`;
      });
      const label = (n.gap ? 'فراغ: ' : '') + n.label, sub = sub4(n);
      nodes += `<g class="gnode${n.gap ? ' gap' : ''}${hotSet.has(n.id) ? ' hot' : ''}" data-n="${esc(n.id)}" transform="translate(${x0} ${n._y - GH4 / 2})">` +
        `<title>${esc(label)}${sub ? ' — ' + esc(sub) : ''}</title>` +
        `<rect class="gbox" width="${W}" height="${GH4}" rx="10" style="stroke:${n.gap ? 'var(--muted)' : col}"${n.gap ? ' stroke-dasharray="4 3"' : ''}/>` +
        (n.gap ? '' : `<rect x="${W - 6}" width="6" height="${GH4}" rx="3" fill="${col}"/>`) +
        `<text class="gt" x="${W - 14}" y="${sub ? 16 : 25}">${esc(fitT4(label, W))}</text>` +
        (sub ? `<text class="gs" x="${W - 14}" y="32">${esc(fitT4(sub, W + 14, 5.7))}</text>` : '') +
        (has ? `<g class="gtog" data-tog="${esc(n.id)}"><circle cx="13" cy="${GH4 / 2}" r="9.5" fill="${open ? 'var(--surface)' : col}" stroke="${col}" stroke-width="1.5"/><text x="13" y="${GH4 / 2 + 4}" text-anchor="middle" style="fill:${open ? col : '#fff'}">${open ? '−' : '+'}</text></g>` : '') +
        `</g>`;
    });
    host.innerHTML = `<svg viewBox="${TG.vb.x} ${TG.vb.y} ${TG.vb.w} ${TG.vb.h}" xmlns="http://www.w3.org/2000/svg"><g>${links}</g><g>${nodes}</g></svg>`;
  }
  function gSet4() { const s = $('#tgsvg svg'); if (s) s.setAttribute('viewBox', `${TG.vb.x} ${TG.vb.y} ${TG.vb.w} ${TG.vb.h}`); }
  function gFit4() {
    const vis = layout4(); if (!vis.length) return;
    const xs = vis.map(n => n._x - GW4[n.kind]), xe = vis.map(n => n._x);
    const x0 = Math.min(...xs) - 30, x1 = Math.max(...xe) + 30;
    const r = $('#tgsvg').getBoundingClientRect();
    // العرض يشمل الشجرة كلها أفقيًا، والمركز على الجذر والقبائل عموديًا؛ الباقي بالتمرير
    const top1 = vis.filter(n => Math.round(-n._x / CW4) <= 1);
    const cy = top1.reduce((s, n) => s + n._y, 0) / top1.length;
    const w = x1 - x0, h = w * r.height / Math.max(1, r.width);
    TG.vb = { x: x0, y: cy - h / 2, w, h };
    gSet4();
  }
  function gZoom4(f) {
    const nw = Math.min(9000, Math.max(250, TG.vb.w * f)), k = nw / TG.vb.w;
    const px = TG.vb.x + TG.vb.w / 2, py = TG.vb.y + TG.vb.h / 2;
    TG.vb.x = px - (px - TG.vb.x) * k; TG.vb.y = py - (py - TG.vb.y) * k; TG.vb.w = nw; TG.vb.h *= k; gSet4();
  }
  /* المدارات: الأنصار في المركز، والقبيلتان على المدار الأول، والبطون على الثاني، وأسر البطن المختار تدور على الخارجي */
  const ORB = { sel: null, basis: null };
  function orbitRender8() {
    const svg = $('#torb'); if (!svg) return;
    orbGapRender8();
    const BB = D.bellies.bellies;
    const C = 300, R1 = 92, R2 = 196, R3 = 268;
    const pos = (a, r) => [C + r * Math.cos(a * Math.PI / 180), C + r * Math.sin(a * Math.PI / 180)];
    const tribes = [...new Set(BB.map(b => b.tribe))];
    const base = { 'الخزرج': -90, 'الأوس': 90 };
    let html = `<circle cx="${C}" cy="${C}" r="${R2}" class="orb-ring"/><circle cx="${C}" cy="${C}" r="${R3}" class="orb-ring o3"/>`;
    html += `<g class="orb-root"><circle cx="${C}" cy="${C}" r="46"/><text x="${C}" y="${C + 6}" text-anchor="middle">الأنصار</text></g>`;
    tribes.forEach(t => {
      const [x, y] = pos(base[t] ?? 0, R1);
      html += `<g class="orb-node orb-tribe" data-tribe="${esc(t)}"><circle cx="${x}" cy="${y}" r="34"/><text x="${x}" y="${y + 6}" text-anchor="middle">${esc(t)}</text></g>`;
    });
    tribes.forEach(t => {
      const list = BB.filter(b => b.tribe === t).sort((a, b) => b.people - a.people);
      list.forEach((b, i) => {
        const span = 150, a0 = (base[t] ?? 0) - span / 2;
        const a = list.length === 1 ? (base[t] ?? 0) : a0 + i * span / (list.length - 1);
        const [x, y] = pos(a, R2);
        const n = D.fams.filter(f => f.b === b.name).length;
        const cls = ['orb-node', 'orb-belly', n ? '' : 'empty', ORB.sel === b.name ? 'on' : ''].filter(Boolean).join(' ');
        html += `<g class="${cls}" data-belly="${esc(b.name)}"><circle cx="${x}" cy="${y}" r="${Math.min(22, 9 + Math.sqrt(n) * 2.2).toFixed(1)}"/><title>${esc(b.name)} · ${n} أسرة</title></g>`;
      });
    });
    const all = ORB.sel ? D.fams.filter(f => f.b === ORB.sel) : [];
    const fams = all.filter(f => !ORB.basis || f.bs === ORB.basis);
    fams.forEach((f, i) => {
      const [x, y] = pos(-90 + i * 360 / fams.length, R3);
      html += `<g class="orb-fam" data-fam="${esc(f.id)}" style="--d:${Math.min(i, 30) * 18}ms;--bc:${esc(BCOL[f.bs] || '#a8977a')}"><circle cx="${x}" cy="${y}" r="8"/><title>${esc(f.n)} · ${esc(f.bs || 'لم يُذكر الأساس')}</title></g>`;
    });
    svg.innerHTML = html;
    const cap = $('#torbCap');
    if (!ORB.sel) { cap.innerHTML = '<small class="muted">اضغط بطنًا لتدور أسره على المدار الخارجي. البطون الباهتة لا أسر لها في السجل بعد.</small>'; return; }
    const bl = BB.find(b => b.name === ORB.sel) || { tribe: '', people: 0 };
    const counts = {};
    all.forEach(f => { const k = f.bs || 'لم يُذكر الأساس'; counts[k] = (counts[k] || 0) + 1; });
    const bars = Object.keys(counts).sort((x, y) => counts[y] - counts[x]).map(k =>
      `<button type="button" class="ob${ORB.basis === k ? ' on' : ''}" data-ob="${esc(k)}" aria-pressed="${ORB.basis === k}"><i style="background:${esc(BCOL[k] || '#a8977a')}"></i>${esc(k)} <small>${counts[k]}</small></button>`).join('');
    cap.innerHTML = `<b>${esc(ORB.sel)}</b> <small class="muted">${esc(bl.tribe)} · ${all.length} أسرة</small>`
      + (all.length ? `<div class="obar"><button type="button" class="ob${ORB.basis ? '' : ' on'}" data-ob="" aria-pressed="${!ORB.basis}">كل الأسس <small>${all.length}</small></button>${bars}</div>` : '')
      + (fams.length ? `<div class="li">${fams.map(f => `<button type="button" data-fam="${esc(f.id)}">${esc(f.n)}${f.sub ? ` <small class="muted">· ${esc(f.sub)}</small>` : ''}</button>`).join('')}</div>` : '<small class="muted">لا أسر منسوبة إلى هذا البطن في السجل بعد.</small>');
  }
  $('#torb').addEventListener('click', e => {
    const f = e.target.closest('[data-fam]'); if (f) { openFamLayer(f.dataset.fam); return; }
    const b = e.target.closest('[data-belly]'); if (b) { const n = b.dataset.belly; ORB.sel = ORB.sel === n ? null : n; orbitRender8(); }
  });
  $('#torbCap').addEventListener('click', e => {
    const f = e.target.closest('[data-fam]'); if (f) { openFamLayer(f.dataset.fam); return; }
    const o = e.target.closest('[data-ob]'); if (o) { ORB.basis = o.dataset.ob || null; orbitRender8(); }
  });
  /* الفجوات ظاهرة: بطون بلا أسر وأسر بلا بطن، ويمكن عرض الأسر بلا بطن بضغطة */
  function orbGapRender8() {
    const BB = D.bellies.bellies;
    const emptyB = BB.filter(b => !D.fams.some(f => f.b === b.name)).length;
    // مطابق لقائمة المراجعة: بلا بطن، أو بطن لا يطابق أي بطن في القائمة (بيت الأنصاري حمص، حربي بن سليمان)
    const bellyNames = new Set(BB.map(b => b.name));
    const noBelly = D.fams.filter(f => !f.b || !bellyNames.has(f.b));
    $('#orbGap').innerHTML = `<span>${emptyB} بطنًا بلا أسر · ${noBelly.length} أسرة بلا بطن</span> <button type="button" data-gap="1">عرض الأسر بلا بطن</button>`;
    return noBelly;
  }
  $('#orbGap').addEventListener('click', e => {
    if (!e.target.closest('[data-gap]')) return;
    const list = orbGapRender8();
    $('#torbCap').innerHTML = `<b>أسر بلا بطن في السجل</b> <small class="muted">${list.length} أسرة</small><div class="li">${list.map(f => `<button type="button" class="nob" data-fam="${esc(f.id)}">${esc(f.n)}</button>`).join('')}</div>`;
  });
  function showTreeMode(m) {
    $$('#treeview button').forEach(b => b.classList.toggle('on', b.dataset.v === m));
    $('#tree').hidden = m !== 'list';
    $('#treeNote').hidden = m !== 'list';
    $('#tgraph').hidden = m !== 'graph';
    $('#bring').hidden = m !== 'ring';
    $('#orbit').hidden = m !== 'orbit';
    if (m === 'orbit') orbitRender8();
    if (m === 'ring') bLayout8();
    if (m === 'graph') { if (!TG.tree) TG.tree = buildFullTree(); drawGraph4(); requestAnimationFrame(() => { if (!TG.fitted) { gFit4(); TG.fitted = true; } }); }
  }
  $('#treeview').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) showTreeMode(b.dataset.v); });
  $('#tgzin').addEventListener('click', () => gZoom4(0.8));
  $('#tgzout').addEventListener('click', () => gZoom4(1.25));
  $('#tgfit').addEventListener('click', () => gFit4());
  $('#tgthr').addEventListener('click', e => { TG.thr = !TG.thr; e.currentTarget.classList.toggle('on', TG.thr); drawGraph4(); gSet4(); });
  $('#tgsvg').addEventListener('click', e => {
    const tg = e.target.closest('[data-tog]');
    if (tg) { const id = tg.dataset.tog; TG.open.has(id) ? TG.open.delete(id) : TG.open.add(id); drawGraph4(); gSet4(); return; }
    const g = e.target.closest('[data-n]'); if (!g) return;
    const n = findNode4(TG.tree, g.dataset.n); if (!n) return;
    TG.sel = n.id; drawGraph4(); gSet4();
    if (n.kind === 'person') openPerson(n.pid);
    else if (n.kind === 'family') familyProfile(n.fid);
    else if (n.kind === 'branch' && n.parent && n.parent.fid) openFam(n.parent.fid);
    else if (n.kind === 'tribe') groupProfile(n.key);
    else if (n.kind === 'belly') groupProfile(`${n.parent.key} · ${n.gap ? 'بلا بطن مسمّى' : n.label}`);
    else { TG.open.has(n.id) ? TG.open.delete(n.id) : TG.open.add(n.id); drawGraph4(); gSet4(); }
  });
  function findNode4(n, id) { if (n.id === id) return n; for (const k of n.kids) { const f = findNode4(k, id); if (f) return f; } return null; }
  (() => {
    let drag = null;
    const host = $('#tgsvg');
    host.addEventListener('pointerdown', e => { if (e.target.closest('[data-n]')) return; drag = { x: e.clientX, y: e.clientY, vx: TG.vb.x, vy: TG.vb.y }; host.setPointerCapture(e.pointerId); });
    host.addEventListener('pointermove', e => {
      if (!drag) return;
      const r = host.getBoundingClientRect(), s = TG.vb.w / Math.max(1, r.width);
      TG.vb.x = drag.vx - (e.clientX - drag.x) * s; TG.vb.y = drag.vy - (e.clientY - drag.y) * s; gSet4();
    });
    host.addEventListener('pointerup', () => { drag = null; });
    host.addEventListener('wheel', e => { e.preventDefault(); gZoom4(e.deltaY > 0 ? 1.12 : 0.89); }, { passive: false });
  })();
  const IDX = Object.fromEntries(D.pts.map((p, i) => [p.id, i]));
  const TYPE_AR2 = { direct: 'صلة مباشرة', indirect: 'صلة غير مباشرة', 'بطن': 'بطن', 'نسب': 'نسب', 'استيطان': 'استيطان' };
  const PID_BY_NAME = Object.fromEntries(Object.entries(D.people || {}).map(([id, x]) => [x.name, id]));
  function ptHTML(p, idx) {
    const m = p.meta || {};
    const rows = [];
    const add = (k, v) => { v = nz(v); if (v) rows.push(`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`); };
    add('الطبقة', LNAME[p.l]); add('الفرع', p.b);
    if (p.fid && byId[p.fid]) add('الأسرة', byId[p.fid].n);
    add('المكان', p.pp || p.p); add('التاريخ', p.dt);
    if (nz(p.fr) || nz(p.to)) add('من ← إلى', `${nz(p.fr) || '—'} ← ${nz(p.to) || '—'}`);
    add('الدلالة', p.sn); if (m.grade && m.grade !== p.sn) add('الدرجة', m.grade); add('التحقق', m.verification); add('السلسلة', m.chain);
    add('سبب الانتقال', m.motive); add('النطاق', m.scale);
    const jn = v => Array.isArray(v) ? v.join('، ') : v;
    add('تاريخ السجل', m.date_text); add('الأحداث', jn(m.events)); add('الحالة', m.status);
    add('أسماء أخرى', jn(m.aliases)); add('البطن في السجل', m.clan); add('دقة الموقع', p.conf);
    const slots = (p.slots || []).filter(s => nz(s[0]) || nz(s[1]));
    const crumbs = slots.filter(([l, v]) => nz(v)).length ? '<div class="crumbs">' + slots.filter(([l, v]) => nz(v)).map(([l, v]) => `<span class="c"><span class="k">${esc(nz(l))}</span>${esc(nz(v))}</span>`).join('<span class="ar">←</span>') + '</div>' : '';
    const ladder = slots.length ? '<div class="pc-sec"><h4>الجذر القديم وخاناته</h4>' + crumbs + slots.map(([l, v, s, q]) => {
      const pid = nz(v) && PID_BY_NAME[nz(v)];
      const val = !nz(v) ? '<span class="gap">فراغ: لم يُذكر في المصادر بعد</span>'
        : pid ? `<button type="button" data-pp="${esc(pid)}">${esc(nz(v))}</button>` : `<span>${esc(nz(v))}</span>`;
      return `<div class="pslot"><span class="sl">${esc(nz(l))}</span>${val}${nz(s) ? `<span class="ss">${esc(nz(s))}</span>` : ''}${nz(q) ? `<details class="ev"><summary>نص الشاهد</summary><blockquote>${esc(nz(q))}</blockquote></details>` : ''}</div>`;
    }).join('') + '</div>' : '';
    const near = p.fid && byId[p.fid] && byId[p.fid].o ? `<div class="pc-sec"><div><b>القريب:</b> ${esc(byId[p.fid].o.p)}</div></div>` : '';
    const origin = p.fid && byId[p.fid] && byId[p.fid].o
      ? `<div class="pc-sec"><h4>سلسلة الأصل</h4><div>الأصل: <b>${esc(byId[p.fid].o.p)}</b>${byId[p.fid].o.l ? ` <small>موضع ${esc(byId[p.fid].o.l)}</small>` : ''}</div></div>` : '';
    const cpid = p.fid && byId[p.fid] && PID_BY_NAME[byId[p.fid].c];
    let ext = '';
    if (cpid && PEO[cpid]) {
      const ss = spreadSet(cpid), pl = PEO[cpid].name.split(' (')[0];
      const others = [...ss.fids].filter(x => x !== p.fid && byId[x]);
      const ctry = new Set(); others.forEach(x => byId[x].s.forEach(s => s.c && ctry.add(s.c)));
      ext = `<div class="pc-sec"><h4>الامتداد</h4><div>${others.length ? `أسر أخرى من ذرية ${esc(pl)}: ${others.length} في ${ctry.size} ${ctry.size === 1 ? 'بلد' : 'بلدان'}` : `لا أسر أخرى من ذرية ${esc(pl)} في الأطلس`}</div><div class="li"><button type="button" data-spread="${esc(cpid)}">انتشار ذرية ${esc(pl)} على الخريطة</button>${others.slice(0, 12).map(x => `<button type="button" data-fam="${esc(x)}">${esc(byId[x].n)}</button>`).join('')}</div></div>`;
    }
    const lin = (p.lin && p.lin.father ? `<div class="pc-sec"><h4>نسبه عند ابن حزم (ص${esc(p.lin.father.page)})</h4><div>أبوه: <b>${esc(p.lin.father.name)}</b></div>${p.lin.father.q ? `<blockquote>${esc(p.lin.father.q)}</blockquote>` : ''}</div>` : '')
      + (p.lin && p.lin.children ? `<div class="pc-sec"><h4>ولده عند ابن حزم (ص${esc(p.lin.children.page)})</h4><div>${esc((p.lin.children.list || []).join('، '))}</div>${p.lin.children.q ? `<blockquote>${esc(p.lin.children.q)}</blockquote>` : ''}</div>` : '');
    const bl = p.bl && p.bl.full ? `<div class="pc-sec"><h4>بطنه في جمهرة ابن حزم</h4><div>${esc(p.bl.full)}</div>${p.bl.q ? `<blockquote>${esc(p.bl.q)}</blockquote>` : ''}</div>` : '';
    const srcs = (p.srcs || []).length ? `<div class="pc-sec"><h4>المصادر والشواهد <span class="cnt">${p.srcs.length}</span></h4>${p.srcs.map(x => `<div class="psrc"><b>${esc(x.b)}</b>${x.p ? ` · ص${esc(x.p)}` : ''}${x.r ? ` <small>(${esc(x.r)})</small>` : ''}${x.s ? `<small>${esc(x.s)}</small>` : ''}${x.q ? `<blockquote>${esc(x.q)}</blockquote>` : ''}</div>`).join('')}</div>` : '';
    const links = (p.adj || []).length ? `<div class="pc-sec"><h4>روابط مسجلة <span class="cnt">${p.adj.length}</span></h4><div class="li">${p.adj.map(([o, ty, nm]) => {
      const lab = `${esc(nm || '')} <small>${esc(TYPE_AR2[ty] || ty)}</small>`;
      return ALLREC[o] ? `<button type="button" data-rid="${esc(o)}">${lab}</button>` : `<span>${lab}</span>`;
    }).join('')}</div></div>` : '';
    const sibs = recSiblings(p);
    const zoomBtn = p.pl !== 0 && p.x != null ? `<div class="pc-sec"><div class="li"><button type="button" data-zoom="${esc(p.id)}">تكبير عليه</button></div></div>` : '';
    const fbb = p.fid && byId[p.fid];
    const rootBtns = fbb ? `<div class="li">${fbb.b ? `<button type="button" data-gbelly="${esc(gkey({ t: fbb.t, b: fbb.b }))}">كل فروع ${esc(fbb.b)}</button>` : ''}${fbb.c ? `<button type="button" data-gcomp="${esc(fbb.c)}">كل فروع الجد ${esc(fbb.c.split(' ').slice(0, 3).join(' '))}</button>` : ''}</div>` : '';
    const sibHTML = (sibs.length || rootBtns) ? `<div class="pc-sec"><h4>من الجذر نفسه <span class="cnt">${sibs.length}</span></h4>${rootBtns}<div class="li">${sibs.slice(0, 40).map(q => `<button type="button" data-rid="${esc(q.id)}">${esc(q.n)}</button>`).join('')}</div></div>` : '';
    const same = D.pts.map((q, i) => [q, i]).filter(([q, i]) => i !== idx && q.x === p.x && q.y2 === p.y2);
    const samePlace = same.length ? `<div class="pc-sec"><h4>في الموضع نفسه <span class="cnt">${same.length}</span></h4><div class="li">${same.slice(0, 40).map(([q, i]) => `<button type="button" data-pi="${i}">${esc(q.n)}</button>`).join('')}</div></div>` : '';
    const cite = nz(p.cite) || nz(p.src);
    return `<div class="pc"><div class="pch"><span><i style="background:${esc(LCOL[p.l] || '#888')}"></i><b>${esc(p.n)}</b></span><span class="muted">${esc(LNAME[p.l] || '')}</span></div>
      <dl class="pkv">${rows.join('')}</dl>${ladder}${near}${origin}${ext}${lin}${bl}${srcs}${links}${sibHTML}${samePlace}${zoomBtn}
      ${cite ? `<p class="pcite">المصدر: ${esc(cite)}</p>` : '<p class="pcite">لا شاهد مسجّل لهذه النقطة في الأطلس</p>'}
      ${nz(p.q) ? `<details class="ev"><summary>نص الشاهد</summary><blockquote>${esc(nz(p.q))}</blockquote></details>` : ''}</div>`;
  }
  function showPoint(i) {
    $('#ptcard').innerHTML = ptHTML(D.pts[i], i);
    $('#ptcard').scrollTop = 0;
  }
  $('#ptcard').addEventListener('click', e => {
    const pi = e.target.closest('[data-pi]'); if (pi) { showPoint(+pi.dataset.pi); return; }
    const sp = e.target.closest('[data-spread]'); if (sp) { setSpread(sp.dataset.spread); return; }
    const fm = e.target.closest('[data-fam]'); if (fm) { openFam(fm.dataset.fam); return; }
    const gb = e.target.closest('[data-gbelly]'); if (gb) { closeMap(); setGF(gb.dataset.gbelly); $('#tree').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
    const gc = e.target.closest('[data-gcomp]'); if (gc) { closeMap(); TR.mode = 'root'; $('#treeMode').value = 'root'; if (GF.g) setGF(null); drawTree(); $('#tree').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
    const pp = e.target.closest('[data-pp]'); if (pp) openPerson(pp.dataset.pp);
  });
  /* السجلات كلها: المحددة الموقع وغير المحددة، تُفتح بالبطاقة نفسها من الخريطة والموسوعة والبحث والروابط */
  const ALLR = [...D.pts, ...D.urec];
  const ALLREC = Object.fromEntries(ALLR.map(r => [r.id, r]));
  const PIDX = Object.fromEntries(D.pts.map((p, i) => [p.id, i]));
  let CUR_REC = null;
  function showRecById(id) {
    const r = ALLREC[id]; if (!r) return;
    openMap(); setMapMode('layers');
    CUR_REC = r.pl ? id : null;
    if (r.pl) showPoint(PIDX[id]);
    else { $('#ptcard').innerHTML = ptHTML(r, -1); $('#ptcard').scrollTop = 0; }
    drawMaps();
  }
  $('#ptcard').addEventListener('click', e => {
    const rid = e.target.closest('[data-rid]'); if (rid) { showRecById(rid.dataset.rid); }
  });
  function recSiblings(p) {
    return ALLR.filter(q => q.id !== p.id && ((p.fid && q.fid === p.fid) || (!p.fid && p.famn && q.famn === p.famn)));
  }
  /* إغلاق فجوات الواجهة: الطبقة المنفردة، والمناطق، والتكبير، والروابط والتمييز على الخريطة، والأصل، والملفات، والوضع الليلي */
  const LS6 = { z: 1, fx: null, fy: null, box: null, sp: 'manual' };
  const REG6 = [['الحجاز', [36, 19, 43, 27.5]], ['نجد والخليج', [42, 22, 57, 30]], ['اليمن وعُمان', [42, 12, 60, 25]], ['مصر والسودان', [24, 12, 38, 32]],
    ['العراق والشام', [33, 29, 49, 39]], ['المغرب وغرب أفريقيا', [-18, 7, 20, 35]], ['تركيا', [30, 35, 44, 42]]];
  const pxOf = (lo, la) => [(lo + 20) * 8.5, (48 - la) * 10];
  function resetView6() { LS6.z = 1; LS6.fx = null; LS6.fy = null; LS6.box = null; }
  function viewOf6(vb) {
    if (LS6.box) {
      const [x0, y0, x1, y1] = LS6.box, w = Math.max(40, x1 - x0), h = w * vb[3] / vb[2];
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return [cx - w / 2 - 12, cy - h / 2 - 12, w + 24, h + 24];
    }
    if (LS6.fx == null && LS6.z === 1) return vb;
    const w = vb[2] / LS6.z, h = vb[3] / LS6.z;
    const cx = LS6.fx != null ? LS6.fx : vb[0] + vb[2] / 2, cy = LS6.fy != null ? LS6.fy : vb[1] + vb[3] / 2;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function drawRegions6() {
    $('#regions').innerHTML = REG6.map(([l], i) => `<button class="chipb" type="button" data-r="${i}">${esc(l)}</button>`).join('') + '<button class="chipb" type="button" data-r="all">كل النقاط</button>';
  }
  $('#regions').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    resetView6();
    if (b.dataset.r !== 'all') {
      const [lo0, la0, lo1, la1] = REG6[+b.dataset.r][1];
      const [x0, y1] = pxOf(lo0, la0), [x1, y0] = pxOf(lo1, la1);
      LS6.box = [x0, y0, x1, y1];
    }
    drawMaps();
  });
  $('#lzin').addEventListener('click', () => { LS6.box = null; LS6.z *= 1.6; drawMaps(); });
  $('#lzout').addEventListener('click', () => { LS6.box = null; LS6.z = Math.max(1, LS6.z / 1.6); drawMaps(); });
  $('#lzfit').addEventListener('click', () => { resetView6(); drawMaps(); });
  $('#spreadmode').addEventListener('click', e => {
    const b = e.target.closest('[data-sp]'); if (!b) return;
    LS6.sp = b.dataset.sp; $$('#spreadmode button').forEach(x => x.classList.toggle('on', x === b));
  });
  function autoSpreadFor(rec) {
    if (LS6.sp !== 'auto' || !rec || !rec.fid || !byId[rec.fid]) return;
    const cp = PID_BY_NAME[byId[rec.fid].c];
    if (cp && PEO[cp] && (!SPREAD || SPREAD_PID !== cp)) { SPREAD = spreadSet(cp); SPREAD_PID = cp; drawSpreadRow(); }
  }
  function soloLayer(k) {
    LS.lay = new Set([k]);
    drawLayerChips(); drawMaps();
  }
  $('#layerchips').addEventListener('dblclick', e => {
    const b = e.target.closest('[data-l]'); if (!b) return;
    if (LS.lay.size === 1 && LS.lay.has(b.dataset.l)) LS.lay = new Set(D.layers.map(l => l.key));
    else soloLayer(b.dataset.l);
    drawLayerChips(); drawMaps();
  });
  function originsOf(id) {
    const r = ALLREC[id]; if (!r) return [];
    return (r.adj || []).filter(([, ty]) => ty === 'direct' || ty === 'indirect');
  }
  function recOverlay6(k) {
    const r = CUR_REC && ALLREC[CUR_REC];
    if (!r || !r.pl) return '<g id="links"></g><g id="hl"></g>';
    let links = '';
    (r.adj || []).forEach(([o, ty]) => {
      const q = ALLREC[o]; if (!q || !q.pl) return;
      if (ty === 'direct' || ty === 'indirect') {
        const mx = (r.x + q.x) / 2, my = (r.y2 + q.y2) / 2 - Math.hypot(q.x - r.x, q.y2 - r.y2) * .2;
        links += `<path class="direct" d="M${q.x} ${q.y2} Q${mx} ${my} ${r.x} ${r.y2}" style="stroke-width:${1.6 * k}px;opacity:.7"/>`;
      } else {
        links += `<line x1="${r.x}" y1="${r.y2}" x2="${q.x}" y2="${q.y2}" stroke="var(--accent)" stroke-width="${1.2 * k}" stroke-dasharray="${5 * k} ${4 * k}"/>`;
      }
    });
    const hl = `<circle cx="${r.x}" cy="${r.y2}" r="${9 * k}" fill="none" stroke="var(--gold)" stroke-width="${2 * k}"/>`;
    return `<g id="links">${links}</g><g id="hl">${hl}</g>`;
  }
  /* رسم أسماء متعددة دون تداخل: الاسم الذي يتقاطع مع اسم سبق رسمه يُترك */
  function placeLabelHTML(items, fs, pad) {
    const placed = [];
    let out = '';
    for (const it of items) {
      const w = it.t.length * fs * 0.62, x = it.x, y = it.y;
      const box = [x - w / 2 - pad, y - fs - pad, x + w / 2 + pad, y + pad];
      if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      out += `<text class="plab" x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" style="stroke-width:${fs * 0.25}px">${esc(it.t)}</text>`;
    }
    return out;
  }
  /* الأسماء: يُرسم الاسم إن لم يتقاطع مع اسم سبق رسمه. الترتيب الأصلي هو الأولوية */
  function labels6(vis, k) {
    if (LS6.z < 2 && !LS6.box) return '<g id="labels"></g>';
    const placed = [], fs = 10 * k, pad = 2 * k;
    const out = [];
    for (const [p] of vis) {
      if (out.length >= 120) break;
      const text = nz(p.pp) || p.n;
      const w = text.length * fs * 0.62, x = p.x, y = p.y2 - 6 * k;
      const box = [x - w / 2 - pad, y - fs - pad, x + w / 2 + pad, y + pad];
      if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      out.push(`<text class="plab" x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" style="stroke-width:${3 * k}px">${esc(text)}</text>`);
    }
    return '<g id="labels">' + out.join('') + '</g>';
  }
  function geoLabels6(k) {
    if (LS6.z >= 2 || LS6.box) return '<g id="geo"></g>';
    return '<g id="geo">' + D.geo.map(g => `<text class="plab gl" x="${g.x}" y="${g.y}" text-anchor="middle" font-size="${13 * k}" style="stroke-width:${3 * k}px">${esc(g.name)}</text>`).join('') + '</g>';
  }
  function zoomTo6(x, y, z) { resetView6(); LS6.fx = x; LS6.fy = y; LS6.z = z; drawMaps(); }
  $('#ptcard').addEventListener('click', e => {
    const z = e.target.closest('[data-zoom]'); if (z) { const q = ALLREC[z.dataset.zoom]; if (q && q.pl) zoomTo6(q.x, q.y2, 4); return; }
  });
  $('#bigSvg').addEventListener('click', e => { /* النقر على العنقود يعرض قائمته ويتيح الأزرار أدناه */ });
  function showCluster(ci) {
    const list = CLUSTERS[ci] || [];
    const cx = list.reduce((s, i) => s + D.pts[i].x, 0) / list.length, cy = list.reduce((s, i) => s + D.pts[i].y2, 0) / list.length;
    SPIDER6 = { x: cx, y: cy, list, on: false };
    $('#ptcard').innerHTML = `<div class="pc"><div class="pch"><b>${list.length} نقطة في هذا الموضع</b></div><div class="pc-sec"><div class="li"><button type="button" id="cityzoom" data-cz="${cx},${cy}">تكبير على الموضع</button><button type="button" id="cityfan" data-cf="${cx},${cy}">تفريد النقاط على الخريطة</button></div></div><div class="pc-sec"><div class="li">${list.map(i => `<button type="button" data-pi="${i}">${esc(D.pts[i].n)}</button>`).join('')}</div></div></div>`;
    $('#ptcard').scrollTop = 0;
  }
  $('#ptcard').addEventListener('click', e => {
    const pf = e.target.closest('#pickfam');
    if (pf) {
      const f = byId[pf.dataset.fid]; if (!f) return;
      const s = f.s.find(x => x.k === 'معاصر') || f.s[0];
      if (s && placeBy[key(s.b, s.c)]) selectPlace(key(s.b, s.c), f.id); else setList([f], 'من النقطة', f.id);
      return;
    }
    const cz = e.target.closest('#cityzoom'), cf = e.target.closest('#cityfan');
    if (cz) { const [x, y] = cz.dataset.cz.split(',').map(Number); if (SPIDER6) SPIDER6.on = false; zoomTo6(x, y, 3); return; }
    if (cf) { const [x, y] = cf.dataset.cf.split(',').map(Number); if (SPIDER6) SPIDER6.on = true; LS5.clus = false; $$('#clmode button').forEach(b => b.classList.toggle('on', b.dataset.k === 'off')); zoomTo6(x, y, 3); return; }
  });
  // الروابط المرئية تُمرَّر إلى الخريطة عند فتح السجل
  const _showPointOld = showPoint;
  showPoint = function (i) {
    CUR_REC = D.pts[i] ? D.pts[i].id : null; _showPointOld(i); autoSpreadFor(D.pts[i]);
    const fid = D.pts[i] && D.pts[i].fid;
    if (fid && byId[fid]) $('#ptcard').insertAdjacentHTML('beforeend', `<div class="pc-sec"><button type="button" class="chipb" id="pickfam" data-fid="${esc(fid)}">مسار هذه الأسرة على الخريطة</button></div>`);
    if (!$('#sheet').hidden) drawMaps();
  };
  function familyProfile(fid) {
    const f = byId[fid]; if (!f) return;
    const kids = D.fams.filter(c => c.par === fid);
    const st = f.s.map(s => `<span>${esc(s.p)} <small>${s.k === 'معاصر' ? 'حضور معاصر' : s.k === 'أصل' ? 'أصل' : 'محطة تاريخية'}</small></span>`).join('');
    openDialog(f.n, `<div class="pd-sec"><small>${esc(f.gs || '')}</small></div>` +
      (kids.length ? `<div class="pd-sec"><h4>فروعه المسجلة (${kids.length})</h4><div class="li">${kids.map(k => `<button type="button" data-fam="${esc(k.id)}">${esc(k.n)}</button>`).join('')}</div></div>` : '') +
      `<div class="pd-sec"><h4>مواضعه</h4><div class="li">${st || '<small>لا مواضع منصوصة</small>'}</div></div>` +
      ((D.acts && D.acts[fid]) ? `<div class="pd-sec"><h4>الأعمال والمناصب (${D.acts[fid].length})</h4>${D.acts[fid].map(a => `<div class="actrow"><b>${esc(a.c)}</b> ${esc(a.t)} <small>${esc(a.p)} · موضع ${esc(a.l)} في النسخة الرقمية للكتاب</small></div>`).join('')}</div>` : '') +
      ((D.moves && D.moves[fid]) ? `<div class="pd-sec"><h4>الحركة من المدينة</h4>${D.moves[fid].map(m => `<div class="actrow">من ${esc(m.f)} إلى ${esc(m.t)} <small>${esc(m.d)} · ${esc(m.c)} · موضع ${esc(m.l)} في النسخة الرقمية للكتاب</small></div>`).join('')}${((D.mtypes && D.mtypes[fid]) || []).map(x => `<div class="actrow"><b>حكم المحرّر وفق المعيار 21: ${esc(x.n)}</b> <small>${esc(x.m)} · ${esc(x.d)} · ${esc(x.e)}</small></div>`).join('')}</div>` : '') +
      `<div class="pd-sec"><div class="li"><button type="button" id="tmap" data-tmap="${esc(fid)}">أسرها على الخريطة</button><button type="button" data-fam="${esc(fid)}">فتح البطاقة</button></div></div>`);
  }
  function bellyPeople4(tribe, belly, anyBelly) {
    return Object.entries(PEO).filter(([, x]) => x.cat !== 'group' && (x.tribe || 'غير مذكور') === tribe && (anyBelly || (x.bc || '') === (belly || '')));
  }
  function famKidsLine4(f) {
    const kids = D.fams.filter(c => c.par === f.id);
    return kids.length ? `${kids.length} فرع: ${kids.slice(0, 3).map(k => k.n).join('، ')}${kids.length > 3 ? '…' : ''}` : '';
  }
  function groupProfile(key) {
    const [t, b0] = key.split(' · ');
    const b = b0 === 'بلا بطن مسمّى' ? '' : b0;
    const list = famSort8(D.fams.filter(f => gkey(f) === key));
    const ps = bellyPeople4(t, b, b0 === undefined);
    openDialog(b0 || t, `<div class="pd-sec"><small>${esc(t)} · ${list.length} أسرة · ${ps.length} صحابيًّا وعلمًا</small></div>` +
      (ps.length ? `<div class="pd-sec"><h4>الصحابة والأعلام</h4><div class="li">${ps.map(([id, x]) => `<button type="button" data-pp="${esc(id)}">${esc(x.name.split(' (')[0])}</button>`).join('')}</div></div>` : '') +
      `<div class="pd-sec"><h4>الأسر</h4><div class="li">${list.map(f => `<button type="button" data-fam="${esc(f.id)}">${esc(f.n)}</button>`).join('')}</div></div>` +
      `<div class="pd-sec"><div class="li"><button type="button" data-gk2="${esc(key)}">إظهار البطن في الشجرة</button></div></div>`);
  }
  /* السردية: سبعة فصول، والنص المنقول بلفظه في إطار مع رابطه */
  const NARR8_HTML = "<nav class=\"nr-tl\" aria-label=\"فصول السردية\"><button type=\"button\" data-nrch=\"0\"><i></i><b>١</b><small>قبل الإسلام</small><span>يثرب</span></button><button type=\"button\" data-nrch=\"1\"><i></i><b>٢</b><small>1هـ</small><span>العقبتان</span></button><button type=\"button\" data-nrch=\"2\"><i></i><b>٣</b><small>15–52هـ</small><span>الأنصار</span></button><button type=\"button\" data-nrch=\"3\"><i></i><b>٤</b><small>63هـ</small><span>الأمصار</span></button><button type=\"button\" data-nrch=\"4\"><i></i><b>٥</b><small>ق2–9هـ</small><span>الحرّة</span></button><button type=\"button\" data-nrch=\"5\"><i></i><b>٦</b><small>ق5–13هـ</small><span>الأوطان</span></button><button type=\"button\" data-nrch=\"6\"><i></i><b>٧</b><small>اليوم</small><span>الملح</span></button></nav><div class=\"pd-sec nr-hero\"><p class=\"nr-kicker\">السردية</p><h4 class=\"nr-title\"><span class=\"nr-ta\">الأنصار:</span> من واحة النصرة إلى آفاق الأرض</h4><p class=\"nr-sub\">فتحوا مدينتهم للرسالة السماوية، ثم اتسعت بهم الأوطان.</p><p>من واحةٍ تتنازعها العصبيات، إلى مدينةٍ تحتضن الرسالة الربانية والرسول الأكرم ﷺ، إلى بيوتٍ ومجالس علم في أقاليم بعيدة؛ تتصل حكاية الأنصار بخيطٍ من الاختيار والمسؤولية والرحيل.</p></div><section class=\"pd-sec nr-ch\" id=\"nr-ch0\" data-nrch=\"0\"><p class=\"nr-n\">الفصل ١ · قبل الإسلام</p><h4>يثرب: من الاستقرار إلى الانقسام</h4><p class=\"nr-lead\">قبل أن يكونوا حاضنة الإسلام، كانت لهم حكاية وصول.</p><p>تصل روايات الأخبار قدوم الأوس والخزرج إلى يثرب بتفرّق الأزد من اليمن وسيل العرم. وكانوا حين نزلوا لا يملكون نعمًا ولا شاءً، وكانت الأموال في أيدي اليهود. ثم تدرّجوا في الاستقرار والقوة، حتى صاروا طرفًا يصنع موازين الواحة.</p><p>ثم جاء أبو جبيلة: أخبر أبناءُ قيلة الملكَ بأن اليهود علموا بقصده، فدعاهم إلى مأدبة فقتلهم، فعزّت الأوس والخزرج، وتفرّقوا في عالية يثرب وسافلتها. ثم انقسمت القوة على نفسها، فجاء بُعاث آخر حروبهم. وقالت عائشة رضي الله عنها فيه: «كان يوم بعاث يومًا قدّمه الله لرسوله».</p><p>هنا يتبدل اتجاه الحكاية: المدينة التي عجزت عن جمع قوتها ستجد في الرسالة النبوية رابطةً تعيد توجيهها؛ من التنازع على الواحة إلى الاجتماع على النصرة.</p><p class=\"nr-src\"><small>المصادر: ابن حزم، جمهرة أنساب العرب، ص٣٣٢ (الشاملة 9793/329) · ابن خلدون، ج٢ ص٣٤٣–٣٤٧ (الشاملة 12320/1146–1150).</small></p><div class=\"nr-go\"><span>في الأطلس</span><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"az\">القبيلتان وبطونهما</button></div></section><section class=\"pd-sec nr-ch\" id=\"nr-ch1\" data-nrch=\"1\"><p class=\"nr-n\">الفصل ٢ · 1هـ</p><h4>العقبتان: حين اختارت يثرب مستقبلها</h4><p class=\"nr-lead\">بين بيعتين، تحولت الدعوة من إيمان أفراد إلى مسؤولية جماعة.</p><p>في العقبة الأولى، بايع اثنا عشر رجلًا من أهل يثرب رسول الله ﷺ، ثم عادوا ومعهم مصعب بن عمير يعلّم القرآن ويدعو إلى الإسلام. أخذت الدعوة تدخل البيوت عبر التعليم والحوار وصلات الجوار والقرابة؛ فتهيأت المدينة من داخلها لاستقبال صاحب الرسالة.</p><p>وفي الموسم التالي اتسع اللقاء: ثلاثة وسبعون رجلًا وامرأتان، نسيبة بنت كعب وأسماء بنت عمرو. يروي كعب بن مالك أنهم تسللوا بعد ثلث الليل إلى العقبة، وهناك تعاهدوا على الإيواء والحماية، وعلى فتح بيوتهم ومدينتهم لدعوةٍ تعرف قريش قوتها.</p><p class=\"nr-read\"><b>قراءة:</b> قبل أن يهاجر النبي ﷺ، كانت يثرب قد اختارت موقعها في مستقبله.</p><p class=\"nr-src\"><small>المصادر: ابن هشام، السيرة النبوية، ج١ ص٤٣١ و٤٤١ و٤٥٤ (الشاملة 23833/454 و464 و477).</small></p><div class=\"nr-go\"><span>في الأطلس</span><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"sky\">سماء الصحابة: شهود العقبتين وبدر</button></div></section><section class=\"pd-sec nr-ch\" id=\"nr-ch2\" data-nrch=\"2\"><p class=\"nr-n\">الفصل ٣ · 15–52هـ</p><h4>الأنصار: حين صار الوعد دارًا</h4><p class=\"nr-lead\">انتظروا وصول نبيهم ﷺ على الطريق، وفتحوا للمهاجرين مكانًا في الحياة.</p><p>كان المسلمون يغدون كل صباح إلى الحرّة ينتظرون رسول الله ﷺ، حتى يردّهم حرّ الظهيرة. فلما انقلبوا يومًا بعد أن أطالوا الانتظار، رأى رجل من يهود النبيَّ وأصحابه مبيّضين يزول بهم السراب، فصاح: «يا معاشر العرب، هذا جدكم الذي تنتظرون»، فثار المسلمون إلى السلاح، فتلقوه.</p><p>ثم بدأت بعد فرحة اللقاء مسؤولية احتضان المهاجرين. فآخى النبي ﷺ بين عبد الرحمن بن عوف وسعد بن الربيع، فعرض سعد على أخيه نصف ماله، وأن ينظر أيّ زوجتيه أعجبته فيطلقها له. فأبى عبد الرحمن بعفّته، وسأل عن السوق ليعمل بيده.</p><p>وعرض الأنصار قسمة نخيلهم مع إخوانهم، فقال النبي ﷺ: «لا». فقالوا: «يكفونا المئونة، وتشركونا في التمر». فاستقر التعاون على المشاركة في الثمرة لقاء المؤونة، فكان الإيثار عملًا يُعاش في الحقل والسوق.</p><p>وحين سُئل أنس عن اسم الأنصار أكانوا يُسمّون به أم سمّاهم الله، قال: «بل سمّانا الله». بقي الأوس والخزرج في أنسابهم، لكن جمعتهم النصرة في اسمٍ يُقرأ به انتماؤهم الجديد: انتماءٌ تُصدّقه المسؤولية.</p><p class=\"nr-src\"><small>المصادر: صحيح البخاري: 3906 (الشاملة 1681/5900) · 3780 (1681/5733) · 3782 (1681/5735) · 3776 (1681/5727).</small></p><div class=\"nr-go\"><span>في الأطلس</span><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"texts\">الأنصار في القرآن والحديث</button></div></section><section class=\"pd-sec nr-ch\" id=\"nr-ch3\" data-nrch=\"3\"><p class=\"nr-n\">الفصل ٤ · 63هـ</p><h4>إلى الأمصار: اتساع المهمة</h4><p class=\"nr-lead\">احتاجت الأمصار المفتوحة إلى من يعلّم القرآن ويفقّه، فخرج الأنصار من المدينة يحملون ما تعلّموه.</p><p>كتب يزيد بن أبي سفيان إلى عمر أن أهل الشام يحتاجون من يعلّمهم القرآن ويفقّههم، فأرسل معاذ بن جبل وعبادة بن الصامت وأبا الدرداء. وعبادة نفسه أول من وُلّي قضاء فلسطين، كما قال الأوزاعي.</p><p>ومع التعليم والقضاء، تحوّلت بعض الرحلات إلى إقامة، ومن الإقامة تبدأ البيوت والأجيال. فسعد بن عبادة، سيد الخزرج، خرج إلى حوران ومات بها، ولم يعلم أهل المدينة بموته حتى سمعوا قائلًا من البئر. وأبو أيوب مات في غزو القسطنطينية، ودُفن بأصل حصنها.</p><p class=\"nr-src\"><small>المصادر: الإصابة، ج٣ ص٥٠٧ · أسد الغابة، ج٣ ص١٥٩ (الشاملة 1110/1416) · ابن سعد، الطبقات الكبرى، ج٣ ص٣٧٠ و٤٦٣ (الشاملة 1686/1048 و1141).</small></p><div class=\"nr-go\"><span>في الأطلس</span><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"place:حمص\">حمص</button><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"place:دمشق\">دمشق</button><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"place:فلسطين\">فلسطين</button></div></section><section class=\"pd-sec nr-ch\" id=\"nr-ch4\" data-nrch=\"4\"><p class=\"nr-n\">الفصل ٥ · ق2–9هـ</p><h4>الحرّة: الانكسار وأسئلة الرحيل</h4><p class=\"nr-lead\">في سنة ٦٣هـ، فقدت المدينة أبناءها في معركة لم تكن معركتها.</p><p>خلع أهل المدينة بيعة يزيد، فجعلوا على الأنصار عبد الله بن حنظلة. وكان قد وفد على يزيد ومعه ثمانية من بنيه. فلما انكسر الناس قدّمهم للقتال واحدًا بعد واحد حتى أتى على آخرهم، ثم كسر جفن سيفه وقاتل حتى قُتل. وعدّ خليفة بن خياط قتلى الأنصار مائةً وثلاثةً وسبعين. ثم أباحها مسلم بن عقبة ثلاثًا، كما يذكر السمهودي.</p><p class=\"nr-read\"><b>قراءة:</b> المدينة بعد هذه الأيام لم تعد كما عرفها أهلها، والبقاء فيها صار أثقل على كثيرين. أما دوافع الراحلين ووجهاتهم فتتعدد، والنصوص لا تجمعها في سبب واحد.</p><p class=\"nr-read\"><b>قراءة:</b> هذه قراءة تجمع أطراف المشهد، لا نصّ منقول.</p><p class=\"nr-src\"><small>المصادر: خليفة بن خياط، ص٢٣٧–٢٥٠ · وفاء الوفاء، ج١ ص١٠٤–١٠٥ (الشاملة 23695/100–101) · ابن خلدون، ج٢ ص٣٥٣ (الشاملة 12320/1156).</small></p><div class=\"nr-go\"><span>في الأطلس</span><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"sky\">بطون الأنصار في سماء الصحابة</button></div></section><section class=\"pd-sec nr-ch\" id=\"nr-ch5\" data-nrch=\"5\"><p class=\"nr-n\">الفصل ٦ · ق5–13هـ</p><h4>أوطان تتسع: من الأندلس إلى مجالس العلم</h4><p class=\"nr-lead\">قد يقلّ ظهور الجماعة في موطنها الأول، بينما تتجذر فروعها في مواطن أخرى.</p><p>قال ابن سعيد المغربي متعجبًا: «والعجب أنّك تعدم هذا النسب بالمدينة وتجده بالأندلس في أكثر بلدانها ما يشذّ عن العدد كثرة». وذكر أن من سأل عن النسب بالمدينة لم يجد إلا شيخًا من الخزرج وعجوزًا من الأوس. وقال ابن غالب: «وكان جزء الأنصار بناحية طليطلة، وهم أكثر القبائل بالأندلس في مشرقها ومغربها». وإلى قيس بن سعد بن عبادة ينتسب بنو الأحمر، سلاطين غرناطة، وعليهم انقرض ملك الأندلس من المسلمين.</p><p>وفي المواطن البعيدة بقيت أسر أنصارية حملت العلم والقضاء: خطيب ينبع من ذرية نجم الدين الخطيب، والقاضي عبد الجواد الكبير وذريته في جرجا، والقاضي حمد بن حمد القطري في فرشوط، والشيخ أمين بن عبد القادر وذريته في السلط. وبين حضورٍ يدخل تاريخ الحكم، ومجلسٍ تتوارثه الأجيال، تتضح المسافة بين الوصول والاستقرار.</p><p class=\"nr-src\"><small>المصادر: نفح الطيب للمقّري، ج١ ص٢٩٤ (الشاملة 1002/313) · بطاقات الأسر في الأطلس: أنصار ينبع، بيت القاضي، القطري، آل أمين.</small></p><div class=\"nr-go\"><span>في الأطلس</span><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"place:قرطبة\">قرطبة</button><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"place:إشبيلية\">إشبيلية</button></div></section><section class=\"pd-sec nr-ch\" id=\"nr-ch6\" data-nrch=\"6\"><p class=\"nr-n\">الفصل ٧ · اليوم</p><h4>الملح الذي بقي</h4><p class=\"nr-lead\">في آخر أيام النبي ﷺ، صعد المنبر وقال: «أوصيكم بالأنصار، فإنهم كرشي وعيبتي».</p><p>ثم قال: «فاقبلوا من محسنهم وتجاوزوا عن مسيئهم». وقد أخبر ابن عباس أن النبي ﷺ قال: «إن الناس يكثرون، وتقل الأنصار حتى يكونوا كالملح في الطعام؛ فمن ولي منكم أمرًا يضر فيه أحدًا أو ينفعه، فليقبل من محسنهم، ويتجاوز عن مسيئهم».</p><p>وعند هذه الوصية تجتمع أطراف الحكاية: وصولٌ إلى يثرب، وحربٌ مزقت أهلها، وعهدٌ جمعهم، ودارٌ اتسعت للمهاجرين؛ ثم طرقٌ حملت أبناءها إلى الأمصار، ومحنٌ بدّلت مواطنهم، وبيوتٌ ومجالس حفظت امتدادهم. تبقى المدينة أول الحكاية، وتبقى النصرة المعنى الذي أعطاها اسمها.</p><p class=\"nr-src\"><small>المصادر: صحيح البخاري: 3799 (الشاملة 1681/5760) · 3800 (1681/5761).</small></p><div class=\"nr-go\"><span>في الأطلس</span><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"fam:barakat\">بيت الأنصاري (الزرندي سابقًا)</button><button type=\"button\" class=\"nr-gobtn\" data-nrgo=\"place:المدينة المنورة\">الأسر في المدينة اليوم</button></div></section>";
  const ENTRY = {
    about: ['نبذة عن الأطلس', () => `
      <div class="pd-sec"><p>الأنصار أهل المدينة من الأوس والخزرج، الذين آووا رسول الله ﷺ وأصحابه المهاجرين ونصروهم، فسُمّوا بهذا الاسم. قال تعالى: «وَالَّذِينَ تَبَوَّءُوا الدَّارَ وَالْإِيمَانَ مِن قَبْلِهِمْ»، وقال: «وَالسَّابِقُونَ الْأَوَّلُونَ مِنَ الْمُهَاجِرِينَ وَالْأَنصَارِ».</p>
      <p>وفي السنة قال ﷺ: «آيَةُ الإِيمَانِ حُبُّ الأَنْصَارِ، وَآيَةُ النِّفَاقِ بُغْضُ الأَنْصَارِ» (صحيح البخاري، رقم 17). ويُروى عنه: «الأَنْصَارُ شِعَارٌ، وَالنَّاسُ دِثَارٌ» (صحيح البخاري، رقم 4330).</p>
      <p>هذا الأطلس يتتبعهم بعد المدينة: كيف تفرّقت بطونهم، وأين استقرت أسرهم، وبأي أصول تُنسب. ولكل أسرة إثباتها المذكور في بطاقتها، وتفاوت الإثبات يُقرأ هناك.</p>
      <p>نسأل الله أن يجعل هذا العمل سببًا لصلة الرحم ومعرفة الأنساب على وجهها.</p></div>
      <div class="pd-sec"><small>أرقام الأطلس: ${D.stats.fams} أسرة، و${D.stats.places} موضعًا، و${D.stats.studies} كتابًا ودراسة.</small></div>`],
    narrative: ['السردية: من واحة النصرة إلى آفاق الأرض', () => NARR8_HTML],
    texts: ['الأنصار في الوحيين', () => {
      const W = D.wahy;
      const ayah = a => `﴿${esc(a.text)}﴾ <small>(${a.s}:${a.a})</small>`;
      const hadithRow = h => `<details class="wh"><summary><b>${esc(h.cn)}</b> <small>رقم ${esc(String(h.no))}</small></summary><p>${esc(h.text)}</p><small class="src">المصدر: ${esc(h.cn)} · رقم ${esc(String(h.no))}</small><small class="grade">${esc(h.status)}</small></details>`;
      return `
      <div class="pd-sec"><h4>في القرآن الكريم</h4>
        ${W.quran.lexical.map(a => `<p class="qr">${ayah(a)}</p>`).join('')}
        <h4>آيات يُفسّرها المفسّرون بالأنصار (تفسيرًا لا لفظًا)</h4>
        ${W.quran.tafsir.map(a => `<p class="qr">${ayah(a)}<br><small>${esc(a.note)}</small></p>`).join('')}</div>
      <div class="pd-sec"><h4>فضائل الأنصار في الحديث (${D.virtues.filter(v => v.cat === 'فضل').length} حديثًا صريحًا)</h4>
        <small>صُنّفت الأحاديث بقراءة مباشرة لنصوص المرشحين. «فضل» قول أو نص يُثني على الأنصار، و«قصة» واقعة فيها ثناء لا قول صريح فيه.</small>
        ${D.virtues.filter(v => v.cat === 'فضل').map(v => `<details class="wh"><summary><b>${esc(v.cn)}</b> <small>رقم ${esc(String(v.no))}</small></summary><p>${esc(v.text)}</p><small>${esc(v.status)}${v.note ? ' · ' + esc(v.note) : ''}</small></details>`).join('')}
        <h4>قصص فيها ثناء على الأنصار</h4>
        ${D.virtues.filter(v => v.cat === 'قصة').map(v => `<details class="wh"><summary><b>${esc(v.cn)}</b> <small>رقم ${esc(String(v.no))}</small></summary><p>${esc(v.text)}</p><small>${esc(v.status)}</small></details>`).join('')}</div>
      <div class="pd-sec"><h4>أبرز ما ورد في الحديث</h4>
        ${W.featured.map(f => `<div class="actrow"><b>${esc(f.phrase)}</b>${f.hits.map(hadithRow).join('')}</div>`).join('')}</div>
      <div class="pd-sec"><h4>بطون الأوس والخزرج في الوحيين</h4>
        <select id="wbel" class="wq">${D.bellies.bellies.map(x => `<option value="${esc(x.name)}">${esc(x.tribe)} · ${esc(x.name)} (${x.people})</option>`).join('')}</select>
        <input id="wbq" type="search" placeholder="تصفية نصوص البطن بكلمة" class="wq">
        <small id="wbcount" class="cnt"></small>
        <div id="wbres"></div></div>
      <div class="pd-sec"><h4>بحث في النصوص</h4>
        <div class="mseg" id="wsrc" role="group" aria-label="نوع النص"><button type="button" data-ws="all" class="on">الكل</button><button type="button" data-ws="quran">القرآن</button><button type="button" data-ws="hadith">الحديث</button></div>
        <input id="wq" type="search" placeholder="ابحث بكلمة من النص أو اسم الكتاب" class="wq">
        <small id="wcount" class="cnt"></small>
        <div id="wres"></div></div>
      <div class="pd-sec"><small>تُراجع أرقام الآيات والأحاديث في نسخة معتمدة قبل الاستشهاد بها خارج الأطلس. الترقيم وفق النسخة الإلكترونية المرجعية المستخدمة في إعداد الأطلس. درجة أحاديث أبي داود من الألباني، ودرجة النسائي وابن ماجه والترمذي عند غياب حكمه من دار السلام، من مجموعة مفتوحة الرخصة (MIT)، ولم تُراجع على المصادر الأصلية بعد.</small></div>`;
    }],
  };
  const wnorm = s => String(s || '').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640\u0610-\u061A\u06D6-\u06ED]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ی/g, 'ي').replace(/ک/g, 'ك').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  function hrow8(h) { return hadithCard8({ cn: h.cn, no: h.no, text: h.text, status: h.status, note: '' }, (D.bexpl || {})[h.c + ':' + h.no] || 'شرح لم يُكتب بعد.'); }
  function bellyShow() {
    const BB = D.bellies, k = $('#wbel').value;
    const bl = BB.bellies.find(x => x.name === k);
    const cur = BB.curated.filter(c => c.belly === k);
    const q = wnorm($('#wbq').value);
    const hs = bl ? bl.hadith.filter(h => !q || wnorm(h.text).includes(q)) : [];
    const curHTML = cur.map(c => `<div class="actrow"><b>${c.kind === 'قرآن' ? 'القرآن' : 'الحديث'} · ${esc(c.ref)}</b>${c.kind === 'قرآن' ? `<p>﴿${esc(c.text)}﴾</p>` : `<p>${esc(c.text)}</p>`}<small>${esc(c.note)}. ${esc(c.basis)}.</small></div>`).join('');
    $('#wbres').innerHTML = (curHTML || '') + (hs.length ? hs.slice(0, 40).map(hrow8).join('') : '<p class="muted">لا نص في الكتب الستة بهذا الاسم</p>');
    $('#wbcount').textContent = `${hs.length} حديثًا` + (hs.length > 40 ? ' (يُعرض أول 40، فضيّق البحث)' : '');
  }
  const EX = D.explain;
  function hadithCard8(v, expl) {
    return `<details class="wh"><summary><b>${esc(v.cn)}</b> <small>رقم ${esc(String(v.no))}</small></summary><p>${esc(v.text)}</p><p class="expl"><b>المعنى:</b> ${esc(expl)}</p><small class="src">المصدر: ${esc(v.cn)} · رقم ${esc(String(v.no))}</small><small class="grade"><span class="gtag gc-${gcls8(gradeKey8(v.status))}">${esc(gtxt8(gradeKey8(v.status)))}</span> ${esc(v.status)}${v.note ? ' · ' + esc(v.note) : ''}</small></details>`;
  }
  /* الربط: البطاقات والافتتاحية والسردية تتحدث عن المرحلة نفسها */
  const DECK8 = { sync: null }, OPX = { go: null };
  const LAST8 = { type: '', id: '' };
  /* أماكن كل مرحلة كما يذكرها النص. «map» تعني موضعًا على مستوى الدولة لا مدينة في السجل */
  const STAGE_PL8 = [
    [{ n: 'المدينة المنورة' }],
    [],
    [{ n: 'حمص' }, { n: 'دمشق' }, { n: 'فلسطين' }, { n: 'بيت المقدس' }],
    [],
    [{ n: 'قرطبة' }, { n: 'إشبيلية' }],
    [{ n: 'الأحساء' }, { n: 'جلاجل' }, { n: 'مسيد ود عيسى' }, { n: 'المحلة' }],
    [{ n: 'المدينة المنورة' }],
  ];
  /* اسم المكان كما هو في السجل: قد يحمل الاسم قوسًا، مثل «الأحساء (المبرز)» */
  function placeKey8(name) {
    const cnt = {};
    D.pts.forEach(p => {
      if ((p.l === 'L6' || p.l === 'L4') && p.pp && (p.pp === name || p.pp.startsWith(name + ' ') || p.pp.startsWith(name + ' ('))) cnt[p.pp] = (cnt[p.pp] || 0) + 1;
    });
    const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  }
  /* السردية عند المرحلة: تُفتح في موضعها من النص */
  function openNarrative8(i) {
    openEntry('narrative');
    const sec0 = $('#nr-ch' + (STAGE_CH8[i] ?? 0)); const h = sec0 && sec0.querySelector('h4');
    if (!h) return;
    const sec = h.closest('.pd-sec');
    if (sec) sec.classList.add('hl');
    h.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  /* كل مرحلة من مراحل الافتتاحية تفتح الفصل الذي يقابلها في السردية */
  const STAGE_CH8 = [0, 1, 2, 3, 4, 5, 6];
  /* نص كل فصل كاملًا من السردية نفسها، يُعرض داخل لوح الرحلة */
  const FULL8 = (() => { const t = document.createElement('div'); t.innerHTML = NARR8_HTML; return [...t.querySelectorAll('.nr-ch')].map((sec, k) => { sec.querySelectorAll('h4, .nr-n, .nr-go' + (k === 6 ? '' : ', .nr-lead')).forEach(x => x.remove()); return sec.innerHTML; }); })();
  /* المرحلة على الخريطة: تنتقل الافتتاحية إليها */
  function opGo8(i) { if (OPX.go) OPX.go(i); }

  const STAGES8 = [
    ["يثرب: من الاستقرار إلى الانقسام", "قبل أن يكونوا حاضنة الإسلام، كانت لهم حكاية وصول. ثم جاء أبو جبيلة، وجاء بُعاث آخر حروبهم."],
    ["العقبتان: حين اختارت يثرب مستقبلها", "بين بيعتين، تحولت الدعوة من إيمان أفراد إلى مسؤولية جماعة."],
    ["الأنصار: حين صار الوعد دارًا", "انتظروا وصول نبيهم ﷺ على الطريق، وفتحوا للمهاجرين مكانًا في الحياة."],
    ["إلى الأمصار: اتساع المهمة", "احتاجت الأمصار المفتوحة إلى من يعلّم القرآن ويفقّه، فخرج الأنصار من المدينة يحملون ما تعلّموه."],
    ["الحرّة: الانكسار وأسئلة الرحيل", "في سنة ٦٣هـ، فقدت المدينة أبناءها في معركة لم تكن معركتها."],
    ["أوطان تتسع: من الأندلس إلى مجالس العلم", "قد يقلّ ظهور الجماعة في موطنها الأول، بينما تتجذر فروعها في مواطن أخرى."],
    ["الملح الذي بقي", "في آخر أيام النبي ﷺ، صعد المنبر وقال: «أوصيكم بالأنصار، فإنهم كرشي وعيبتي»."],
  ];
  function renderDeck8() {
    const deck = $('#deck');
    if (!deck) return;
    const N = STAGES8.length;
    deck.innerHTML = STAGES8.map(([t, s], i) => {
      const chips = (STAGE_PL8[i] || []).map(pl => {
        if (pl.map) return `<button type="button" class="dchip" data-map="${i}">${esc(pl.n)}</button>`;
        const key = placeKey8(pl.n);
        return key ? `<button type="button" class="dchip" data-place="${esc(key)}">${esc(pl.n)}</button>` : '';
      }).join('');
      return `<article class="dcard" data-i="${i}" data-n="${(i + 1).toLocaleString('ar-EG')}"><span class="dn">المرحلة ${i + 1} من ${N}</span><h3>${esc(t)}</h3><p>${esc(s)}</p><div class="dcard-foot">${chips ? `<div class="dcard-pl">${chips}</div>` : ''}<div class="dcard-act"><button type="button" class="dact" data-narr="${i}">السردية عند هذه المرحلة ←</button><button type="button" class="dact" data-map="${i}">أرِها على الخريطة</button></div></div></article>`;
    }).join('');
    const dots = $('#ddots');
    dots.innerHTML = STAGES8.map(([t], i) => `<button type="button" data-i="${i}" aria-label="${esc(t)}"></button>`).join('');
    const cards = [...deck.querySelectorAll('.dcard')];
    let cur = 0, sx = null, moved = false;
    const place = () => {
      /* قوس دائري مركزه أسفل البطاقات: كل مرحلة على محيطه، وتميل مع انحنائه */
      const ARC = 15, R = 560;
      cards.forEach((c, i) => {
        const d = i - cur, a = Math.abs(d);
        const th = d * ARC * Math.PI / 180;
        const x = -R * Math.sin(th), y = R * (1 - Math.cos(th));
        const sc = 1 - a * .03, r = -d * ARC;
        const op = a === 0 ? 1 : a === 1 ? .6 : a === 2 ? .22 : 0;
        c.style.setProperty('--x', x.toFixed(1) + 'px');
        c.style.setProperty('--y', y.toFixed(1) + 'px');
        c.style.setProperty('--sc', sc.toFixed(3));
        c.style.setProperty('--r', r + 'deg');
        c.style.setProperty('--op', op.toFixed(3));
        c.style.zIndex = 20 - a;
        c.classList.toggle('on', d === 0);
      });
      dots.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
      $('#dprev').disabled = cur === 0;
      $('#dnext').disabled = cur === N - 1;
    };
    const go = i => { cur = Math.max(0, Math.min(N - 1, i)); place(); };
    DECK8.sync = i => { if (i !== cur) go(i); };
    $('#dprev').addEventListener('click', () => go(cur - 1));
    $('#dnext').addEventListener('click', () => go(cur + 1));
    dots.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) go(+b.dataset.i); });
    deck.addEventListener('click', e => {
      if (moved) return;
      const pl = e.target.closest('[data-place]');
      if (pl) { cmGoPlace(pl.dataset.place); return; }
      const mp = e.target.closest('[data-map]');
      if (mp) { opGo8(+mp.dataset.map); return; }
      const nr = e.target.closest('[data-narr]');
      if (nr) { openNarrative8(+nr.dataset.narr); return; }
      const c = e.target.closest('.dcard');
      if (!c) return;
      const i = +c.dataset.i;
      if (i === cur) openNarrative8(i); else go(i);
    });
    deck.addEventListener('pointerdown', e => { sx = e.clientX; moved = false; });
    deck.addEventListener('pointermove', e => { if (sx !== null && Math.abs(e.clientX - sx) > 8) moved = true; });
    deck.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
    });
    deck.addEventListener('pointercancel', () => { sx = null; });
    deck.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur - 1); }
    });
    place();
  }
  /* حلقة البطون: بطاقة لكل بطن على حلقة ثلاثية الأبعاد، والبطاقة الأمامية هي المختارة */
  const BR8 = { i: 0, n: 0, step: 0, R: 0 };
  const TRIBE_C8 = t => (t === 'الأوس' ? 'var(--aws)' : t === 'الخزرج' ? 'var(--khazraj)' : 'var(--other)');
  function renderBring8() {
    const list = D.bellies.bellies;
    BR8.n = list.length;
    BR8.step = 360 / list.length;
    BR8.R = Math.round((95 + 16) / Math.tan(Math.PI / list.length));
    $('#bringRing').innerHTML = list.map((b, i) => `<button type="button" class="bc2" data-i="${i}" style="--tc:${TRIBE_C8(b.tribe)}"><span class="tr">${esc(b.tribe)}</span><span class="nm">${esc(b.name)}</span><span class="mt">${b.people} صحابيًّا وعلمًا · ${b.hadith.length} نصًّا في الكتب الستة</span></button>`).join('');
    $$('#bringRing .bc2').forEach((el, i) => { el.style.transform = `rotateY(${i * BR8.step}deg) translateZ(${BR8.R}px)`; });
    bLayout8();
  }
  function bLayout8() {
    if (!BR8.n) return;
    const i = BR8.i, b = D.bellies.bellies[i];
    $('#bringRing').style.transform = `translateZ(${-BR8.R}px) rotateY(${-i * BR8.step}deg)`;
    $$('#bringRing .bc2').forEach((el, k) => el.classList.toggle('on', k === i));
    $('#bName').textContent = b.name;
    $('#bMeta').textContent = `${b.tribe} · ${i + 1} من ${BR8.n}`;
  }
  function bGo8(d) { BR8.i = (BR8.i + d + BR8.n) % BR8.n; bLayout8(); }
  function openBelly8() {
    const name = D.bellies.bellies[BR8.i].name;
    openEntry('texts');
    $('#wbel').value = name;
    bellyShow();
  }
  $('#bprev').addEventListener('click', () => bGo8(-1));
  $('#bnext').addEventListener('click', () => bGo8(1));
  $('#bOpen').addEventListener('click', openBelly8);
  $('#bringRing').addEventListener('click', e => {
    const c = e.target.closest('.bc2'); if (!c) return;
    if (+c.dataset.i === BR8.i) openBelly8(); else { BR8.i = +c.dataset.i; bLayout8(); }
  });
  {
    const bb = $('#bringbox');
    let sx = null, moved = false;
    bb.addEventListener('pointerdown', e => { sx = e.clientX; moved = false; });
    bb.addEventListener('pointermove', e => { if (sx !== null && Math.abs(e.clientX - sx) > 8) moved = true; });
    bb.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 45) bGo8(dx < 0 ? 1 : -1); });
    bb.addEventListener('pointercancel', () => { sx = null; });
    bb.addEventListener('click', e => { if (moved) { moved = false; e.stopPropagation(); } }, true);
    bb.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); bGo8(1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); bGo8(-1); }
    });
  }
  /* الأطلس على مساحة واحدة: ثلاثة مستويات على سطح واحد.
     ١) القبيلتان: بطونهما نقاط تعطي شكل العنقود.   ٢) القبيلة مفتوحة: بطونها بطاقات.
     ٣) البطن مفتوح: ورقة تملأ السطح بأسره، فيها أسره وأعلامه. */
  const AZ = { tribes: [], mode: 'ov', fo: -1, bi: -1 };
  const AZ_HH = 64, AZ_G = 12;
  function azSetBox(el, x, y, w, h) {
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';
  }
  function azInit8() {
    const cv = $('#azCanvas');
    if (!cv) return;
    const list = D.bellies.bellies;
    AZ.tribes = [...new Set(list.map(b => b.tribe))].map(t => {
      const bl = list.map((b, i) => ({ b, i })).filter(x => x.b.tribe === t).sort((a, c) => c.b.people - a.b.people);
      const all = Object.values(D.people).filter(p => p.tribe === t).length;
      return { name: t, bl, color: TRIBE_C8(t), people: all, inBelly: bl.reduce((s, x) => s + x.b.people, 0), fams: D.fams.filter(f => f.t === t).length };
    });
    cv.innerHTML = AZ.tribes.map((t, ti) => `<div class="azr" data-t="${ti}" style="--tc:${t.color}" role="button" tabindex="0" aria-label="${esc(t.name)}، ${t.bl.length} بطنًا"><div class="azh"><b>${esc(t.name)}</b><small>${t.bl.length} بطنًا · ${t.fams} أسرة · ${t.people} صحابيًّا وعلمًا${t.people > t.inBelly ? ` (منهم ${t.people - t.inBelly} بلا بطن مذكور)` : ''}</small></div><span class="azbig" aria-hidden="true">${t.fams}</span><span class="azhint" aria-hidden="true">اضغط لتتسع</span><div class="azb">${t.bl.map(x => `<button type="button" class="azc" data-bi="${x.i}"><span class="azl"><b>${esc(x.b.name)}</b><small>${x.b.people} صحابيًّا وعلمًا ${x.b.hadith.length ? ' · ' + x.b.hadith.length + ' نصًّا' : ''}</small></span></button>`).join('')}</div></div>`).join('') +
      '<div class="azp" id="azPanel" aria-live="polite"></div>';
    cv.addEventListener('click', azClick);
    cv.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('azr')) { e.preventDefault(); azClick(e); }
    });
    addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !$('#pdlg').hidden || !$('#sheet').hidden || !$('#cmdk').hidden) return;
      if (AZ.mode === 'bl') azBackFromBelly(); else if (AZ.mode === 'fo') azOverview();
    });
    $('#azBack').addEventListener('click', azOverview);
    addEventListener('resize', azLayout);
    azLayout(); azCrumb();
  }
  function azClick(e) {
    const t = e.target;
    if (t.closest('#azPBack')) { azBackFromBelly(); return; }
    const tx = t.closest('[data-tx]'); if (tx) { azOpenBelly(+tx.dataset.tx); return; }
    const pp = t.closest('[data-pp]'); if (pp) { openPerson(pp.dataset.pp); return; }
    const fm = t.closest('[data-fam]'); if (fm) { openFamLayer(fm.dataset.fam); return; }
    const bz = t.closest('.azc');
    if (bz) { if (AZ.mode === 'fo') azBellyFocus(+bz.dataset.bi); return; }
    const r = t.closest('.azr');
    if (r && AZ.mode === 'ov') azFocus(+r.dataset.t);
  }
  function azOpenBelly(bi) {
    const name = D.bellies.bellies[bi].name;
    openEntry('texts');
    $('#wbel').value = name;
    bellyShow();
  }
  function azFocus(ti) { AZ.mode = 'fo'; AZ.fo = ti; azLayout(); azCrumb(); $('#azBack').hidden = false; saveHash(); }
  function azOverview() { AZ.mode = 'ov'; AZ.fo = -1; AZ.bi = -1; azLayout(); azCrumb(); $('#azBack').hidden = true; saveHash(); }
  function azCrumb() {
    const txt = AZ.mode === 'bl' ? `الأنصار › ${AZ.tribes[AZ.fo].name} › ${D.bellies.bellies[AZ.bi].name}`
      : AZ.mode === 'fo' ? `الأنصار › ${AZ.tribes[AZ.fo].name} · اضغط بطنًا لتقرأ أسره وأعلامه`
      : 'القبيلتان: الأوس والخزرج';
    $('#azCrumb').textContent = txt;
  }
  /* الورقة: تنطلق من البطاقة نفسها وتتمدّد إلى السطح كله */
  function azBellyFocus(bi) {
    const bel = D.bellies.bellies[bi];
    const cv = $('#azCanvas'), pn = $('#azPanel');
    const card = cv.querySelector(`.azc[data-bi="${bi}"]`);
    if (!card) return;
    const cr = cv.getBoundingClientRect(), r = card.getBoundingClientRect();
    AZ.mode = 'bl'; AZ.bi = bi; AZ.fo = AZ.tribes.findIndex(t => t.name === bel.tribe);
    azRenderBelly(bi);
    pn.style.transition = 'none';
    pn.classList.add('on');
    azSetBox(pn, r.left - cr.left, r.top - cr.top, r.width, r.height);
    pn.style.opacity = '1';
    void pn.offsetWidth;
    pn.style.transition = '';
    azSetBox(pn, 0, 0, cv.clientWidth, cv.clientHeight);
    pn.style.borderRadius = '24px';
    $('#azBack').hidden = true;
    azCrumb();
    pn.querySelector('.azp-b').scrollTop = 0;
    saveHash();
  }
  function azBackFromBelly() {
    if (AZ.mode !== 'bl') return;
    const cv = $('#azCanvas'), pn = $('#azPanel');
    const card = cv.querySelector(`.azc[data-bi="${AZ.bi}"]`);
    AZ.mode = 'fo';
    if (card) {
      const cr = cv.getBoundingClientRect(), r = card.getBoundingClientRect();
      azSetBox(pn, r.left - cr.left, r.top - cr.top, r.width, r.height);
    }
    pn.style.opacity = '0';
    setTimeout(() => { if (AZ.mode !== 'bl') pn.classList.remove('on'); }, 620);
    AZ.bi = -1;
    $('#azBack').hidden = false;
    azCrumb();
    saveHash();
  }
  function azRenderBelly(bi) {
    const bel = D.bellies.bellies[bi];
    const fams = famSort8(D.fams.filter(f => gkey(f) === `${bel.tribe} · ${bel.name}`));
    const ps = bellyPeople4(bel.tribe, bel.name, false);
    $('#azPanel').innerHTML = `
      <div class="azp-h"><button type="button" class="azp-back" id="azPBack">البطون</button><div class="azp-t"><b>${esc(bel.name)}</b><small>${esc(bel.tribe)} · ${fams.length} أسرة · ${ps.length} صحابيًّا وعلمًا · ${bel.hadith.length} نصًّا</small></div><button type="button" class="azp-tx" data-tx="${bi}">نصوص البطن</button></div>
      <div class="azp-b">
        ${fams.length ? `<h4>الأسر</h4><div class="azp-g">${fams.map(f => {
          const kids = D.fams.filter(c => c.par === f.id).length;
          return `<button type="button" class="azp-f" data-fam="${esc(f.id)}"><b>${esc(f.n)}</b>${f.sub ? `<small class="tsub">› ${esc(f.sub)}</small>` : ''}<small>${(f.s || []).length} موضعًا${kids ? ` · ${kids} فرعًا` : ''}</small>${f.bs ? `<small>${esc(f.bs)}</small>` : ''}</button>`;
        }).join('')}</div>` : '<p class="azp-empty">لا أسر مسجّلة لهذا البطن في السجل بعد.</p>'}
        ${ps.length ? `<h4>الصحابة والأعلام (${ps.length})</h4><div class="li">${ps.map(([id]) => pBtn(id)).join('')}</div>` : ''}
      </div>`;
  }
  function azLayout() {
    const cv = $('#azCanvas');
    if (!cv || !AZ.tribes.length) return;
    const cw = cv.clientWidth, ch = cv.clientHeight, phone = cw < 640, focus = AZ.mode !== 'ov';
    AZ.tribes.forEach((t, ti) => {
      const el = cv.querySelector(`.azr[data-t="${ti}"]`);
      let x = 0, y = 0, w = cw, h = ch;
      if (!focus) {
        if (phone) { h = (ch - AZ_G) / 2; y = ti * (h + AZ_G); }
        else { w = (cw - AZ_G) / 2; x = ti * (w + AZ_G); }
      }
      azSetBox(el, x, y, w, h);
      el.classList.toggle('dim', focus && ti !== AZ.fo);
      el.classList.toggle('fo', focus && ti === AZ.fo);
      const bodyW = w, bodyH = h - AZ_HH;
      const belly = [...el.querySelectorAll('.azc')];
      if (focus && ti === AZ.fo) {
        const pad = 14, gap = 14, cols = Math.max(1, Math.floor((bodyW - 2 * pad + gap) / (230 + gap)));
        const cardW = Math.floor((bodyW - 2 * pad - (cols - 1) * gap) / cols), cardH = 118;
        belly.forEach((c, k) => azSetBox(c, pad + (k % cols) * (cardW + gap), pad + Math.floor(k / cols) * (cardH + gap), cardW, cardH));
      } else {
        const cx = bodyW / 2, cy = bodyH / 2 - 6, c0 = 24;
        belly.forEach((c, k) => {
          const sz = 12 + Math.min(12, t.bl[k].b.people / 3);
          const a = k * 2.399963, r = c0 * Math.sqrt(k + 0.6);
          azSetBox(c, cx + r * Math.cos(a) - sz / 2, cy + r * Math.sin(a) - sz / 2, sz, sz);
        });
      }
    });
    if (AZ.mode === 'bl') azSetBox($('#azPanel'), 0, 0, cw, ch);
  }
  /* المرحلة ج: بحث شامل (Ctrl+K): قبيلة وبطن وأسرة وشخص، ويقفز بك إلى موضعه على الأطلس */
  const CM = { items: null, list: [], idx: 0 };
  const CM_RANK = { 'قبيلة': 0, 'بطن': 1, 'مدينة': 2, 'أسرة': 3, 'شخص': 4 };
  function cmBuild() {
    if (CM.items) return;
    const tribes = AZ.tribes.map((t, ti) => ({ k: 'قبيلة', sub: `${t.bl.length} بطنًا · ${t.fams} أسرة`, label: t.name, act: () => cmGo('tribe', ti) }));
    const bellies = D.bellies.bellies.map((b, bi) => ({ k: 'بطن', sub: `${b.tribe} · ${b.people} صحابيًّا وعلمًا`, label: b.name, act: () => cmGo('belly', bi) }));
    const fams = D.fams.map(f => ({ k: 'أسرة', sub: [f.t, f.b].filter(Boolean).join(' · '), label: f.n, act: () => openFamLayer(f.id) }));
    const ppl = Object.entries(PEO).filter(([, p]) => p.cat !== 'group').map(([id, p]) => ({ k: 'شخص', sub: p.tribe || '', label: p.name, act: () => openPerson(id) }));
    const cities = [...new Set(D.places.map(p => p.p))].filter(n => placeRecs8(n).length).map(n => {
      const pl = D.places.find(p => p.p === n);
      return { k: 'مدينة', sub: [pl.c, pl.ta].filter(Boolean).join(' · '), label: n, act: () => cmGoPlace(n) };
    });
    CM.items = [...tribes, ...bellies, ...cities, ...fams, ...ppl].map(it => Object.assign(it, { lab: norm(it.label), key: norm(it.label + ' ' + it.sub) }));
  }
  function cmSearch(q) {
    const t = norm(q).trim();
    if (!t) return CM.items.filter(it => it.k === 'قبيلة' || it.k === 'بطن').slice(0, 12);
    const toks = t.split(' ').filter(Boolean);
    return CM.items
      .filter(it => toks.every(x => it.key.includes(x)))
      .sort((a, b) => ((a.lab.startsWith(t) ? 0 : 1) - (b.lab.startsWith(t) ? 0 : 1)) || (CM_RANK[a.k] - CM_RANK[b.k]))
      .slice(0, 40);
  }
  function cmRender() {
    CM.list = cmSearch($('#cmdkQ').value);
    CM.idx = Math.min(CM.idx, Math.max(0, CM.list.length - 1));
    $('#cmdkList').innerHTML = CM.list.length
      ? CM.list.map((it, i) => `<button type="button" class="cmi" role="option" aria-selected="${i === CM.idx}" data-i="${i}"><span class="cmk">${esc(it.k)}</span><span class="cmt"><b>${esc(it.label)}</b><small>${esc(it.sub)}</small></span></button>`).join('')
      : '<p class="cmnone">لا نتائج. جرّب اسمًا آخر أو جزءًا منه.</p>';
  }
  function cmMark() {
    const btns = $$('#cmdkList .cmi');
    btns.forEach((b, i) => b.setAttribute('aria-selected', i === CM.idx ? 'true' : 'false'));
    if (btns[CM.idx]) btns[CM.idx].scrollIntoView({ block: 'nearest' });
  }
  function cmOpen() {
    cmBuild();
    $('#cmdk').hidden = false;
    $('#cmdkQ').value = '';
    CM.idx = 0;
    cmRender();
    $('#cmdkQ').focus();
  }
  function cmClose() { $('#cmdk').hidden = true; }
  function cmPick(i) {
    const it = CM.list[i];
    if (!it) return;
    cmClose();
    it.act();
  }
  function cmScrollTo(el) {
    const nav = document.querySelector('.secnav'), bar = document.querySelector('.bar');
    const off = (nav ? nav.offsetHeight : 0) + (bar ? bar.offsetHeight : 0) + 16;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - off, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function cmScrollCanvas() { cmScrollTo($('#azCanvas')); }
  /* المدينة: كما يفعل زرّها في شريط المدن، أي تكبير الخريطة عليها وفتح بطاقتها */
  function cmGoPlace(name) {
    const L = placeRecs8(name);
    if (!L.length) return;
    const cx = L.reduce((s, p) => s + p.x, 0) / L.length, cy = L.reduce((s, p) => s + p.y2, 0) / L.length;
    cmScrollTo($('#h-places').closest('section'));
    LS5.clus = false; $$('#clmode button').forEach(x => x.classList.toggle('on', x.dataset.k === 'off'));
    zoomTo6(cx, cy, 3); openPlace8(name);
  }
  function cmGo(kind, i) {
    cmScrollCanvas();
    if (kind === 'tribe') { azOverview(); azFocus(i); return; }
    const bel = D.bellies.bellies[i];
    const ti = AZ.tribes.findIndex(t => t.name === bel.tribe);
    azOverview(); azFocus(ti);
    setTimeout(() => azBellyFocus(i), 760);
  }
  $('#cmdkBtn').addEventListener('click', cmOpen);
  $('#cmdkQ').addEventListener('input', () => { CM.idx = 0; cmRender(); });
  $('#cmdkQ').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = CM.list.length; if (!n) return;
      CM.idx = (CM.idx + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      cmMark();
    } else if (e.key === 'Enter') { e.preventDefault(); cmPick(CM.idx); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cmClose(); }
  });
  $('#cmdkList').addEventListener('click', e => { const b = e.target.closest('.cmi'); if (b) cmPick(+b.dataset.i); });
  $('#cmdk').addEventListener('click', e => { if (e.target.hasAttribute('data-x')) cmClose(); });
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); cmOpen(); return; }
    if (e.key === '/' && $('#cmdk').hidden && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); cmOpen(); }
  });
  /* رحلة أسرتك: تُرسم من أصل الأسرة إلى مواضعها المنصوصة، ويُصدَّر منها صورة تحمل درجة إثباتها. لا يُحفظ شيء. */
  function fjInit() {
    const root = $('#fjRoot'); if (!root) return;
    const inp = $('#fjIn'), go = $('#fjGo'), cv = $('#fjCv'), stage = $('#fjStage'), out = $('#fjOut'), cnt = $('#fjCount'), dl = $('#fjList');
    const FAMS = D.fams.slice().sort((a, b) => a.n.localeCompare(b.n, 'ar'));
    const cs = getComputedStyle(document.documentElement);
    const FONT = (cs.getPropertyValue('--f-display') || 'sans-serif').trim();
    const BODY = (cs.getPropertyValue('--f-body') || 'sans-serif').trim();
    const LAND = new Path2D(D.land);
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const PLX = name => D.places.find(p => p.p === name && p.x != null) || null;
    const DEGP = {
      'مصادر قديمة متعددة': 'حسب مصادر قديمة متعددة',
      'مصدر مدوّن': 'حسب مصدر مدوّن',
      'وثيقة أسرية مؤرخة': 'بوثيقة أسرية مؤرخة',
      'جد مسمّى في رواية الأسرة': 'حسب رواية الأسرة، وفيها جدّ مسمّى',
      'فرع من أسرة مقبولة': 'فرع متصل بأسرة ثابتة النسبة',
      'رواية متوارثة عن تدوين قديم': 'حسب رواية متوارثة عن تدوين قديم',
      'رواية منقولة': 'حسب رواية منقولة',
      'نسبة أنصارية عامة': 'نسبة عامة بلا جد أو مصدر يبيّنها',
    };
    const basisOf = f => DEGP[f.bs] || 'بلا درجة إثبات مذكورة';
    const KIND = { 'أصل': 'الأصل', 'محطة': 'محطة', 'معاصر': 'اليوم' };
    const journeyOf = f => {
      const pts = [];
      const o = f.o && PLX(f.o.p);
      if (o) pts.push({ k: 'أصل', n: f.o.p, x: o.x, y: o.y });
      (f.s || []).forEach(s => {
        const q = PLX(s.b); if (!q) return;
        const last = pts[pts.length - 1];
        /* موضعان متلاصقان على الخريطة مكان واحد، فلا يُرسم بينهما خط */
        if (last && Math.hypot(last.x - q.x, last.y - q.y) < 6) { if (s.k === 'معاصر') last.k = 'معاصر'; return; }
        pts.push({ k: s.k === 'معاصر' ? 'معاصر' : s.k === 'أصل' ? 'أصل' : 'محطة', n: s.b, x: q.x, y: q.y });
      });
      return pts;
    };
    let DL = null;
    try { if (window.claude && window.claude.use) window.claude.use('downloads').then(x => { DL = x || null; }, () => {}); } catch (e) {}
    const withRoute = FAMS.filter(f => journeyOf(f).length >= 2).length;
    cnt.textContent = `رحلة مرسومة لـ${withRoute.toLocaleString('ar-EG')} أسرة من ${FAMS.length.toLocaleString('ar-EG')}`;
    dl.innerHTML = FAMS.map(f => `<option value="${esc(f.n)}"></option>`).join('');

    /* رسم الأرض والطريق والمواضع داخل مستطيل بعينه */
    function paint(ctx, X, Y, W, H, pts, prog, k) {
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const bw = Math.max(90, x1 - x0), bh = Math.max(90, y1 - y0), pad = 60 * k;
      const S = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh);
      const ox = X + (W - bw * S) / 2 - x0 * S, oy = Y + (H - bh * S) / 2 - y0 * S;
      const to = q => [ox + q.x * S, oy + q.y * S];
      ctx.save();
      ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
      ctx.save(); ctx.transform(S, 0, 0, S, ox, oy); ctx.fillStyle = 'rgba(120,170,150,.16)'; ctx.fill(LAND); ctx.restore();
      const P = pts.map(to), L = P.length - 1;
      const bez = (a, b) => {
        const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * 0.22, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * 0.22 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.12;
        return t => { const v = 1 - t; return [v * v * a[0] + 2 * v * t * mx + t * t * b[0], v * v * a[1] + 2 * v * t * my + t * t * b[1]]; };
      };
      let head = null;
      for (let i = 0; i < L; i++) {
        const f = bez(P[i], P[i + 1]), u = Math.max(0, Math.min(1, prog * L - i));
        ctx.setLineDash([3 * k, 6 * k]); ctx.strokeStyle = 'rgba(95,211,184,.22)'; ctx.lineWidth = 1.2 * k;
        ctx.beginPath(); for (let j = 0; j <= 60; j++) { const [x, y] = f(j / 60); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke(); ctx.setLineDash([]);
        if (u > 0) {
          ctx.strokeStyle = '#5fd3b8'; ctx.lineWidth = 2.4 * k; ctx.beginPath();
          const n = Math.max(2, Math.round(60 * u));
          for (let j = 0; j <= n; j++) { const [x, y] = f(u * j / n); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
          ctx.stroke();
          if (u < 1) head = f(u);
        }
      }
      if (head) {
        ctx.fillStyle = 'rgba(247,241,228,.28)'; ctx.beginPath(); ctx.arc(head[0], head[1], 9 * k, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#f7f1e4'; ctx.beginPath(); ctx.arc(head[0], head[1], 3 * k, 0, 6.2832); ctx.fill();
      }
      P.forEach((q, i) => {
        const p = pts[i], reached = i === 0 || prog * L >= i;
        const col = p.k === 'أصل' ? '#e4bb62' : p.k === 'معاصر' ? '#f7f1e4' : '#5fd3b8';
        const r = (p.k === 'أصل' ? 6 : p.k === 'معاصر' ? 5.5 : 4.2) * k;
        ctx.globalAlpha = reached ? 1 : 0.3;
        if (reached && p.k === 'معاصر') { ctx.fillStyle = 'rgba(247,241,228,.2)'; ctx.beginPath(); ctx.arc(q[0], q[1], r + 6 * k, 0, 6.2832); ctx.fill(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        if (reached) {
          const left = q[0] < X + W / 2, tx = q[0] + (left ? 1 : -1) * 10 * k, ty = q[1] - 2 * k;
          ctx.textAlign = left ? 'left' : 'right'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
          ctx.font = `600 ${13 * k}px ${FONT}`; ctx.lineWidth = 3.5 * k; ctx.strokeStyle = 'rgba(4,10,8,.9)';
          ctx.strokeText(p.n, tx, ty); ctx.fillStyle = '#eef6f2'; ctx.fillText(p.n, tx, ty);
          ctx.font = `500 ${11 * k}px ${BODY}`; ctx.fillStyle = 'rgba(238,246,242,.6)';
          ctx.strokeText(KIND[p.k] || '', tx, ty + 15 * k); ctx.fillText(KIND[p.k] || '', tx, ty + 15 * k);
        }
      });
      ctx.restore();
    }

    let raf = 0, cur = null, CTX = null;
    function size() {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      return { ctx: cv.getContext('2d'), W: r.width, H: r.height, dpr };
    }
    function draw(p) {
      const c = CTX; if (!c) return;
      c.ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
      c.ctx.fillStyle = '#040a08'; c.ctx.fillRect(0, 0, c.W, c.H);
      if (cur && cur.pts.length) paint(c.ctx, 0, 0, c.W, c.H, cur.pts, p, 1);
    }
    function play(f, pts) {
      cancelAnimationFrame(raf); cur = { f, pts }; stage.hidden = false; CTX = size();
      if (RM || pts.length < 2) { draw(1); return; }
      const dur = Math.min(9000, 1600 + (pts.length - 1) * 1100), t0 = performance.now();
      const tick = now => { const p = Math.min(1, (now - t0) / dur); draw(p); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }
    addEventListener('resize', () => { if (cur) { CTX = size(); draw(1); } });

    function show(f) {
      const pts = journeyOf(f);
      const steps = pts.map(p => `<li><b>${esc(KIND[p.k] || p.k)}</b><span>${esc(p.n)}</span></li>`).join('');
      let note;
      const originNote = f.o && !PLX(f.o.p) ? ` أصلها المنصوص «${esc(f.o.p)}» لم يُرسم موضعه بعد، فيبدأ الطريق من أول موضع معلوم.` : '';
      if (pts.length >= 2) note = '<p class="fj-note">الطريق هنا يمرّ بما هو منصوص للأسرة فقط، وما لم يُنصّ عليه لا يُرسم.' + originNote + '</p>';
      else if (pts.length === 1) note = '<p class="fj-note">المعلوم عن هذه الأسرة حتى الآن موضع واحد، ولا طريق يُرسم بين موضعين.' + originNote + ' وبطاقتها تقرأ نسبها.</p>';
      else note = '<p class="fj-note">لا موضع منصوص لهذه الأسرة في الأطلس بعد. وبطاقتها تذكر ما هو معلوم من نسبها.</p>';
      out.innerHTML = `<article class="fj-card"><h3>${esc(f.n)}</h3>
        <p class="fj-note">${esc(f.t || '')}${f.b ? ' · ' + esc(f.b) : ''}</p>
        <p class="fj-basis"><b>الإثبات:</b> ${esc(basisOf(f))}${f.dis ? '. اختُلف في نسبها بين المصادر' : ''}.</p>
        ${pts.length ? `<ol class="fj-steps">${steps}</ol>` : ''}
        ${note}
        <div class="fj-acts"><button type="button" data-fj="card">افتح البطاقة</button>${pts.length >= 2 ? '<button type="button" class="primary" data-fj="img">صدّر صورة الرحلة</button>' : ''}</div></article>`;
      if (pts.length) play(f, pts);
      else { stage.hidden = true; cur = null; }
    }

    function search() {
      const k = wnorm(inp.value);
      if (!k) { out.innerHTML = '<p class="fj-note">اكتب اسم أسرتك، أو اسم جدّها، أو اسم بطنها. لا يُحفظ شيء مما تكتبه.</p>'; stage.hidden = true; cur = null; return; }
      const f = FAMS.find(x => wnorm(x.n) === k) || FAMS.find(x => wnorm(x.n).includes(k));
      if (!f) { out.innerHTML = '<p class="fj-note">لم نجد هذا الاسم في الأطلس. جرّب اسم الجد أو البطن.</p>'; stage.hidden = true; cur = null; return; }
      inp.value = f.n; show(f);
    }
    go.addEventListener('click', search);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(); } });

    /* صورة الرحلة: الخريطة واسم الأسرة ودرجة إثباتها، بلا ادعاء يتجاوز ما في بطاقتها */
    function exportImg(f, pts) {
      const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.fillStyle = '#040a08'; x.fillRect(0, 0, W, H);
      x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
      x.fillStyle = 'rgba(238,246,242,.62)'; x.font = `500 34px ${BODY}`; x.fillText('كالملح في الطعام · أطلس الأنصار', W - 70, 110);
      let fs = 96; x.font = `700 ${fs}px ${FONT}`;
      while (x.measureText(f.n).width > W - 140 && fs > 48) { fs -= 4; x.font = `700 ${fs}px ${FONT}`; }
      x.fillStyle = '#fbf7ee'; x.fillText(f.n, W - 70, 240);
      x.fillStyle = 'rgba(238,246,242,.7)'; x.font = `500 32px ${BODY}`;
      x.fillText([f.t, f.b].filter(Boolean).join(' · '), W - 70, 298);
      paint(x, 50, 340, W - 100, 760, pts, 1, 1.6);
      x.fillStyle = '#fbf7ee'; x.font = `600 40px ${BODY}`; x.fillText('الإثبات: ' + basisOf(f), W - 70, 1200);
      if (f.dis) { x.fillStyle = '#f0a078'; x.font = `500 30px ${BODY}`; x.fillText('اختُلف في نسبها بين المصادر', W - 70, 1248); }
      x.fillStyle = 'rgba(238,246,242,.55)'; x.font = `400 27px ${BODY}`;
      x.fillText('المواضع منصوصة في الأطلس، والإثبات كما في بطاقة الأسرة.', W - 70, 1300);
      c.toBlob(bl => {
        const name = 'rihla-' + f.id.replace(/[^a-z0-9_-]/gi, '') + '.png';
        const link = location.href.split('#')[0] + '#fam-' + famHashKey8(f.id);
        const file = new File([bl], name, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'رحلة ' + f.n, text: 'رحلة ' + f.n + ' من المدينة، حسب الأطلس: ' + link }).catch(() => {});
          return;
        }
        if (DL) { DL.save({ filename: name, data: bl }).catch(() => {}); return; }
        const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, 'image/png');
    }
    out.addEventListener('click', e => {
      const b = e.target.closest('[data-fj]'); if (!b || !cur) return;
      if (b.dataset.fj === 'card') openFamLayer(cur.f.id);
      else if (b.dataset.fj === 'img') exportImg(cur.f, cur.pts);
    });
  }

  /* الافتتاحية: مراحلها فصول السردية السبعة، وترسم كل مرحلة المسارات التي يذكرها فصلها، وفي الأخيرة تظهر مواضع السجلات */
  const OP = { idx: -1, forced: -1, routes: [], N: 0, live: false };
  const OP_TAG = [
    "ابن خلدون، ج٢ ص٣٤٣–٣٤٧ (الشاملة 12320/1146–1150)",
    "ابن هشام، السيرة النبوية، ج١ ص٤٣١–٤٥٤ (الشاملة 23833/454–477)",
    "صحيح البخاري: 3906 · 3780 · 3782 · 3776",
    "الإصابة، ج٣ ص٥٠٧ · ابن سعد، ج٣ ص٣٧٠ و٤٦٣",
    "خليفة بن خياط، ص٢٣٧–٢٥٠ · وفاء الوفاء، ج١ ص١٠٤–١٠٥",
    "نفح الطيب، ج١ ص٢٩٤ (الشاملة 1002/313)",
    "صحيح البخاري: 3799 · 3800",
  ];
  const OP_ERA = ['قبل الإسلام', '1هـ', '15–52هـ', '63هـ', 'ق2–9هـ', 'ق5–13هـ', 'اليوم'];
  const SL8 = (c, t) => `<span><i style="color:${c};background:${c}"></i>${t}</span>`;
  const SALT_LEG = [
    SL8('#e4bb62', 'الأوس') + SL8('#5fd3b8', 'الخزرج') + SL8('#f7f1e4', 'كل برج أُطُم'),
    SL8('#f7f1e4', 'حبيبات الحيّين صارت اسمًا واحدًا'),
    SL8('#f7f1e4', 'كل خيط رحلة من المدينة إلى حيث أقام صاحبها'),
    SL8('#f7f1e4', 'عدد قتلى الأنصار عند خليفة بن خياط') + SL8('#f0a078', 'وعند غيره أكثر'),
    SL8('#f7f1e4', 'أغزر الخيوط إلى الأندلس، حيث كانوا أكثر القبائل'),
    SL8('#f7f1e4', 'خيوط أرفع: أفراد خرجوا بالعلم'),
    SL8('#5fd3b8', 'سجلّ في الأطلس') + SL8('#f7f1e4', 'الأسر الحاضرة في المدينة'),
  ];
  function opPoint(kind, name) {
    const g = kind === 'geo' ? D.geo.find(x => x.name === name) : D.places.find(x => x.p === name && x.x != null);
    return g ? { x: g.x, y: kind === 'geo' ? g.y : g.y } : null;
  }
  function opInit() {
    const sec = $('#h-open');
    if (!sec) return;
    entriesInit();
    OP.routes = []; OP.spots = []; OP.spokes = []; OP.migs = [];
    const N = STAGES8.length; OP.N = N;
    $('#opDots').innerHTML = STAGES8.map((st, i) => `<button type="button" data-i="${i}" aria-label="${esc(st[0])}"></button>`).join('');
    $('#opDots').addEventListener('click', e => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      const i = +b.dataset.i;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { OP.forced = i; opPaint(); return; }
      const top = sec.offsetTop + ((i + 0.5) / N) * (sec.offsetHeight - innerHeight);
      scrollTo({ top, behavior: 'smooth' });
    });
    $('#opGo').addEventListener('click', () => cmScrollTo($('#azCanvas')));
    $('#saltSkip').addEventListener('click', () => cmScrollTo($('#azCanvas')));
    $('#saltRead').addEventListener('click', () => {
      const hud = $('#saltHud'), full = $('#saltFull'), open = !hud.classList.contains('open');
      hud.classList.toggle('open', open); full.hidden = !open;
      $('#saltRead').textContent = open ? 'اختصر الفصل' : 'اقرأ الفصل كاملًا';
      if (open) full.innerHTML = FULL8[OP.idx < 0 ? 0 : OP.idx] || '';
    });
    const stick = sec.querySelector('.op-stick');
    let px = null;
    stick.addEventListener('pointerdown', e => { px = e.clientX; });
    stick.addEventListener('pointercancel', () => { px = null; });
    stick.addEventListener('pointerup', e => {
      if (px === null) return;
      const dx = e.clientX - px; px = null;
      if (Math.abs(dx) < 50) return;
      const nx = (OP.idx < 0 ? 0 : OP.idx) + (dx < 0 ? 1 : -1);
      if (nx >= 0 && nx < N) OPX.go(nx);
    });
    OPX.go = i => {
      const top = sec.offsetTop + ((i + 0.5) / N) * (sec.offsetHeight - innerHeight);
      scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    function opStage(i) {
      OP.idx = i;
      saveHash();
      if (DECK8.sync && OP.live) DECK8.sync(i);
      $('#opK').textContent = `الفصل ${(i + 1).toLocaleString('ar-EG')} من ${N.toLocaleString('ar-EG')} · ${OP_ERA[i]}`;
      { const sf = $('#saltFull'); if (sf) sf.innerHTML = FULL8[i] || ''; }
      $('#saltLeg').innerHTML = SALT_LEG[i] || '';
      const hud = $('#saltHud'); hud.classList.remove('swap'); void hud.offsetWidth; hud.classList.add('swap');
      $('#h-open-t').textContent = STAGES8[i][0];
      $('#opP').textContent = STAGES8[i][1];
      $('#opTag').textContent = OP_TAG[i];
      $$('#opDots button').forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    }
    function opPaint() {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const rr = sec.getBoundingClientRect();
      OP.live = rr.bottom > 0 && rr.top < innerHeight;
      let x;
      if (reduce) x = OP.forced >= 0 ? OP.forced + 0.99 : 0;
      else {
        const range = sec.offsetHeight - innerHeight;
        const p = range > 0 ? Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / range)) : 0;
        x = Math.min(N - 0.001, p * N);
      }
      OP.x = x; if (OP.onPaint) OP.onPaint();
      const idx = Math.floor(x), t = Math.min(1, Math.max(0, (x - idx) / 0.8));
      if (idx !== OP.idx && OP.live) opStage(idx);
      OP.migs.forEach(mg => {
        const v = idx === 6 ? Math.min(1, Math.max(0, t * 1.25 - (mg.k % 61) / 61 * 0.25)) : 0;
        mg.el.style.strokeDashoffset = (mg.len * (1 - v)).toFixed(2);
      });
      OP.spokes.forEach(sp => {
        const v = idx === 6 ? Math.min(1, Math.max(0, t * 1.25 - (sp.k % 97) / 97 * 0.25)) : 0;
        sp.el.style.strokeDashoffset = (sp.len * (1 - v)).toFixed(2);
      });
      OP.spots.forEach(sp => {
        const o = idx === 6 ? Math.min(1, Math.max(0, t * 1.3 - (sp.k % 97) / 97 * 0.3)) : 0;
        sp.el.style.opacity = o.toFixed(3);
      });
      OP.routes.forEach(r => {
        const v = r.s < idx ? 1 : r.s === idx ? t : 0;
        r.el.style.strokeDashoffset = r.len * (1 - v);
        r.el.classList.toggle('ghost', idx === 6);
        r.t.classList.toggle('on', v > 0.92);
        r.pin.style.opacity = v > 0 ? 1 : 0;
      });
    }
    let raf = 0;
    const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; opPaint(); }); };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    opStage(0);
    opPaint();
  }
  /* البطاقات الثلاث في «ابدأ من هنا»: تُفتح في مكانها، وفي كل واحدة محتواها */
  function entriesInit() {
    const ab = $('#entAboutB');
    ab.innerHTML = ENTRY.about[1]();
    [...ab.querySelectorAll(':scope > .pd-sec')].forEach((sec, i) => {
      const h = sec.querySelector(':scope > h4');
      if (!h || i === 0) return;
      const d = document.createElement('details');
      d.className = 'fold';
      const sm = document.createElement('summary');
      sec.replaceWith(d);
      sm.appendChild(h);
      d.appendChild(sm);
      d.appendChild(sec);
    });
    $('#entNarrB').innerHTML = `<p><b>كالملح في الطعام:</b> سبعة فصول من واحة يثرب إلى اليوم، بنصوص المصادر بألفاظها، وكل فصل يفتح ما يقابله في الأطلس. والافتتاحية أدناه تمر بالفصول نفسها على الخريطة.</p><div class="op-acts" style="margin-top:8px"><button type="button" data-open-entry="narrative">فتح السردية كاملة</button></div>`;
    const ayat = D.wahy.quran.lexical.slice(0, 3).map(a => `<p class="qr">﴿${esc(a.text)}﴾ <small>(${a.s}:${a.a})</small></p>`).join('');
    $('#entTextsB').innerHTML = `<p class="muted" style="margin:0">من القرآن:</p>${ayat}<p class="muted" style="margin:6px 0 0">من الحديث: حديثان في فضلهم، ونصّاهما ودرجتاهما في قسم «أحاديث الأنصار».</p><div class="op-acts" style="margin-top:8px"><button type="button" data-open-entry="texts">فتح النصوص كاملة</button></div>`;
  }
  /* أحاديث الأنصار: عبارة واحدة في كل مرة تتوهج كلماتها، وأشعة من وسطها بعدد رواياتها */
  function quoteInit() {
    const stage = $('#qstage'); if (!stage || !D.wahy || !D.wahy.featured) return;
    const F = D.wahy.featured, cv = $('#qCv'), ctx = cv.getContext('2d');
    const host = cv;
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    let cur = 0, W = 1, H = 1, dpr = 1, rays = 0, raysTo = 0, angle = 0, raf = 0, vis = true, last = performance.now();
    const txt = $('#qText'), src = $('#qSrc'), nav = $('#qNav'), cnt = $('#qCount'), more = $('#qMore');
    const isHL = w => /نصار/.test(w);

    nav.innerHTML = F.map((f, i) => `<button type="button" data-q="${i}" aria-label="${esc(f.phrase)}" title="${esc(f.phrase)}"></button>`).join('');

    function show(i) {
      cur = (i + F.length) % F.length;
      const f = F[cur], h = f.hits[0] || {};
      txt.innerHTML = f.phrase.split(' ').map((w, k) => `<span class="qw${isHL(w) ? ' hl' : ''}" style="--d:${k * 110}ms">${esc(w)}</span>`).join(' ');
      txt.dataset.k = String(cur);
      src.innerHTML = `<b>${esc(h.cn || '')}</b> · رقم ${esc(String(h.no || ''))}`;
      cnt.innerHTML = `<b>${f.hits.length}</b> ${f.hits.length === 1 ? 'رواية' : 'روايات'}`;
      more.setAttribute('aria-expanded', 'false');
      const box = $('#qList'); box.hidden = true;
      box.innerHTML = f.hits.map(x => `<details class="wh"><summary><b>${esc(x.cn)}</b> <small>رقم ${esc(String(x.no))}</small></summary><p>${esc(x.text)}</p><small class="src">${esc(x.status || '')}</small></details>`).join('');
      nav.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-current', k === cur ? 'true' : 'false'));
      raysTo = Math.min(44, 10 + f.hits.length * 9);
      kick();
    }

    function layout() {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      kick();
    }

    function drawRays(dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      rays += (raysTo - rays) * Math.min(1, dt * 3);
      angle += dt * 0.08;
      const cx = W / 2, cy = H * 0.42, L = Math.hypot(W, H);
      const n = Math.round(rays);
      for (let i = 0; i < n; i++) {
        const a = angle + (i / n) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.05;
        const w = 0.5 + (i % 3) * 0.35;
        const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * L * 0.6, cy + Math.sin(a) * L * 0.6);
        g.addColorStop(0, 'rgba(228,187,98,0.16)'); g.addColorStop(1, 'rgba(228,187,98,0)');
        ctx.strokeStyle = g; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.012) * L * 0.6, cy + Math.sin(a - 0.012) * L * 0.6); ctx.stroke();
      }
      const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.42);
      hg.addColorStop(0, 'rgba(95,211,184,0.16)'); hg.addColorStop(1, 'rgba(95,211,184,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    }

    function frame(now) {
      raf = 0;
      if (!vis) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      drawRays(dt);
      if (!RM && Math.abs(rays - raysTo) > 0.05) raf = requestAnimationFrame(frame);
      else if (!RM) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && vis) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    $('#qPrev').addEventListener('click', () => show(cur - 1));
    $('#qNext').addEventListener('click', () => show(cur + 1));
    nav.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) show(+b.dataset.q); });
    more.addEventListener('click', () => {
      const box = $('#qList'), open = box.hidden;
      box.hidden = !open; more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'إخفاء الروايات' : 'اقرأ الروايات';
    });
    stage.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur + 1); if (e.key === 'ArrowRight') show(cur - 1); });
    let sx = null;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; });
    stage.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) show(dx < 0 ? cur + 1 : cur - 1); });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(stage);
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage);
    layout();
    show(0);
  }
  quoteInit();
  $('.entries').addEventListener('click', e => {
    const oe = e.target.closest('[data-open-entry]'); if (oe) { openEntry(oe.dataset.openEntry); return; }
    const g = e.target.closest('[data-opgo]'); if (g) { opGo8(+g.dataset.opgo); return; }
    const n = e.target.closest('[data-opn]'); if (n) openNarrative8(+n.dataset.opn);
  });
  function renderThemes8() {
    const byKey = Object.fromEntries(D.virtues.map(v => [v.c + ':' + v.no, v]));
    const N = EX.themes.length;
    $('#themes').innerHTML = '<div class="tcar" id="tcar" tabindex="0" aria-label="موضوعات أحاديث الأنصار، استخدم الأسهم للتنقل">' +
      EX.themes.map((th, i) => `<article class="theme"><h3><span class="num">${i + 1} / ${N}</span>${esc(th.title)}</h3><p class="mini">${esc(th.intro)}</p><div class="wh-list">${th.keys.map(k => byKey[k] ? hadithCard8(byKey[k], EX.virtue[k] || '') : '').join('')}</div></article>`).join('') +
      '</div><nav class="tnav" aria-label="تنقل بين موضوعات الأحاديث"><button type="button" id="tprev">السابق</button><div class="tdots" id="tdots"></div><button type="button" id="tnext">التالي</button></nav>';
    carouselSetup8();
  }
  function carouselSetup8() {
    const car = $('#tcar');
    if (!car) return;
    const cards = [...car.querySelectorAll('.theme')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dots = $('#tdots');
    dots.innerHTML = cards.map((c, i) => `<button type="button" data-i="${i}" aria-label="${esc(c.querySelector('h3').textContent.trim())}"></button>`).join('');
    let cur = 0, raf = 0;
    const centerOf = el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
    const paint = () => {
      raf = 0;
      const mid = car.getBoundingClientRect().left + car.clientWidth / 2;
      let best = 0, bd = Infinity;
      cards.forEach((c, i) => {
        const a = Math.abs(centerOf(c) - mid) / car.clientWidth;
        if (a < bd) { bd = a; best = i; }
        if (!reduce) { c.style.setProperty('--s', Math.max(.93, 1 - a * .12).toFixed(3)); c.style.setProperty('--o', Math.max(.55, 1 - a * .6).toFixed(3)); }
      });
      cur = best;
      cards.forEach((c, i) => c.classList.toggle('on', i === best));
      dots.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === best ? 'true' : 'false'));
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    car.addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    const go = i => {
      const c = cards[(i + cards.length) % cards.length];
      const delta = centerOf(c) - (car.getBoundingClientRect().left + car.clientWidth / 2);
      car.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' });
    };
    dots.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) go(+b.dataset.i); });
    $('#tprev').addEventListener('click', () => go(cur - 1));
    $('#tnext').addEventListener('click', () => go(cur + 1));
    car.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur - 1); }
    });
    car.scrollBy({ left: centerOf(cards[0]) - (car.getBoundingClientRect().left + car.clientWidth / 2), behavior: 'auto' });
    paint();
  }
  function renderBTree8() {
    const BB = D.bellies;
    const tribes = [...new Set(BB.bellies.map(b => b.tribe))];
    $('#btree').innerHTML = tribes.map(tr => {
      const bl = BB.bellies.filter(b => b.tribe === tr).sort((a, b) => b.people - a.people);
      return `<details class="tribe"><summary><b>${esc(tr)}</b> <small>${bl.length} بطنًا · اضغط للفتح</small></summary>` + bl.map(b => {
        const items = BB.curated.filter(c => c.belly === b.name);
        const curatedRefs = new Set(items.map(c => c.ref));
        const quranCur = items.filter(c => c.kind === 'قرآن').map(c => `<div class="actrow"><b>القرآن · ${esc(c.ref)}</b><p>﴿${esc(c.text)}﴾</p><p class="expl"><b>المعنى:</b> ${esc(EX.belly[b.name + '|' + c.kind + '|' + c.ref] || c.note)}</p><small class="grade">الدرجة: نص الآية ثابت بالتواتر. ${esc(c.basis)}</small><small class="src">المصدر: القرآن الكريم، سورة ${esc(c.ref.split(':')[0])} آية ${esc(c.ref.split(':')[1])}</small></div>`).join('');
        const GM = {};
        BB.bellies.forEach(x => x.hadith.forEach(h => { GM[h.cn + ' · رقم ' + h.no] = h.status; }));
        const hadCur = items.filter(c => c.kind !== 'قرآن').map(c => `<div class="actrow"><b>الحديث · ${esc(c.ref)}</b><p>${esc(c.text)}</p><p class="expl"><b>المعنى:</b> ${esc(EX.belly[b.name + '|' + c.kind + '|' + c.ref] || c.note)}</p><small class="src">المصدر: ${esc(c.ref)}</small><small class="grade">${esc(GM[c.ref] || '')}</small></div>`).join('');
        const restRefs = b.hadith.filter(h => !curatedRefs.has(`${h.cn} · رقم ${h.no}`));
        const restHad = restRefs.length ? `<div class="refl"><p class="mini">نصوص أخرى لهذا البطن في الكتب الستة، بلا نصّها هنا؛ «كل النصوص» تعرضها:</p>` + restRefs.map(h => `<div class="refr"><b>${esc(h.cn)}</b> · رقم ${esc(String(h.no))}${h.status ? ` <small class="grade">${esc(h.status)}</small>` : ''}</div>`).join('') + '</div>' : '';
        const body = quranCur + hadCur + restHad || '<p class="mini">لا نص في الكتب الستة بهذا الاسم.</p>';
        return `<details class="bnode"><summary><b>${esc(b.name)}</b> <small>${b.people} صحابيًّا وعلمًا ${b.hadith.length ? ' · ' + b.hadith.length + ' نصًّا في الكتب الستة' : ''}</small></summary>${body}<button type="button" class="chipb" data-open-belly="${esc(b.name)}">كل النصوص (${b.hadith.length})</button></details>`;
      }).join('') + '</details>';
    }).join('');
  }
  function gtxt8(k) { return k === 'none' ? 'بلا حكم' : k; }
  function gcls8(k) { return { صحيح: 's', حسن: 'h', ضعيف: 'w', منكر: 'x', none: 'n' }[k] || 'n'; }
  function gradeKey8(s) {
    if (/منكر|شاذ|موضوع/.test(s)) return 'منكر';
    if (/ضعيف/.test(s)) return 'ضعيف';
    if (/حسن/.test(s)) return 'حسن';
    if (/صحيح/.test(s)) return 'صحيح';
    return 'none';
  }
  function renderGrades8() {
    const seen = new Map();
    D.wahy.hadith.forEach(h => seen.set(h.c + ':' + h.no, h));
    D.bellies.bellies.forEach(b => b.hadith.forEach(h => { if (!seen.has(h.c + ':' + h.no)) seen.set(h.c + ':' + h.no, h); }));
    window.GRADE_ROWS8 = [...seen.values()].sort((a, b) => a.c.localeCompare(b.c) || a.no - b.no);
    drawGrades8();
  }
  const GR8_PAGE = 40, GR8 = { L: [], n: GR8_PAGE, key: '', last: '' };
  function drawGrades8() {
    const col = $('#gcol').value, gr = $('#ggr').value, q = wnorm($('#gq').value);
    const L = window.GRADE_ROWS8.filter(h => (col === 'all' || h.c === col)
      && (gr === 'all' || gradeKey8(h.status) === gr)
      && (!q || wnorm(h.text).includes(q)));
    const idxKeys = new Set(D.wahy.hadith.map(h => h.c + ':' + h.no));
    const fromIdx = L.filter(h => idxKeys.has(h.c + ':' + h.no)).length;
    $('#gcount').textContent = `${L.length} حديثًا · ${fromIdx} من الفهرس العام و${L.length - fromIdx} مرتبطة بالبطون`;
    const GK = ['صحيح', 'حسن', 'ضعيف', 'منكر', 'none'], GL = { صحيح: 'صحيح', حسن: 'حسن', ضعيف: 'ضعيف', منكر: 'منكر', none: 'بلا حكم في المصدر' };
    const cnt = Object.fromEntries(GK.map(k => [k, 0]));
    L.forEach(h => { cnt[gradeKey8(h.status)]++; });
    const tot = L.length || 1;
    const cols = {};
    L.forEach(h => { if (!cols[h.c]) cols[h.c] = { name: String(h.cn || h.c).replace(/ ·.*$/, ''), n: 0 }; cols[h.c].n++; });
    $('#gsum').innerHTML = L.length ? `
      <div class="gbar" role="img" aria-label="توزع الدرجات">${GK.filter(k => cnt[k]).map(k => `<i class="gc-${gcls8(k)}" style="width:${(cnt[k] / tot * 100).toFixed(2)}%" title="${esc(GL[k])}: ${cnt[k]}"></i>`).join('')}</div>
      <div class="glegend">${GK.filter(k => cnt[k]).map(k => `<span><i class="gc-${gcls8(k)}"></i>${esc(GL[k])} <b>${cnt[k]}</b></span>`).join('')}</div>
      <div class="gcols">${Object.values(cols).sort((a, b) => b.n - a.n).map(c => `<span class="gcol">${esc(c.name)} <b>${c.n}</b></span>`).join('')}</div>
      <div class="gbtns"><button type="button" data-gall="open">فتح كل المجموعات</button><button type="button" data-gall="close">طيّ كل المجموعات</button></div>` : '';
    GR8.open = GR8.open || new Set();
    const groups = new Map();
    L.forEach(h => { if (!groups.has(h.c)) groups.set(h.c, { name: String(h.cn || h.c).replace(/ ·.*$/, ''), rows: [] }); groups.get(h.c).rows.push(h); });
    const topOf8 = c => ['bukhari', 'muslim'].includes(c) ? 'sahih' : (['abudawud', 'tirmidhi', 'nasai', 'ibnmajah'].includes(c) ? 'sunan' : 'other');
    const TOPN8 = { sahih: 'الصحاح', sunan: 'السنن', other: 'مصادر أخرى' };
    GR8.keys = [...groups.keys()];
    ['sahih', 'sunan', 'other'].filter(t => GR8.keys.some(c => topOf8(c) === t)).forEach(t => GR8.keys.push('T:' + t));
    if (q) GR8.keys.forEach(c => GR8.open.add(c));
    const rk8 = c => { const i = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'].indexOf(c); return i < 0 ? 99 : i; };
    GR8.keys.sort((a, b) => rk8(a) - rk8(b));
    const rowH = h => `<details class="wh"><summary><b>${esc(h.cn)}</b> <small>رقم ${esc(String(h.no))}</small> <span class="gtag gc-${gcls8(gradeKey8(h.status))}">${esc(gtxt8(gradeKey8(h.status)))}</span></summary><p>${esc(String(h.text).slice(0, 400))}</p><small class="src">المصدر: ${esc(h.cn)} · رقم ${esc(String(h.no))}</small><small class="grade">${esc(h.status)}</small></details>`;
    const bookH = ([c, g]) => {
      const on = GR8.open.has(c);
      return `<div class="gg${on ? ' on' : ''}"><button type="button" class="gg-h" data-gg="${esc(c)}" aria-expanded="${on}"><span class="gg-t"><b>${esc(g.name)}</b> <small>${g.rows.length} حديثًا</small></span><span class="gg-a">${on ? 'إخفاء النتائج' : 'عرض النتائج'}</span></button>${on ? `<div class="gg-b">${g.rows.map(rowH).join('')}</div>` : ''}</div>`;
    };
    const topsH = ['sahih', 'sunan', 'other'].map(t => {
      const books = [...groups].filter(([c]) => topOf8(c) === t).sort((x, y) => rk8(x[0]) - rk8(y[0]));
      if (!books.length) return '';
      const n = books.reduce((sum, [, g]) => sum + g.rows.length, 0);
      const on = GR8.open.has('T:' + t);
      return `<div class="gg gg-top${on ? ' on' : ''}"><button type="button" class="gg-h" data-gg="T:${t}" aria-expanded="${on}"><span class="gg-t"><b>${TOPN8[t]}</b> <small>${books.length} كتابًا · ${n} حديثًا</small></span><span class="gg-a">${on ? 'إخفاء' : 'عرض'}</span></button>${on ? `<div class="gg-b">${books.map(bookH).join('')}</div>` : ''}</div>`;
    }).join('');
    $('#glist').innerHTML = topsH || '<p class="muted">لا نتائج</p>';
    $('#gmore').hidden = true;
  }
  $('#glist').addEventListener('click', e => {
    const b = e.target.closest('[data-gg]'); if (!b) return;
    const c = b.dataset.gg;
    GR8.open.has(c) ? GR8.open.delete(c) : GR8.open.add(c);
    drawGrades8();
  });
  $('#gsum').addEventListener('click', e => {
    const b = e.target.closest('[data-gall]'); if (!b) return;
    if (b.dataset.gall === 'open') (GR8.keys || []).forEach(c => GR8.open.add(c));
    else GR8.open.clear();
    drawGrades8();
  });
  $('#gmore').addEventListener('click', () => { GR8.n += GR8_PAGE; drawGrades8(); });
  $('#gcol').addEventListener('change', drawGrades8);
  $('#ggr').addEventListener('change', drawGrades8);
  $('#gq').addEventListener('input', drawGrades8);
  $('#btree').addEventListener('click', e => {
    const b = e.target.closest('[data-open-belly]'); if (!b) return;
    openEntry('texts');
    $('#wbel').value = b.dataset.openBelly;
    bellyShow();
  });
  function wahySearch() {
    const W = D.wahy, q = wnorm($('#wq').value), src = document.querySelector('#wsrc .on')?.dataset.ws || 'all';
    const Q = [...W.quran.lexical, ...W.quran.tafsir].filter(() => src !== 'hadith');
    const H = W.hadith.filter(() => src !== 'quran');
    const qh = Q.filter(a => !q || wnorm(a.text).includes(q));
    const hh = H.filter(h => !q || wnorm(h.text).includes(q) || wnorm(h.cn).includes(q));
    const total = qh.length + hh.length;
    const shown = [...qh.map(a => `<p>﴿${esc(a.text)}﴾ <small>(${a.s}:${a.a})</small></p>`), ...hh.slice(0, 40).map(h => `<details class="wh"><summary><b>${esc(h.cn)}</b> <small>رقم ${esc(String(h.no))}</small></summary><p>${esc(h.text)}</p><small class="src">المصدر: ${esc(h.cn)} · رقم ${esc(String(h.no))}</small><small class="grade">${esc(h.status)}</small></details>`)].join('');
    $('#wres').innerHTML = shown || '<p class="muted">لا نتائج</p>';
    $('#wcount').textContent = `${total} نصًّا` + (hh.length > 40 ? ` (يُعرض أول 40 من الحديث، فضيّق البحث)` : '');
  }
  function bindTexts() {
    $('#wq').addEventListener('input', wahySearch);
    $('#wbel').addEventListener('change', bellyShow);
    $('#wbq').addEventListener('input', bellyShow);
    bellyShow();
    $('#wsrc').addEventListener('click', e => {
      const b = e.target.closest('[data-ws]'); if (!b) return;
      $$('#wsrc button').forEach(x => x.classList.toggle('on', x === b));
      wahySearch();
    });
    wahySearch();
  }
  /* طيّ أقسام نصوص الأنصار الطويلة: العنوان والعدد يظهران، والمحتوى عند الطلب. يبقى مفتوحًا البحث والبطون لأنهما أداة العمل */
  function foldTexts() {
    const keep = /بحث في النصوص|تُراجع أرقام|بطون الأوس والخزرج/;
    $$('#pdBody > .pd-sec').forEach(sec => {
      const h = sec.querySelector(':scope > h4');
      if (!h || keep.test(h.textContent)) return;
      const d = document.createElement('details');
      d.className = 'fold';
      const sm = document.createElement('summary');
      sec.replaceWith(d);
      sm.appendChild(h);
      d.appendChild(sm);
      d.appendChild(sec);
    });
  }
  function openEntry(k) {
    const [title, body] = ENTRY[k];
    openDialog(title, body(), k === 'texts' ? { rebind: bindTexts } : k === 'narrative' ? { rebind: bindNarr8 } : {});
    if (k === 'texts') foldTexts();
  }
  $$('[data-entry]').forEach(b => b.addEventListener('click', () => openEntry(b.dataset.entry)));
  $('#heroStart').addEventListener('click', () => $('#h-open').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  $('#heroMap').addEventListener('click', () => $('#openMap').click());
  $('#geoMap').addEventListener('click', () => openMap('all'));
  /* البداية: فجرٌ يتسلل من المدينة، ثم تمتد الهجرات إلى كل قُطر تسكنه أسر الأنصار اليوم */
  function heroLightInit() {
    const cv = $('#hlCv'); if (!cv || !cv.getContext) return;
    const host = cv.parentElement, tip = $('#hlTip'), ctx = cv.getContext('2d');
    const origin = opPoint('place', 'المدينة المنورة');
    if (!origin || typeof Path2D === 'undefined') return;
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const DAWN = 5.2;
    // أماكن الأسر الحديثة: كل مكان فيه أسرة، والبعيد جدًا (جاكرتا) خارج الإطار
    const PL = D.places.filter(q => q.x != null && q.y != null && q.f && q.f.length && q.x < 700);
    const best = {};
    PL.forEach(q => { if (q.p === 'المدينة المنورة') return; const k = q.c || q.p; if (!best[k] || best[k].f.length < q.f.length) best[k] = q; });
    const dests = Object.values(best).sort((u, v) => Math.hypot(u.x - origin.x, u.y - origin.y) - Math.hypot(v.x - origin.x, v.y - origin.y));
    const BX0 = Math.min(...PL.map(q => q.x)) - 26, BX1 = Math.max(...PL.map(q => q.x)) + 26;
    const BY0 = Math.min(...PL.map(q => q.y)) - 26, BY1 = Math.max(...PL.map(q => q.y)) + 26;
    const BW = BX1 - BX0, BH = BY1 - BY0;
    const LAND = new Path2D(D.land);
    const T0 = performance.now();
    let W = 1, H = 1, dpr = 1, S = 1, OX = 0, OY = 0, dots = [], maxD = 1, ox0 = 0, oy0 = 0, arcs = [], PLC = [], END = DAWN + 4, vis = true, raf = 0;
    const toC = q => [OX + (q.x - BX0) * S, OY + (q.y - BY0) * S];
    const tNow = now => (now - T0) / 1000;
    const ease = u => 1 - Math.pow(1 - u, 3);

    function bez(p0, p1) {
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], d = Math.hypot(dx, dy);
      const mx = (p0[0] + p1[0]) / 2 - dy * 0.22, my = (p0[1] + p1[1]) / 2 + dx * 0.22 - d * 0.12;
      return u => { const v = 1 - u; return [v * v * p0[0] + 2 * v * u * mx + u * u * p1[0], v * v * p0[1] + 2 * v * u * my + u * u * p1[1]]; };
    }

    function layout() {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (W >= 720) { S = Math.min((W * 0.94) / BW, (H * 0.46) / BH); OX = (W - BW * S) / 2; OY = H - BH * S - H * 0.03; }
      else { S = Math.min((W * 0.96) / BW, (H * 0.42) / BH); OX = (W - BW * S) / 2; OY = H * 0.5; }
      [ox0, oy0] = toC(origin);
      const mask = landMask(LAND, [S * dpr, 0, 0, S * dpr, (OX - BX0 * S) * dpr, (OY - BY0 * S) * dpr], cv.width, cv.height);
      dots = [];
      const g = W >= 720 ? 4 : 3;
      for (let y = 0; y < H; y += g) for (let x = 0; x < W; x += g) {
        const jx = x + (Math.random() - 0.5) * 1.2, jy = y + (Math.random() - 0.5) * 1.2;
        if (landHas(mask, jx, jy, dpr)) dots.push({ x: jx, y: jy, d: Math.hypot(jx - ox0, jy - oy0), a: 0.35 + Math.random() * 0.65 });
      }
      maxD = dots.reduce((m, q) => Math.max(m, q.d), 1);
      PLC = PL.map(q => { const xy = toC(q); return { k: q.p, c: q.c, xy, d: Math.hypot(xy[0] - ox0, xy[1] - oy0) }; });
      const topN = new Set([...dests].sort((u, v) => v.f.length - u.f.length).slice(0, 8));
      arcs = dests.map((q, i) => { const to = toC(q); return { k: q.p, c: q.c, to, big: topN.has(q), at: DAWN * 0.5 + i * 0.2, f: bez([ox0, oy0], to) }; });
      END = Math.max(DAWN, ...arcs.map(a => a.at + 2.4)) + 0.8;
    }

    function halo(txt, x, y) {
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,16,13,.9)'; ctx.lineJoin = 'round';
      ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y);
    }

    function strokeCurve(f, u0, u1, color, alpha, width) {
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const u = u0 + (u1 - u0) * (i / 48), [x, y] = f(u);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }

    function draw(now) {
      const t = RM ? END : tNow(now);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const front = maxD * ease(Math.min(1, t / DAWN));
      ctx.fillStyle = '#9fd8c6';
      for (const q of dots) {
        const lit = Math.max(0, Math.min(1, (front - q.d) / 36));
        const wave = Math.exp(-Math.pow((q.d - front) / 10, 2)) * (t < DAWN + 1 ? 1 : 0);
        ctx.globalAlpha = Math.min(1, (0.1 + 0.2 * lit + 0.7 * wave) * q.a);
        ctx.fillRect(q.x, q.y, 1.5, 1.5);
      }
      ctx.fillStyle = '#e4bb62';
      for (const q of PLC) {
        const l = Math.max(0, Math.min(1, (front - q.d) / 30));
        if (!l) continue;
        ctx.globalAlpha = 0.3 + 0.55 * l;
        ctx.beginPath(); ctx.arc(q.xy[0], q.xy[1], 1.9, 0, 6.2832); ctx.fill();
      }
      ctx.font = '600 12.5px ThmDisplay, Reem Kufi, Amiri, sans-serif';
      for (const a of arcs) {
        const u = Math.max(0, Math.min(1, (t - a.at) / 2.4));
        if (u <= 0) continue;
        strokeCurve(a.f, 0, 1, '#5fd3b8', 0.16, 1);
        strokeCurve(a.f, Math.max(0, u - 0.42), u, '#8fe9d2', 0.95, 1.6);
        const [hx, hy] = a.f(u);
        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
        hg.addColorStop(0, 'rgba(143,233,210,.95)'); hg.addColorStop(1, 'rgba(143,233,210,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 14, 0, 6.2832); ctx.fill();
        if (u >= 1) {
          const la = Math.max(0, Math.min(1, (t - a.at - 2.4) / 0.6));
          const w = ctx.measureText(a.k).width;
          const right = a.to[0] < ox0 && a.to[0] - w - 9 > 6;
          if (!a.big) { ctx.globalAlpha = 1; ctx.fillStyle = '#e4bb62'; ctx.beginPath(); ctx.arc(a.to[0], a.to[1], 3.4, 0, 6.2832); ctx.fill(); continue; }
          ctx.globalAlpha = la; ctx.fillStyle = '#e4bb62';
          ctx.beginPath(); ctx.arc(a.to[0], a.to[1], 3.4, 0, 6.2832); ctx.fill();
          ctx.fillStyle = '#eef6f2'; ctx.textAlign = right ? 'right' : 'left';
          halo(a.k, a.to[0] + (right ? -8 : 8), a.to[1] + 4);
        }
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      const og = ctx.createRadialGradient(ox0, oy0, 0, ox0, oy0, 26 + 8 * pulse);
      og.addColorStop(0, 'rgba(228,187,98,.85)'); og.addColorStop(1, 'rgba(228,187,98,0)');
      ctx.globalAlpha = Math.min(1, t / 0.8); ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(ox0, oy0, 26 + 8 * pulse, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.arc(ox0, oy0, 3.4, 0, 6.2832); ctx.fill();
      ctx.font = '700 14px ThmDisplay, Reem Kufi, Amiri, sans-serif'; ctx.fillStyle = '#e4bb62';
      if (W >= 720) { ctx.textAlign = 'right'; halo('المدينة المنورة', ox0 - 12, oy0 + 5); }
      else { ctx.textAlign = 'center'; halo('المدينة المنورة', ox0, oy0 + 26); }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = 0;
      if (!vis) return;
      draw(now);
      if (!RM && tNow(now) < END) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && vis && !RM) raf = requestAnimationFrame(frame); }
    function refresh() { layout(); draw(performance.now()); kick(); }

    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = tNow(performance.now());
      let best = null, bd = 16;
      for (const a of arcs) {
        if (now < a.at + 2.4) continue;
        const d = Math.hypot(a.to[0] - x, a.to[1] - y);
        if (d < bd) { bd = d; best = { t: a.k, sub: 'مقصد هجرة', at: a.to }; }
      }
      for (const q of PLC) {
        const d = Math.hypot(q.xy[0] - x, q.xy[1] - y);
        if (d < bd) { bd = d; best = { t: q.k, sub: q.c || '', at: q.xy }; }
      }
      if (!best) { tip.hidden = true; return; }
      tip.hidden = false;
      tip.textContent = best.sub ? best.t + ' · ' + best.sub : best.t;
      tip.style.left = best.at[0] + 'px'; tip.style.top = best.at[1] + 'px';
    });
    host.addEventListener('pointerleave', () => { tip.hidden = true; });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(host);
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(host);
    else window.addEventListener('resize', refresh);
    refresh();
  }

  /* شجرة الأنساب: الجذر في المدينة، والقبيلتان فرعان، وكل بطن غصن، وكل أسرة ورقة، والضوء يسري من الجذر */
  function rootLitInit() {
    const cv = $('#rlCv'); if (!cv || !cv.getContext) return;
    const host = cv.parentElement, tip = $('#rlTip'), ctx = cv.getContext('2d');
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const BB = D.bellies.bellies;
    const cnt = name => D.fams.filter(f => f.b === name).length;
    const maxN = Math.max(1, ...BB.map(b => cnt(b.name)));
    const T0 = performance.now();
    let W = 1, H = 1, dpr = 1, root = [0, 0], br = [], vis = true, raf = 0;
    const tNow = now => (now - T0) / 1000;
    const ease = u => 1 - Math.pow(1 - u, 3);
    const TRIBES = [{ t: 'الأوس', c: -128, s: 70, col: '#e4bb62' }, { t: 'الخزرج', c: -52, s: 70, col: '#5fd3b8' }];

    function layout() {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      root = [W / 2, H * 0.92];
      const reach = W >= 720 ? Math.min(H * 0.62, W * 0.42) : Math.min(H * 0.8, W * 0.85);
      br = [];
      TRIBES.forEach((T, ti) => {
        const list = BB.filter(b => b.tribe === T.t).map(b => ({ name: b.name, n: cnt(b.name) })).sort((u, v) => v.n - u.n);
        const L = list.length;
        list.forEach((b, i) => {
          const ang = (T.c + (L > 1 ? (i - (L - 1) / 2) * (T.s / (L - 1)) : 0)) * Math.PI / 180;
          const len = reach * (0.5 + 0.5 * (b.n / maxN));
          const e = [root[0] + len * Math.cos(ang), root[1] + len * Math.sin(ang)];
          const bend = (ti === 0 ? -1 : 1) * 0.22;
          const cA = ang + bend, cp = [root[0] + len * 0.55 * Math.cos(cA), root[1] + len * 0.55 * Math.sin(cA)];
          const f = u => { const v = 1 - u; return [v * v * root[0] + 2 * v * u * cp[0] + u * u * e[0], v * v * root[1] + 2 * v * u * cp[1] + u * u * e[1]]; };
          const leaves = [];
          for (let k = 0; k < b.n; k++) {
            const ring = Math.floor(k / 7), j = k % 7, la = ang + (j - 3) * 0.3, rr = 10 + ring * 8;
            leaves.push([e[0] + rr * Math.cos(la), e[1] + rr * Math.sin(la)]);
          }
          br.push({ name: b.name, n: b.n, tribe: T.t, col: T.col, f, e, leaves, delay: 0.25 + i * 0.12 + ti * 0.5, period: 3.2 + (i % 3) * 0.5, lx: e[0] + (Math.cos(ang) >= 0 ? 12 : -12), ly: e[1] + 4, right: Math.cos(ang) >= 0 });
        });
      });
    }

    function curve(f, u0, u1) {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = u0 + (u1 - u0) * (i / 40), [x, y] = f(u);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }

    function draw(now) {
      const t = RM ? 12 : tNow(now);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // الجذر
      const rg = ctx.createRadialGradient(root[0], root[1], 0, root[0], root[1], 46);
      rg.addColorStop(0, 'rgba(228,187,98,.7)'); rg.addColorStop(1, 'rgba(228,187,98,0)');
      ctx.globalAlpha = Math.min(1, t / 0.8); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(root[0], root[1], 46, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.arc(root[0], root[1], 4, 0, 6.2832); ctx.fill();
      ctx.font = '700 14px ThmDisplay, Reem Kufi, Amiri, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('الأنصار', root[0], root[1] + 24);
      ctx.font = '600 12.5px ThmDisplay, Reem Kufi, Amiri, sans-serif';
      for (const b of br) {
        const g = ease(Math.max(0, Math.min(1, (t - b.delay) / 1.6)));
        if (g <= 0) continue;
        ctx.lineCap = 'round';
        curve(b.f, 0, g); ctx.globalAlpha = 0.5; ctx.strokeStyle = b.col; ctx.lineWidth = 1.4; ctx.stroke();
        if (g < 1) continue;
        // نبض يسري من الجذر إلى البطن
        const p = ((t - b.delay - 1.6) % b.period) / b.period;
        if (p > 0 && p < 1) {
          const tail = Math.max(0, p - 0.25);
          curve(b.f, tail, p); ctx.globalAlpha = 0.95; ctx.strokeStyle = b.col; ctx.lineWidth = 2.2; ctx.stroke();
          const [hx, hy] = b.f(p), hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12);
          hg.addColorStop(0, b.col); hg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 1; ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 12, 0, 6.2832); ctx.fill();
        }
        // البطن والأسر
        const la = Math.max(0, Math.min(1, (t - b.delay - 1.6) / 0.8));
        ctx.globalAlpha = la; ctx.fillStyle = b.col;
        ctx.beginPath(); ctx.arc(b.e[0], b.e[1], 4.5, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#e4bb62';
        for (const [x, y] of b.leaves) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.2832); ctx.fill(); }
        if (b.n >= 2) {
          // الاسم يقف على يمين الطرف أو يسارها، ويتحول إلى الجهة الأخرى إن خرج من الإطار
          const w = ctx.measureText(b.name).width, left = !b.right && b.lx - w > 6;
          const tx = left ? b.lx : b.e[0] + 12;
          ctx.globalAlpha = la; ctx.fillStyle = '#eef6f2'; ctx.textAlign = left ? 'right' : 'left';
          ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,16,13,.9)'; ctx.lineJoin = 'round';
          ctx.strokeText(b.name, tx, b.ly); ctx.fillText(b.name, tx, b.ly);
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = 0;
      if (!vis) return;
      draw(now);
      if (!RM) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && vis && !RM) raf = requestAnimationFrame(frame); }
    function refresh() { layout(); draw(performance.now()); kick(); }

    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 20;
      for (const b of br) {
        const d = Math.hypot(b.e[0] - x, b.e[1] - y);
        if (d < bd) { bd = d; best = b; }
      }
      if (!best) { tip.hidden = true; host.style.cursor = ''; return; }
      tip.hidden = false; host.style.cursor = 'pointer';
      tip.textContent = best.name + ' · ' + best.n + ' أسرة';
      tip.style.left = best.e[0] + 'px'; tip.style.top = best.e[1] + 'px';
    });
    host.addEventListener('pointerleave', () => { tip.hidden = true; });
    host.addEventListener('click', e => {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      for (const b of br) {
        if (Math.hypot(b.e[0] - x, b.e[1] - y) < 20) { openEntry('texts'); $('#wbel').value = b.name; bellyShow(); return; }
      }
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(host);
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(host);
    else window.addEventListener('resize', refresh);
    refresh();
  }
  heroLightInit();
  rootLitInit();
  $('#entAbout').addEventListener('toggle', () => {});

  /* مكدّس الأوراق: كل فتح داخل النافذة يدفع الورقة الحالية، والرجوع أو المسار يعيدانها */
  const LAYERS = { stack: [], cur: null };
  /* موضع آخر نقرة: منه تتسع النافذة */
  let WIN_ORIGIN = null;
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('button, .ec, .fc, summary, [data-pp], [data-fam]');
    if (!t) return;
    const r = t.getBoundingClientRect();
    if (r.width) WIN_ORIGIN = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, true);
  function winPlay(sel) {
    const root = document.querySelector(sel); if (!root || !WIN_ORIGIN) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const p = root.querySelector('.panel'); if (!p) return;
    const pr = p.getBoundingClientRect();
    p.style.setProperty('--ox', (WIN_ORIGIN.x - (pr.left + pr.width / 2)) + 'px');
    p.style.setProperty('--oy', (WIN_ORIGIN.y - (pr.top + pr.height / 2)) + 'px');
    root.classList.remove('win'); void root.offsetWidth; root.classList.add('win');
    p.addEventListener('animationend', () => root.classList.remove('win'), { once: true });
  }
  const isDlgOpen = () => !$('#pdlg').hidden;
  const snapLayer = () => ({ title: $('#pdTitle').textContent, html: $('#pdBody').innerHTML, scroll: $('#pdBody').scrollTop, rebind: LAYERS.cur ? LAYERS.cur.rebind : null });
  function beginLayer(title, opts = {}) {
    if (isDlgOpen() && !opts.replace) LAYERS.stack.push(snapLayer());
    LAYERS.cur = { rebind: opts.rebind || null };
    $('#pdTitle').textContent = title;
  }
  function showLayer(scroll = 0) {
    saveHash();
    const body = $('#pdBody');
    body.scrollTop = scroll;
    body.classList.remove('lyin'); void body.offsetWidth; body.classList.add('lyin');
    if (LAYERS.cur && LAYERS.cur.rebind) LAYERS.cur.rebind();
    const wasHidden = $('#pdlg').hidden;
    $('#pdlg').hidden = false;
    if (wasHidden) winPlay('#pdlg');
    $('#pdlg').dataset.depth = String(Math.min(LAYERS.stack.length, 2));
    renderTrail();
    $('#pdlg .close').focus();
  }
  function restoreLayer(l) {
    $('#pdTitle').textContent = l.title;
    $('#pdBody').innerHTML = l.html;
    LAYERS.cur = { rebind: l.rebind };
    showLayer(l.scroll || 0);
  }
  function renderTrail() {
    const tr = $('#pdTrail');
    const st = LAYERS.stack;
    const short = t => (t.length > 34 ? t.slice(0, 33) + '…' : t);
    tr.hidden = st.length === 0;
    $('#pdBack').hidden = st.length === 0;
    tr.innerHTML = '';
    if (st.length) tr.innerHTML = st.map((l, i) => `<button type="button" data-lv="${i}">${esc(short(l.title))}</button><span class="sep">›</span>`).join('') + `<b>${esc(short($('#pdTitle').textContent))}</b>`;
  }
  function popLayer() {
    const l = LAYERS.stack.pop();
    if (l) restoreLayer(l); else closeDialog();
  }
  function goLayer(i) {
    const t = LAYERS.stack[i];
    if (!t) return;
    LAYERS.stack = LAYERS.stack.slice(0, i);
    restoreLayer(t);
  }
  function closeDialog() {
    LAYERS.stack = []; LAYERS.cur = null;
    saveHash();
    $('#pdlg').hidden = true;
    $('#pdlg').dataset.depth = '0';
  }
  function openDialog(title, html, opts = {}) {
    beginLayer(title, opts);
    $('#pdBody').innerHTML = html;
    showLayer();
  }
  $('#pdBack').addEventListener('click', popLayer);
  $('#pdTrail').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (b) goLayer(+b.dataset.lv); });
  function showSource6(name) {
    const L = ALLR.filter(r => (r.srcs || []).some(x => x.b === name));
    openDialog(name, `<div class="pd-sec"><small>يستشهد به في ${L.length} سجلًّا</small></div><div class="pd-sec"><div class="li">${L.slice(0, 200).map(r => `<button type="button" data-rid="${esc(r.id)}">${esc(r.n)}</button>`).join('')}</div></div>`);
  }
  function revealNode6(pid) {
    const find = (n, path) => { if (n.kind === 'person' && n.pid === pid) return [n, path]; for (const k of n.kids) { const f = find(k, [...path, n]); if (f) return f; } return null; };
    if (!TG.tree) TG.tree = buildFullTree();
    const hit = find(TG.tree, []); if (!hit) return;
    hit[1].forEach(a => TG.open.add(a.id));
    TG.open.add(hit[0].id);
    TG.sel = hit[0].id;
    drawGraph4(); layout4();
    const n = findNode4(TG.tree, hit[0].id);
    if (n && n._x != null) { TG.vb.x = n._x - TG.vb.w * .7; TG.vb.y = n._y - TG.vb.h / 2; gSet4(); }
  }
  $('#pdBody').addEventListener('click', e => {
    const tm = e.target.closest('#tmap'); if (tm) { closePerson(); openFam(tm.dataset.tmap); openMap(); setMapMode('city'); return; }
    const tp = e.target.closest('[data-tp]'); if (tp) { const id = tp.dataset.tp; closePerson(); showTreeMode('graph'); revealNode6(id); $('#treeview').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
    const gk = e.target.closest('[data-gk2]'); if (gk) { closePerson(); setGF(gk.dataset.gk2); $('#tree').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
    const sr = e.target.closest('[data-src]'); if (sr) { showSource6(sr.dataset.src); return; }
  });
  $('#encbody').addEventListener('click', e => {
    const sr = e.target.closest('[data-src]'); if (sr) { showSource6(sr.dataset.src); }
  });
  $('#theme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
  });
  /* البند الثاني للخريطة: عجلة وسحب، وتلميح عند المرور، وأسماء العناقيد، وإخفاء فروع الطبقة */
  const LS8 = { br: new Set(), drag: null, moved: false, lastVB: null };
  function clusterName8(list) {
    const c = {};
    list.forEach(([p]) => { const n = nz(p.pp) || nz(p.p) || p.n; c[n] = (c[n] || 0) + 1; });
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return top ? (top[0].length > 22 ? top[0].slice(0, 21) + '…' : top[0]) : '';
  }
  let PSORT8 = 'root', PLACE8 = null;
  function topCities8() {
    const m = {};
    D.pts.forEach(p => {
      if (!p.pp || !(p.l === 'L6' || p.l === 'L4') || !LS.lay.has(p.l) || p.pp.includes('على مستوى الدولة')) return;
      (m[p.pp] = m[p.pp] || []).push(p);
    });
    return Object.entries(m).filter(([, l]) => l.length > 1).sort((a, b) => b[1].length - a[1].length).slice(0, 12);
  }
  function placeRecs8(name) {
    return D.pts.filter(p => p.pp === name && (p.l === 'L6' || p.l === 'L4'));
  }
  function drawTopCities8() {
    const top = topCities8();
    $('#topcities').innerHTML = top.length
      ? '<div class="note" style="width:100%">مدن متعددة الفروع (تاريخيًا)</div>' + top.map(([name, l]) => {
        const clans = new Set(l.map(p => p.root && p.root.clan).filter(Boolean));
        return `<button type="button" class="chipb" data-tc="${esc(name)}">${esc(name)} <small>${l.length}${clans.size ? ' · ' + esc([...clans].join('/')) : ''}</small></button>`;
      }).join('')
      : '';
  }
  function openPlace8(name) {
    PLACE8 = name;
    const L = placeRecs8(name);
    const keyOf = p => PSORT8 === 'layer' ? ((D.layers.find(l => l.key === p.l) || {}).short || p.l)
      : PSORT8 === 'root' ? ((p.root && p.root.clan) || 'غير مذكور') : 'كل السجلات';
    const groups = {};
    L.slice().sort((a, b) => String(a.n).localeCompare(String(b.n), 'ar')).forEach(p => { const k = keyOf(p); (groups[k] = groups[k] || []).push(p); });
    const seg = [['root', 'حسب الجذر'], ['layer', 'حسب الطبقة'], ['name', 'بالاسم']]
      .map(([k, l]) => `<button type="button" data-ps="${k}" class="${PSORT8 === k ? 'on' : ''}">${l}</button>`).join('');
    $('#ptcard').innerHTML = `<div class="pc"><div class="pch"><b>${esc(name)}</b> <small>${L.length} سجلًّا</small></div>`
      + `<div class="pc-sec"><div class="mseg" id="psort">${seg}</div></div>`
      + Object.keys(groups).map(g => `<div class="pc-sec"><h4>${esc(g)} <small>${groups[g].length}</small></h4><div class="li">${groups[g].map(p => `<button type="button" data-rid="${esc(p.id)}">${esc(p.n)}</button>`).join('')}</div></div>`).join('')
      + '</div>';
    $('#ptcard').scrollTop = 0;
  }
  $('#topcities').addEventListener('click', e => {
    const b = e.target.closest('[data-tc]'); if (!b) return;
    const L = placeRecs8(b.dataset.tc);
    const cx = L.reduce((s, p) => s + p.x, 0) / L.length, cy = L.reduce((s, p) => s + p.y2, 0) / L.length;
    LS5.clus = false; $$('#clmode button').forEach(x => x.classList.toggle('on', x.dataset.k === 'off'));
    zoomTo6(cx, cy, 3); openPlace8(b.dataset.tc);
    $('#ptcard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('#ptcard').addEventListener('click', e => {
    const s = e.target.closest('[data-ps]'); if (!s || !PLACE8) return;
    PSORT8 = s.dataset.ps; openPlace8(PLACE8);
  });
  function drawBranchChips8() {
    const byL = {};
    D.pts.forEach(p => { if (!p.b) return; (byL[p.l] = byL[p.l] || {})[p.b] = ((byL[p.l] || {})[p.b] || 0) + 1; });
    $('#branchchips').innerHTML = D.layers.filter(l => byL[l.key]).map(l => {
      const bs = Object.entries(byL[l.key]).sort((a, b) => b[1] - a[1]);
      return `<details><summary><i style="background:${esc(l.color)}"></i>${esc(l.short)} <small>${bs.length} فرعًا</small></summary><div class="li">${bs.map(([b, n]) => {
        const key = l.key + '|' + b;
        return `<button type="button" class="chipb" data-lb="${esc(key)}" aria-pressed="${!LS8.br.has(key)}">${esc(b)} <small>${n}</small></button>`;
      }).join('')}</div></details>`;
    }).join('');
  }
  $('#branchchips').addEventListener('click', e => {
    const b = e.target.closest('[data-lb]'); if (!b) return;
    const k = b.dataset.lb;
    LS8.br.has(k) ? LS8.br.delete(k) : LS8.br.add(k);
    b.setAttribute('aria-pressed', String(!LS8.br.has(k)));
    drawMaps();
  });
  const mapSvg = $('#bigSvg'), mapTip = $('#mtip');
  function hideTip8() { mapTip.hidden = true; }
  function hover8(e) {
    if (LS.mode !== 'layers') { hideTip8(); return; }
    const t = e.target.closest('[data-pi],[data-cl]');
    if (!t) { hideTip8(); return; }
    let txt;
    if (t.dataset.pi != null && t.dataset.pi !== '') {
      const p = D.pts[+t.dataset.pi];
      txt = `${p.n} · ${LNAME[p.l] || ''}${nz(p.pp) ? ' · ' + p.pp : ''}`;
    } else {
      const n = (CLUSTERS[+t.dataset.cl] || []).length;
      txt = `${n} نقطة في هذا الموضع · انقر لعرضها`;
    }
    mapTip.textContent = txt;
    const pr = $('.sheet .panel').getBoundingClientRect();
    mapTip.style.left = Math.min(e.clientX - pr.left + 12, pr.width - 280) + 'px';
    mapTip.style.top = (e.clientY - pr.top + 14) + 'px';
    mapTip.hidden = false;
  }
  mapSvg.addEventListener('pointerdown', e => {
    if (e.button === 0 && LS.mode !== 'layers' && MV.lastVB) {
      const vb = MV.lastVB;
      MV.drag = { x: e.clientX, y: e.clientY, cx: vb[0] + vb[2] / 2, cy: vb[1] + vb[3] / 2, w: vb[2] };
      LS8.moved = false; return;
    }
    if (e.button !== 0 || LS.mode !== 'layers' || !LS8.lastVB) return;
    const vb = LS8.lastVB;
    LS8.drag = { x: e.clientX, y: e.clientY, cx: vb[0] + vb[2] / 2, cy: vb[1] + vb[3] / 2, w: vb[2] };
    LS8.moved = false;
  });
  mapSvg.addEventListener('pointermove', e => {
    if (MV.drag) {
      const dx = e.clientX - MV.drag.x, dy = e.clientY - MV.drag.y;
      if (Math.hypot(dx, dy) > 4) LS8.moved = true;
      if (LS8.moved) {
        const r = mapSvg.getBoundingClientRect(), s = MV.drag.w / Math.max(1, r.width);
        MV.on = true; MV.w = MV.drag.w; MV.cx = MV.drag.cx - dx * s; MV.cy = MV.drag.cy - dy * s;
        hideTip8(); drawMaps();
      }
      return;
    }
    if (LS8.drag) {
      const dx = e.clientX - LS8.drag.x, dy = e.clientY - LS8.drag.y;
      if (Math.hypot(dx, dy) > 4) LS8.moved = true;
      if (LS8.moved) {
        const r = mapSvg.getBoundingClientRect(), s = LS8.drag.w / Math.max(1, r.width);
        LS6.box = null; LS6.fx = LS8.drag.cx - dx * s; LS6.fy = LS8.drag.cy - dy * s;
        hideTip8(); drawMaps();
        return;
      }
    }
    hover8(e);
  });
  const endDrag8 = () => { LS8.drag = null; MV.drag = null; };
  mapSvg.addEventListener('pointerup', endDrag8);
  mapSvg.addEventListener('pointerleave', () => { endDrag8(); hideTip8(); });
  // بعد السحب لا يُعدّ النقر اختيارًا لنقطة
  mapSvg.addEventListener('click', e => {
    if (LS8.moved) { LS8.moved = false; e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  mapSvg.addEventListener('wheel', e => {
    if (LS.mode !== 'layers') {
      if (!MV.lastVB) return;
      e.preventDefault();
      const vb = MV.lastVB;
      MV.cx = vb[0] + vb[2] / 2; MV.cy = vb[1] + vb[3] / 2;
      MV.w = Math.min(1400, Math.max(60, vb[2] * (e.deltaY < 0 ? 0.8 : 1.25))); MV.on = true;
      hideTip8(); drawMaps(); return;
    }
    e.preventDefault();
    LS6.box = null;
    LS6.z = Math.min(20, Math.max(1, LS6.z * (e.deltaY < 0 ? 1.25 : 0.8)));
    hideTip8(); drawMaps();
  }, { passive: false });
  function spiderSVG8(k) {
    if (!SPIDER6 || !SPIDER6.on || LS5.clus) return '';
    return '<g id="spider">' + SPIDER6.list.map(i => `<line x1="${SPIDER6.x}" y1="${SPIDER6.y}" x2="${D.pts[i].x}" y2="${D.pts[i].y2}" stroke="var(--muted)" stroke-width="${.7 * k}" opacity=".6"/>`).join('') + '</g>';
  }
  function markHot8() {
    HOTF = new Set();
    for (let x = st.list[st.idx]; x; x = x.par ? byId[x.par] : null) HOTF.add(x.id);
  }
  addEventListener('resize', () => { layout(); layoutRing(); });

  /* start: the country with most places, at its capital */
  drawRing(); drawLayerChips(); drawEraChips(); drawTree(); renderEnc(); drawRegions6(); drawBranchChips8(); drawTopCities8(); renderDeck8(); renderThemes8(); renderBTree8(); renderGrades8(); renderBring8(); azInit8(); opInit(); fjInit(); bubbleSync();
  const fromHash = applyHash();
  if (!fromHash) selectCountry(countries[0]);
  CS8.ready = true;
  if (fromHash && st.country) CS8.open.add(st.country);
  LS.picked = !!fromHash;
  drawStrip();

  /* تنقل الأقسام: شريط مثبّت، وتمييز القسم الحالي أثناء التمرير، وظهور تدريجي، وإمالة خفيفة للبطاقات */
  (function uxNav() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wrap = document.querySelector('.wrap');
    const bar = document.querySelector('.bar');
    const secs = [...document.querySelectorAll('.wrap > section')].filter(s => s.querySelector('h2[id]'));
    if (!wrap || !bar || !secs.length) return;
    const nav = document.createElement('nav');
    nav.className = 'secnav';
    nav.setAttribute('aria-label', 'أقسام الصفحة');
    nav.innerHTML = '<div class="secnav-in"></div>';
    const inner = nav.firstElementChild;
    const setBar = () => document.documentElement.style.setProperty('--barh', bar.offsetHeight + 'px');
    setBar(); addEventListener('resize', setBar);
    secs.forEach(s => {
      const h = s.querySelector('h2');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = h.textContent.trim();
      b.dataset.sec = h.id;
      b.addEventListener('click', () => {
        const top = s.getBoundingClientRect().top + scrollY - (nav.offsetHeight + bar.offsetHeight + 14);
        scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
      });
      inner.appendChild(b);
    });
    wrap.insertBefore(nav, secs[0]);
    const setCur = id => inner.querySelectorAll('button').forEach(b => {
      const on = b.dataset.sec === id;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setCur(e.target.querySelector('h2').id); }),
        { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(s => spy.observe(s));
      if (!reduce) {
        document.documentElement.classList.add('js');
        const shown = new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } }),
          { rootMargin: "0px 0px -6% 0px", threshold: 0 });
        secs.forEach(s => { s.classList.add('reveal'); shown.observe(s); });
      }
    }
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
      document.querySelectorAll('.entry').forEach(el => {
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          el.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
          el.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
        });
        el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
      });
    }
  })();

  /* رابط الأسرة: #fam-معرّفها، وعند فتح الرابط تُفتح بطاقتها مباشرة */
  const famHashKey8 = id => 'fam-' + id.replace(/_/g, '-');
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-share]'); if (!b) return;
    const id = b.dataset.share;
    const url = location.href.split('#')[0] + '#' + famHashKey8(id);
    const done = () => { b.dataset.copied = '1'; b.textContent = 'تم نسخ الرابط'; setTimeout(() => { b.dataset.copied = ''; b.textContent = 'انسخ رابط هذه الأسرة'; }, 2000); };
    const fallback = () => { b.textContent = url; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
  });
  (function openFamFromHash() {
    const m = location.hash.match(/^#fam-(.+)$/); if (!m) return;
    const f = D.fams.find(x => famHashKey8(x.id) === location.hash.slice(1)); if (!f) return;
    setTimeout(() => openFamLayer(f.id), 350);
  })();


  /* السردية: الخط الزمني يتبع القراءة، وأزرار كل فصل تفتح ما يقابله في الأطلس */
  function bindNarr8() {
    const body = $('#pdBody'), tl = body.querySelector('.nr-tl');
    if (!tl) return;
    body.querySelectorAll('[data-nrgo^="place:"]').forEach(b => { if (!placeKey8(b.dataset.nrgo.slice(6))) b.remove(); });
    body.querySelectorAll('[data-nrgo^="fam:"]').forEach(b => { if (!byId[b.dataset.nrgo.slice(4)]) b.remove(); });
    const btns = [...tl.querySelectorAll('button[data-nrch]')];
    const setOn = i => btns.forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('past', k < i); if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    const secs = [...body.querySelectorAll('.nr-ch')];
    const onScroll = () => {
      if ($('#pdlg').hidden || !body.contains(tl)) return;
      const br = body.getBoundingClientRect().top, line = body.scrollTop + tl.offsetHeight + 40;
      let cur = -1;
      secs.forEach((sc, k) => { if (sc.getBoundingClientRect().top - br + body.scrollTop <= line) cur = k; });
      setOn(cur);
    };
    if (body._nr8) body.removeEventListener('scroll', body._nr8);
    body._nr8 = onScroll;
    body.addEventListener('scroll', onScroll, { passive: true });
    setOn(-1);
    setTimeout(onScroll, 450);
  }
  $('#pdBody').addEventListener('click', e => {
    const t = e.target.closest('.nr-tl button[data-nrch]');
    if (t) {
      const sc = $('#nr-ch' + t.dataset.nrch), body = $('#pdBody'), tl = body.querySelector('.nr-tl');
      if (sc) body.scrollTo({ top: sc.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - (tl ? tl.offsetHeight : 0) - 6, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    const g = e.target.closest('[data-nrgo]'); if (!g) return;
    const v = g.dataset.nrgo, i = v.indexOf(':'), kind = i < 0 ? v : v.slice(0, i), arg = i < 0 ? '' : v.slice(i + 1);
    if (kind === 'fam') { openFamLayer(arg); return; }
    if (kind === 'texts') { openEntry('texts'); return; }
    closeDialog();
    if (kind === 'az') { cmScrollTo($('#azCanvas')); return; }
    if (kind === 'sky') { cmScrollTo($('#sky')); return; }
    if (kind === 'place') { const k = placeKey8(arg); if (k) cmGoPlace(k); return; }
    if (kind === 'tribes') { cmScrollTo($('#h-places').closest('section')); const b = document.querySelector('[data-gl="tribes"]'); if (b) b.click(); }
  });


  /* رحلة الملح: آلاف الحبيبات تتشكّل في كل فصل شكلًا من السردية، والتمرير ينقلها من شكل إلى شكل */
  function saltInit() {
    const cv = $('#saltCv'), sec = $('#h-open');
    if (!cv || !cv.getContext || !sec || typeof Path2D === 'undefined' || typeof DOMMatrix === 'undefined') return;
    const ctx = cv.getContext('2d'), host = cv.parentElement;
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const COL = [[228, 187, 98], [95, 211, 184], [247, 241, 228], [104, 138, 127], [240, 160, 120]];
    const LAND = new Path2D(D.land);
    const FONT = (getComputedStyle(document.documentElement).getPropertyValue('--f-display') || 'serif').trim();
    let W = 1, H = 1, dpr = 1, N = 0, SZ = 1.8, V = { x: 0, y: 0, w: 1, h: 1 }, ST = [], DLY = null, SW = null, MED = null;
    let ready = false, vis = false, raf = 0, lastW = 0, lastH = 0, VIG = null;
    const T0 = performance.now();
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const sm = v => v * v * (3 - 2 * v);
    const pt = name => {
      const q = D.places.find(z => z.p === name && z.x != null); if (q) return { x: q.x, y: q.y };
      const r = D.pts.filter(z => z.pp && (z.pp === name || z.pp.startsWith(name + ' ')) && z.x != null && z.y2 != null);
      if (r.length) return { x: r.reduce((t, z) => t + z.x, 0) / r.length, y: r.reduce((t, z) => t + z.y2, 0) / r.length };
      const g = D.geo.find(z => z.name === name); return g ? { x: g.x, y: g.y } : null;
    };
    MED = pt('المدينة المنورة');
    if (!MED) return;
    const perm = () => { const a = new Uint32Array(N); for (let i = 0; i < N; i++) a[i] = i; for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    const mk = () => ({ tx: new Float32Array(N), ty: new Float32Array(N), al: new Float32Array(N), ph: new Float32Array(N), col: new Uint8Array(N), kind: new Uint8Array(N), arc: new Uint8Array(N), arcs: [], labs: [], pulse: [] });
    const put = (s, p, x, y, c, a) => { s.tx[p] = x; s.ty[p] = y; s.col[p] = c; s.al[p] = a; s.kind[p] = 0; };
    const bez = (a, b, bend) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
      const mx = (a[0] + b[0]) / 2 - dy * bend, my = (a[1] + b[1]) / 2 + dx * bend - d * 0.1;
      return u => { const v = 1 - u; return [v * v * a[0] + 2 * v * u * mx + u * u * b[0], v * v * a[1] + 2 * v * u * my + u * u * b[1]]; };
    };
    function frame(x0, y0, x1, y1) {
      const S = Math.min(V.w / (x1 - x0), V.h / (y1 - y0));
      const ox = V.x + (V.w - (x1 - x0) * S) / 2 - x0 * S, oy = V.y + (V.h - (y1 - y0) * S) / 2 - y0 * S;
      return { S, ox, oy, to: q => [ox + q.x * S, oy + q.y * S] };
    }
    function landPts(F, g) {
      const mask = landMask(LAND, [F.S * dpr, 0, 0, F.S * dpr, F.ox * dpr, F.oy * dpr], Math.round(W * dpr), Math.round(H * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const out = [];
      for (let y = 0; y < H; y += g) for (let x = 0; x < W; x += g) {
        const jx = x + (rnd() - .5) * g * .7, jy = y + (rnd() - .5) * g * .7;
        if (landHas(mask, jx, jy, dpr)) out.push([jx, jy]);
      }
      return out;
    }
    function textPts(str, bw, bh, cx, cy, g) {
      const oc = document.createElement('canvas'), w = Math.max(10, Math.ceil(bw)), h = Math.max(10, Math.ceil(bh));
      oc.width = w; oc.height = h;
      const o = oc.getContext('2d');
      let fs = h * 0.78;
      o.font = `700 ${fs}px ${FONT}`;
      const mw = o.measureText(str).width; if (mw > w * 0.96) fs *= (w * 0.96) / mw;
      o.font = `700 ${fs}px ${FONT}`; o.textAlign = 'center'; o.textBaseline = 'middle'; o.direction = 'rtl'; o.fillStyle = '#fff';
      o.fillText(str, w / 2, h / 2);
      const im = o.getImageData(0, 0, w, h).data, out = [];
      for (let y = 0; y < h; y += g) for (let x = 0; x < w; x += g) if (im[(y * w + x) * 4 + 3] > 140) out.push([cx - w / 2 + x, cy - h / 2 + y]);
      return out.length ? out : [[cx, cy]];
    }
    /* الفصل الأول: واحة فيها أبراج، وكل برج أُطُم */
    function oasis() {
      const s = mk(), o = perm(); let k = 0;
      const cx = V.x + V.w / 2, cy = V.y + V.h / 2, R = Math.min(V.w / 2.5, V.h / 1.7), rx = R * 1.2, ry = R * 0.82;
      const T = []; let guard = 0;
      while (T.length < 13 && guard++ < 4000) {
        const t = rnd() * 6.2832, r = Math.sqrt(rnd()) * 0.8, x = cx + Math.cos(t) * r * rx, y = cy + Math.sin(t) * r * ry;
        if (T.every(q => Math.hypot(q[0] - x, q[1] - y) > R * 0.3)) T.push([x, y, T.length % 2]);
      }
      const tw = Math.max(9, R * 0.085), th = tw * 1.7, gx = 6, gy = 10;
      T.forEach(([x, y, c]) => {
        for (let a = 0; a < gx; a++) for (let b = 0; b < gy; b++) {
          if (k >= N) return;
          const edge = a === 0 || a === gx - 1 || b === 0 || b === gy - 1;
          put(s, o[k++], x - tw / 2 + a * tw / (gx - 1), y - th + b * th / (gy - 1), c, edge ? 0.95 : 0.4);
        }
      });
      while (k < N) {
        const t = rnd() * 6.2832, r = Math.pow(rnd(), 0.6), x = cx + Math.cos(t) * r * rx, y = cy + Math.sin(t) * r * ry;
        put(s, o[k++], x, y, rnd() < .5 ? 0 : 1, 0.1 + rnd() * 0.2);
      }
      return s;
    }
    /* الفصل الثاني: حبيبات الحيّين تصير اسمًا واحدًا */
    function name() {
      const s = mk(), o = perm();
      const P = textPts('الأنصار', V.w * 0.94, Math.min(V.h * 0.62, V.w * 0.44), V.x + V.w / 2, V.y + V.h / 2, W >= 720 ? 3 : 2);
      for (let k = 0; k < N; k++) { const q = P[Math.floor(rnd() * P.length)]; put(s, o[k], q[0] + (rnd() - .5) * 1.2, q[1] + (rnd() - .5) * 1.2, 2, 0.5 + rnd() * 0.5); }
      return s;
    }
    /* خريطة: أرض خافتة، وخيوط تجري من المدينة إلى المواضع، وعند كل موضع حبيبات تستقر */
    const BG = new Map();
    function landBg(F, key) {
      if (BG.has(key)) return BG.get(key);
      const pts = landPts(F, W >= 720 ? 4 : 3.2);
      const oc = document.createElement('canvas'); oc.width = Math.round(W * dpr); oc.height = Math.round(H * dpr);
      const o = oc.getContext('2d'); o.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts.forEach(([x, y]) => { const sh = 0.45 + rnd() * 0.55; o.fillStyle = `rgba(${Math.round(70 + 40 * sh)},${Math.round(110 + 50 * sh)},${Math.round(98 + 40 * sh)},${(0.22 + 0.3 * sh).toFixed(2)})`; o.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); });
      /* حواف الأرض تذوب في العتمة، فلا يظهر للخريطة إطار */
      
      const v = { cv: oc, pts }; BG.set(key, v); return v;
    }
    function map(F, gap, landShare, dests, colr, key) {
      const s = mk(), o = perm(); let k = 0;
      const bg = landBg(F, key); s.bg = bg.cv;
      const land = bg.pts, med = F.to(MED);
      const nLand = land.length ? Math.round(N * landShare) : 0;
      for (let i = 0; i < nLand; i++) { const q = land[Math.floor(rnd() * land.length)]; put(s, o[k++], q[0], q[1], 3, 0.18 + rnd() * 0.22); }
      const core = Math.round(N * 0.035);
      for (let i = 0; i < core; i++) { const r = Math.sqrt(rnd()) * 6, t = rnd() * 6.2832; put(s, o[k++], med[0] + Math.cos(t) * r, med[1] + Math.sin(t) * r, 2, 0.9); }
      const D2 = dests.filter(d => d.q);
      D2.forEach(d => { const to = F.to(d.q); d.to = to; s.arcs.push({ f: bez(med, to, 0.2), sp: 0.045 + rnd() * 0.03 }); s.labs.push({ t: d.lab, x: to[0], y: to[1], dy: d.dy || 0 }); });
      const tw = D2.reduce((t, d) => t + d.w, 0), rest = N - k;
      let ai = 0, acc = D2.length ? D2[0].w / tw * rest : rest;
      for (let i = 0; k < N; i++) {
        while (i > acc && ai < D2.length - 1) { ai++; acc += D2[ai].w / tw * rest; }
        const p = o[k++], c = colr != null ? colr : (rnd() < .5 ? 0 : 1);
        if (!D2.length) { put(s, p, med[0], med[1], 2, 0.6); continue; }
        if (rnd() < 0.24) { const to = D2[ai].to, r = Math.sqrt(rnd()) * 5, t = rnd() * 6.2832; put(s, p, to[0] + Math.cos(t) * r, to[1] + Math.sin(t) * r, c, 0.85); continue; }
        s.kind[p] = 1; s.arc[p] = ai; s.ph[p] = rnd(); s.tx[p] = (rnd() - .5) * 3.2; s.ty[p] = (rnd() - .5) * 3.2; s.col[p] = c; s.al[p] = 0.8;
      }
      s.labs.push({ t: 'المدينة المنورة', x: med[0], y: med[1], o: true, dy: 14 });
      return s;
    }
    /* الفصل الرابع: العدد الذي ذكره خليفة، وحوله غبار يتساقط */
    function harra() {
      const s = mk(), o = perm(); let k = 0;
      const bh = Math.min(V.h * 0.6, V.w * 0.48), cy = V.y + V.h * 0.45;
      const P = textPts('173', V.w * 0.72, bh, V.x + V.w / 2, cy, W >= 720 ? 3 : 2);
      const nNum = Math.round(N * 0.7);
      for (; k < nNum; k++) { const q = P[Math.floor(rnd() * P.length)]; put(s, o[k], q[0], q[1], 2, 0.55 + rnd() * 0.45); }
      for (; k < N; k++) { const p = o[k]; s.kind[p] = 2; s.tx[p] = V.x + rnd() * V.w; s.ty[p] = V.y + rnd() * V.h; s.ph[p] = 5 + rnd() * 9; s.col[p] = 4; s.al[p] = 0.08 + rnd() * 0.16; }
      s.labs.push({ t: 'من الأنصار، عند خليفة بن خياط', x: V.x + V.w / 2, y: cy + bh * 0.46, c: true });
      return s;
    }
    /* الفصل السابع: كل حبة سجلّ في الأطلس، والمضيئة في المدينة أسرها اليوم */
    function today(F, gap, key) {
      const s = mk(), o = perm(); let k = 0;
      const bg = landBg(F, key); s.bg = bg.cv;
      const recs = D.pts.filter(z => (z.l === 'L6' || z.l === 'L4') && z.x != null && z.y2 != null);
      const per = Math.max(1, Math.min(3, Math.floor(N * 0.55 / Math.max(1, recs.length))));
      recs.forEach(z => {
        const [x, y] = F.to({ x: z.x, y: z.y2 }), cl = z.root && z.root.clan, c = cl === 'الأوس' ? 0 : cl === 'الخزرج' ? 1 : 2;
        for (let j = 0; j < per && k < N; j++) { const r = Math.sqrt(rnd()) * 3.4, t = rnd() * 6.2832; put(s, o[k++], x + Math.cos(t) * r, y + Math.sin(t) * r, c, 0.8); }
      });
      const med = F.to(MED);
      const nMed = D.fams.filter(f => (f.s || []).some(x => x.k === 'معاصر' && x.b === 'المدينة المنورة')).length;
      for (let j = 0; j < nMed && k < N; j++) { const t = j / nMed * 6.2832 - 1.57, p = o[k++]; put(s, p, med[0] + Math.cos(t) * 9, med[1] + Math.sin(t) * 9, 2, 1); s.pulse.push(p); }
      const land = bg.pts;
      while (k < N) { const q = land.length ? land[Math.floor(rnd() * land.length)] : [med[0], med[1]]; put(s, o[k++], q[0], q[1], 3, 0.1 + rnd() * 0.14); }
      s.labs.push({ t: `المدينة المنورة · ${nMed.toLocaleString('ar-EG')} أسر`, x: med[0], y: med[1], o: true, dy: 26 });
      return s;
    }
    function layout() {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(W < 720 ? 1.5 : 2, window.devicePixelRatio || 1);
      lastW = W; lastH = H;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const wide = W >= 900;
      if (wide) {
        const inset = Math.max(32, W / 2 - 560), hud = Math.min(440, W * 0.36);
        V = { x: 40, y: 150, w: Math.max(200, W - inset - hud - 110), h: Math.max(200, H - 200) };
      } else V = { x: 14, y: 150, w: W - 28, h: Math.max(160, H * 0.56 - 150) };
      N = wide ? 2600 : 1500; SZ = wide ? 1.9 : 1.6;
      seed = 11; BG.clear();
      DLY = new Float32Array(N); SW = new Float32Array(N);
      for (let i = 0; i < N; i++) { DLY[i] = rnd(); SW[i] = (rnd() < .5 ? -1 : 1) * (0.25 + rnd() * 0.75); }
      const gap = wide ? 5 : 4;
      const FA = frame(392, 52, 640, 290), FB = frame(92, 60, 650, 350), FC = frame(420, 110, 612, 350);
      ST = [
        oasis(),
        name(),
        map(FA, gap, 0.5, [
          { q: pt('حمص'), lab: 'حمص', w: 1 }, { q: pt('دمشق'), lab: 'دمشق', w: 1 }, { q: pt('الشام (حوران)'), lab: 'حوران', w: 0.7, dy: 10 },
          { q: pt('فلسطين'), lab: 'فلسطين', w: 1 }, { q: pt('إسطنبول'), lab: 'القسطنطينية', w: 1 }], null, 'A'),
        harra(),
        map(FB, gap, 0.42, [
          { q: pt('قرطبة'), lab: 'الأندلس', w: 3.2, dy: -14 }, { q: pt('إشبيلية'), lab: 'إشبيلية', w: 1.6, dy: 12 }, { q: pt('المغرب'), lab: 'المغرب', w: 1.4 },
          { q: pt('مصر'), lab: 'مصر', w: 1 }, { q: pt('دمشق'), lab: 'الشام', w: 1 }, { q: pt('العراق'), lab: 'العراق', w: 1 }], null, 'B'),
        map(FC, gap, 0.62, [
          { q: pt('الأحساء'), lab: 'الأحساء', w: 1 }, { q: pt('جلاجل'), lab: 'جلاجل', w: 1, dy: -10 },
          { q: pt('مسيد ود عيسى'), lab: 'كترانج', w: 1 }, { q: pt('المحلة'), lab: 'المخلاف السليماني', w: 1 },
          { q: pt('ينبع البحر'), lab: 'ينبع · خطيب ينبع', w: 1, dy: 22 }, { q: pt('جرجا'), lab: 'جرجا · بيت القاضي', w: 1, dy: -16 },
          { q: pt('فرشوط'), lab: 'فرشوط · القطري', w: 1, dy: 16 }, { q: pt('السلط ووادي السير'), lab: 'السلط · آل أمين', w: 1, dy: -8 }], 2, 'C'),
        today(FB, gap, 'B'),
      ];
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(4,10,8,0)'); g.addColorStop(1, 'rgba(4,10,8,.85)');
      VIG = g;
      ready = true; kick();
    }
    const CS = {};
    const colStr = (a, b, m) => {
      const q = a === b ? 0 : Math.round(m * 8), key = a * 100 + b * 10 + q;
      let v = CS[key];
      if (!v) { const A = COL[a], B = COL[b], t = q / 8; v = CS[key] = `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`; }
      return v;
    };
    let QX = 0, QY = 0, QA = 0;
    function posAt(s, p, time) {
      const kd = s.kind[p];
      if (kd === 1) { const A = s.arcs[s.arc[p]], u = (s.ph[p] + time * A.sp) % 1, q = A.f(u); QX = q[0] + s.tx[p]; QY = q[1] + s.ty[p]; QA = s.al[p] * (0.2 + 0.8 * Math.sin(Math.PI * u)); return; }
      if (kd === 2) { QX = s.tx[p] + Math.sin(time * 0.6 + p) * 6; QY = V.y + ((s.ty[p] - V.y + time * s.ph[p]) % V.h); QA = s.al[p]; return; }
      QX = s.tx[p] + (RM ? 0 : Math.sin(time * 0.9 + p * 1.7) * 0.45); QY = s.ty[p] + (RM ? 0 : Math.cos(time * 0.7 + p * 2.3) * 0.45); QA = s.al[p];
    }
    function labs(s, a) {
      if (a < 0.03 || !s.labs.length) return;
      ctx.globalCompositeOperation = 'source-over'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      s.labs.forEach(L => {
        const fs = L.c ? Math.max(14, Math.min(19, V.w / 36)) : (W >= 720 ? 13.5 : 12);
        ctx.font = `600 ${fs}px ${FONT}`;
        const left = !L.c && L.x < V.x + V.w * 0.22;
        ctx.textAlign = L.c ? 'center' : left ? 'left' : 'right';
        const x = L.c ? L.x : left ? L.x + 9 : L.x - 9, y = L.y + (L.dy || 0);
        ctx.globalAlpha = a;
        ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(4,10,8,.88)'; ctx.strokeText(L.t, x, y);
        ctx.fillStyle = L.o ? '#f1d48c' : L.c ? 'rgba(247,241,228,.8)' : '#e8f2ee'; ctx.fillText(L.t, x, y);
      });
    }
    function draw(now) {
      if (!ready) return;
      const time = RM ? 0 : (now - T0) / 1000, NS = ST.length, x = OP.x || 0;
      const kk = x - 0.5;
      let i0, f;
      if (kk <= 0) { i0 = 0; f = 0; } else if (kk >= NS - 1) { i0 = NS - 1; f = 0; } else { i0 = Math.floor(kk); f = kk - i0; }
      const i1 = Math.min(NS - 1, i0 + 1), A = ST[i0], B = ST[i1];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      { ctx.fillStyle = '#040a08'; ctx.fillRect(0, 0, W, H); }
      const mb = RM ? (f > 0.5 ? 1 : 0) : sm(clamp((f - 0.2) / 0.6));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (A.bg && A.bg === B.bg) { ctx.globalAlpha = 1; ctx.drawImage(A.bg, 0, 0); }
      else { if (A.bg) { ctx.globalAlpha = 1 - mb; ctx.drawImage(A.bg, 0, 0); } if (B.bg && B !== A) { ctx.globalAlpha = mb; ctx.drawImage(B.bg, 0, 0); } }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      let last = '';
      for (let p = 0; p < N; p++) {
        let m = RM ? (f > 0.5 ? 1 : 0) : clamp((f - 0.2 - DLY[p] * 0.32) / 0.28);
        m = sm(m);
        posAt(A, p, time);
        let px = QX, py = QY, al = QA, ca = A.col[p], cb = ca;
        if (m > 0 && B !== A) {
          const ax = QX, ay = QY, aa = QA;
          posAt(B, p, time);
          const bx = QX, by = QY, dx = bx - ax, dy = by - ay;
          const mx = (ax + bx) / 2 - dy * 0.28 * SW[p], my = (ay + by) / 2 + dx * 0.28 * SW[p], v = 1 - m;
          px = v * v * ax + 2 * v * m * mx + m * m * bx; py = v * v * ay + 2 * v * m * my + m * m * by;
          al = Math.min(1, aa + (QA - aa) * m + Math.sin(Math.PI * m) * 0.3);
          cb = B.col[p];
        }
        const c = colStr(ca, cb, m);
        if (c !== last) { ctx.fillStyle = c; last = c; }
        ctx.globalAlpha = al;
        ctx.fillRect(px - SZ / 2, py - SZ / 2, SZ, SZ);
      }
      const mm = RM ? (f > 0.5 ? 1 : 0) : sm(clamp((f - 0.25) / 0.5));
      [[A, 1 - mm], [B, B === A ? 0 : mm]].forEach(([S, w]) => {
        if (w < 0.03 || !S.pulse.length) return;
        S.pulse.forEach((p, j) => {
          const g = 0.55 + 0.45 * Math.sin(time * 2.2 + j * 0.8);
          ctx.globalAlpha = w * 0.22 * g; ctx.fillStyle = '#f7f1e4';
          ctx.beginPath(); ctx.arc(S.tx[p], S.ty[p], 7, 0, 6.2832); ctx.fill();
          ctx.globalAlpha = w * (0.7 + 0.3 * g);
          ctx.beginPath(); ctx.arc(S.tx[p], S.ty[p], 2.4, 0, 6.2832); ctx.fill();
        });
      });
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      
      labs(A, 1 - mm); if (B !== A) labs(B, mm);
      ctx.globalAlpha = 1;
      const pr = $('#saltProg'); if (pr) pr.style.transform = `scaleX(${Math.min(1, x / NS).toFixed(4)})`;
      const hn = $('#saltHint'); if (hn) hn.classList.toggle('off', x > 0.25);
    }
    let lastDraw = 0;
    function tick(now) {
      raf = 0;
      /* على الهواتف: 30 إطارًا في الثانية تكفي للحركة، وتخفف الحمل على المعالج والبطارية */
      if (W >= 720 || now - lastDraw >= 33) { lastDraw = now; draw(now); }
      if (vis && !RM && !document.hidden) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && ready && vis) raf = requestAnimationFrame(tick); }
    OP.onPaint = kick;
    new IntersectionObserver(es => { vis = es.some(e => e.isIntersecting); if (vis) kick(); }, { threshold: 0 }).observe(sec);
    new IntersectionObserver(es => { document.body.classList.toggle('in-salt', es.some(e => e.isIntersecting)); }, { threshold: 0.35 }).observe(host);
    document.addEventListener('visibilitychange', kick);
    let rt = 0;
    new ResizeObserver(() => {
      const r = host.getBoundingClientRect();
      if (ready && Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 90) return;
      clearTimeout(rt); rt = setTimeout(layout, 160);
    }).observe(host);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(layout, layout);
  }
  saltInit();

})();
