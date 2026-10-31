import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "../../functions/shared/sim/engine.mjs";
import { computeSignals } from "../../functions/shared/signals.mjs";
import { dayEnd, dayOfDate } from "../../functions/shared/sastDay.mjs";
import { dailySignalChart, chartWindow } from "../../functions/shared/signalDetail.mjs";
import { nearbySignals } from "../../src/lib/replayToday.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadComponent } from "../helpers/render-component.mjs";
import { readFileSync } from "node:fs";
import town from "../../functions/data/places.json" with { type: "json" };

test("every retained seven-day signal count matches the chart for tuning runs", (t) => {
  let comparisons = 0;
  for (let seed = 1; seed <= 10; seed++) for (const scenario of ["water", "none"]) {
    const run = createRun({ seed, scenario });
    for (let day = 0; day <= run.lastDay; day++) {
      const cards = run.cardsUpTo(day), asOf = dayEnd(dayOfDate(run.startDate) + day);
      const result = computeSignals({ cards, asOf, town });
      for (const area of town.areas) {
        const expected = result.signals.filter((signal) => signal.areas.some((name) => [area.name, ...area.neighbours].includes(name)));
        assert.deepEqual(nearbySignals(result, town, area.name), expected);
      }
      for (const signal of result.signals.filter((item) => item.timeWindow.days === 7)) {
        const chart = dailySignalChart({ cards, asOf, signal, town });
        assert.deepEqual(chartWindow(chart, signal.timeWindow), { observed: signal.observed, expected: signal.expected }, `seed ${seed}, ${scenario}, day ${day}`);
        comparisons++;
        for (const own of signal.byArea) {
          const areaChart = dailySignalChart({ cards, asOf, signal: { symptomGroup: signal.symptomGroup, areas: [own.area] }, town });
          assert.deepEqual(chartWindow(areaChart, signal.timeWindow), { observed: own.observed, expected: own.expected }, `seed ${seed}, ${scenario}, day ${day}, ${own.area}`);
          comparisons++;
        }
      }
    }
  }
  assert.ok(comparisons > 0);
  t.diagnostic(`${comparisons} retained seven-day signal comparisons matched`);
});

test("both replay entry points pass the same signal-opening handler", () => {
  const code = readFileSync(new URL("../../src/screens/DemoScreen.jsx", import.meta.url), "utf8");
  assert.match(code, /<ReplayToday[^>]*onOpenSignal=\{openSignal\}/);
  assert.match(code, /<AreaSheet[^>]*onOpenSignal=\{openSignal\}/);
  assert.match(code, /setPlaying\(false\);\s*setDetailArea\(/);
});

test("Today shows quiet wording only for a checked day without nearby signals", async () => {
  const { default: ReplayToday } = await loadComponent("../../src/components/ReplayToday.jsx");
  const run = createRun({ seed: 1, scenario: "water" });
  for (const day of [8, 19]) {
    const cards = run.cardsUpTo(day), asOf = dayEnd(dayOfDate(run.startDate) + day);
    const result = computeSignals({ cards, asOf, town });
    const replay = { chartFor: (_run, _day, signal) => dailySignalChart({ cards, asOf, signal, town }), chartWindow };
    const html = renderToStaticMarkup(createElement(ReplayToday, { replay, runId: "seeded", day, result, town, area: town.areas[0].name, onArea() {}, onOpenSignal() {} }));
    assert.equal(html.includes("Nothing unusual near"), result.status === "ok" && nearbySignals(result, town, town.areas[0].name).length === 0);
  }
});

test("list checked quiet days for the public replay", (t) => {
  for (const scenario of ["water", "none"]) {
    const run = createRun({ seed: 1, scenario });
    for (const area of town.areas) {
      const days = [];
      for (let day = 0; day <= run.lastDay; day++) {
        const result = computeSignals({ cards: run.cardsUpTo(day), asOf: dayEnd(dayOfDate(run.startDate) + day), town });
        if (result.status === "ok" && nearbySignals(result, town, area.name).length === 0) days.push(day);
      }
      t.diagnostic(`${scenario} ${area.name}: ${days.join(", ")}`);
    }
  }
});
