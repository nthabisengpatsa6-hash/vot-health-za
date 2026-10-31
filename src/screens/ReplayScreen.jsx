import { useEffect, useRef, useState } from "react";
import RankingPanel from "../components/RankingPanel";
import { createRankingGate } from "../lib/liveRanking";
import { rankSources } from "../lib/rankApi";
import { draftNotification } from "../lib/draftApi";
import DemoScreen from "./DemoScreen";
import { useLocation } from "react-router";

function LiveRanking({ saved, snapshot, request, gate, busy, setBusy, detail, onEntry }) {
  const [result, setResult] = useState({ state: "saved", live: null });
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const shownEntry = (result.live || saved)?.entry;
  useEffect(() => { onEntry?.(shownEntry); }, [shownEntry, onEntry]);
  const rank = () => gate.run(async () => {
    setBusy(true);
    setResult({ state: "loading", live: null });
    try {
      const entry = await rankSources(request);
      if (active.current) setResult({ state: "live", live: { entry, ...snapshot } });
    } catch (error) {
      if (active.current) setResult({ state: error.code === "functions/resource-exhausted" ? "capped" : "failed", live: null });
    } finally { setBusy(false); }
  });
  return <RankingPanel saved={saved} live={result.live} state={result.state} busy={busy} onRank={rank} onShowSaved={() => setResult({ state: "saved", live: null })} detail={detail} />;
}

export default function ReplayScreen({ profileArea }) {
  const location = useLocation();
  const [gate] = useState(createRankingGate);
  const [busy, setBusy] = useState(false);
  return <DemoScreen embedded profileArea={profileArea} initialToday={location.state?.today === true} draftAction={draftNotification} renderRanking={(props) => <LiveRanking key={`${props.request.day}|${props.request.symptomGroup}|${props.request.area}`} {...props} gate={gate} busy={busy} setBusy={setBusy} />} />;
}
