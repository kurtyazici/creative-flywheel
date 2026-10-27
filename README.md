# UEP Creative Flywheel (v1)

Find what winning TikTok Shop videos share → make more → cut losers.

**Scope source:** Jeff one-pager (Oct 20, 2026)  
**Styling refs:** [seat-cushion](https://kurtyazici.github.io/top-seat-cushion-dashboard/seat-cushion-brief/2026/1020.html) · [blanket](https://kurtyazici.github.io/top-blanket-dashboard/blanket-brief/2026/1021.html) · [umbrella](https://kurtyazici.github.io/top-umbrella-dashboard/umbrella-brief/2026/1020.html)

## Recommended repo

**New public GitHub Pages repo:** `kurtyazici/creative-flywheel`  
Do **not** extend `top-blanket-dashboard` / `top-umbrella-dashboard` / `top-seat-cushion-dashboard` — those are single-category Kalodata market briefs. Flywheel needs multi-product, multi-account, product+7d/30d UI, and three brief types.

Reuse their pattern: static `index.html` + dated brief folders + JSON under `data/YYYY-MMDD/` + twice-weekly Hermes push (Tue/Fri 8 AM CT like existing Mini jobs).

## Layout

```
index.html                          # product + timeline selector UI
data/YYYY-MMDD/
  winners-<sku>.json                # Brief 1 — our winners (Cruva)
  marketplace-<query>.json          # Brief 2 — all-Shop trending (Cruva marketplace)
  category-<slug>.json              # Brief 3 — category trending
briefs/our-winners/YYYY/MMDD.html
briefs/all-shop-trending/YYYY/MMDD.html
briefs/category-trending/YYYY/MMDD.html
```

## Data phases

| Phase | Source | Briefs unlocked | Status today |
|-------|--------|-----------------|--------------|
| 1 | Cruva MCP (`search_videos`, `search_brand_products`, `search_marketplace_products`, categories) | Our winners + all-Shop + category (basic) | **Works now** |
| 2 | Kalodata (Open API notes + Mini Hermes scrapes) | Richer market virals / category spend | Needs Mini lock / key — do not run from this bot |
| 2b | FastMoss (~$49/mo) | Cross-check AFM vs Kalo | **Do not purchase** until Jeff confirms |

## Cadence

Twice weekly (align with Hermes Tue/Fri 8 AM Central product dashboard jobs).

## Sample (this turn)

- Product: Repel umbrella `1732530504119718107`
- Open: `briefs/our-winners/2026/1023.html`
- JSON: `data/2026-1023/winners-repel-umbrella.json`

## Dashboard prototype (Oct 26, 2026)

Static, no build. `python3 -m http.server` → open `/`. Tabs: Rankings · Deconstruct · Storyboard · Form trends · Steal sheet + prompts · FastMoss (coming soon).
Regenerate JSON from on-disk research: `python3 scripts/build_data.py` (reads `blankets/2026-10-23/` + `data/2026-1023/`). Missing values = `null` → shown as "–". Nothing is invented.

### Data schema (`data/*.json`)
Every row carries `category` (`blanket`|`umbrella`) and `source` (`Kalodata/Hermes` | `Cruva` | `FastMoss`).
- `rankings.json` — `[ {category, type (product|video|video (our winners)), window (7d|30d), rank, name, creator, product_id?, video_id?, video_url, gmv, views, units, price, creators, posted, hook, source, as_of} ]`
- `deconstruct.json` — `[ {category, n, creator, product, gmv, views, window, format, video_url, hook, hold, body, close, steal, source, as_of} ]`
- `trends.json` — `[ {category, layer (Hook|Hold|Body|Close|Format), pattern, count, notes, source, basis} ]`
- `steal.json` — `{blanket:{source,as_of,brand,do_dont[],recipes[{title,hook,hold,body,close}],checklist[]}, umbrella:{source,as_of,brand,patterns[],prompts{tiktok,ai_video},notes[]}}`
- `storyboard.json` — `{meta, videos:[deconstruct row + video_id, thumbnail_url, in_top10, frames{hook,hold,body,close}→assets/storyboard/<video_id>/*.jpg, timestamps{duration,hook,hold,body,close}, frames_status]}`. Built by `scripts/build_storyboard.py` (run from `build_data.py`; `NO_MEDIA=1` skips): TikTok oEmbed thumbnail per video + real frames (yt-dlp + ffmpeg, 360px JPG) for the top 10 by GMV (blankets first). Failed downloads → `frames:null`, UI shows "Frame unavailable".
- `meta.json` — as-of dates + source list.
- `fastmoss.json` — **FastMoss slot (coming soon)**: `{rankings:[],deconstruct:[],trends:[]}` using the same row schemas with `"source":"FastMoss"`; rows merge into every tab automatically.
