"""出来上がりの検品。台本の読み上げ文と、完成動画の静止画・音程を確かめる。

使い方:
  python3 -I check.py script <script.json>   読み上げ文の音程を1文ずつ測り、怪しい文を挙げる
  python3 -I check.py frames <job-dir>       完成動画から確認用の静止画を切り出す
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RANGE_LIMIT = 18.0  # 1文の音程の幅（半音）。これを超えると不自然に跳ねていることが多い


def check_script(path):
    import voice
    sc = json.load(open(path))
    voice.READINGS.update(sc.get("readings", {}))
    groups = [s["lines"] for s in sc["sections"]] + [sc["short"]["lines"]]
    bad = 0
    for grp in groups:
        for ln in grp:
            say = ln["say"]
            st = voice.f0_stats(*voice.tts(say))
            notes = []
            if st["range_st"] > RANGE_LIMIT:
                notes.append(f"音程の幅 {st['range_st']}半音")
            if say.count("、") >= 3:
                notes.append("読点が多い")
            if say.rstrip("。").endswith("ん"):
                notes.append("「ん」で終わる（語尾が沈みやすい）")
            feats = voice.frontend(say)
            # 例: 「ほくさい」が「ほ(副詞)/くさい(形容詞)」に割れる
            odd = []
            for i, f in enumerate(feats):
                if not re.fullmatch(r"[ぁ-ゖ]", f["string"]):
                    continue
                if f["pos"] in ("助詞", "助動詞", "記号") or f["pos_group1"] in ("非自立", "接尾"):
                    continue
                nxt = feats[i + 1]["pos"] if i + 1 < len(feats) else ""
                if f["pos"] == "動詞" and nxt in ("助詞", "助動詞", "動詞"):
                    continue  # 「し(て)」「い(ます)」「さ(れる)」などの活用は正常
                odd.append(f["string"])
            if odd:
                notes.append("かな書きの語が割れている（漢字で書く）: " + "/".join(odd))
            if notes:
                bad += 1
                print(f"要確認: {say}\n   -> {'; '.join(notes)}")
    print(f"確認が必要な文: {bad}")


def frames(job):
    out = os.path.join(job, "out")
    for name, times in (("long", [2, 30, 70]), ("short", [3, 10])):
        src = os.path.join(out, f"{name}.mp4")
        if not os.path.exists(src):
            continue
        for t in times:
            dst = os.path.join(out, f"check_{name}_{t}.jpg")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1",
                            "-vf", "scale=960:-1", dst], check=True)
            print(dst)


if __name__ == "__main__":
    {"script": check_script, "frames": frames}[sys.argv[1]](sys.argv[2])
