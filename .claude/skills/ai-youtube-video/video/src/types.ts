// build_props.py が書き出す props.json の形
export type Line = {start: number; end: number; text: string};

export type Section = {
  image: string; // public/ からの相対パス
  focus: [number, number]; // ズームの中心 (0-1)
  caption: string;
  start: number; // 秒
  duration: number; // 秒
};

export type LongProps = {
  title: string;
  audio: string;
  duration: number;
  sections: Section[];
  lines: Line[];
};

export type ShortProps = {
  headline: string;
  image: string;
  audio: string;
  duration: number;
  lines: Line[];
};

export type ThumbProps = {
  image: string;
  focus: [number, number];
  lines: string[];
  sub: string;
};

export type JobProps = {
  long: LongProps;
  short: ShortProps;
  thumb: ThumbProps;
};
