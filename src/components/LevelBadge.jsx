// Watch, Signal and Alert are always shown with their word and a bar count
// (1, 2 or 3), never by colour alone.
const LEVELS = {
  watch: { label: "Watch", bars: 1, meaning: "Clearly more cases than usual." },
  signal: { label: "Signal", bars: 2, meaning: "Reported by two or more people, or twice the usual number." },
  alert: { label: "Alert", bars: 3, meaning: "A Signal with a likely common source, or signs of severe illness." },
};

export default function LevelBadge({ level }) {
  const { label, bars } = LEVELS[level];
  return (
    <span className={`level level-${level}`}>
      <span className="level-bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= bars ? "bar on" : "bar"} />
        ))}
      </span>
      {label}
    </span>
  );
}

export function LevelKey() {
  return (
    <ul className="level-key">
      {Object.entries(LEVELS).map(([level, { meaning }]) => (
        <li key={level}>
          <LevelBadge level={level} />
          <span>{meaning}</span>
        </li>
      ))}
    </ul>
  );
}
