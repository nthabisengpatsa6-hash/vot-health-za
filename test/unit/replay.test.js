import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import places from "../../functions/data/places.json" with { type: "json" };
import { computeSignals } from "../../functions/shared/signals.mjs";
import { dayEnd, dayOfDate } from "../../functions/shared/sastDay.mjs";
import { LEVELS } from "../../src/config/levels.js";
import { PRODUCT_NAME } from "../../src/config/product.js";
import { createReplay, LAST_DAY, REPLAY_DAYS, REPLAY_SEED, RUNS } from "../../src/lib/replay.js";
import * as words from "../../src/lib/replayText.js";
import { areaLayers, GRID, MAP_AREAS } from "../../src/lib/townMap.js";
import { createRun } from "../../src/sim/engine.js";
import { HELD_OUT_SEEDS } from "../../src/sim/scorecard.js";

// The public replay at /demo and the Near me map: what they show and what
// they say. The screens themselves are checked in a browser (docs/HISTORY.md,
// Task 14); everything they show comes from the modules tested here.
const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const codeOnly = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const seedsAsked = [];
const replay = createReplay({ createRun: (options) => (seedsAsked.push(options.seed), createRun(options)), computeSignals, dayEnd, dayOfDate, town: places });
const DAYS = Array.from({ length: REPLAY_DAYS }, (_, day) => day);
const AREAS = places.areas.map((area) => area.name);
const dayZero = dayOfDate("2027-02-01");

test("the replay is seed 1 on both runs, days 0 to 28, with no way to a held-out seed", () => {
  assert.equal(REPLAY_SEED, 1);
  assert.ok(!HELD_OUT_SEEDS.includes(REPLAY_SEED));
  assert.deepEqual(RUNS.map((run) => [run.id, run.scenario]), [["seeded", "water"], ["quiet", "none"]]);
  assert.equal(LAST_DAY, 28);
  replay.resultFor("seeded", 0);
  replay.resultFor("quiet", 0);
  assert.deepEqual(seedsAsked, [1, 1]);
});

test("on day 17 the seeded run's map is computeSignals' own, and the quiet run has no level", () => {
  const run = createRun({ seed: 1, scenario: "water" });
  const direct = computeSignals({ cards: run.cardsUpTo(17), asOf: dayEnd(dayZero + 17), town: places });
  assert.deepEqual(replay.resultFor("seeded", 17).areaLevels, direct.areaLevels);
  assert.deepEqual(Object.entries(direct.areaLevels).filter(([, level]) => level).map(([area, level]) => `${area} ${level}`), ["Thaga Park alert", "Leeba View alert", "Nonyana Flats alert"]);
  assert.deepEqual(Object.values(replay.resultFor("quiet", 17).areaLevels), AREAS.map(() => null));
});

test("switching runs keeps the day and swaps the data; the runs share every card until day 13", () => {
  assert.equal(replay.dateOf(17), "2027-02-18");
  assert.equal(replay.cardsOn("seeded", 17).length, 20);
  assert.equal(replay.cardsOn("quiet", 17).length, 11);
  for (const day of DAYS.slice(0, 13)) {
    assert.deepEqual(replay.cardsOn("quiet", day).map(({ id }) => id), replay.cardsOn("seeded", day).map(({ id }) => id), `day ${day}`);
  }
});

test("a day's cards are that day's only, newest first", () => {
  const cards = replay.cardsOn("seeded", 17);
  for (const { card } of cards) assert.ok(card.createdAt >= dayEnd(dayZero + 16) && card.createdAt < dayEnd(dayZero + 17));
  for (let i = 1; i < cards.length; i += 1) assert.ok(cards[i - 1].card.createdAt >= cards[i].card.createdAt);
});

test("an area's level is dated from the first day of its unbroken stretch", () => {
  assert.equal(replay.levelSince("seeded", 16, "Leeba View"), 15);
  assert.equal(replay.levelSince("seeded", 18, "Leeba View"), 17);
  assert.equal(words.sinceLine(17, replay.dateOf(17)), "Since day 17, Thu 18 Feb 2027");
});

test("the sheet says counts against usual, places of care and cards, and why the area has its level", () => {
  const [signal] = replay.resultFor("seeded", 17).signals;
  assert.equal(words.placeLine(signal), "Thaga Park, Leeba View and Nonyana Flats together: 52 cases in 3 days; usually about 7.");
  assert.equal(words.areaLine(signal, "Leeba View"), "Leeba View: 21 cases in 3 days; usually about 2.");
  assert.equal(words.cardsLine(signal), "Reported on 23 cards from 4 places of care.");
  assert.equal(words.whyLine(signal), "Alert: reported from 4 places of care, clearly more than twice the usual number, and a possible common source.");
  assert.equal(words.nothingFoundLine("Kgwedi Heights", "2027-02-18"), "Nothing unusual was found in Kgwedi Heights on Thu 18 Feb 2027.");
  assert.equal(words.usualText(0.4), "usually fewer than 1");
  assert.equal(words.usualText(0.5), "usually about 1");
});

