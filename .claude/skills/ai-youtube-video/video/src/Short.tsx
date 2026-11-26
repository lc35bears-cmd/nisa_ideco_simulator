import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Captions, FadeEdges, Headline} from './parts';
import type {ShortProps} from './types';

/** 縦長の画面で、横長の作品を左から右へ流して見せる */
const PanningArt: React.FC<{src: string; durationInFrames: number}> = ({src, durationInFrames}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, durationInFrames], [0, -100], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          inset: -80,
          width: 'calc(100% + 160px)',
          height: 'calc(100% + 160px)',
          objectFit: 'cover',
          filter: 'blur(45px) brightness(0.4)',
        }}
      />
      <div style={{position: 'absolute', top: 330, left: 0, width: '100%', height: 1150, overflow: 'hidden'}}>
        <Img
          src={staticFile(src)}
          style={{
            position: 'absolute',
            height: '100%',
            left: 0,
            // 画像の幅 - 画面幅 ぶんを動かす
            transform: `translateX(calc(${x / 100} * (100% - 1080px)))`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const Short: React.FC<ShortProps> = ({headline, image, audio, lines}) => {
  const {durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill>
      <FadeEdges durationInFrames={durationInFrames}>
        <PanningArt src={image} durationInFrames={durationInFrames} />
      </FadeEdges>
      <Headline text={headline} fontSize={96} top={110} />
      <Captions lines={lines} fontSize={66} bottom={300} maxWidth="92%" />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
