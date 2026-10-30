import test from "node:test";
import assert from "node:assert/strict";
import {ALLOWANCE, compareText, collectTranscripts, historicalAllowance, sixWords} from "../../scripts/scan-transcripts.mjs";
import {fileURLToPath} from "node:url";

test("six consecutive words fail unless that exact sequence was historically authored", () => {
  const text = "ibis copper amber lilac granite willow";
  const corpus = new Set(sixWords(text));
  assert.equal(compareText(text, corpus, new Set()).failedCount, 1);
  assert.deepEqual(compareText(text, corpus, corpus), {allowedCount:1, failedCount:0});
  assert.equal(compareText("ibis copper amber lilac granite", corpus, new Set()).failedCount, 0);
});
test("allowance is pinned to the pre-arrival blob and cannot derive from current fixtures", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  assert.ok(historicalAllowance(root).size > 0);
  const calls = [];
  assert.throws(() => historicalAllowance(root, (args) => {calls.push(args); return "{}";}), /hash mismatch/);
  assert.deepEqual(calls, [["show", `${ALLOWANCE.commit}:${ALLOWANCE.file}`]]);
  assert.ok(Object.isFrozen(ALLOWANCE));
});
test("raw ears and clean transcripts are collected without model/card metadata", () => {
  assert.deepEqual(collectTranscripts({transcripts:{a:"alpha", b:"beta"}, payload:{reply:{transcriptClean:"gamma"}}, model:"ignored"}), ["alpha", "beta", "gamma"]);
});
