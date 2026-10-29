const test = require("node:test");
const assert = require("node:assert/strict");
const places = require("../data/places.json");

// Functions code is CommonJS and the shared statistics are ES modules, so a
// function will load them with import() inside its handler (Node 22). No
// function does yet; this checks that it can.
test("CommonJS code can load and run the shared statistics", async () => {
  const {computeSignals} = await import("../shared/signals.mjs");
  const {dayEnd, dayOfDate} = await import("../shared/sastDay.mjs");
  const asOf = dayEnd(dayOfDate("2027-02-01"));
  const result = computeSignals({cards: [], asOf, town: places});
  assert.equal(result.status, "notEnoughHistory");
  assert.deepEqual(result.signals, []);
  assert.equal(Object.keys(result.areaLevels).length, places.areas.length);
});
