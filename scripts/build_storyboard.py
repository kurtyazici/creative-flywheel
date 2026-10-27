#!/usr/bin/env python3
"""Storyboard media for every deconstruct video: TikTok oEmbed thumbnail lookup + real ffmpeg frames (5-frame hook strip,
Hold/Body/Close, 1-per-2.5s filmstrip) from a yt-dlp download (no cookies; alternate URL forms tried on failure).
Writes data/storyboard.json. Never fakes frames: on failure frames=null + per-URL errors recorded, UI marks frames unavailable."""
import json, os, re, shutil, subprocess, tempfile, urllib.request, urllib.parse, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = f"{R}/data"; ASSETS = f"{R}/assets/storyboard"


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

STRIP_EVERY = 2.5

def url_forms(url, vid, creator):
    """Original URL first, then normalized forms built from the video ID (no cookies used)."""
    forms = [url, f"https://www.tiktok.com/@{creator}/video/{vid}" if creator else None,
             f"https://www.tiktok.com/@_/video/{vid}", f"https://m.tiktok.com/v/{vid}.html", f"https://www.tiktok.com/embed/v2/{vid}"]
    return list(dict.fromkeys(f for f in forms if f))

def download(url, vid, creator, td):
    attempts = []
    for u in url_forms(url, vid, creator):
        for f in os.listdir(td): os.remove(f"{td}/{f}")
        dl = subprocess.run(["yt-dlp", "-q", "--no-warnings", "--no-cookies", "--write-info-json", "-f", "b[ext=mp4]/b", "-o", f"{td}/v.%(ext)s", u],
                            capture_output=True, text=True, timeout=300)
        vids = [f for f in os.listdir(td) if f.startswith("v.") and not f.endswith(".json")]
        if not dl.returncode and vids:
            info = {}
            try: info = json.load(open(f"{td}/v.info.json"))
            except Exception: pass
            return f"{td}/{vids[0]}", info, u, attempts
        attempts.append({"url": u, "error": ((dl.stderr.strip().splitlines() or ["?"])[-1])[:200]})
    return None, None, None, attempts

def filmstrip(src, d, D):
    os.makedirs(f"{D}/strip", exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vf", f"fps=1/{STRIP_EVERY},scale=240:-2", "-q:v", "7", f"{D}/strip/%03d.jpg"], capture_output=True)
    fs = sorted(f for f in os.listdir(f"{D}/strip") if f.endswith(".jpg"))
    # fps filter emits the frame nearest each 2.5s tick starting at t=0
    return [{"t": round(i * STRIP_EVERY, 1), "src": os.path.relpath(f"{D}/strip/{f}", R)} for i, f in enumerate(fs) if i * STRIP_EVERY < d]

def frames(url, vid, row):
    with tempfile.TemporaryDirectory() as td:
        src, info, used, attempts = download(url, vid, row.get("creator"), td)
        if not src: return None, "download failed on all URL forms: " + attempts[-1]["error"], attempts, None
        d = duration(src); D = f"{ASSETS}/{vid}"
        if os.path.isdir(D): shutil.rmtree(D)
        os.makedirs(D); out = {"duration": round(d, 2), "downloaded_from": used, "hook": []}
        prev = -1.0
        for i, t in enumerate(HOOK_T):
            if t >= d: continue
            p = f"{D}/hook{i + 1}.jpg"; c = best(src, t, d, p, after=prev); prev = c if c is not None else prev
            if c is None: return None, f"ffmpeg failed on hook {t}s", attempts, None
            out["hook"].append({"target": t, "t": c, "src": os.path.relpath(p, R)})
        for b, t in beat_times(d, row).items():
            p = f"{D}/{b}.jpg"; c = best(src, t, d, p)
            if c is None: return None, f"ffmpeg failed on {b}", attempts, None
            out[b] = {"t": c, "src": os.path.relpath(p, R)}
        out["strip"] = filmstrip(src, d, D)
        meta = {k: info.get(k) for k in ("description", "title", "upload_date", "duration", "view_count", "like_count")} if info else None
        return out, None, attempts, meta

def summary(r, meta):
    """One line built only from real text: deconstruct beats/steal/overview + yt-dlp caption."""
    parts = []
    if r["category"] == "blanket" and r.get("hook") and r.get("close"):
        first = lambda t: re.split(r"(?<=[.!?”;])\s", t)[0].rstrip(".;")
        parts.append(f"{first(r['hook'])} → {first(r['close'])}")
    if r.get("steal"): parts.append(r["steal"].rstrip("."))
    elif r.get("format"): parts.append("Format: " + r["format"])
    cap = (meta or {}).get("description") or ""
    cap = re.sub(r"\s+", " ", cap).strip()
    return {"text": " · ".join(parts) if parts else None, "caption": (cap[:160] + "…" if len(cap) > 160 else cap) or None,
            "basis": "deconstruct notes" + (" + TikTok caption (yt-dlp)" if cap else "")}

def main():
    decon = json.load(open(f"{OUT}/deconstruct.json"))
    rows = []
    for r in [r for r in decon if r.get("video_url")]:
        vid = re.search(r"/video/(\d+)", r["video_url"]).group(1); thumb, title = oembed(r["video_url"])
        e = dict(category=r["category"], n=r["n"], video_id=vid, creator=r["creator"], product=r["product"], gmv=r["gmv"], views=r["views"],
                 window=r["window"], format=r["format"], video_url=r["video_url"], hook=r["hook"], hold=r["hold"], body=r["body"], close=r["close"],
                 steal=r["steal"], source=r["source"], as_of=r["as_of"], thumbnail_url=thumb)
        f, err, attempts, meta = frames(r["video_url"], vid, r)
        e.update(frames=f, frames_status="ok" if f else err, download_attempts=attempts, ytdlp=meta, summary=summary(r, meta))
        print(vid, r["category"], r["creator"], e["frames_status"], (len(f["strip"]) if f else 0), "strip", f and f["downloaded_from"] != r["video_url"] and "(alt url)" or "")
        rows.append(e)
    meta = dict(generated=datetime.datetime.now().astimezone().isoformat(timespec="minutes"), selection="all deconstruct videos",
                strip_every_s=STRIP_EVERY,
                timestamp_rule="Hook strip 0 / 0.5 / 1 / 2 / 3s; Hold ~5s, Body = middle, Close = end - 2s (beat timestamp used if written in deconstruct). Each frame nudged up to +0.4s / -0.2s to the most detailed frame to avoid mid-transition blur. Filmstrip: 1 frame / 2.5s")
    json.dump(dict(meta=meta, videos=rows), open(f"{OUT}/storyboard.json", "w"), indent=1, ensure_ascii=False)

if __name__ == "__main__": main()
