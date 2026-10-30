import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import AreaSheet from "../components/AreaSheet";
import { PauseIcon, PlayIcon } from "../components/Icons";
import LevelBadge, { LevelKey } from "../components/LevelBadge";
import Message from "../components/Message";
import TownMap from "../components/TownMap";
import Wordmark from "../components/Wordmark";
import { LEVEL_ORDER } from "../config/levels";
import { PRODUCT_NAME } from "../config/product";
import { LIVE_REPLAY_FOOTER } from "../config/rankingCopy";
import { createReplay, LAST_DAY, REPLAY_DAYS, RUNS } from "../lib/replay";
import { BANNER, cardMeta, dateLabel, dayHeading, FOOTER, groupLabel, intro, levelsAnnouncement, RUN_NOTE, sinceLine } from "../lib/replayText";
import { MAP_AREAS, TOWN_FILE } from "../lib/townMap";

// The public replay (decisions D2 and T1): no sign-in, no Firestore, no
// Functions and no Meta model, so a judge without an account can watch it.
// The engine and the statistics load here and nowhere else in the app, and
// only with import(), so they never reach the main file
// (test/unit/sim-imports.test.js).
let replayReady = null;
function loadReplay() {
  replayReady ??= Promise.all([import("../../functions/shared/sim/engine.mjs"), import("../../functions/shared/signals.mjs"), import("../../functions/shared/sastDay.mjs")])
    .then(([engine, signals, sastDay]) => createReplay({ createRun: engine.createRun, computeSignals: signals.computeSignals, dayEnd: sastDay.dayEnd, dayOfDate: sastDay.dayOfDate, town: TOWN_FILE }));
  return replayReady;
}

const SECONDS_PER_DAY = 1.5;
const SHOWN_CARDS = 3;
const rankOf = (level) => LEVEL_ORDER.indexOf(level);

