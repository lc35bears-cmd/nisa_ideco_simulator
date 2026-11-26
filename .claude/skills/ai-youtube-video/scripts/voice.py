"""ナレーション音声。Open JTalk のアクセントを直してから合成し、必要ならピッチ曲線を整える。"""
import numpy as np
import pyopenjtalk
import pyworld

# 辞書のアクセント誤りを直す {表記: アクセント核の位置(0=平板)}
ACCENT_FIX = {
    "形": 0,
    "本編": 0,
    "主役": 0,
}

# 辞書が知らない読み {表記: カタカナ} または {表記: [カタカナ, アクセント核]}
# 台本ごとの読みは script.json の "readings" に書けば、ここに足される。
READINGS = {}

DEFAULT = dict(speed=1.05, half_tone=-1.5, smooth=False, range_scale=1.0)


def apply_readings(text):
    """表記を読みに置き換える。長い語から順に置き換える。"""
    accents = {}
    for k in sorted(READINGS, key=len, reverse=True):
        v = READINGS[k]
        kana, acc = (v[0], v[1]) if isinstance(v, (list, tuple)) else (v, None)
        if k in text:
            text = text.replace(k, kana)
            if acc is not None:
                accents[kana] = acc
    return text, accents


def frontend(text):
    text, accents = apply_readings(text)
    feats = pyopenjtalk.run_frontend(text)
    for f in feats:
        if f["string"] in accents:
            f["acc"] = accents[f["string"]]
        if f["string"] in ACCENT_FIX:
            f["acc"] = ACCENT_FIX[f["string"]]
        if f["acc"] > f["mora_size"] and f["chain_flag"] != 1:
            f["acc"] = 0  # 範囲外の値は平板に
    return feats


def shape_pitch(x, sr, range_scale=1.0, smooth=True):
    """WORLDでF0を取り出し、細かな揺れをならし、抑揚の幅を調整して戻す"""
    x = x.astype(np.float64)
    f0, t = pyworld.harvest(x, sr, frame_period=5.0)
    sp = pyworld.cheaptrick(x, f0, t, sr)
    ap = pyworld.d4c(x, f0, t, sr)
    v = f0 > 0
    if v.sum() > 10:
        lf0 = np.log(np.where(v, f0, 1.0))
        if smooth:
            # 有声区間ごとに 25ms の移動平均（区間をまたがない）
            k = 5
            out = lf0.copy()
            idx = np.flatnonzero(v)
            runs = np.split(idx, np.flatnonzero(np.diff(idx) > 1) + 1)
            for r in runs:
                if len(r) >= k:
                    seg = np.pad(lf0[r], k // 2, mode="edge")
                    out[r] = np.convolve(seg, np.ones(k) / k, mode="valid")
            lf0 = out
        m = lf0[v].mean()
        lf0[v] = m + (lf0[v] - m) * range_scale
        f0 = np.where(v, np.exp(lf0), 0.0)
    y = pyworld.synthesize(f0, sp, ap, sr, frame_period=5.0)
    return y[: len(x)]


def tts(text, speed=None, half_tone=None, smooth=None, range_scale=None, raw=False):
    p = dict(DEFAULT)
    for k, val in dict(speed=speed, half_tone=half_tone, smooth=smooth, range_scale=range_scale).items():
        if val is not None:
            p[k] = val
    if raw:  # 旧方式（比較用）
        x, sr = pyopenjtalk.tts(text, speed=1.12)
    else:
        labels = pyopenjtalk.make_label(frontend(text))
        x, sr = pyopenjtalk.synthesize(labels, speed=p["speed"], half_tone=p["half_tone"])
        if p["smooth"] or p["range_scale"] != 1.0:
            x = shape_pitch(x, sr, p["range_scale"], p["smooth"])
    x = x / (np.abs(x).max() + 1e-9) * 0.85
    return x, sr


def f0_stats(x, sr, edge_ms=30):
    """音程の統計。声の出だしと切れ目（edge_ms）は測定が乱れるので除く。"""
    f0, _ = pyworld.harvest(x.astype(np.float64), sr, frame_period=5.0)
    voiced = f0 > 0
    core = voiced.copy()
    k = max(1, edge_ms // 5)
    idx = np.flatnonzero(voiced)
    for r in np.split(idx, np.flatnonzero(np.diff(idx) > 1) + 1):
        core[r[:k]] = False
        core[r[-k:]] = False
    v = f0[core] if core.sum() > 10 else f0[voiced]
    st = 12 * np.log2(v / np.median(v))
    jumps = np.abs(np.diff(12 * np.log2(f0[1:][(f0[1:] > 0) & (f0[:-1] > 0)] / f0[:-1][(f0[1:] > 0) & (f0[:-1] > 0)])))
    return dict(median_hz=round(float(np.median(v)), 1),
                range_st=round(float(np.percentile(st, 95) - np.percentile(st, 5)), 1),
                jitter_st=round(float(np.mean(jumps)), 3))
