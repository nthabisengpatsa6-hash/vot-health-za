import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BANNER } from "../lib/replayText";
import { PRODUCT_NAME } from "../config/product";

export default function ScorecardScreen() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; import("../sim/held-out/scorecard-screen.json").then((module) => { if (active) setData(module.default); }, () => { if (active) setFailed(true); }); return () => { active = false; }; }, []);
  return <main className="screen scorecard"><p className="pill">{BANNER}</p><Link to="/demo">Back to replay</Link><h1>Held-out scorecard</h1>{failed && <p role="alert">The scorecard could not load. Please reload the page.</p>}{!data && !failed && <p role="status">Loading the scorecard…</p>}{data && <Scorecard data={data} />}</main>;
}

export function Scorecard({ data }) {
  const held = data.heldOut, tune = data.tuning;
  return <>
    <p>Tested on {data.sampleSize} simulation runs {PRODUCT_NAME} had never seen (seeds {data.firstSeed} to {data.lastSeed}), set aside before tuning and run once.</p>
    <p>Tested on {data.sampleSize} held-out simulation runs: every run reached Alert (median day {held.first.alert.median}). Muse Spark ranked works A first at the first Alert in {data.firstAlert.worksFirst} of {data.firstAlert.ranked}, and in all {data.day19.worksFirst} on day 19. No false Signals or Alerts; {held.falseSignals.combined.watch} false Watch signal-days across {data.totalRuns} runs.</p>
    <h2>Tuning and held-out</h2>
    <p>First day: median (range)</p>
    <dl>{["watch", "signal", "alert"].map((level) => <div key={level}><dt>{level[0].toUpperCase() + level.slice(1)}</dt><dd>Tuning: {tune.first[level].median} ({tune.first[level].min}–{tune.first[level].max}); held-out: {held.first[level].median} ({held.first[level].min}–{held.first[level].max})</dd></div>)}</dl>
    <h3>False signals (signal-days)</h3>
    {[["Seeded", "seeded"], ["Quiet", "quiet"], ["Combined", "combined"]].map(([label, key]) => <p key={key}>{label}: tuning Watch {tune.falseSignals[key].watch}, Signal {tune.falseSignals[key].signal}, Alert {tune.falseSignals[key].alert}; held-out Watch {held.falseSignals[key].watch}, Signal {held.falseSignals[key].signal}, Alert {held.falseSignals[key].alert}.</p>)}
    <p>Works A first at first Alert: tuning {data.tuningRanking.worksFirstAtFirstAlert} of {data.tuningRanking.rankedFirstAlerts}; held-out {data.firstAlert.worksFirst} of {data.firstAlert.ranked}.</p>
    <h2>The quiet runs</h2><p>In {data.sampleSize} runs with no hidden outbreak, {PRODUCT_NAME} never raised a Signal or Alert. {data.quietRunsWithWatch} of {data.sampleSize} quiet runs had a false Watch: {held.falseSignals.quiet.watch} signal-days.</p>
    <h2>Where it fell short</h2><p>Signal and Alert median first days were {held.first.signal.median} and {held.first.alert.median}, compared with {tune.first.signal.median} and {tune.first.alert.median} in tuning.</p>
    <ul>{data.misses.map((item) => <li key={item.seed}>Seed {item.seed}: {item.source.startsWith("shop:") ? "shop" : "school"} ranked first; confidence {item.confidence}.</li>)}</ul>
    <h2>Muse Spark's confidence</h2><p>{data.highCount} of {data.rankingCount} held-out ranking events had a high-confidence top pick; {data.highWorks} named works A.</p>
    <h2>Definitions</h2><p>One signal-day is one signal on one day. A false signal-day is a signal-day outside the seeded illness, or any signal-day in a quiet run.</p><p>Tuning: works A was ever first by day 19 in {data.tuningRanking.worksEverFirstByDay19} of {data.tuningRanking.seeds}. Held-out: works A was first at the event in force on day 19 in {data.day19.worksFirst} of {data.day19.ranked}. These measure different things.</p>
    <p>Full records: docs/provenance/held-out/ in the repository.</p>
  </>;
}