test("why a level, for every path to it, never naming a source", () => {
  const signal = (level, independentReporters, candidateSource, severityFlags) => ({ level, independentReporters, checks: { candidateSource, severityFlags } });
  assert.equal(words.whyLine(signal("watch", 1, false, false)), "Watch: clearly more than usual.");
  assert.equal(words.whyLine(signal("signal", 2, false, false)), "Signal: reported from 2 places of care, and clearly more than twice the usual number.");
  assert.equal(words.whyLine(signal("alert", 3, false, true)), "Alert: reported from 3 places of care, clearly more than twice the usual number, and 2 or more cards say patients are sicker than usual or not getting better.");
  assert.equal(words.whyLine(signal("alert", 4, true, true)), "Alert: reported from 4 places of care, clearly more than twice the usual number, a possible common source, and 2 or more cards say patients are sicker than usual or not getting better.");
  // A Signal's checks alone never make it an Alert sentence.
  assert.equal(words.whyLine(signal("signal", 2, true, true)), "Signal: reported from 2 places of care, and clearly more than twice the usual number.");
});

test("screen readers hear which areas are at which level", () => {
  assert.equal(words.levelsAnnouncement(17, replay.resultFor("seeded", 17).areaLevels), "Day 17: Thaga Park, Leeba View and Nonyana Flats at Alert.");
  assert.equal(words.levelsAnnouncement(9, { "Thaga Park": "watch", "Leeba View": "alert", "Mmutla Ridge": null }), "Day 9: Leeba View at Alert; Thaga Park at Watch.");
  assert.equal(words.levelsAnnouncement(3, { "Thaga Park": null }), "Day 3: no area has a level.");
});

test("dates and times come from the date itself and SAST, never the computer's time zone", () => {
  assert.equal(words.dateLabel("2027-02-01"), "Mon 1 Feb 2027");
  assert.equal(words.timeLabel(Date.UTC(2027, 1, 18, 14, 27)), "16:27");
  assert.equal(words.cardMeta({ caseCount: 5, ageGroup: "under_5", createdAt: Date.UTC(2027, 1, 18, 14, 27) }), "5 cases, under 5, 16:27");
  assert.equal(words.cardMeta({ caseCount: 1, ageGroup: "adult", createdAt: Date.UTC(2027, 1, 18, 7, 5) }), "1 case, adult, 09:05");
});

test("every level is drawn with its word and its print or outline, and no level with neither", () => {
  for (const level of Object.keys(LEVELS)) {
    const layers = areaLayers(level);
    assert.equal(layers.word, LEVELS[level].label);
    assert.ok(layers.print !== null || layers.watchOutline, `${level} has a pattern or shape`);
  }
  assert.deepEqual(areaLayers("watch"), { fill: "quiet", print: null, watchOutline: true, word: "Watch" });
  assert.deepEqual(areaLayers("signal"), { fill: "signal", print: "sparse", watchOutline: false, word: "Signal" });
  assert.deepEqual(areaLayers("alert"), { fill: "alert", print: "dense", watchOutline: false, word: "Alert" });
  assert.deepEqual(areaLayers(null), { fill: "quiet", print: null, watchOutline: false, word: null });
});

// Ray casting: is the point inside the polygon?
function inside([x, y], shape) {
  let crossings = 0;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i, i += 1) {
    const [xi, yi] = shape[i];
    const [xj, yj] = shape[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) crossings += 1;
  }
  return crossings % 2 === 1;
}

test("every area is drawn, with its name placed inside its own shape on the grid", () => {
  assert.deepEqual(MAP_AREAS.map((area) => area.name), AREAS);
  for (const area of MAP_AREAS) {
    assert.ok(area.label, `${area.name} has a label point`);
    assert.ok(inside(area.label.at, area.shape), `${area.name}'s label point is inside it`);
    for (const [x, y] of area.shape) assert.ok(x >= 0 && x <= GRID.width && y >= 0 && y <= GRID.height, `${area.name} is on the grid`);
    assert.match(area.path, /^M[\d. L]+Z$/);
  }
});

