import test from "node:test";
import assert from "node:assert/strict";
import {ALLOWANCE, OWN_AUDIO_INPUTS, PRE_RUN_COMMIT, preRunAllowance, provenanceChunks, compareText, collectTranscripts, collectPrivateTexts, historicalAllowance, sixWords, inputKind, scanTranscripts} from "../../scripts/scan-transcripts.mjs";
import {authoredInputCatalog, verifiedAuthoredRecord} from "../../scripts/lib/authoredInputs.mjs";
import {hashOf} from "../../scripts/lib/noteArtifacts.mjs";
import {ideal} from "../../scripts/lib/notePlans.mjs";
import {planRankings} from "../../scripts/lib/rankPlans.mjs";
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

test("additional historical allowance reads only the exact approved commit", () => {
  const calls = [], sentence = "ibis copper amber lilac granite willow";
  const result = preRunAllowance("unused", (args) => {calls.push(args); return args[0] === "ls-tree" ? "historical.md\n" : sentence;});
  assert.equal(PRE_RUN_COMMIT, "44a37d3e315c42721ca92b734ddbbb24c34c618c");
  assert.deepEqual(calls, [["ls-tree", "-r", "--name-only", PRE_RUN_COMMIT], ["show", `${PRE_RUN_COMMIT}:historical.md`]]);
  assert.equal(result.get(sentence), "historical.md");
  assert.ok(!result.has("current file content never expands this allowance"));
});
test("authored catalog verifies fixture identities and rebuilt tuning simulation hashes", () => {
  const catalog = authoredInputCatalog();
  for (const text of Object.values(ideal)) assert.ok(catalog.hashes.has(hashOf(text)));
  const plans = planRankings({sets:["all"]}); assert.equal(plans.length, 79);
  for (const plan of plans) assert.ok(catalog.hashes.has(hashOf(plan.input)));
  for (const [callId, identity] of catalog.legacy) {
    const {inputHash:omitted, ...metadata} = identity;
    assert.ok(omitted);
    assert.ok(verifiedAuthoredRecord({callId, kind:"fixture", ...metadata}, catalog));
    assert.ok(!verifiedAuthoredRecord({callId, kind:"fixture", ...metadata, run:99}, catalog));
  }
  assert.equal(catalog.legacy.size, 40);
});
test("provenance exemption is per verified authored record, not a whole file", () => {
  const sentence = "ibis copper amber lilac granite willow", input = "authored synthetic input", inputHash = hashOf(input);
  const catalog = {hashes:new Set([inputHash]), legacy:new Map()}, row = {kind:"fixture", inputHash, payload:{reply:{transcriptClean:sentence}}};
  const known = provenanceChunks(JSON.stringify(row), "docs/provenance/synthetic.jsonl", catalog);
  assert.equal(known.records, 1); assert.deepEqual(known.texts, []);
  const unverified = {...row, inputHash:hashOf("unapproved input")};
  const mixed = provenanceChunks([row, unverified].map(JSON.stringify).join("\n"), "docs/provenance/synthetic.jsonl", catalog);
  assert.equal(mixed.records, 1); assert.equal(mixed.texts.length, 1); assert.ok(mixed.texts[0].includes(sentence));
  assert.equal(provenanceChunks(JSON.stringify(row), "test-fixtures/synthetic.json", catalog).records, 0);
  for (const audio of [{kind:"recording"}, {stage:"voice"}, {stage:"audio"}, {stage:"pipeline"}, {inputType:"audio"}]) assert.equal(verifiedAuthoredRecord({...row, ...audio}, catalog), false);
  assert.equal(verifiedAuthoredRecord({...row, input:"wrong text"}, catalog), false);
  const envelope = provenanceChunks(JSON.stringify({records:[row, unverified], metadata:sentence}), "docs/provenance/synthetic.json", catalog);
  assert.equal(envelope.records, 1); assert.equal(envelope.texts.length, 2);
});

test("scan combines the two approved additions while retaining per-file failures", () => {
  const repo = fileURLToPath(new URL("../../", import.meta.url)), parent = join(repo, ".scratch"); mkdirSync(parent, {recursive:true});
  const root = mkdtempSync(join(parent, "a2-scan-")), dir = join(root, "test-audio", "results"); mkdirSync(dir, {recursive:true});
  mkdirSync(join(root, "docs", "provenance"), {recursive:true});
  const past = "ibis copper amber lilac granite willow", novel = "heron silver azure fern quartz birch", authored = "made up source input", inputHash = hashOf(authored);
  writeFileSync(join(dir, "synthetic.jsonl"), JSON.stringify({kind:"recording", id:"n01", transcript:`${past}. ${novel}`}));
  writeFileSync(join(root, "tracked.txt"), `${past}\n${novel}`);
  writeFileSync(join(root, "docs", "provenance", "synthetic.jsonl"), JSON.stringify({kind:"fixture", inputHash, payload:{reply:{transcriptClean:novel}}}));
  const git = (args) => {
    if (args[0] === "show") return args[1].startsWith(PRE_RUN_COMMIT) ? past : execFileSync("git", args, {cwd:repo, encoding:"utf8"});
    if (args[0] === "ls-tree") return "historical.md\n";
    if (args[0] === "check-ignore") return args.at(-1);
    return args.includes("-z") ? "tracked.txt\0docs/provenance/synthetic.jsonl\0" : "";
  };
  const result = scanTranscripts(root, {git, catalog:{hashes:new Set([inputHash]), legacy:new Map()}});
  assert.deepEqual(result.failures, [{file:"tracked.txt", count:6}]);
  assert.ok(result.allowed.some((row) => row.file === `${PRE_RUN_COMMIT}:historical.md` && row.count === 1));
  assert.deepEqual(result.verifiedProvenance, [{file:"docs/provenance/synthetic.jsonl", records:1}]);
  assert.ok(!JSON.stringify(result).includes(past)); assert.ok(!JSON.stringify(result).includes(novel));
});
