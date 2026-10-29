const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dash = v => (v === null || v === undefined || v === '') ? '–' : esc(v);
const money = v => v == null ? '–' : '$' + (v >= 1e6 ? (v/1e6).toFixed(2)+'m' : v >= 1e3 ? (v/1e3).toFixed(1)+'k' : v.toFixed(2));
const big = v => v == null ? '–' : v >= 1e6 ? (v/1e6).toFixed(2)+'m' : v >= 1e3 ? (v/1e3).toFixed(1)+'k' : String(v);
const ts = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + (s % 1 ? '.' + Math.round((s % 1) * 10) : '');
const P = p => '../' + p;
const img = (f, alt, w, h) => f ? `<img src="${esc(P(f.src))}" alt="${esc(alt)}" loading="lazy" width="${w}" height="${h}"/>` : '<div class="ph"><span>Frame unavailable</span></div>';
const say = (t, cls) => `<p class="say ${cls || ''}">${t ? esc(t) : '<span class="gap"></span>'}</p>`;
const beat = (label, f, v, text, cls, kind) => `<figure class="bt ${cls}"><figcaption class="beat-l">${label}${f ? ' ' + ts(f.t) : ''}${kind ? ` <i>${kind}</i>` : ''}</figcaption>${img(f, label + ' @' + v.creator, 360, 640)}${say(text, kind ? 'gist' : '')}</figure>`;
const BT=[['hk','H','Hook'],['ho','Ho','Hold'],['bo','B','Body'],['cl','C','Close']];
const bwin = (v) => { const W = v.tx && v.tx.windows; if (W) return [W.hook[0], W.hold[0], W.body[0], W.close[0]]; const D = v.frames ? v.frames.duration : 0, he = Math.min(Math.max((v.frames && v.frames.hold ? v.frames.hold.t : 3) + 2.5, 6), D); return [0, 3, he, Math.max(he, D - 5)]; };
const bof = (st, t) => { let k = 0; st.forEach((b, i) => { if (t >= b - 0.01) k = i; }); return k; };
const pill = (k, long) => `<span class="bp ${BT[k][0]}" title="${BT[k][2]}">${long ? BT[k][2] : BT[k][1]}</span>`;
const legend = '<span class="bleg">' + BT.map((b, k) => pill(k, true)).join('') + '</span>';
const card = v => { const F = v.frames, X = v.tx && v.tx.speech ? v.tx : null;
  const hooks = F ? F.hook.map((h, i) => beat('HOOK', h, v, X && X.hook[i], 'hk')).join('') : '';
  const rest = F ? beat('HOLD', F.hold, v, X && X.hold, 'hd') + beat('BODY', F.body, v, X && X.body, 'bd', 'summary') + beat('CLOSE', F.close, v, X && X.close, 'cl', 'summary') : '';
  const script = X ? [X.hook.join(' '), X.hold].join(' ').replace(/\s+/g, ' ').trim() : '';
  const nospeech = v.tx && !v.tx.speech ? '<p class="meta warn">No speech detected (music / text-only video).</p>' : '';
  return `<article class="card sb"><div class="sb-h"><div><b>#${v.rank}</b> <a href="${esc(v.url)}" target="_blank" rel="noopener">@${esc(v.creator)}</a> ${v.product_id && v.product ? `<a class="meta pdp" href="https://www.tiktok.com/shop/pdp/${esc(v.product_id)}" target="_blank" rel="noopener" title="Open TikTok Shop listing">${esc(v.product)} ↗</a>` : `<span class="meta">${dash(v.product)}</span>`}</div>
    <div class="sb-m"><span>GMV <b>${money(v.gmv)}</b></span><span>Views <b>${big(v.views)}</b></span><span class="meta">posted ${dash(v.posted)}${F ? ' · ' + F.duration + 's' : ''}</span>
    <a class="watch" href="${esc(v.url)}" target="_blank" rel="noopener">Watch on TikTok ↗</a></div></div>
    ${v.note ? `<p class="meta">${esc(v.note)}</p>` : ''}
    ${script ? `<blockquote class="script"><b>Hook + hold script${X.translated ? ' (translated from ' + esc(X.language) + ')' : ''}:</b> “${esc(script)}”</blockquote>` : nospeech}
    <div class="beats">${hooks}${rest}</div>
    <div class="full"><div class="full-h"><b>Timeline</b> ${legend}${F ? ` <span class="meta">${F.duration}s · 1 frame per 2.5s · words spoken in each window</span>` : ''}
      <button class="play" data-id="${esc(v.video_id)}" data-url="${esc(v.url)}">▶ Play</button></div>
      ${F && F.strip.length ? (() => { const st = bwin(v); let prev = -1; return `<div class="tl">${F.strip.map((f, i) => { const k = bof(st, f.t), first = k !== prev; prev = k; return `<figure class="tb ${BT[k][0]}${first ? ' start' : ''}"><figcaption>${first ? pill(k) + ' ' : ''}${ts(f.t)}</figcaption>${img(f, ts(f.t), 240, 427)}${say(X && X.strip[i])}</figure>`; }).join('')}</div>`; })() : '<p class="meta">Filmstrip unavailable</p>'}
      <div class="player" hidden></div>
      <p class="sum"><b>Summary:</b> ${X ? esc(X.summary) : '–'} <span class="meta">(opening lines of transcript)</span></p>
      <p class="sum meta"><b>Caption:</b> ${v.caption ? esc(v.caption.replace(/\s+/g, ' ')) : '–'}</p>
      ${X ? `<details class="tx"><summary>Full transcript${X.translated ? ' (English translation)' : ''}</summary>${(() => { const st = bwin(v); let prev = -1; return '<div class="txl">' + X.full.map(([t, s]) => { const k = bof(st, t), first = k !== prev; prev = k; return `${first ? `<div class="txh ${BT[k][0]}">${pill(k)} ${BT[k][2]} <span class="meta">from ${ts(Math.floor(st[k]))}</span></div>` : ''}<p class="tb ${BT[k][0]}"><span class="meta">${ts(Math.floor(t))}</span> ${esc(s)}</p>`; }).join('') + '</div>'; })()}</details>` : ''}</div>
    ${F ? '' : `<p class="meta warn">Frames unavailable: ${esc(v.frames_status)}</p>`}</article>`; };
