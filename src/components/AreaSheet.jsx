import { useEffect, useRef } from "react";
import { LEVEL_ORDER } from "../config/levels";
import { areaLine, cardsLine, groupLabel, nothingFoundLine, placeLine, whyLine } from "../lib/replayText";
import LevelBadge from "./LevelBadge";
import ReplayRanking from "./ReplayRanking";

const rank = (signal) => LEVEL_ORDER.indexOf(signal.level);

// One area on the day shown: its level and, for each signal it's part of,
// the counts against usual and why it has its level. Sources are named
// only inside Possible sources at Signal/Alert (docs/DESIGN.md).
// It doesn't block the page (docs/DESIGN.md, "The map"),
// so Play and the day slider keep working and its numbers follow the day.
export default function AreaSheet({ area, result, since, onClose, replay, day, runId, renderRanking, onOpenSignal }) {
  const heading = useRef(null);

  useEffect(() => {
    heading.current.focus();
  }, [area]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const level = result.areaLevels[area];
  const signals = result.signals.filter((signal) => signal.areas.includes(area)).sort((a, b) => rank(b) - rank(a));

  return (
    <section className="sheet" aria-labelledby="sheet-title">
      <span className="sheet-grabber" aria-hidden="true" />
      <h2 id="sheet-title" ref={heading} tabIndex={-1}>{area}</h2>
      {level ? <LevelBadge level={level} detail={since} /> : <p>{nothingFoundLine(area, result.date)}</p>}
      {signals.map((signal) => (
        <div key={signal.id} className="sheet-signal">
          <h3>{groupLabel(signal.symptomGroup)}</h3>
          <p>{placeLine(signal)}</p>
          {signal.areas.length > 1 && <p>{areaLine(signal, area)}</p>}
          <p>{cardsLine(signal)}</p>
          <p>{whyLine(signal)}</p>
          {onOpenSignal && <button type="button" className="button button-secondary" onClick={() => onOpenSignal(signal)}>Open signal</button>}
          {runId === "seeded" && ["signal", "alert"].includes(signal.level) && <ReplayRanking key={`${day}|${area}|${signal.symptomGroup}`} replay={replay} day={day} area={area} signal={signal} renderPanel={renderRanking} />}
        </div>
      ))}
      <button type="button" className="button button-secondary sheet-close" onClick={onClose}>Close</button>
    </section>
  );
}
