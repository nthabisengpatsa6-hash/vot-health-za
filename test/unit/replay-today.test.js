import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "../../functions/shared/sim/engine.mjs";
import { computeSignals } from "../../functions/shared/signals.mjs";
import { dayEnd, dayOfDate } from "../../functions/shared/sastDay.mjs";
import { dailySignalChart, chartWindow } from "../../functions/shared/signalDetail.mjs";
import { nearbySignals, weeklyCounts } from "../../src/lib/replayToday.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadComponent } from "../helpers/render-component.mjs";
import town from "../../functions/data/places.json" with { type: "json" };

test("every retained seven-day signal count matches the chart for tuning runs", (t) => {
  let signalComparisons = 0, areaComparisons = 0, todayComparisons = 0;
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
        signalComparisons++;
        const replay = { chartWindow, chartFor: (_run, _day, selection) => dailySignalChart({ cards, asOf, signal: selection, town }) };
        for (const own of signal.byArea) {
          const areaChart = dailySignalChart({ cards, asOf, signal: { symptomGroup: signal.symptomGroup, areas: [own.area] }, town });
          assert.deepEqual(chartWindow(areaChart, signal.timeWindow), { observed: own.observed, expected: own.expected }, `seed ${seed}, ${scenario}, day ${day}, ${own.area}`);
          areaComparisons++;
          const today = weeklyCounts(replay, scenario, day, own.area).find((entry) => entry.value === signal.symptomGroup);
          assert.ok(today, `Today includes ${signal.symptomGroup} in ${own.area}`);
          assert.deepEqual({ observed: today.observed, expected: today.expected }, { observed: own.observed, expected: own.expected }, `Today helper: seed ${seed}, ${scenario}, day ${day}, ${own.area}`);
          todayComparisons++;
        }
      }
    }
  }
  assert.equal(signalComparisons, 71);
  assert.equal(areaComparisons, 229);
  assert.equal(todayComparisons, 229);
  t.diagnostic(`Pinned: ${signalComparisons} signal, ${areaComparisons} chart per-area, ${todayComparisons} Today helper comparisons matched the engine`);
});

test("Today shows quiet wording only for a checked day without nearby signals", async () => {
  const { default: ReplayToday } = await loadComponent("../../src/components/ReplayToday.jsx");
  const run = createRun({ seed: 1, scenario: "water" });
  for (const day of [8, 19]) {
    const cards = run.cardsUpTo(day), asOf = dayEnd(dayOfDate(run.startDate) + day);
    const result = computeSignals({ cards, asOf, town });
    const replay = { chartFor: (_run, _day, signal) => dailySignalChart({ cards, asOf, signal, town }), chartWindow };
    const html = renderToStaticMarkup(createElement(ReplayToday, { replay, runId: "seeded", day, result, town, area: town.areas[0].name, onArea() {}, onOpenSignal() {} }));
    assert.ok(html.includes("<h2>This week in Thaga Park</h2>"));
    assert.ok(html.includes("<p>Nearby means Thaga Park and the areas next to it.</p>"));
    assert.equal(html.includes("<p>Nothing unusual near Thaga Park this week.</p>"), result.status === "ok" && nearbySignals(result, town, town.areas[0].name).length === 0);
  }
});

test("an engine result with insufficient history has no usual value or quiet claim", async () => {
  const { default: ReplayToday } = await loadComponent("../../src/components/ReplayToday.jsx");
  const run = createRun({ seed: 1, scenario: "water" }), day = 8;
  const asOf = dayEnd(dayOfDate(run.startDate) + day);
  const cards = run.cardsUpTo(day).filter(({card}) => card.createdAt >= asOf - 7 * 86400000);
  const result = computeSignals({ cards, asOf, town });
  assert.equal(result.status, "notEnoughHistory");
  const replay = { chartWindow, chartFor: (_run, _day, signal) => dailySignalChart({ cards, asOf, signal, town }) };
  const html = renderToStaticMarkup(createElement(ReplayToday, { replay, runId: "seeded", day, result, town, area: "Thaga Park", onArea() {}, onOpenSignal() {} }));
  assert.ok(html.includes("<p>Not enough history.</p>"));
  assert.doesNotMatch(html, /usually|Nothing unusual near|NaN|Infinity/);
});

test("the seeded video shots are pinned for every area on day 8 and two areas on day 16", async () => {
  const { default: ReplayToday } = await loadComponent("../../src/components/ReplayToday.jsx");
  const run = createRun({ seed: 1, scenario: "water" });
  for (const day of [8, 16]) {
    const cards = run.cardsUpTo(day), asOf = dayEnd(dayOfDate(run.startDate) + day);
    const result = computeSignals({ cards, asOf, town });
    assert.equal(result.status, "ok");
    const replay = { chartWindow, chartFor: (_run, _day, signal) => dailySignalChart({ cards, asOf, signal, town }) };
    for (const area of day === 8 ? town.areas.map((item) => item.name) : ["Thaga Park", "Lebone Gardens"]) {
      const html = renderToStaticMarkup(createElement(ReplayToday, { replay, runId: "seeded", day, result, town, area, onArea() {}, onOpenSignal() {} }));
      const quiet = day === 8 || area === "Lebone Gardens";
      assert.equal(html.includes(`<p>Nothing unusual near ${area} this week.</p>`), quiet);
      assert.equal(nearbySignals(result, town, area).length > 0, !quiet);
      if (!quiet) assert.ok(html.includes('class="area-row"'));
    }
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
