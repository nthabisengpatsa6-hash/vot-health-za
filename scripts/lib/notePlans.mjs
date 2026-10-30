import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import baseline from "../fixtures/extraction-baseline-f05ffb0.json" with {type:"json"};
import special from "../../test-fixtures/local-words.json" with {type:"json"};
import ideal from "../../test-fixtures/ideal-transcripts.json" with {type:"json"};
import {hashOf} from "./noteArtifacts.mjs";
const require = createRequire(import.meta.url);
const {SYSTEM_PROMPT, userMessage} = require("../../functions/lib/extractCard.js");
const {REPLY_SCHEMA} = require("../../functions/lib/cardSchema.js");
const {NOTE_KEYWORDS} = require("../../functions/lib/notePipeline.js");
const {extractionHash} = require("../../functions/lib/extractionHash.js");
export {baseline, special, ideal};
export const BASETEN_MODEL = "meta-models/muse-spark-open-1026";
export const PRICE_SOURCES = {
  checked:"2026-10-30", meta:"https://dev.meta.ai/docs/pricing-rate-limits",
  baseten:"https://www.baseten.co/pricing/", inputPerMillion:1.25, outputPerMillion:4.25, voicePerHour:0.18,
};
export function configurations({minimal12 = true, minimal13 = true} = {}) {
  const configs = [
    {name:"Baseline", prompt:baseline.prompt, keywords:baseline.keywords, audioModel:baseline.audioModel, audioEffort:"low", extractionHash:baseline.legacyHash},
    {name:"A", prompt:SYSTEM_PROMPT, keywords:NOTE_KEYWORDS, audioModel:"muse-spark-1.2", audioEffort:"low"},
    ...(minimal12 ? [{name:"A-min", prompt:SYSTEM_PROMPT, keywords:NOTE_KEYWORDS, audioModel:"muse-spark-1.2", audioEffort:"minimal"}] : []),
    {name:"B", prompt:SYSTEM_PROMPT, keywords:NOTE_KEYWORDS, audioModel:"muse-spark-1.3", audioEffort:minimal13 ? "minimal" : "low"},
  ];
  return configs.map((config) => ({...config,
    extractionHash:config.extractionHash || extractionHash(config), configurationHash:extractionHash(config)}));
}
export function textPlans() {
  const plans = [];
  for (const name of ["Baseline", "A"]) {
    const config = configurations().find((config) => config.name === name);
    for (const [id, text] of Object.entries(ideal)) plans.push({kind:"fixture", id, text, run:1, config});
    for (const fixture of special) for (let run = 1; run <= (name === "A" ? 3 : 1); run++) plans.push({kind:"fixture", id:fixture.id, text:fixture.text, run, config});
  }
  return plans;
}
export function basetenPlans() {
  return [...special.map((fixture) => ({id:fixture.id, text:fixture.text})),
    ...["n03", "n09", "n08", "n10", "n04"].map((id) => ({id, text:ideal[id]}))];
}
export function requireListened(local) {
  if (!local || typeof local.listenedAt !== "string" || !Number.isFinite(Date.parse(local.listenedAt))) throw new Error("Set listenedAt after listening to all ten recordings before starting paid scoring.");
  const allowed = new Set(["symptomGroup", "caseCount", "comparedWithUsual", "ageGroup", "area", "onset", "exposureTypes", "exposureKeyTerms", "observations", "acceptUnsure", "notifiableCondition"]);
  for (const [card, fields] of Object.entries(local.corrections || {})) {
    if (!/^n(?:0[1-8]|09[ab])$/.test(card) || !fields || typeof fields !== "object" || Object.keys(fields).some((field) => !allowed.has(field))) throw new Error("Invalid local correction shape.");
  }
}
export const readCorrections = (root) => JSON.parse(readFileSync(join(root, "test-audio", "expected-corrections.json"), "utf8"));
export const callIdentity = (value) => hashOf({version:1, ...value});
export function estimate({repeat = 3, seconds = 156.18, billedSeconds = 151, baseten = true} = {}) {
  const configs = configurations(), rows = [];
  const textInput = (config, text) => Math.ceil(Buffer.byteLength(config.prompt + JSON.stringify(REPLY_SCHEMA) + userMessage(text, text)) / 4) + 64;
  const avg = (config) => Object.values(ideal).reduce((sum, text) => sum + textInput(config, text), 0) / 10;
  const add = (part, provider, model, calls, input, output, voice = 0) => rows.push({part, provider, model, calls, inputTokens:Math.ceil(input), outputTokens:output,
    usd:(input * 1.25 + output * 4.25) / 1e6 + voice});
  add("recording voices", "meta", "muse-voice-transcribe-1.0", 20 * repeat, 0, 0, billedSeconds * 2 * repeat * 0.18 / 3600);
  for (const [model, effort] of [["muse-spark-1.2", "low"], ["muse-spark-1.2", "minimal"], ["muse-spark-1.3", "minimal"]]) {
    add(`recording audio ${effort}`, "meta", model, 10 * repeat, repeat * (seconds * 12.5 + 940), 10 * repeat * 4000);
  }
  for (const config of configs) add(`recording cards ${config.name}`, "meta", "muse-spark-1.3", 10 * repeat, 10 * repeat * avg(config), 10 * repeat * 8000);
  for (const name of ["Baseline", "A"]) {
    const plans = textPlans().filter((plan) => plan.config.name === name);
    add(`authored text ${name}`, "meta", "muse-spark-1.3", plans.length, plans.reduce((n, plan) => n + textInput(plan.config, plan.text), 0), plans.length * 8000);
  }
  add("keyword preflight", "meta", "muse-voice-transcribe-1.0", 1, 0, 0, 0.18 / 3600);
  add("effort preflight 1.2 minimal", "meta", "muse-spark-1.2", 1, 107, 4000);
  add("effort preflight 1.3 minimal", "meta", "muse-spark-1.3", 1, 107, 4000);
  if (baseten) {
    const a = configs[1];
    add("slug preflight", "baseten", BASETEN_MODEL, 1, 32, 32);
    add("authored cards", "baseten", BASETEN_MODEL, 8, basetenPlans().reduce((n, plan) => n + textInput(a, plan.text), 0), 8 * 8000);
    add("ranking", "baseten", BASETEN_MODEL, 6, 26953, 6 * 8000);
  }
  const usd = rows.reduce((n, row) => n + row.usd, 0);
  return {repeat, rows, calls:rows.reduce((n, row) => n + row.calls, 0), usd,
    conditional:{calls:1, usd:(107 * 1.25 + 4000 * 4.25) / 1e6, reason:"Only if Spark 1.3 rejects minimal: verify low before recordings."},
    allRetryUsd:usd * 2, minutes:[25, 45]};
}
