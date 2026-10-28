const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dash = v => (v === null || v === undefined || v === '') ? '–' : esc(v);
const money = v => v == null ? '–' : '$' + (v >= 1e6 ? (v/1e6).toFixed(2)+'m' : v >= 1e3 ? (v/1e3).toFixed(1)+'k' : v.toFixed(2));
const big = v => v == null ? '–' : v >= 1e6 ? (v/1e6).toFixed(2)+'m' : v >= 1e3 ? (v/1e3).toFixed(1)+'k' : String(v);
const ts = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + (s % 1 ? '.' + Math.round((s % 1) * 10) : '');
const P = p => '../' + p;
const fig = (label, f, v, cls) => `<figure class="panel ${cls}"><figcaption class="beat-l">${label}${f ? ' ' + ts(f.t) : ''}</figcaption>${f ? `<img src="${esc(P(f.src))}" alt="${esc(label)} @${esc(v.creator)}" loading="lazy" width="360" height="640"/>` : '<div class="ph"><span>Frame unavailable</span></div>'}</figure>`;
const card = v => { const F = v.frames;
  const hooks = F ? F.hook.map(h => fig('HOOK', h, v, 'hk')).join('') : '';
  const rest = ['hold', 'body', 'close'].map(b => `<div class="beat-c">${fig(b[0].toUpperCase() + b.slice(1), F && F[b], v, '')}</div>`).join('');
  return `<article class="card sb"><div class="sb-h"><div><b>#${v.rank}</b> <a href="${esc(v.url)}" target="_blank" rel="noopener">@${esc(v.creator)}</a> <span class="meta">${dash(v.product)}</span></div>
    <div class="sb-m"><span>GMV <b>${money(v.gmv)}</b></span><span>Views <b>${big(v.views)}</b></span><span class="meta">posted ${dash(v.posted)}${F ? ' · ' + F.duration + 's' : ''}</span>
    <a class="watch" href="${esc(v.url)}" target="_blank" rel="noopener">Watch on TikTok ↗</a></div></div>
    ${v.note ? `<p class="meta">${esc(v.note)}</p>` : ''}
    <div class="strip"><div class="hook-g"><div class="hook-f">${hooks}</div><p class="note"><b>Hook strip</b> 0 / 0.5 / 1 / 2 / 3s</p></div><div class="rest">${rest}</div></div>
    <div class="full"><div class="full-h"><b>Full video</b>${F ? ` <span class="meta">${F.duration}s · ${F.strip.length} frames · 1 per 2.5s</span>` : ''}
      <button class="play" data-id="${esc(v.video_id)}" data-url="${esc(v.url)}">▶ Play</button></div>
      <p class="sum"><b>Summary:</b> ${v.caption ? esc(v.caption.replace(/\s+/g, ' ')) : '–'} <span class="meta">(TikTok caption)</span></p>
      ${F && F.strip.length ? `<div class="film">${F.strip.map(f => `<figure><img src="${esc(P(f.src))}" alt="${ts(f.t)}" loading="lazy" width="240" height="427"/><figcaption>${ts(f.t)}</figcaption></figure>`).join('')}</div>` : '<p class="meta">Filmstrip unavailable</p>'}
      <div class="player" hidden></div></div>
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
