// Waveform bars, 3 px wide and 3 px apart. With peaks (0 to 1, from the
// recording's loudness) it's a still picture of the note. Without, it's the
// processing waveform: a fixed set of bars that rise and fall in turn (the
// styles switch the movement off for reduced motion).
const BARS = 32;
const HEIGHT = 32;
const MIN_BAR = 3;
const PROCESSING = Array.from({ length: BARS }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 0.45)));

export default function Waveform({ peaks }) {
  const heights = peaks || PROCESSING;
  const width = heights.length * 6 - 3;
  return (
    <svg className={peaks ? "waveform" : "waveform is-moving"} width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden="true" focusable="false">
      {heights.map((value, i) => {
        const h = Math.max(MIN_BAR, Math.round(value * HEIGHT));
        return <rect key={i} x={i * 6} y={(HEIGHT - h) / 2} width="3" height={h} rx="1.5" style={peaks ? undefined : { "--i": i }} />;
      })}
    </svg>
  );
}