fetch('../data/community.json').then(r => r.json()).then(d => {
  $('#asof').textContent = `Window ${d.meta.window} · ${d.meta.source} · generated ${d.meta.generated}`;
  $('#secnav').innerHTML = d.sections.map(s => `<a href="#${s.id}">${esc(s.title)}</a>`).join(' · ');
  $('#main').innerHTML = d.sections.map(s => `<section id="${s.id}"><h2>${esc(s.title)} <span class="meta">(${s.videos.length})</span></h2><p class="meta">${esc(s.basis)}</p>${s.videos.map(card).join('')}</section>`).join('');
  document.querySelectorAll('.play').forEach(btn => btn.onclick = () => {
    const box = btn.closest('.full').querySelector('.player'), open = box.hidden;
    box.hidden = !open; btn.textContent = open ? '✕ Close player' : '▶ Play';
    if (!open) { box.innerHTML = ''; return; }
    box.innerHTML = `<blockquote class="tiktok-embed" cite="${esc(btn.dataset.url)}" data-video-id="${esc(btn.dataset.id)}" style="max-width:325px;min-width:325px"><section><a href="${esc(btn.dataset.url)}" target="_blank" rel="noopener">Loading TikTok…</a></section></blockquote>`;
    if (window.tiktokEmbed && window.tiktokEmbed.lib) window.tiktokEmbed.lib.render(box.querySelectorAll('.tiktok-embed'));
    else { document.getElementById('tt-embed')?.remove(); const sc = document.createElement('script'); sc.id = 'tt-embed'; sc.async = true; sc.src = 'https://www.tiktok.com/embed.js'; document.body.appendChild(sc); }
  });
});
