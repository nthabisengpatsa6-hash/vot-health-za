import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import places from "../../functions/data/places.json" with { type: "json" };
import { createRun } from "../../functions/shared/sim/engine.mjs";
import { computeSignals } from "../../functions/shared/signals.mjs";
import { dayEnd, dayOfDate } from "../../functions/shared/sastDay.mjs";
import { createReplay } from "../../src/lib/replay.js";
import { findSavedRanking } from "../../src/lib/savedRankings.js";
import { evidenceText, rankingLabel, safeSummary } from "../../src/lib/rankingText.js";
import { createRankingGate } from "../../src/lib/liveRanking.js";
import { CAPPED, FAILED, NO_SAVED } from "../../src/config/rankingCopy.js";
import { loadComponent } from "../helpers/render-component.mjs";

const entries = JSON.parse(readFileSync(new URL("../../src/sim/saved-rankings/seed-1.json", import.meta.url), "utf8"));
const replay = createReplay({ createRun, computeSignals, dayEnd, dayOfDate, town: places });
const signal = replay.resultFor("seeded", 17).signals.find((signal) => signal.level === "alert");
const saved = findSavedRanking(entries, replay, 17, signal);
const { default: RankingPanel } = await loadComponent("../../src/components/RankingPanel.jsx");
const render = (props = {}) => renderToStaticMarkup(createElement(RankingPanel, { saved, ...props }));
const plain = (html) => html.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");

test("saved and live labels follow sentence copy without middle dots", () => {
  assert.equal(rankingLabel(saved.entry), "Saved ranking by Muse Spark 1.3. Ranked on 30 Oct 2026, from replay day 17.");
  const live = { ...saved, entry: { ...saved.entry, ms: 12345 } };
  assert.equal(rankingLabel(live.entry, true), "Ranked live by Muse Spark 1.3 just now, in 12.3 s.");
  assert.match(plain(render({ live })), /Ranked live by Muse Spark 1.3 just now, in 12\.3 s\./);
  assert.match(plain(render({ live, onShowSaved: () => {} })), /Show saved ranking/);
});

test("panel states keep saved evidence, expose failures and disable live calls while busy", () => {
  for (const [state, message] of [["failed", FAILED], ["capped", CAPPED]]) {
    const output = plain(render({ state }));
    assert.ok(output.includes(message));
    assert.ok(output.includes("Saved ranking by"));
    assert.match(output, /Supports/);
  }
  assert.ok(plain(render({ saved: null })).includes(NO_SAVED));
  const loading = render({ state: "loading", onRank: () => {} });
  assert.match(loading, /role="status"/);
  assert.match(loading, /waveform is-moving/);
  assert.match(loading, /disabled=""/);
  assert.match(render({ busy: true, onRank: () => {} }), /disabled=""/);
  assert.doesNotMatch(render(), /Rank live with Muse Spark/);
});