export default function DemoScreen({ embedded = false, renderRanking }) {
  const [replay, setReplay] = useState(null);
  const [failed, setFailed] = useState(false);
  const [runId, setRunId] = useState(RUNS[0].id);
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(null);
  const [heard, setHeard] = useState({ levels: null, text: "" });
  const opener = useRef(null);

  useEffect(() => {
    document.title = `Replay – ${PRODUCT_NAME}`;
    return () => {
      document.title = PRODUCT_NAME;
    };
  }, []);

  useEffect(() => {
    let current = true;
    loadReplay().then((ready) => current && setReplay(ready), () => current && setFailed(true));
    return () => {
      current = false;
    };
  }, []);

  // One day every 1.5 s; reaching the last day stops it.
  const running = playing && day < LAST_DAY;
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setDay((current) => Math.min(current + 1, LAST_DAY)), SECONDS_PER_DAY * 1000);
    return () => clearInterval(timer);
  }, [running]);

  const result = replay ? replay.resultFor(runId, day) : null;
  const levels = result ? result.areaLevels : {};
  const cards = useMemo(() => (replay ? replay.cardsOn(runId, day) : []), [replay, runId, day]);
  const date = replay ? dateLabel(replay.dateOf(day)) : null;

  // Screen readers hear the map change, not every day ticking by.
  const levelsKey = result ? JSON.stringify(levels) : null;
  if (levelsKey !== heard.levels) setHeard({ levels: levelsKey, text: heard.levels === null ? "" : levelsAnnouncement(day, levels) });

  const openArea = (area, element) => {
    opener.current = element;
    setSelected(area);
  };
  const closeSheet = useCallback(() => {
    setSelected(null);
    opener.current?.focus();
  }, []);

  // Play at the last day starts again from day 0.
  const togglePlay = () => {
    if (!running && day === LAST_DAY) setDay(0);
    setPlaying(!running);
  };
  // Moving the slider after the replay has ended doesn't start it again.
  const chooseDay = (next) => {
    if (!running) setPlaying(false);
    setDay(next);
  };

  let since = null;
  if (selected && levels[selected]) {
    const sinceDay = replay.levelSince(runId, day, selected);
    since = sinceLine(sinceDay, replay.dateOf(sinceDay));
  }
  // Highest level first, then the town file's order.
  const areas = MAP_AREAS.map((area) => area.name).sort((a, b) => rankOf(levels[b]) - rankOf(levels[a]));
  const Content = embedded ? "section" : "main";

  return (
    <div className={`demo${selected ? " has-sheet" : ""}${embedded ? " is-embedded" : ""}`}>
      <header className="demo-header">
        {!embedded && <div className="demo-bar">
          <Link to="/" className="header-wordmark"><Wordmark /></Link>
          <Link to="/" className="header-link">Sign in</Link>
        </div>}
        <p className="pill demo-pill">{BANNER}</p>
      </header>

      <Content className="demo-main">
        <h1>Replay</h1>
        <p className="lead">{intro({ product: PRODUCT_NAME, town: TOWN_FILE.town, days: REPLAY_DAYS })}</p>

        <div className="segmented" role="group" aria-label="Which run">
          {RUNS.map((run) => <button key={run.id} type="button" aria-pressed={run.id === runId} onClick={() => setRunId(run.id)}>{run.label}</button>)}
        </div>
        <p className="note run-note">{RUN_NOTE}</p>

        <div className="replay-controls">
          <button type="button" className="button button-primary replay-play" disabled={!replay} onClick={togglePlay}>{running ? <PauseIcon /> : <PlayIcon />}{running ? "Pause" : "Play"}</button>
          <p className="replay-day"><strong>Day {day}</strong>{date && <span>{date}</span>}</p>
        </div>
        <input className="replay-slider" type="range" min="0" max={LAST_DAY} step="1" value={day} disabled={!replay} aria-label="Replay day" aria-valuetext={date ? `Day ${day}, ${date}` : `Day ${day}`} onChange={(event) => chooseDay(Number(event.target.value))} />
        <p className="replay-ends" aria-hidden="true"><span>Day 0</span><span>Day {LAST_DAY}</span></p>

        <TownMap levels={levels} selected={selected} onSelect={replay ? openArea : null} description={`Map of ${TOWN_FILE.town}`} />
        <p className="visually-hidden" role="status">{heard.text}</p>
        {!replay && !failed && <p className="note" role="status">Preparing the town…</p>}
        {failed && <Message kind="error" role="alert">The replay couldn't load. Check your connection, then reload the page.</Message>}

        {replay && (
          <>
            <h2>{dayHeading(day, cards)}</h2>
            {cards.length > SHOWN_CARDS && <p className="note">The latest {SHOWN_CARDS}, newest first:</p>}
            <ol className="replay-cards">
              {cards.slice(0, SHOWN_CARDS).map(({ id, card }) => (
                <li key={id} className="replay-card">
                  <p className="replay-card-head">{groupLabel(card.symptomGroup)}, {card.area}</p>
                  <p className="voice-quote">“{card.symptomsInWords}”</p>
                  {card.exposure.words && <p className="replay-card-label">Shared exposure</p>}
                  {card.exposure.words && <p className="voice-quote">“{card.exposure.words}”</p>}
                  <p className="note">{cardMeta(card)}</p>
                </li>
              ))}
            </ol>
          </>
        )}

        <h2>All areas</h2>
        <ul className="area-list">
          {areas.map((area) => (
            <li key={area}>
              <button type="button" className="area-row" disabled={!replay} aria-expanded={area === selected} onClick={(event) => openArea(area, event.currentTarget)}>
                <span className="area-row-name">{area}</span>
                {result && (levels[area] ? <LevelBadge level={levels[area]} /> : <span className="area-row-quiet">Nothing unusual</span>)}
              </button>
            </li>
          ))}
        </ul>

        <h2>What the levels mean</h2>
        <LevelKey />
        <p className="note">{embedded ? LIVE_REPLAY_FOOTER : FOOTER}</p>
        {!embedded && <Link to="/" className="button button-secondary">Health professionals: sign in</Link>}
      </Content>

      {selected && result && <AreaSheet area={selected} result={result} since={since} onClose={closeSheet} replay={replay} day={day} runId={runId} renderRanking={renderRanking} />}
    </div>
  );
}
