import { CAPPED, EVIDENCE_INTRO, FAILED, NO_SAVED, RANKING_FOOTER } from "../config/rankingCopy";
import { evidenceText, rankingLabel, safeSummary, sourcePresentation } from "../lib/rankingText";
import Message from "./Message";
import Waveform from "./Waveform";

function Evidence({ citations, signal, cards, label }) {
  return (
    <div className="ranking-evidence">
      <h5>{label}</h5>
      {!citations.length && <p className="note">None cited.</p>}
      {citations.map((citation, index) => {
        const evidence = evidenceText(citation, signal, cards);
        return (
          <details key={index}>
            <summary>{evidence.text}</summary>
            {!evidence.cards.length && <p className="note">No cards recorded for this comparison.</p>}
            <ul className="ranking-cards">
              {evidence.cards.map((card, number) => <li key={number}>{card.words ? <p className="voice-quote">“{card.words}”</p> : <p className="note">No exposure words recorded.</p>}<p className="note">Onset: {card.onset}</p></li>)}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

// Presentation only: no Firebase, callable, storage or model requests.
// Day 6 can pass a different signal/card snapshot into this same panel.
export default function RankingPanel({ saved = null, live = null, state = "saved", onRank, onShowSaved, busy = false }) {
  const shown = live || saved;
  const ranking = shown?.entry.ranking;
  return (
    <section className="ranking-panel" aria-label="Possible sources" aria-busy={state === "loading"}>
      <h3>Possible sources</h3>
      {shown ? <p className="note ranking-label">{rankingLabel(shown.entry, Boolean(live))}</p> : <p>{NO_SAVED}</p>}
      {state === "loading" && <div className="ranking-progress" role="status"><Waveform /><p>Ranking possible sources. Please keep this screen open.</p></div>}
      {state === "failed" && <Message kind="error" role="alert">{FAILED}</Message>}
      {state === "capped" && <Message kind="info" role="status">{CAPPED}</Message>}
      {ranking?.sources.map((source) => {
        const { name, checks } = sourcePresentation(source, shown.signal);
        const summary = safeSummary(source.reason);
        return (
          <article key={source.sourceId} className="ranked-source">
            <h4>{source.rank}. {name}</h4>
            <p className="ranking-confidence">{source.confidence[0].toUpperCase() + source.confidence.slice(1)} confidence</p>
            {source.fromClinicianCluesOnly && <p className="ranking-tag">From clinicians' clues only</p>}
            {summary && <div><h5>Muse Spark's summary</h5><p>{summary}</p></div>}
            <p className="ranking-evidence-label">{EVIDENCE_INTRO}</p>
            <Evidence citations={source.supporting} signal={shown.signal} cards={shown.cards} label="Supports" />
            <Evidence citations={source.contradicting} signal={shown.signal} cards={shown.cards} label="Against" />
            {checks && <div><h5>Possible checks for environmental health</h5><p>{checks}</p></div>}
          </article>
        );
      })}
      <p className="note ranking-footer">{RANKING_FOOTER}</p>
      {onRank && <button type="button" className="button button-primary" disabled={busy || state === "loading" || state === "capped"} onClick={onRank}>Rank live with Muse Spark</button>}
      {live && onShowSaved && <button type="button" className="text-button" onClick={onShowSaved}>Show saved ranking</button>}
    </section>
  );
}
