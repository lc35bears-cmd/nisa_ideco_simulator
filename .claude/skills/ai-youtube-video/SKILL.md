---
name: ai-youtube-video
description: 顔出しなし・AI運用のYouTube解説動画（長尺1本＋Shorts＋サムネイル）を、リサーチ→台本→ナレーション→Remotionで描画→検品まで一人で作る。「動画を作って」「次の回を作って」「Shortsを作って」「台本を書いて動画にして」と言われたときに使う。
---

# AI YouTube 動画制作（ベース）

台本（`script.json`）を1つ書けば、長尺動画・Shorts・サムネイル・投稿用メタデータがそろう。
描画は Remotion（React で動画を組むツール）、ナレーションは Open JTalk（オフラインの合成音声）。

```
リサーチ → script.json → check.py script → build_props.py → render.mjs → check.py frames → 納品
```

## 0. 準備（セッションごとに1回）

```bash
SKILL=.claude/skills/ai-youtube-video
pip install -q pyopenjtalk-plus pyworld numpy
(cd $SKILL/video && npm install --no-audit --no-fund)
```

- 画像はメトロポリタン美術館の Open Access API を使う。ネットワークで
  `collectionapi.metmuseum.org` と `images.metmuseum.org` が許可されている必要がある。
- ffmpeg（検品用）と Chromium はクラウド環境に入っている。`render.mjs` が自動で見つける。

## 1. リサーチ

- 題材は**パブリックドメインの素材がある**ものに限る。今は `met:<objectID>` に対応している。
  - 検索: `https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&q=<語>&limit=40`
    （旧 `/v1/search` は 2026-10-01 に廃止）
  - 詳細: `.../v1/objects/<id>` の `isPublicDomain` が true のものだけ使う（build_props.py も確認して止める）
- 年代・作品名は美術館のデータで確かめる。逸話や引用は Web で2つ以上の出典に当たる。
  **確かめられなかった話は台本に入れない。**

## 2. 台本 `script.json`

例は `examples/hokusai/script.json`。主な項目:

| 項目 | 内容 |
|---|---|
| `title` | YouTube のタイトル |
| `title_card` | 冒頭に出す大見出し（`\n` で改行） |
| `description`, `tags` | 概要欄とタグ。出典とAI利用の表記は自動で足される |
| `readings` | 読み方の辞書 `{"押送船": ["オシオクリブネ", 5], "石班沢": "カジカザワ"}`（数字はアクセント核の位置、0=平板） |
| `thumb` | `image`, `focus`, `lines`（大きな文字、1〜2行）, `sub` |
| `sections[]` | 場面。`image`, `focus`（ズームの中心 0〜1）, `caption`（左上のラベル）, `lines[]` |
| `short` | `title`, `headline`, `image`, `lines[]`（6文前後、20秒くらい） |

`lines` は `{"sub": 字幕, "say": 読み上げ文}`。**字幕と読み上げ文は分ける。**

### 読み上げ文（say）の書き方 ― 音程を崩さないためのルール

調べて分かったこと。守らないと抑揚が不自然に跳ねる。

1. **読点は意味の切れ目だけ。** 「、」のたびに音程がリセットされる。1文に2つまで。
2. **固有名詞は漢字で書く。** かな書きは割れる（「ほくさい」→「ほ／くさい」）。
3. **漢字でも読めない語は `readings` に足す**（「押送船」→オーソーセン、「山下白雨」→ヤマシタハクウ と誤読する）。
4. **「〜ん。」で終わらせない。** 語尾が沈んでうなり声になる。「〜です」「〜ます」で閉じる。
5. 数字は漢数字で（「七十歳」）。字幕は算用数字でよい。
6. 長尺は 8〜12 分が目安（1場面 3〜5 文、15〜25 場面）。冒頭 15 秒で「何が分かる動画か」を言う。

## 3. 読み上げ文の検品

```bash
python3 -I $SKILL/scripts/check.py script <script.json>
```

1文ずつ合成して、音程の幅（18半音超）、読点の多さ、「ん」終わり、かなの割れを挙げる。
`readings` か言い回しを直して **「確認が必要な文: 0」** にする。
読みを確かめたいときは `voice.frontend(文)` の `pron` を並べて見る。

## 4. 素材と音声を作る

```bash
python3 -I $SKILL/scripts/build_props.py <script.json> <job-dir>
```

`<job-dir>` に `img/`, `audio/`, `props.json`（字幕の時刻つき）, `metadata.json`（投稿用）ができる。
job-dir はリポジトリの外（スクラッチパッドなど）に置く。

## 5. 描画

```bash
cd $SKILL/video && node render.mjs <job-dir> [thumb|short|long|all]
```

出力は `<job-dir>/out/`。4コアで Shorts 20秒が約1.5分、長尺は実時間の約4倍かかる。
長尺は Bash の上限（10分）を超えるので `run_in_background` で回す。
見た目を変えるときは `video/src/`（`parts.tsx` が共通部品、`Long.tsx`/`Short.tsx`/`Thumbnail.tsx`）を直す。
`npx remotion studio` でプレビューもできる。

## 6. 完成品の検品

```bash
python3 -I $SKILL/scripts/check.py frames <job-dir>
```

切り出した静止画を Read で見て、字幕がはみ出ていないか、画像が切れていないかを確かめる。
音は聞けないので、ユーザーに聞いてもらい、気になる語を `readings` / `voice.ACCENT_FIX` に足す。

## 守ること

- 画像は**パブリックドメイン（CC0）だけ**。出典は metadata.json の概要欄に自動で入る。
- 概要欄に AI 利用の表記を残す。本物と見間違える合成映像を使うときは、投稿時に「改変・合成コンテンツ」を申告する。
- YouTube の「本物でないコンテンツ」（量産・繰り返し）ポリシーに当たらないよう、毎回、構成と切り口を変える。
- Remotion は個人・3人以下の会社は無料、それ以上は有料ライセンス。

## まだないもの（次に足す）

- YouTube Data API での投稿（`metadata.json` を使う。審査に通るまで投稿は非公開になる）
- BGM、VOICEVOX / ElevenLabs など他の声、メトロポリタン美術館以外の素材元
