import { useEffect, useState } from "react";
import { findSavedRanking, loadSavedRankings } from "../lib/savedRankings";
import RankingPanel from "./RankingPanel";
import Message from "./Message";

// Mounted only for a selected Signal/Alert. The JSON import starts here,
// never on the replay's first load, on Watch, or in the quiet run.
export default function ReplayRanking({ replay, day, area, signal, renderPanel }) {
  const [entries, setEntries] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    loadSavedRankings().then((value) => { if (current) { setEntries(value); setFailed(false); } }, () => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [attempt]);
  if (failed) return <Message kind="error" role="alert">Saved rankings couldn't load. Check your connection, then try again.<button type="button" className="button button-secondary" onClick={() => { setFailed(false); setAttempt(attempt + 1); }}>Try again</button></Message>;
  if (!entries) return <p className="note" role="status">Loading saved ranking…</p>;
  const props = { saved: findSavedRanking(entries, replay, day, signal), snapshot: { signal, cards: replay.cardsUpTo("seeded", day) }, request: { day, symptomGroup: signal.symptomGroup, area } };
  return renderPanel ? renderPanel(props) : <RankingPanel saved={props.saved} />;
}
