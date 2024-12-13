declare module 'wavesurfer.js' {
  interface WaveSurferOptions {
    container: HTMLElement | string;
    waveColor?: string;
    progressColor?: string;
    cursorColor?: string;
    barWidth?: number;
    barRadius?: number;
    responsive?: boolean;
    height?: number;
    normalize?: boolean;
    [key: string]: any;
  }

  class WaveSurfer {
    static create(options: WaveSurferOptions): WaveSurfer;
    load(url: string): void;
    play(): void;
    pause(): void;
    stop(): void;
    destroy(): void;
    on(event: string, callback: () => void): void;
  }

  export default WaveSurfer;
}
