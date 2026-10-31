import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {computeSignals} from "../../functions/shared/signals.mjs";
import {dayEnd, dayOfDate} from "../../functions/shared/sastDay.mjs";
import {dailySignalChart, chartWindow} from "../../functions/shared/signalDetail.mjs";
import town from "../../functions/data/places.json" with {type:"json"};

test("every Signal and Alert in seeds 1–10 has chart totals exactly equal to the frozen engine", () => {
  let checked = 0;
  for (let seed = 1; seed <= 10; seed++) for (const scenario of ["water", "none"]) {
    const run = createRun({seed, scenario});
    for (let day = 0; day <= run.lastDay; day++) {
      const cards = run.cardsUpTo(day), asOf = dayEnd(dayOfDate(run.startDate) + day);
      for (const signal of computeSignals({cards, asOf, town}).signals.filter((s) => ["signal", "alert"].includes(s.level))) {
        const chart = dailySignalChart({cards, asOf, signal, town});
        assert.equal(chart.days.length, 14);
        assert.deepEqual(chartWindow(chart, signal.timeWindow), {observed:signal.observed, expected:signal.expected}, `seed ${seed}, ${scenario}, day ${day}`);
        assert.deepEqual(chart.days.filter((d) => d.date >= signal.timeWindow.from).map(({date, cards, cases}) => ({date, cards, cases})), signal.byDay);
        checked++;
      }
    }
  }
  assert.equal(checked, 125);
});

test("the historical Baseten scoring client stays byte-identical to dc38d22", () => {
  assert.deepEqual(readFileSync(new URL("../../scripts/lib/basetenScoring.mjs", import.meta.url)), execFileSync("git", ["show", "dc38d22:scripts/lib/basetenScoring.mjs"]));
});
