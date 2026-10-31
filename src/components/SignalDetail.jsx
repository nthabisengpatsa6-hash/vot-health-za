import { useEffect, useRef, useState } from "react";
import { groupLabel, dateLabel, cardMeta } from "../lib/replayText";
import LevelBadge from "./LevelBadge";
import DailySquaresChart from "./DailySquaresChart";
import ReplayRanking from "./ReplayRanking";
import DraftedNotification from "./DraftedNotification";

function CardLinks({ ids, label }) {
  return <details className="signal-evidence"><summary>{label}</summary>{ids.length ? <ul>{ids.map((id, index) => <li key={id}><a href={`#card-${id}`}>View card {index + 1}</a></li>)}</ul> : <p>No cards recorded.</p>}</details>;
}

export default function SignalDetail({ signal, replay, runId, day, area, town, chart, renderRanking, draftAction, signedIn = false, onBack }) {
  const heading = useRef(null);
  const [entry, setEntry] = useState(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const ids = new Set(chart.days.flatMap((entry) => entry.cardIds));
  const records = replay.cardsUpTo(runId, day).filter(({ id }) => ids.has(id)).toReversed();
  const current = records.filter(({ id }) => signal.cardIds.includes(id));
  return (
    <section className={`screen signal-detail${signedIn ? " is-embedded" : ""}`}>
      <p className="pill">Simulation: a made-up town and made-up data</p>
      <button type="button" className="text-button" onClick={onBack}>Back to replay</button>
      <h1 ref={heading} tabIndex={-1}>Signal detail</h1>
      <LevelBadge level={signal.level} detail={`Day ${day}, ${dateLabel(replay.dateOf(day))}`} />
      <h2>{groupLabel(signal.symptomGroup)}</h2>
      <p>{signal.areas.join(", ")}</p>
      <p className="signal-count"><strong>{signal.observed.cases} cases in {signal.timeWindow.days} days</strong>; usual about {signal.expected.cases}.</p>
      <p>{signal.observed.cards} cards from {signal.independentReporters} places of care.</p>
      <p className="note">Usual comes from this area's 8 weeks of reports ending 2 weeks before today.</p>
      <CardLinks ids={signal.cardIds} label="Cards behind these counts" />
      {signal.otherWindows.length > 0 && <div><h3>Other windows found</h3>{signal.otherWindows.map((window, index) => <p key={index}>{window.days}-day window: {window.level[0].toUpperCase() + window.level.slice(1)} in {window.areas.join(", ")}. Counts for this additional window are unavailable.</p>)}</div>}
      <DailySquaresChart chart={chart} level={signal.level} />
      <h2>Observations</h2>
      <p>{signal.flags.moreSevere} {signal.flags.moreSevere === 1 ? "card describes" : "cards describe"} patients as sicker than usual.</p>
      <CardLinks ids={current.filter(({ card }) => card.observations.moreSevere).map(({ id }) => id)} label="Cards flagged sicker than usual" />
      <p>{signal.flags.notResponding} {signal.flags.notResponding === 1 ? "card describes" : "cards describe"} patients not getting better with usual treatment.</p>
      <CardLinks ids={current.filter(({ card }) => card.observations.notResponding).map(({ id }) => id)} label="Cards flagged not getting better" />
      <h2>Cards behind the signal</h2>
      <p className="note">The same symptom group and areas over the chart's 14 days, newest first.</p>
      <ol className="replay-cards signal-timeline">{records.map(({ id, card }) => <li key={id} id={`card-${id}`} className="replay-card" tabIndex={-1}><p>{dateLabel(new Date(card.createdAt + 2 * 60 * 60 * 1000).toISOString().slice(0, 10))}, {card.area}</p><p className="note">{cardMeta(card)}</p>{[card.symptomsInWords, card.unusualDescription, card.exposure.words, card.observations.shortOfSupplies ? card.observations.suppliesNote : null].filter(Boolean).map((words, index) => <p key={index} className="voice-quote">“{words}”</p>)}</li>)}</ol>
      {runId === "seeded" && ["signal", "alert"].includes(signal.level) ? <ReplayRanking replay={replay} day={day} area={area} signal={signal} renderPanel={renderRanking} detail onEntry={setEntry} /> : <><h2>Possible sources</h2><p>Live ranking and drafting are available for Signal or Alert in the seeded replay.</p></>}
      <DraftedNotification signal={signal} day={day} area={area} town={town} entry={entry} publicDemo={!signedIn} onDraft={runId === "seeded" && ["signal", "alert"].includes(signal.level) ? draftAction : undefined} />
    </section>
  );
}
