import { useId } from "react";
import { LEVELS } from "../config/levels";

// Watch, Signal and Alert always show their word and their own pattern or
// shape, never colour alone: Watch is indigo with a dashed ochre border,
// Signal is orange with the sparse print, Alert is crimson with the dense
// print. The print appears only here and on the map (docs/DESIGN.md).
const CORNERS_12 = [[0, 0], [12, 0], [0, 12], [12, 12]];
const CORNERS_16 = [[0, 0], [16, 0], [0, 16], [16, 16]];

export default function LevelBadge({ level, detail }) {
  return (
    <span className={`level level-${level}`}>
      <LevelSwatch level={level} />
      <span className="level-text">
        <span className="level-word">{LEVELS[level].label}</span>
        {detail && <span className="level-detail">{detail}</span>}
      </span>
    </span>
  );
}

export function LevelKey() {
  return (
    <ul className="level-key">
      {Object.entries(LEVELS).map(([level, { meaning }]) => (
        <li key={level}>
          <LevelBadge level={level} detail={meaning} />
        </li>
      ))}
    </ul>
  );
}

function LevelSwatch({ level }) {
  // Pattern ids must be unique on the page, and safe inside url(#…).
  const id = `print${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (level === "watch") {
    return (
      <svg className="level-swatch" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <rect className="swatch-watch" x="1.5" y="1.5" width="37" height="37" rx="8.5" />
      </svg>
    );
  }
  return (
    <svg className="level-swatch" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>{level === "alert" ? <DensePrint id={id} /> : <SparsePrint id={id} />}</defs>
      <rect className={`swatch-${level}`} width="40" height="40" rx="10" />
      <rect width="40" height="40" rx="10" fill={`url(#${id})`} />
    </svg>
  );
}

// transform scales the print on the map, so it stays the same size on
// screen whatever the map's size.
export function DensePrint({ id, transform }) {
  return (
    <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform={transform}>
      <polygon className="print-light" points="6,2 9.5,6 6,10 2.5,6" fillOpacity="0.5" />
      <circle className="print-dot" cx="6" cy="6" r="1" />
      {CORNERS_12.map(([cx, cy]) => <circle key={`${cx}-${cy}`} className="print-light" cx={cx} cy={cy} r="1.1" fillOpacity="0.5" />)}
    </pattern>
  );
}

export function SparsePrint({ id, transform }) {
  return (
    <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform={transform}>
      <circle className="print-light" cx="8" cy="8" r="1.5" fillOpacity="0.55" />
      {CORNERS_16.map(([cx, cy]) => <circle key={`${cx}-${cy}`} className="print-light" cx={cx} cy={cy} r="0.9" fillOpacity="0.4" />)}
    </pattern>
  );
}
