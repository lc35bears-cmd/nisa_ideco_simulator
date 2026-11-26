"""script.json -> job ディレクトリ（画像・音声・props.json・metadata.json）

使い方: python3 -I build_props.py <script.json> <job-dir>

画像の指定方法:
  "met:45434"        メトロポリタン美術館の Open Access（パブリックドメインのみ受け付ける）
  "files/foo.jpg"    script.json からの相対パスにある手元の画像
"""
import json
import os
import shutil
import sys
import urllib.request
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice  # noqa: E402

SR = 48000
LINE_GAP = 0.35  # 文と文の間（秒）
SECTION_GAP = 0.7  # 場面が変わる前の間（秒）
TAIL = 0.8  # 最後の余韻（秒）
MET = "https://collectionapi.metmuseum.org/public/collection/v1/objects/"


def fetch_image(ref, script_dir, job, credits, crop=None):
    rel = _fetch_image(ref, script_dir, job, credits)
    if not crop:
        return rel
    # 美術館の写真には色見本やものさしが写り込むことがあるので切り抜く。crop は [左, 上, 右, 下] の割合
    from PIL import Image
    im = Image.open(os.path.join(job, rel))
    w, h = im.size
    out = rel.replace(".jpg", "_crop.jpg")
    im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h))).convert("RGB").save(
        os.path.join(job, out), quality=95)
    return out


def _fetch_image(ref, script_dir, job, credits):
    os.makedirs(os.path.join(job, "img"), exist_ok=True)
    if ref.startswith("met:"):
        obj = ref[4:]
        rel = f"img/met_{obj}.jpg"
        dst = os.path.join(job, rel)
        meta = json.load(urllib.request.urlopen(MET + obj, timeout=30))
        if not meta.get("isPublicDomain"):
            raise SystemExit(f"{ref} はパブリックドメインではないので使えません")
        if not os.path.exists(dst):
            urllib.request.urlretrieve(meta["primaryImage"], dst)
        credits[ref] = f"{meta.get('artistDisplayName', '')}「{meta.get('title', '')}」{meta.get('objectDate', '')} " \
                       f"The Metropolitan Museum of Art, Public Domain (CC0) {meta.get('objectURL', '')}"
        return rel
    src = os.path.join(script_dir, ref)
    rel = "img/" + os.path.basename(ref)
    shutil.copy(src, os.path.join(job, rel))
    credits[ref] = os.path.basename(ref)
    return rel


def synth(groups, out_wav):
    """groups: [[{sub,say},...],...] -> (字幕の時刻, 各グループの開始と長さ, 全体の長さ)"""
    pieces, lines, spans, t = [], [], [], 0.0
    for gi, grp in enumerate(groups):
        g0 = t
        for ln in grp:
            a, sr = voice.tts(ln["say"])
            assert sr == SR
            lines.append({"start": round(t, 3), "end": round(t + len(a) / SR, 3), "text": ln["sub"]})
            pieces += [a, np.zeros(int(LINE_GAP * SR))]
            t += len(a) / SR + LINE_GAP
        if gi < len(groups) - 1:
            pieces.append(np.zeros(int(SECTION_GAP * SR)))
            t += SECTION_GAP
        spans.append([round(g0, 3), round(t - g0, 3)])
    pieces.append(np.zeros(int(TAIL * SR)))
    t += TAIL
    spans[-1][1] = round(spans[-1][1] + TAIL, 3)
    audio = np.concatenate(pieces)
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
    return lines, spans, round(t, 3)


def main(script_path, job):
    sc = json.load(open(script_path))
    voice.READINGS.update(sc.get("readings", {}))
    sdir = os.path.dirname(os.path.abspath(script_path))
    os.makedirs(os.path.join(job, "audio"), exist_ok=True)
    os.makedirs(os.path.join(job, "out"), exist_ok=True)
    credits = {}

    # 長尺
    secs = sc["sections"]
    lines, spans, dur = synth([s["lines"] for s in secs], os.path.join(job, "audio/long.wav"))
    long = {
        "title": sc.get("title_card", sc["title"]),
        "audio": "audio/long.wav",
        "duration": dur,
        "lines": lines,
        "sections": [
            {"image": fetch_image(s["image"], sdir, job, credits, s.get("crop")), "focus": s.get("focus", [0.5, 0.5]),
             "caption": s.get("caption", ""), "start": sp[0], "duration": sp[1]}
            for s, sp in zip(secs, spans)
        ],
    }

    # Shorts
    sh = sc["short"]
    s_lines, _, s_dur = synth([sh["lines"]], os.path.join(job, "audio/short.wav"))
    short = {"headline": sh.get("headline", ""), "image": fetch_image(sh["image"], sdir, job, credits, sh.get("crop")),
             "audio": "audio/short.wav", "duration": s_dur, "lines": s_lines}

    # サムネイル
    th = sc["thumb"]
    thumb = {"image": fetch_image(th.get("image", secs[0]["image"]), sdir, job, credits, th.get("crop")),
             "focus": th.get("focus", [0.5, 0.5]), "lines": th["lines"], "sub": th.get("sub", "")}

    json.dump({"long": long, "short": short, "thumb": thumb},
              open(os.path.join(job, "props.json"), "w"), ensure_ascii=False, indent=1)

    # 投稿用のメタデータ（概要欄に出典とAI利用の表記を自動で足す）
    desc = sc.get("description", "").rstrip() + "\n\n■ 画像出典\n" + "\n".join(f"・{c}" for c in credits.values())
    desc += "\n\n■ 制作について\n台本の作成とナレーション（合成音声 Open JTalk）にAIを使用しています。"
    meta = {"title": sc["title"], "description": desc, "tags": sc.get("tags", []),
            "short_title": sh.get("title", sc["title"]) + " #shorts", "duration_long": dur, "duration_short": s_dur}
    json.dump(meta, open(os.path.join(job, "metadata.json"), "w"), ensure_ascii=False, indent=1)
    print(f"long {dur:.1f}s / short {s_dur:.1f}s / images {len(credits)} -> {job}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
