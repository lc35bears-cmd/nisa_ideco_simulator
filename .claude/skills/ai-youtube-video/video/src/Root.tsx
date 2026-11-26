import React from 'react';
import {Composition, Still} from 'remotion';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/800.css';
import '@fontsource/noto-sans-jp/900.css';
import {Long} from './Long';
import {Short} from './Short';
import {Thumbnail} from './Thumbnail';
import type {LongProps, ShortProps, ThumbProps} from './types';

const FPS = 30;

// Studio で開いたときの仮の値。実際は render.mjs が props.json を渡す。
const demoLong: LongProps = {title: '', audio: '', duration: 5, sections: [], lines: []};
const demoShort: ShortProps = {headline: '', image: '', audio: '', duration: 5, lines: []};
const demoThumb: ThumbProps = {image: '', focus: [0.5, 0.5], lines: ['タイトル'], sub: ''};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Long"
      component={Long}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={150}
      defaultProps={demoLong}
      calculateMetadata={({props}) => ({durationInFrames: Math.ceil(props.duration * FPS)})}
    />
    <Composition
      id="Short"
      component={Short}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={150}
      defaultProps={demoShort}
      calculateMetadata={({props}) => ({durationInFrames: Math.ceil(props.duration * FPS)})}
    />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} defaultProps={demoThumb} />
  </>
);
