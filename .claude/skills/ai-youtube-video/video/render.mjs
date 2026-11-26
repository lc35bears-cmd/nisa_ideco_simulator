// 使い方: node render.mjs <jobディレクトリ> [long|short|thumb|all]
// jobディレクトリは build_props.py の出力先（props.json と素材が入っている）。
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [, , jobArg, which = 'all'] = process.argv;
if (!jobArg) {
  console.error('usage: node render.mjs <job-dir> [long|short|thumb|all]');
  process.exit(1);
}
const job = path.resolve(jobArg);
const props = JSON.parse(fs.readFileSync(path.join(job, 'props.json'), 'utf8'));

// このクラウド環境に入っている Chromium。なければ Remotion が自分で取りに行く。
const PW = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = process.env.REMOTION_BROWSER ?? (fs.existsSync(PW) ? PW : null);

const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
  publicDir: job, // 素材は job ディレクトリから読む
});

const common = {serveUrl, browserExecutable, chromiumOptions: {gl: 'swangle'}};
const concurrency = Math.max(1, os.cpus().length);

const jobs = {
  thumb: async () => {
    const composition = await selectComposition({...common, id: 'Thumbnail', inputProps: props.thumb});
    await renderStill({...common, composition, inputProps: props.thumb, output: path.join(job, 'out/thumbnail.png')});
  },
  short: async () => {
    const composition = await selectComposition({...common, id: 'Short', inputProps: props.short});
    await renderMedia({
      ...common, composition, inputProps: props.short, codec: 'h264', crf: 24, x264Preset: 'slow', concurrency,
      outputLocation: path.join(job, 'out/short.mp4'),
      onProgress: ({progress}) => process.stdout.write(`\rshort ${(progress * 100).toFixed(0)}%`),
    });
  },
  long: async () => {
    const composition = await selectComposition({...common, id: 'Long', inputProps: props.long});
    await renderMedia({
      ...common, composition, inputProps: props.long, codec: 'h264', crf: 24, x264Preset: 'slow', concurrency,
      outputLocation: path.join(job, 'out/long.mp4'),
      onProgress: ({progress}) => process.stdout.write(`\rlong ${(progress * 100).toFixed(0)}%`),
    });
  },
};

for (const k of which === 'all' ? ['thumb', 'short', 'long'] : [which]) {
  const t = Date.now();
  await jobs[k]();
  console.log(`\n${k} done in ${((Date.now() - t) / 1000).toFixed(0)}s`);
}
