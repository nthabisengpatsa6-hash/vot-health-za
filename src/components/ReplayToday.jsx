import LevelBadge from "./LevelBadge";
import { groupLabel } from "../lib/replayText";
import { nearbySignals, weeklyCounts } from "../lib/replayToday";
import { usualCasesText } from "../../functions/shared/draft/counts.mjs";

export default function ReplayToday({ replay, runId, day, result, town, area, onArea, onOpenSignal }) {
  const signals = nearbySignals(result, town, area);
  const counts = weeklyCounts(replay, runId, day, area);
  return <section className="replay-today">
    <h2>Today</h2>
    <label className="field"><span className="field-label">Choose an area</span><span className="select"><select className="input" value={area} onChange={(event) => onArea(event.target.value)}>{town.areas.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></span></label>
    <h2>This week in {area}</h2>
    {counts.length ? <ul>{counts.map((item) => <li key={item.value}>{item.label}: {item.observed.cases} cases in 7 days; {result.status === "ok" ? usualCasesText(item.expected.cases) : "Not enough history"}.</li>)}</ul> : <p>No case cards in this area in 7 days.</p>}
    <h2>Open signals nearby</h2>
    <p>Nearby means {area} and the areas next to it.</p>
    {result.status !== "ok" ? <p>Not enough history.</p> : signals.length ? <ul className="area-list">{signals.map((signal) => <li key={signal.id}><button type="button" className="area-row" onClick={() => onOpenSignal(signal, area)}><span><strong>{groupLabel(signal.symptomGroup)}</strong><br />{signal.areas.join(", ")}</span><LevelBadge level={signal.level} /></button></li>)}</ul> : <p>Nothing unusual near {area} this week.</p>}
  </section>;
}
