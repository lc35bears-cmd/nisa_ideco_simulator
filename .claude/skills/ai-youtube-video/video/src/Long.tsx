import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArtFrame, Captions, FadeEdges, Headline, Progress, SectionLabel} from './parts';
import type {LongProps} from './types';

const TitleCard: React.FC<{title: string}> = ({title}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [fps * 4, fps * 4.6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 45%)'}} />
      <Headline text={title} fontSize={84} top={70} delay={4} />
    </AbsoluteFill>
  );
};

export const Long: React.FC<LongProps> = ({title, audio, sections, lines}) => {
  const {fps, durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {sections.map((s, i) => {
        const from = Math.round(s.start * fps);
        const dur = Math.max(1, Math.round(s.duration * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <FadeEdges durationInFrames={dur}>
              <ArtFrame src={s.image} focus={s.focus} durationInFrames={dur} />
              {i > 0 || !title ? <SectionLabel text={s.caption} fontSize={36} /> : null}
            </FadeEdges>
          </Sequence>
        );
      })}
      {title ? (
        <Sequence durationInFrames={Math.round(fps * 5)}>
          <TitleCard title={title} />
        </Sequence>
      ) : null}
      <Captions lines={lines} fontSize={58} bottom={70} maxWidth="85%" />
      <Progress durationInFrames={durationInFrames} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