// Lemoha's own words on /demo and Near me (decision T2, as narrowed on
// 29 Oct): nothing that names or hints at what was planted, and never a
// chance. The clinicians' words on the cards are theirs, covered by
// test/unit/sim-text.test.js.
const HINTS = /\b(water|works|taps?|chlorin\w*|outbreaks?|metsi|pompo)\b/i;
const CHANCES = [/chance/i, /probab/i, /odds/i, /%/, /\b\d+(?:\.\d+)?e[-+]?\d+\b/i, /\b1 in [\d,]+/i];

function ourWords() {
  const all = [words.BANNER, words.RUN_NOTE, words.FOOTER, words.DEMO_LINK, words.intro({ product: PRODUCT_NAME, town: places.town, days: REPLAY_DAYS }), ...words.nearMeNote(PRODUCT_NAME)];
  all.push(...RUNS.map((run) => run.label), ...Object.values(LEVELS).flatMap(({ label, meaning }) => [label, meaning]));
  for (const area of AREAS) all.push(words.nearMeMap({ town: places.town, area }));
  for (const run of RUNS) {
    for (const day of DAYS) {
      const result = replay.resultFor(run.id, day);
      const cards = replay.cardsOn(run.id, day);
      all.push(words.dayHeading(day, cards), words.levelsAnnouncement(day, result.areaLevels), words.dateLabel(replay.dateOf(day)));
      for (const { card } of cards) all.push(words.groupLabel(card.symptomGroup), words.cardMeta(card));
      for (const area of AREAS) {
        const since = result.areaLevels[area] ? replay.levelSince(run.id, day, area) : null;
        all.push(since === null ? words.nothingFoundLine(area, replay.dateOf(day)) : words.sinceLine(since, replay.dateOf(since)));
      }
      for (const signal of result.signals) {
        all.push(words.groupLabel(signal.symptomGroup), words.placeLine(signal), words.cardsLine(signal), words.whyLine(signal), ...signal.areas.map((area) => words.areaLine(signal, area)));
      }
    }
  }
  return all;
}

test("Lemoha's own words on the replay never hint at what was planted, and never give a chance", () => {
  const all = ourWords();
  assert.ok(all.length > 1000, `${all.length} pieces of text`);
  for (const text of all) {
    assert.doesNotMatch(text, HINTS, text);
    for (const pattern of CHANCES) assert.doesNotMatch(text, pattern, text);
  }
});

test("the screens' own code and text never hint at what was planted", () => {
  for (const file of ["src/screens/DemoScreen.jsx", "src/screens/NearMeScreen.jsx", "src/components/AreaSheet.jsx", "src/components/TownMap.jsx", "src/components/LevelBadge.jsx", "src/Root.jsx", "src/lib/replayText.js", "src/lib/townMap.js", "src/config/levels.js"]) {
    assert.doesNotMatch(codeOnly(read(file)), HINTS, file);
  }
  for (const file of ["src/screens/DemoScreen.jsx", "src/components/AreaSheet.jsx", "src/lib/replayText.js", "src/config/levels.js"]) {
    for (const pattern of [/chance/i, /probab/i]) assert.doesNotMatch(codeOnly(read(file)), pattern, file);
  }
});

test("Near me never says a check ran or that nothing was found", () => {
  const CLAIMS = /no signals?|nothing unusual|(was|were) found|checked|all clear|no alerts?/i;
  for (const text of [...words.nearMeNote(PRODUCT_NAME), words.nearMeMap({ town: places.town, area: "Leeba View" })]) assert.doesNotMatch(text, CLAIMS, text);
  assert.doesNotMatch(codeOnly(read("src/screens/NearMeScreen.jsx")), CLAIMS);
  assert.match(words.nearMeNote(PRODUCT_NAME)[0], /doesn't check real reports for signals yet/);
});

test("the map's level changes move only when motion is allowed", () => {
  const css = read("src/index.css");
  const start = css.indexOf("@media (prefers-reduced-motion: no-preference) {");
  assert.ok(start > 0);
  let depth = 0;
  let end = start;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  const allowed = css.slice(start, end);
  const elsewhere = css.slice(0, start) + css.slice(end);
  assert.match(allowed, /\.map-area \{\s*transition: fill var\(--motion-level\);/);
  assert.match(allowed, /\.map-print,\s*\.map-watch \{\s*transition: opacity var\(--motion-level\);/);
  for (const [, selectors, body] of elsewhere.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/\.map-|\.sheet|\.replay-|\.town-map/.test(selectors)) assert.doesNotMatch(body, /transition|animation/, selectors.trim());
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*transition: none !important;/);
});
