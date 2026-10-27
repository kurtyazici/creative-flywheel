#!/usr/bin/env python3
"""Storyboard media: TikTok oEmbed thumbnail for every deconstruct video + real ffmpeg frames for the top 10
winners (by GMV, blankets first, then umbrella fill). Writes data/storyboard.json. Never fakes frames:
if a download/extract fails, frames=null + error recorded and the UI marks frames unavailable."""
import json, os, re, shutil, subprocess, tempfile, urllib.request, urllib.parse, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = f"{R}/data"; ASSETS = f"{R}/assets/storyboard"
TOP_N = 10

def oembed(url):
    try:
        q = "https://www.tiktok.com/oembed?url=" + urllib.parse.quote(url, safe="")
        req = urllib.request.Request(q, headers={"User-Agent": "Mozilla/5.0"})
        j = json.load(urllib.request.urlopen(req, timeout=20))
        return j.get("thumbnail_url"), j.get("title")
    except Exception as e:
        return None, None

def duration(p):
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(o.stdout.strip())

HOOK_T = (0.0, 0.5, 1.0, 2.0, 3.0); NUDGE = (0.0, 0.2, 0.4, -0.2)

def grab(src, t, p):
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", src, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "5", p], capture_output=True, text=True)
    return os.path.exists(p) and os.path.getsize(p) > 1000 and not r.returncode

def best(src, t, d, p, nudge=True, after=-1.0):
    """Grab frame near t; when nudging, try t, t+0.2, t+0.4, t-0.2 and keep the most detailed frame
    (largest JPEG = sharpest / most on-screen text; blurry mid-transition frames compress small)."""
    cands = [t] + ([t + n for n in NUDGE[1:]] if nudge else [])
    cands = [round(c, 2) for c in cands if max(0, after + 0.05) <= c < d - 0.05 or (c == 0 and after < 0)] or [round(max(0, min(t, d - 0.1)), 2)]
    scored = []
    for i, c in enumerate(cands):
        tmp = f"{p}.c{i}.jpg"
        if grab(src, c, tmp): scored.append((os.path.getsize(tmp), c, tmp))
    if not scored: return None
    _, c, tmp = max(scored); os.replace(tmp, p)
    for _, _, f in scored:
        if os.path.exists(f): os.remove(f)
    return c

def beat_times(d, row):
    """Explicit timestamps from deconstruct beats if present (e.g. '0:05'), else defaults."""
    t = {"hold": min(5.0, d * 0.3), "body": d / 2, "close": max(d - 2.0, d * 0.8)}
    for b in t:
        m = re.search(r"\b(\d+):(\d{2})\b", row.get(b) or "")
        if m: t[b] = min(int(m.group(1)) * 60 + int(m.group(2)), d - 0.1)
    return t

def frames(url, vid, row):
    with tempfile.TemporaryDirectory() as td:
        dl = subprocess.run(["yt-dlp", "-q", "--no-warnings", "-f", "b[ext=mp4]/b", "-o", f"{td}/v.%(ext)s", url], capture_output=True, text=True, timeout=300)
        files = [f for f in os.listdir(td) if f.startswith("v.")]
        if dl.returncode or not files: return None, ("download failed: " + (dl.stderr.strip().splitlines() or ["?"])[-1])[:200]
        src = f"{td}/{files[0]}"; d = duration(src); D = f"{ASSETS}/{vid}"
        if os.path.isdir(D): shutil.rmtree(D)
        os.makedirs(D); out = {"duration": round(d, 2), "hook": []}
        prev = -1.0
        for i, t in enumerate(HOOK_T):
            if t >= d: continue
            p = f"{D}/hook{i + 1}.jpg"; c = best(src, t, d, p, after=prev); prev = c if c is not None else prev
            if c is None: return None, f"ffmpeg failed on hook {t}s"
            out["hook"].append({"target": t, "t": c, "src": os.path.relpath(p, R)})
        for b, t in beat_times(d, row).items():
            p = f"{D}/{b}.jpg"; c = best(src, t, d, p)
            if c is None: return None, f"ffmpeg failed on {b}"
            out[b] = {"t": c, "src": os.path.relpath(p, R)}
        return out, None

def main():
    decon = json.load(open(f"{OUT}/deconstruct.json"))
    vids = [r for r in decon if r.get("video_url")]
    top = sorted([r for r in vids if r["category"] == "blanket"], key=lambda r: -(r["gmv"] or 0))
    top += sorted([r for r in vids if r["category"] == "umbrella"], key=lambda r: -(r["gmv"] or 0))
    top_ids = [re.search(r"/video/(\d+)", r["video_url"]).group(1) for r in top[:TOP_N]]
    rows = []
    for r in vids:
        vid = re.search(r"/video/(\d+)", r["video_url"]).group(1); thumb, title = oembed(r["video_url"])
        e = dict(category=r["category"], n=r["n"], video_id=vid, creator=r["creator"], product=r["product"], gmv=r["gmv"], views=r["views"],
                 window=r["window"], format=r["format"], video_url=r["video_url"], hook=r["hook"], hold=r["hold"], body=r["body"], close=r["close"],
                 steal=r["steal"], source=r["source"], as_of=r["as_of"], thumbnail_url=thumb, in_top10=vid in top_ids,
                 frames=None, frames_status="not in top 10 (frames not extracted)")
        if vid in top_ids:
            f, err = frames(r["video_url"], vid, r)
            e.update(frames=f, frames_status="ok" if f else err)
        print(vid, r["creator"], "thumb" if thumb else "no-thumb", e["frames_status"]); rows.append(e)
    meta = dict(generated=datetime.datetime.now().astimezone().isoformat(timespec="minutes"), top_n=TOP_N,
                selection="top 10 by GMV, blankets first then umbrella", timestamp_rule="Hook strip 0 / 0.5 / 1 / 2 / 3s; Hold ~5s, Body = middle, Close = end - 2s (beat timestamp used if written in deconstruct). Each frame nudged up to +0.4s / -0.2s to the most detailed frame to avoid mid-transition blur")
    json.dump(dict(meta=meta, videos=rows), open(f"{OUT}/storyboard.json", "w"), indent=1, ensure_ascii=False)

if __name__ == "__main__": main()
