import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {FONT} from './parts';
import type {ThumbProps} from './types';

const COLORS = ['#ffffff', '#ffd400', '#ffffff'];

export const Thumbnail: React.FC<ThumbProps> = ({image, focus, lines, sub}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <Img
        src={staticFile(image)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`,
          transform: 'scale(1.25)',
          transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
        }}
      />
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 80%)'}} />
      <div style={{position: 'absolute', left: 56, top: 110}}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 112,
              lineHeight: 1.3,
              color: COLORS[i % COLORS.length],
              WebkitTextStroke: '18px #000',
              paintOrder: 'stroke fill',
            }}
          >
            {l}
          </div>
        ))}
        <div
          style={{
            marginTop: 36,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 44,
            color: '#fff',
            WebkitTextStroke: '8px #000',
            paintOrder: 'stroke fill',
          }}
        >
          {sub}
        </div>
      </div>
    </AbsoluteFill>
  );
};
