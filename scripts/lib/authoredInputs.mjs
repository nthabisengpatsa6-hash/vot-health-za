import example from "../../test-fixtures/baseten-example.json" with {type:"json"};
import {ideal, special, textPlans, basetenPlans, configurations, BASETEN_MODEL, callIdentity} from "./notePlans.mjs";
import {planRankings} from "./rankPlans.mjs";
import {hashOf} from "./noteArtifacts.mjs";
import {createRequire} from "node:module";
import {planDraftTrial} from "./draftTrial.mjs";
const {REPLY_SCHEMA} = createRequire(import.meta.url)("../../functions/lib/cardSchema.js");
let cached;
export function authoredInputCatalog() {
  if (cached) return cached;
  const hashes = new Set([...Object.values(ideal), ...special.map((fixture) => fixture.text), example.messages[0].content].map(hashOf));
  for (const plan of planRankings({sets:["all"]})) hashes.add(hashOf(plan.input));
  for (const plan of planDraftTrial()) hashes.add(hashOf(plan.input));
  const legacy = new Map();
  const plans = [...textPlans().map((plan) => ({...plan, provider:"meta", model:"muse-spark-1.3"})),
    ...basetenPlans().map((plan) => ({...plan, run:1, config:configurations()[1], provider:"baseten", model:BASETEN_MODEL}))];
  for (const plan of plans) {
    const inputHash = hashOf(plan.text);
    const identity = {kind:"fixture", provider:plan.provider, model:plan.model, prompt:hashOf(plan.config.prompt), schema:hashOf(REPLY_SCHEMA), id:plan.id, text:inputHash, run:plan.run};
    legacy.set(callIdentity(identity), {inputHash, id:plan.id, run:plan.run, provider:plan.provider, model:plan.model});
  }
  cached = {hashes, legacy}; return cached;
}
export function verifiedAuthoredRecord(row, catalog) {
  if (!row || row.kind === "recording" || row.inputType === "audio" || ["voice", "audio", "pipeline"].includes(row.stage)) return false;
  const declared = row.inputHash || row.payload?.inputHash;
  if (declared) {
    if (!catalog.hashes.has(declared)) return false;
    const input = row.input || row.payload?.input;
    return !input || hashOf(input) === declared;
  }
  // Early Task 16 fixture records bind the input hash into callId rather
  // than storing it separately. Verify the complete authored call identity.
  const old = catalog.legacy.get(row.callId);
  return Boolean(old && row.kind === "fixture" && row.id === old.id && row.run === old.run && row.provider === old.provider && row.model === old.model);
}
