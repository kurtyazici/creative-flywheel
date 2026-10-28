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
const card = v => { const F = v.frames, X = v.tx && v.tx.speech ? v.tx : null;
  const hooks = F ? F.hook.map((h, i) => beat('HOOK', h, v, X && X.hook[i], 'hk')).join('') : '';
  const rest = F ? beat('HOLD', F.hold, v, X && X.hold, 'hd') + beat('BODY', F.body, v, X && X.body, 'bd', 'summary') + beat('CLOSE', F.close, v, X && X.close, 'cl', 'summary') : '';
  const script = X ? [X.hook.join(' '), X.hold].join(' ').replace(/\s+/g, ' ').trim() : '';
  const nospeech = v.tx && !v.tx.speech ? '<p class="meta warn">No speech detected (music / text-only video).</p>' : '';
  return `<article class="card sb"><div class="sb-h"><div><b>#${v.rank}</b> <a href="${esc(v.url)}" target="_blank" rel="noopener">@${esc(v.creator)}</a> <span class="meta">${dash(v.product)}</span></div>
    <div class="sb-m"><span>GMV <b>${money(v.gmv)}</b></span><span>Views <b>${big(v.views)}</b></span><span class="meta">posted ${dash(v.posted)}${F ? ' · ' + F.duration + 's' : ''}</span>
    <a class="watch" href="${esc(v.url)}" target="_blank" rel="noopener">Watch on TikTok ↗</a></div></div>
    ${v.note ? `<p class="meta">${esc(v.note)}</p>` : ''}
    ${script ? `<blockquote class="script"><b>Hook + hold script${X.translated ? ' (translated from ' + esc(X.language) + ')' : ''}:</b> “${esc(script)}”</blockquote>` : nospeech}
    <div class="beats">${hooks}${rest}</div>
    <div class="full"><div class="full-h"><b>Timeline</b>${F ? ` <span class="meta">${F.duration}s · 1 frame per 2.5s · words spoken in each window</span>` : ''}
      <button class="play" data-id="${esc(v.video_id)}" data-url="${esc(v.url)}">▶ Play</button></div>
      ${F && F.strip.length ? `<div class="tl">${F.strip.map((f, i) => `<figure><figcaption>${ts(f.t)}</figcaption>${img(f, ts(f.t), 240, 427)}${say(X && X.strip[i])}</figure>`).join('')}</div>` : '<p class="meta">Filmstrip unavailable</p>'}
      <div class="player" hidden></div>
      <p class="sum"><b>Summary:</b> ${X ? esc(X.summary) : '–'} <span class="meta">(opening lines of transcript)</span></p>
      <p class="sum meta"><b>Caption:</b> ${v.caption ? esc(v.caption.replace(/\s+/g, ' ')) : '–'}</p>
      ${X ? `<details class="tx"><summary>Full transcript${X.translated ? ' (English translation)' : ''}</summary>${X.full.map(([t, s]) => `<p><span class="meta">${ts(Math.floor(t))}</span> ${esc(s)}</p>`).join('')}</details>` : ''}</div>
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
