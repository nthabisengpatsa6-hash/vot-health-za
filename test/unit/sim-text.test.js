import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { createRun } from "../../src/sim/engine.js";
import { EVENT_WORDS, EXPOSURE_WORDS, SOMETHING_UNUSUAL, SUPPLIES_NOTES, SYMPTOM_WORDS } from "../../src/sim/phrases.js";

// Simulated text is made up and must stay that way: no personal names (hard
// rule 1), never "outbreak" (hard rule 3), no diagnosis (hard rule 6), no
// blame or politics (hard rule 9), and no line from the scripts read for the
// test recordings.
const places = JSON.parse(readFileSync(new URL("../../functions/data/places.json", import.meta.url), "utf8"));
const NAMES = [places.town, ...places.waterWorks, ...places.areas, ...places.facilities, ...places.schools, ...places.shops]
  .map((place) => (typeof place === "string" ? place : place.name))
  .sort((a, b) => b.length - a.length);
// Capitalised words allowed besides the town file's names. None so far.
const ALLOWED_CAPITALISED = [];
const DENIED = [
  "outbreak",
  // Disease names: simulated cards never carry a diagnosis.
  "cholera", "typhoid", "rotavirus", "shigella", "norovirus", "hepatitis", "e. coli", "measles",
  // Blame or politics.
  "municipality", "council", "councillor", "mayor", "minister", "government",
];

const school = places.schools[0].name;
const PHRASES = [
  ...Object.values(SYMPTOM_WORDS).flat(),
  ...SOMETHING_UNUSUAL.flatMap(({ words, description }) => [words, description]),
  ...Object.values(EXPOSURE_WORDS).flat(),
  ...EVENT_WORDS.map((words) => words.replace("{school}", school)),
  ...SUPPLIES_NOTES,
];

function generatedTexts() {
  const texts = new Set();
  for (let seed = 1; seed <= 10; seed += 1) {
    for (const scenario of ["water", "none"]) {
      const run = createRun({ seed, scenario });
      for (const { card } of run.cardsUpTo(run.lastDay)) {
        for (const text of [card.symptomsInWords, card.unusualDescription, card.exposure.words, card.observations.suppliesNote]) if (text) texts.add(text);
      }
    }
  }
  return [...texts];
}
const TEXTS = [...new Set([...PHRASES, ...generatedTexts()])];

// Lower case, with every run of non-letters as one space: "E. coli" and
// "e.coli" both become "e coli".
const normalise = (text) => ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;

test("every capital letter in simulated text belongs to a name from the town file", () => {
  assert.ok(TEXTS.length > PHRASES.length / 2);
  for (const text of TEXTS) {
    let rest = text;
    for (const name of [...NAMES, ...ALLOWED_CAPITALISED]) rest = rest.split(name).join(" ");
    assert.doesNotMatch(rest, /\p{Lu}/u, `"${text}"`);
  }
});

test("no simulated text says outbreak, names a disease, or names anyone to blame", () => {
  for (const text of [...TEXTS, ...NAMES, ...places.shops.map((shop) => shop.description)]) {
    for (const word of DENIED) assert.ok(!normalise(text).includes(normalise(word).trim()), `"${text}" contains "${word}"`);
  }
});

test("no phrase is a line from the scripts read for the test recordings", () => {
  const fixtures = new URL("../../test-fixtures/", import.meta.url);
  const practice = new URL("practice-results/", fixtures);
  const files = [new URL("ideal-transcripts.json", fixtures), new URL("expected-cards.json", fixtures), ...readdirSync(practice).map((name) => new URL(name, practice))];
  const scripts = normalise(files.map((file) => readFileSync(file, "utf8")).join(" "));
  for (const phrase of PHRASES) assert.ok(!scripts.includes(normalise(phrase)), `"${phrase}" is in test-fixtures/`);
});
