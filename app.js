const D = {}; const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dash = v => (v === null || v === undefined || v === '') ? '–' : esc(v);
const money = v => v == null ? '–' : '$' + (v >= 1e6 ? (v/1e6).toFixed(2)+'m' : v >= 1e3 ? (v/1e3).toFixed(1)+'k' : v.toFixed(2));
const big = v => v == null ? '–' : v >= 1e6 ? (v/1e6).toFixed(2)+'m' : v >= 1e3 ? (v/1e3).toFixed(1)+'k' : String(v);
const tag = c => `<span class="tag ${c}">${c}</span>`;
const link = (u, t) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t || 'video')}</a>` : dash(t);
let sort = {k: null, dir: -1};
const filt = rows => rows.filter(r => ($('#cat').value === 'all' || r.category === $('#cat').value) && ($('#src').value === 'all' || r.source === $('#src').value));

function rankings() {
  const cols = [['category','Cat'],['type','Type'],['window','Win'],['rank','#'],['creator','Creator'],['name','Product'],['gmv','GMV'],['views','Views'],['units','Units'],['price','Price'],['creators','Creators'],['posted','Posted'],['hook','Hook'],['source','Source']];
  let rows = filt(D.rankings.concat(D.fastmoss.rankings || []));
  if (sort.k) rows = rows.slice().sort((a, b) => { const x = a[sort.k], y = b[sort.k]; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; });
  const cell = (r, k) => k === 'category' ? tag(r[k]) : k === 'gmv' || k === 'price' ? money(r[k]) : k === 'views' || k === 'units' ? big(r[k])
    : k === 'creator' ? (r.creator ? link(r.video_url, '@' + r.creator) : r.video_url ? link(r.video_url, r.video_id) : dash(r.video_id || r.product_id && null))
    : k === 'source' ? `<span class="src">${esc(r.source)}</span>` : dash(r[k]);
  $('#rankings').innerHTML = `<p class="meta">${rows.length} rows · click a column to sort</p><table><thead><tr>${cols.map(([k, l]) => `<th class="s" data-k="${k}">${l}${sort.k === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(([k]) => `<td class="${['gmv','views','units','price','creators','rank'].includes(k) ? 'n' : ''}">${cell(r, k)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  document.querySelectorAll('#rankings th.s').forEach(th => th.onclick = () => { const k = th.dataset.k; sort = {k, dir: sort.k === k ? -sort.dir : -1}; rankings(); });
}
function deconstruct() {
  const rows = filt(D.deconstruct.concat(D.fastmoss.deconstruct || []));
  $('#deconstruct').innerHTML = `<p class="meta">${rows.length} videos · Umbrella rows only have Hook + format/overview in source (Hold/Body/Close = –)</p><table><thead><tr><th>Cat</th><th>#</th><th>Video</th><th>Product</th><th>GMV</th><th>Views</th><th>Format</th><th>Hook</th><th>Hold</th><th>Body</th><th>Close (CTA)</th><th>Steal / overview</th><th>Source</th></tr></thead><tbody>${rows.map(r => `<tr><td>${tag(r.category)}</td><td class="n">${r.n}</td><td>${link(r.video_url, '@' + r.creator)}</td><td>${dash(r.product)}</td><td class="n">${money(r.gmv)}</td><td class="n">${big(r.views)}</td><td>${dash(r.format)}</td><td>${dash(r.hook)}</td><td>${dash(r.hold)}</td><td>${dash(r.body)}</td><td>${dash(r.close)}</td><td>${dash(r.steal)}</td><td class="src">${esc(r.source)}</td></tr>`).join('')}</tbody></table>`;
}
function bars(rows) {
  const max = Math.max(...rows.map(r => r.count), 1), h = 22, lw = 300, W = 640;
  return `<svg viewBox="0 0 ${W} ${rows.length * h + 4}" width="100%" role="img">${rows.map((r, i) => { const w = (W - lw - 40) * r.count / max;
    return `<text x="${lw - 6}" y="${i*h + 15}" text-anchor="end" font-size="12" fill="#1d2329">${esc((r.layer + ' · ' + r.pattern).slice(0, 48))}</text><rect x="${lw}" y="${i*h + 4}" width="${w}" height="${h - 8}" rx="3" fill="${r.category === 'blanket' ? '#c46a2c' : '#2a8a6a'}"/><text x="${lw + w + 5}" y="${i*h + 15}" font-size="12">${r.count}</text>`; }).join('')}</svg>`;
}
function trends() {
  const rows = filt(D.trends.concat(D.fastmoss.trends || [])); let html = '';
  for (const c of ['blanket', 'umbrella']) { const rs = rows.filter(r => r.category === c); if (!rs.length) continue;
    html += `<div class="card"><h2>${tag(c)} ${rs.length} patterns</h2><p class="meta">Basis: ${esc(rs[0].basis)} · Source: ${esc(rs[0].source)}</p>${bars(rs)}
    <table><thead><tr><th>Layer</th><th>Pattern</th><th>Count</th><th>Notes</th></tr></thead><tbody>${rs.map(r => `<tr><td>${esc(r.layer)}</td><td>${esc(r.pattern)}</td><td class="n">${r.count}</td><td>${dash(r.notes)}</td></tr>`).join('')}</tbody></table></div>`; }
  $('#trends').innerHTML = html || '<p class="meta">No rows for this filter.</p>';
}
function steal() {
  const c = $('#cat').value, s = D.steal, src = $('#src').value; let html = '';
  if ((c === 'all' || c === 'blanket') && (src === 'all' || src === s.blanket.source)) { const b = s.blanket;
    html += `<h2>${tag('blanket')} CloudFur steal sheet <span class="src">${esc(b.source)} · data through ${esc(b.as_of)}</span></h2>
    <div class="card"><h3>Daily content checklist</h3><ol>${b.checklist.map(x => `<li>${esc(x.replace(/\*\*/g, ''))}</li>`).join('')}</ol></div>
    <div class="grid">${b.recipes.map(r => `<div class="card"><h3>${esc(r.title)}</h3>${['hook','hold','body','close'].map(k => `<div class="beat"><b>${k[0].toUpperCase() + k.slice(1)}</b> ${dash(r[k])}</div>`).join('')}</div>`).join('')}</div>
    <table><thead><tr><th>Do</th><th>Don't</th></tr></thead><tbody>${b.do_dont.map(r => `<tr><td>${esc(r.do)}</td><td>${esc(r.dont)}</td></tr>`).join('')}</tbody></table>`; }
  if ((c === 'all' || c === 'umbrella') && (src === 'all' || src === s.umbrella.source)) { const u = s.umbrella;
    html += `<h2>${tag('umbrella')} Repel winning patterns + daily prompts <span class="src">${esc(u.source)} · through ${esc(u.as_of)}</span></h2>
    <div class="card"><h3>Patterns</h3><ul>${u.patterns.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="card"><h3>Today's creator prompt (TikTok)</h3><pre>${esc(u.prompts.tiktok)}</pre><h3>AI video prompt</h3><pre>${esc(u.prompts.ai_video)}</pre></div>
    <div class="card"><h3>Notes</h3><ul>${u.notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`; }
  $('#steal').innerHTML = html || '<p class="meta">No content for this filter.</p>';
}
function fastmoss() {
  const f = D.fastmoss, n = (f.rankings || []).length + (f.deconstruct || []).length + (f.trends || []).length;
  $('#fastmoss').innerHTML = `<div class="empty"><h2>FastMoss (coming soon)</h2><p>${n} rows loaded from <code>data/fastmoss.json</code>.</p><p>Drop FastMoss rows into <code>rankings</code>, <code>deconstruct</code>, <code>trends</code> arrays using the same schema (see README) with <code>"source": "FastMoss"</code>. They will appear in every tab automatically.</p></div>`;
}
function storyboard() {
  const sb = D.storyboard, rows = filt(sb.videos), rk = D.rankings.filter(r => r.video_url);
  const ts = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + (s % 1 ? '.' + Math.round((s % 1) * 10) : '');
  const metric = (v, k) => { if (v[k] != null) return v[k]; const m = rk.find(r => r.video_url === v.video_url && r.window === v.window && r[k] != null); return m ? m[k] : null; };
  const ph = (v, thumb) => `<div class="ph">${thumb && v.thumbnail_url ? `<img src="${esc(v.thumbnail_url)}" alt="TikTok thumbnail"/>` : '<span>Frame unavailable</span>'}</div>`;
  const fig = (label, f, v, cls) => `<figure class="panel ${cls}"><figcaption class="beat-l">${label}${f ? ' ' + ts(f.t) : ''}</figcaption>${f ? `<img src="${esc(f.src)}" alt="${esc(label)} frame @${esc(v.creator)}" loading="lazy" width="360" height="640"/>` : ph(v, cls === 'hk')}</figure>`;
  const card = v => { const F = v.frames;
    const hooks = F ? F.hook.map(h => fig('HOOK', h, v, 'hk')).join('') : [0, .5, 1, 2, 3].map((t, i) => fig('HOOK ' + ts(t), null, v, i ? '' : 'hk')).join('');
    const rest = ['hold', 'body', 'close'].map(b => { const L = b[0].toUpperCase() + b.slice(1), note = v[b] || (b === 'body' && v.format ? 'Format: ' + v.format : null);
      return `<div class="beat-c">${fig(L, F && F[b], v, '')}<p class="note">${dash(note)}</p></div>`; }).join('');
    return `<article class="card sb"><div class="sb-h"><div>${tag(v.category)} <b>#${v.n}</b> <a href="${esc(v.video_url)}" target="_blank" rel="noopener">@${esc(v.creator)}</a> <span class="meta">${dash(v.product)}</span></div>
      <div class="sb-m"><span>GMV <b>${money(metric(v, 'gmv'))}</b></span><span>Views <b>${big(metric(v, 'views'))}</b></span><span class="meta">${esc(v.window)} · <span class="src">${esc(v.source)}</span>${F ? ' · ' + F.duration + 's' : ''}</span>
      <a class="watch" href="${esc(v.video_url)}" target="_blank" rel="noopener">Watch on TikTok ↗</a></div></div>
      <div class="strip"><div class="hook-g"><div class="hook-f">${hooks}</div><p class="note"><b>Hook:</b> ${dash(v.hook)}</p></div><div class="rest">${rest}</div></div>
      ${F ? '' : `<p class="meta warn">Frames unavailable: ${esc(v.frames_status)}</p>`}${v.steal ? `<p class="meta"><b>Steal:</b> ${esc(v.steal)}</p>` : ''}</article>`; };
  const nf = rows.filter(v => v.frames).length;
  $('#storyboard').innerHTML = `<p class="meta">${rows.length} videos · ${nf} with real frames (8 per video: 5-frame hook strip + Hold/Body/Close; yt-dlp + ffmpeg; ${esc(sb.meta.selection)}) · ${esc(sb.meta.timestamp_rule)} · generated ${esc(sb.meta.generated)}</p>${rows.map(card).join('') || '<p class="meta">No videos for this filter.</p>'}`;
}
const R = {rankings, deconstruct, storyboard, trends, steal, fastmoss};
const all = () => Object.values(R).forEach(f => f());
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('main section').forEach(s => s.hidden = s.id !== b.dataset.tab); location.hash = b.dataset.tab; });
$('#cat').onchange = all; $('#src').onchange = all;
Promise.all(['meta', 'rankings', 'deconstruct', 'storyboard', 'trends', 'steal', 'fastmoss'].map(n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); }).then(j => D[n] = j)))
  .then(() => {
    $('#asof').innerHTML = `Data as of: blankets ${esc(D.meta.as_of.blanket)} · umbrellas ${esc(D.meta.as_of.umbrella)}`;
    D.meta.sources.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.id + (s.status !== 'live' ? ' (coming soon)' : ''); $('#src').appendChild(o); });
    all(); const h = location.hash.slice(1); if (R[h]) document.querySelector(`#tabs button[data-tab="${h}"]`).click();
  }).catch(e => { $('#asof').textContent = 'Data failed to load: ' + e.message; console.error(e); });
