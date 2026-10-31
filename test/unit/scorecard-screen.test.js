import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveScorecard, renderedScorecard } from "../../scripts/scorecard-screen.mjs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadComponent } from "../helpers/render-component.mjs";

const original = JSON.parse(readFileSync(new URL("../../src/sim/held-out/scorecard-held-out-seeds-11-20.json", import.meta.url)));
test("the compact scorecard is rebuilt exactly from the held-out record", () => {
  assert.equal(readFileSync(new URL("../../src/sim/held-out/scorecard-screen.json", import.meta.url), "utf8"), renderedScorecard(original));
  const data = deriveScorecard(original);
  assert.equal(data.quietRunsWithWatch, 2);
  assert.equal(data.heldOut.falseSignals.quiet.watch, 4);
  assert.equal(data.highCount, 8);
  assert.equal(data.highWorks, 8);
  assert.equal(data.tuning.falseSignals.combined.watch, 20);
});

test("the scorecard renders the saved headline, comparisons and distinct day-19 definitions", async () => {
  const { Scorecard } = await loadComponent("../../src/screens/ScorecardScreen.jsx");
  const html = renderToStaticMarkup(createElement(Scorecard, { data: deriveScorecard(original) }));
  for (const text of ["median day 16.5", "in 7 of 10", "7 false Watch signal-days across 20 runs", "2 of 10 quiet runs", "8 of 19 held-out ranking events", "Tuning: works A was ever first by day 19", "Held-out: works A was first at the event in force on day 19"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /accuracy|%|outbreak detected/i);
});
