import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Line} from './types';

export const FONT = '"Noto Sans JP", sans-serif';

/** 作品をぼかした背景＋作品全体を収めた前景。ゆっくりズームする。 */
export const ArtFrame: React.FC<{
  src: string;
  focus: [number, number];
  durationInFrames: number;
  fit?: number; // 前景の大きさ（画面に対する割合）
  zoom?: number; // 最後に何倍になるか
}> = ({src, focus, durationInFrames, fit = 0.9, zoom = 1.12}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, zoom], {extrapolateRight: 'clamp'});
  const origin = `${focus[0] * 100}% ${focus[1] * 100}%`;
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          inset: -60,
          width: 'calc(100% + 120px)',
          height: 'calc(100% + 120px)',
          objectFit: 'cover',
          filter: 'blur(40px) brightness(0.45)',
        }}
      />
      <AbsoluteFill style={{transform: `scale(${scale})`, transformOrigin: origin}}>
        <Img
          src={staticFile(src)}
          style={{
            position: 'absolute',
            left: `${(1 - fit) * 50}%`,
            top: `${(1 - fit) * 50}%`,
            width: `${fit * 100}%`,
            height: `${fit * 100}%`,
            objectFit: 'contain',
            filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.6))',
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 場面の頭と終わりを暗転でつなぐ */
export const FadeEdges: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const f = 12;
  const opacity = interpolate(frame, [0, f, durationInFrames - f, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

/** いま読んでいる文を字幕に出す。出るときに少し跳ねる。 */
export const Captions: React.FC<{lines: Line[]; fontSize: number; bottom: number; maxWidth: string}> = ({
  lines,
  fontSize,
  bottom,
  maxWidth,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cur = lines.find((l) => t >= l.start - 0.05 && t < l.end + 0.25);
  if (!cur) return null;
  const local = frame - Math.round(cur.start * fps);
  const pop = spring({frame: local, fps, config: {damping: 14, stiffness: 180}});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom}}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.35,
          color: '#fff',
          textAlign: 'center',
          maxWidth,
          padding: '0.2em 0.6em',
          // 日本語を文節で折り返し、行の長さをそろえる
          wordBreak: 'auto-phrase' as React.CSSProperties['wordBreak'],
          textWrap: 'balance',
          WebkitTextStroke: `${fontSize / 7}px #000`,
          paintOrder: 'stroke fill',
          textShadow: '0 4px 14px rgba(0,0,0,0.7)',
          transform: `translateY(${(1 - pop) * 18}px) scale(${0.94 + pop * 0.06})`,
          opacity: Math.min(1, pop * 1.5),
        }}
      >
        {cur.text}
      </div>
    </AbsoluteFill>
  );
};

/** 左上の場面ラベル */
export const SectionLabel: React.FC<{text: string; fontSize: number}> = ({text, fontSize}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 6, fps, config: {damping: 18}});
  const out = interpolate(frame, [fps * 5, fps * 5.6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: 48,
        top: 44,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize,
        color: '#fff',
        background: 'rgba(0,0,0,0.62)',
        borderLeft: '8px solid #ffd400',
        padding: '0.25em 0.7em',
        transform: `translateX(${(1 - s) * -60}px)`,
        opacity: s * out,
      }}
    >
      {text}
    </div>
  );
};

/** 画面下の進行バー（どこまで見たかが分かると離脱が減る） */
export const Progress: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        height: 8,
        width: `${(frame / durationInFrames) * 100}%`,
        background: '#ffd400',
      }}
    />
  );
};

/** 大見出し（\n で改行） */
export const Headline: React.FC<{text: string; fontSize: number; top: number; delay?: number}> = ({
  text,
  fontSize,
  top,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 12, stiffness: 140}});
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize,
        lineHeight: 1.25,
        color: '#ffd400',
        WebkitTextStroke: `${fontSize / 6}px #000`,
        paintOrder: 'stroke fill',
        whiteSpace: 'pre-line',
        transform: `scale(${0.7 + s * 0.3})`,
        opacity: s,
      }}
    >
      {text}
    </div>
  );
};
