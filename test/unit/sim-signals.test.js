import assert from "node:assert/strict";
import { test } from "node:test";
import { HELD_OUT_SEEDS, scoreRun, TUNING_SEEDS } from "../../src/sim/scorecard.js";

// The statistics on the simulation, through the scorecard. Only results the
// first look supports are tests; the rest (false Watches, the first Watch
// day, which source leads) is reported by scripts/scorecard.mjs. Seeds 1 to
// 10 only: they're the tuning set, and 11 to 20 are held out for Day 8.
const scores = new Map();
function scoreFor(seed, scenario) {
  const key = `${seed}-${scenario}`;
  if (!scores.has(key)) scores.set(key, scoreRun({ seed, scenario }));
  return scores.get(key);
}
const loud = (score) => score.falseAlarms.filter((entry) => entry.level !== "watch");

test('"none", seeds 1 to 10: no Signal and no Alert on any day', () => {
  for (const seed of TUNING_SEEDS) {
    const score = scoreFor(seed, "none");
    assert.equal(score.cluster, null);
    assert.equal(score.days, 29);
    assert.deepEqual(loud(score), [], `seed ${seed}`);
    assert.deepEqual(score.alertPaths, { source: 0, severity: 0, both: 0 }, `seed ${seed}`);
  }
});

test('"water", seeds 1 to 10: works A\'s diarrhoea or vomiting reaches Signal by day 20', () => {
  for (const seed of TUNING_SEEDS) {
    const { cluster } = scoreFor(seed, "water");
    assert.equal(cluster.symptomGroup, "diarrhoea_vomiting");
    assert.ok(cluster.first.signal, `seed ${seed} never reached Signal`);
    assert.ok(cluster.first.signal.day <= 20, `seed ${seed}: day ${cluster.first.signal.day}`);
    assert.ok(cluster.first.signal.day >= cluster.startDay, `seed ${seed}`);
  }
});

test('"water", seeds 1 to 10: no Signal or Alert other than the seeded cluster', () => {
  for (const seed of TUNING_SEEDS) assert.deepEqual(loud(scoreFor(seed, "water")), [], `seed ${seed}`);
});

test("the held-out seeds aren't scored before the thresholds are frozen", () => {
  assert.deepEqual(HELD_OUT_SEEDS, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  for (const seed of HELD_OUT_SEEDS) assert.throws(() => scoreRun({ seed, scenario: "water" }), /held out/);
});
