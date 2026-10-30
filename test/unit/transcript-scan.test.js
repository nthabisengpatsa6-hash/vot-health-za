import test from "node:test";
import assert from "node:assert/strict";
import {ALLOWANCE, OWN_AUDIO_INPUTS, compareText, collectTranscripts, collectPrivateTexts, historicalAllowance, sixWords, inputKind, scanTranscripts} from "../../scripts/scan-transcripts.mjs";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {mkdirSync, mkdtempSync, writeFileSync} from "node:fs";
import {join} from "node:path";

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
  assert.deepEqual(ALLOWANCE, {commit:"0e77db35cb4207929e1e2d39212bb54fa8ff24e4", file:"test-fixtures/ideal-transcripts.json",
    sha256:"f69c798e30997df8b13eabd249f35a0d3e4d265367bb4bf95a3c3c9b5d6b11a2"});
});
test("raw ears and clean transcripts are collected without model/card metadata", () => {
  assert.deepEqual(collectTranscripts({transcripts:{a:"alpha", b:"beta"}, payload:{reply:{transcriptClean:"gamma"}}, model:"ignored"}), ["alpha", "beta", "gamma"]);
});

test("own-voice exceptions are exactly the six approved input files", () => {
  assert.deepEqual(OWN_AUDIO_INPUTS, ["clear-english-16k.wav", "clear-english-24k.wav", "mixed-sesotho-16k.wav", "mixed-sesotho-24k.wav", "all-sesotho-24k.wav", "mixed-amanzimtoti-24k.wav"]);
  assert.ok(Object.isFrozen(OWN_AUDIO_INPUTS));
  for (const file of OWN_AUDIO_INPUTS) assert.equal(inputKind({file}, {transcription:true}), "ownAudio");
  assert.equal(inputKind({note:"all-sesotho"}, {stage:"audio"}), "ownAudio");
  assert.equal(inputKind({file:"unknown.wav"}, {transcription:true}), "privateAudio");
  assert.equal(inputKind({file:"all-sesotho-16k.wav"}, {transcription:true}), "privateAudio");
});

test("numbered reader audio is private regardless of an own-file hint", () => {
  for (const id of ["n09a", "n09b"]) assert.equal(inputKind({kind:"recording", id, file:OWN_AUDIO_INPUTS[0]}), "privateAudio");
  for (let i = 1; i <= 10; i++) {
    const id = `n${String(i).padStart(2, "0")}`;
    assert.equal(inputKind({kind:"recording", id, file:OWN_AUDIO_INPUTS[0]}), "privateAudio");
    assert.equal(inputKind({file:`${id}.opus`}, {transcription:true}), "privateAudio");
    assert.equal(inputKind({note:id}, {stage:"audio"}), "privateAudio");
    assert.equal(inputKind({kind:"fixture", id}), "authoredText");
  }
});

test("private content includes cards and raw replies without collecting timing metadata", () => {
  const texts = collectPrivateTexts({model:"ignored model", transcript:"ear words", payload:{reply:{cards:[{symptomsInWords:"card words"}], transcriptClean:"clean words"},
    rawOutput:JSON.stringify({cards:[{exposure:{words:"raw words"}}]})}, timings:{label:"ignored timing"}});
  assert.deepEqual(texts, ["ear words", "card words", "clean words", "raw words"]);
});

test("scan excludes authored text and own audio but catches reader card-only overlaps", () => {
  const repo = fileURLToPath(new URL("../../", import.meta.url)), parent = join(repo, ".scratch");
  mkdirSync(parent, {recursive:true});
  const root = mkdtempSync(join(parent, "private-scan-")), dir = join(root, "test-audio", "results");
  mkdirSync(dir, {recursive:true});
  const sentence = "ibis copper amber lilac granite willow";
  writeFileSync(join(root, "tracked.txt"), sentence);
  const path = join(dir, "synthetic.jsonl");
  const own = {kind:"recording", file:OWN_AUDIO_INPUTS[0], payload:{reply:{transcriptClean:sentence}}};
  const authored = {kind:"fixture", id:"n01", payload:{reply:{transcriptClean:sentence}}};
  const privateRow = {kind:"recording", id:"n01", payload:{reply:{cards:[{symptomsInWords:sentence}]}}};
  const git = (args) => {
    if (args[0] === "show") return execFileSync("git", args, {cwd:repo, encoding:"utf8"});
    if (args[0] === "check-ignore") return args.at(-1);
    return args.includes("-z") ? "tracked.txt\0" : "";
  };
  writeFileSync(path, [own, authored, privateRow].map((row) => JSON.stringify(row)).join("\n"));
  const result = scanTranscripts(root, {git});
  assert.deepEqual(result.failures, [{file:"tracked.txt", count:1}]);
  assert.deepEqual(result.inputs, {privateAudio:1, ownAudio:1, authoredText:1, unknownPrivate:0});
  assert.ok(!JSON.stringify(result).includes(sentence));
  writeFileSync(path, [own, authored].map((row) => JSON.stringify(row)).join("\n"));
  assert.deepEqual(scanTranscripts(root, {git}).failures, []);
  writeFileSync(path, JSON.stringify({payload:{reply:{cards:[{symptomsInWords:sentence}]}}}));
  assert.equal(scanTranscripts(root, {git}).failures[0].count, 1);
});