test("clues-only tag is code-derived and empty summaries have no heading", () => {
  const source = { ...saved.entry.ranking.sources[0], reason: "", fromClinicianCluesOnly: true };
  const snapshot = { ...saved, entry: { ...saved.entry, ranking: { sources: [source] } } };
  const output = plain(render({ saved: snapshot }));
  assert.match(output, /From clinicians' clues only/);
  assert.doesNotMatch(output, /Muse Spark's summary/);
  assert.match(output, /Medium confidence/);
  assert.equal(safeSummary("A chance of 20%"), "");
  for (const reason of ["The probability is high", "The odds are low", "About twenty percent", "1 in 100"]) assert.equal(safeSummary(reason), "");
});

test("all seven fact templates render with backing counts and expandable card evidence", () => {
  const source = saved.signal.sources.find((source) => source.layer === "water:A");
  const record = saved.cards.find(({ id }) => source.supporting.find((fact) => fact.kind === "exposureMentioned").cardIds.includes(id));
  const cards = [record];
  const kinds = ["insideAreaRaised", "insideAreaNormal", "insideAreaNotRaised", "outsideAreaRaised", "outsideNearUsual", "exposureMentioned", "nameMentioned"];
  const facts = kinds.map((kind) => ({ sourceId: "water:A", kind, area: "Leeba View", cardIds: [record.id] }));
  const ownSignal = { ...saved.signal, sources: saved.signal.sources.map((comparison) => comparison === source ? { ...source, supporting: [{ kind: "exposureMentioned", type: "water", cardIds: [record.id] }] } : comparison) };
  const snapshot = { ...saved, signal: ownSignal, cards, entry: { ...saved.entry, ranking: { sources: [{ ...saved.entry.ranking.sources[0], supporting: facts, contradicting: [], reason: "" }] } } };
  const output = plain(render({ saved: snapshot }));
  const name = source.name;
  const expected = [
    `Leeba View is linked to ${name} and has more cases than usual. Based on 1 card.`,
    `Leeba View is also linked to ${name}, but its cases have not risen like the others. Based on 1 card.`,
    `Leeba View is linked to ${name}, and its cases are not clearly raised. Based on 1 card.`,
    `Leeba View is not linked to ${name}, and has more cases than usual. Based on 1 card.`,
    `Areas not linked to ${name} have about the usual number of cases. Based on 1 card.`,
    `1 card from areas linked to ${name} mentions water.`,
    `${name} is mentioned by name on 1 card.`,
  ];
  assert.deepEqual(facts.map((fact) => evidenceText(fact, ownSignal, cards).text), expected);
  for (const text of expected) assert.ok(output.includes(text));
  assert.match(output, /not clearly raised/);
  assert.doesNotMatch(output, /normal/i);
  assert.match(render({ saved: snapshot }), /<details><summary>/);
  assert.match(render({ saved: snapshot }), /class="voice-quote"/);
  assert.match(output, /Onset:/);
  const empty = evidenceText({ ...facts[0], cardIds: [] }, ownSignal, cards);
  assert.match(empty.text, /Based on 0 cards/);
  assert.equal(empty.cards.length, 0);
});

test("all six real saved panels render evidence and no probability or reporter fields", () => {
  for (const entry of entries) {
    const signal = replay.resultFor("seeded", entry.day).signals.find((signal) => signal.level === "alert");
    const snapshot = findSavedRanking(entries, replay, entry.day, signal);
    const output = plain(render({ saved: snapshot }));
    assert.doesNotMatch(output, /chance|probab|\b1 in\b|%|reporter|sim-2027|·/i);
    assert.match(output, /Supports/);
    assert.match(output, /Against/);
    assert.match(output, /Possible checks for environmental health/);
    assert.doesNotMatch(output, /Card unavailable/);
  }
});

test("latest saved ranking table covers every qualifying day and area without future evidence", () => {
  const expectedDays = { 17: 17, 18: 18, 19: 18, 20: 18, 21: 18, 22: 22, 23: 23, 24: 23, 25: 25, 26: 25, 27: 27 };
  const expectedAreas = {
    17: ["Thaga Park", "Leeba View", "Nonyana Flats"],
    18: ["Thaga Park", "Leeba View", "Sefate Extension", "Nonyana Flats"],
    19: ["Thaga Park", "Leeba View", "Nonyana Flats"], 20: ["Thaga Park", "Leeba View", "Nonyana Flats"], 21: ["Thaga Park", "Leeba View", "Nonyana Flats"],
    22: ["Leeba View", "Nonyana Flats", "Kgwedi Heights"],
    23: ["Thaga Park", "Leeba View", "Nonyana Flats", "Kgwedi Heights"],
    24: ["Thaga Park", "Leeba View", "Nonyana Flats"],
    25: ["Thaga Park", "Leeba View", "Nonyana Flats", "Mmutla Ridge"], 26: ["Thaga Park", "Leeba View", "Nonyana Flats", "Mmutla Ridge"],
    27: ["Thaga Park", "Leeba View", "Sefate Extension", "Nonyana Flats", "Mmutla Ridge"],
  };
  for (let day = 0; day <= 28; day++) {
    const result = replay.resultFor("seeded", day);
    const eligible = result.signals.filter((signal) => ["signal", "alert"].includes(signal.level));
    if (day >= 17) assert.deepEqual(eligible.flatMap((signal) => signal.areas), expectedAreas[day] || []);
    for (const signal of result.signals) {
      const snapshot = findSavedRanking(entries, replay, day, signal);
      if (!["signal", "alert"].includes(signal.level)) { assert.equal(snapshot, null); continue; }
      assert.equal(snapshot.entry.day, expectedDays[day]);
      assert.deepEqual(snapshot.cards, replay.cardsUpTo("seeded", snapshot.entry.day));
      assert.equal(findSavedRanking([], replay, day, signal), null);
      assert.equal(findSavedRanking(entries, replay, day, signal, "quiet"), null);
    }
    assert.equal(replay.resultFor("quiet", day).signals.filter((signal) => ["signal", "alert"].includes(signal.level)).length, 0);
  }
});

test("live gate rejects a double tap and stays closed across context changes until completion", async () => {
  const gate = createRankingGate();
  let finish;
  let calls = 0;
  const first = gate.run(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  assert.equal(gate.pending, true);
  assert.equal(await gate.run(() => { calls++; }), null);
  finish("done");
  assert.equal(await first, "done");
  assert.equal(gate.pending, false);
  await assert.rejects(gate.run(async () => { throw new Error("fake provider failure"); }));
  assert.equal(gate.pending, false);
  assert.equal(calls, 1);
});

test("opening the first ranking never computes a future signal snapshot", () => {
  const guarded = { ...replay, resultFor(runId, day) {
    assert.ok(day <= 17, "future statistics must not be used for an earlier saved lookup");
    return replay.resultFor(runId, day);
  } };
  assert.equal(findSavedRanking(entries, guarded, 17, signal).entry.day, 17);
});
