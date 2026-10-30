const test = require("node:test");
const assert = require("node:assert/strict");
const {listenNote, buildNoteCards, NOTE_KEYWORDS} = require("../lib/notePipeline");
const {REPLY_SCHEMA} = require("../lib/cardSchema");
const {makeWav} = require("./make-wav");
const head = require("./fixtures/process-note-head.json");
const baseline = require("../../scripts/fixtures/extraction-baseline-f05ffb0.json");

test("refactored Baseline sends exactly the captured HEAD request bodies", async () => {
  const requests = {};
  const fetch = async (url, init) => {
    if (url.endsWith("/asr/transcribe")) {
      requests.voice = JSON.parse(await init.body.get("request").text());
      return Response.json({transcript:head.transcript, audioDurationMs:1000});
    }
    const body = JSON.parse(init.body), audio = Array.isArray(body.messages[0].content);
    if (audio) delete body.messages[0].content[1].input_audio.data;
    requests[audio ? "audio" : "extract"] = body;
    return Response.json({choices:[{message:{content:audio ? head.transcript : JSON.stringify(head.reply)}, finish_reason:"stop"}], usage:{prompt_tokens:10, completion_tokens:10}});
  };
  const apiKey = "offline-test-placeholder";
  const heard = await listenNote(makeWav(), {apiKey, keywords:baseline.keywords,
    audio:{model:baseline.audioModel, effort:baseline.audioEffort, prompt:baseline.audioPrompt}, fetch});
  const result = await buildNoteCards(heard, {apiKey, fetch, prompt:baseline.prompt, schema:baseline.schema, uncertainWords:false});
  assert.deepEqual(requests, head.requests);
  assert.deepEqual(result.reply, head.reply);
  assert.deepEqual(REPLY_SCHEMA, baseline.schema);
  assert.equal(NOTE_KEYWORDS.length, 53);
});

test("both shared pipeline ears start before either settles", async () => {
  const order = [];
  let done;
  const gate = new Promise((resolve) => {done = resolve;});
  const run = listenNote(makeWav(), {voice:async () => {order.push("voice"); await gate; return {transcript:"a"};},
    spark:async () => {order.push("spark"); done(); return {transcript:"b"};}});
  const heard = await run;
  assert.deepEqual(order, ["voice", "spark"]);
  assert.equal(heard.singleSource, false);
});

test("default production requests apply only approved A2 prompt, keywords and audio effort", async () => {
  const requests = {};
  const fetch = async (url, init) => {
    if (url.endsWith("/asr/transcribe")) {
      requests.voice = JSON.parse(await init.body.get("request").text());
      return Response.json({transcript:head.transcript, audioDurationMs:1000});
    }
    const body = JSON.parse(init.body), audio = Array.isArray(body.messages[0].content);
    if (audio) delete body.messages[0].content[1].input_audio.data;
    requests[audio ? "audio" : "extract"] = body;
    return Response.json({choices:[{message:{content:audio ? head.transcript : JSON.stringify(head.reply)}, finish_reason:"stop"}], usage:{prompt_tokens:10, completion_tokens:10}});
  };
  const apiKey = "offline-test-placeholder", heard = await listenNote(makeWav(), {apiKey, fetch});
  const result = await buildNoteCards(heard, {apiKey, fetch});
  const expected = structuredClone(head.requests);
  expected.voice.keywords = NOTE_KEYWORDS;
  expected.audio.reasoning_effort = "minimal";
  expected.extract.messages[0].content = require("../lib/extractCard").SYSTEM_PROMPT;
  assert.deepEqual(requests, expected);
  assert.deepEqual(result.reply, head.reply);
});

test("approved production defaults are 1.2 minimal, 1.3 low, Meta, and marker rule off", () => {
  const settings = require("../constants");
  assert.equal(settings.SPARK_AUDIO_MODEL, "muse-spark-1.2");
  assert.equal(settings.SPARK_AUDIO_EFFORT, "minimal");
  assert.equal(settings.EXTRACT_MODEL, "muse-spark-1.3");
  assert.equal(settings.EXTRACT_EFFORT, "low");
  assert.equal(settings.EXTRACTION_PROVIDER, "meta");
  assert.equal(settings.UNCERTAIN_WORDS, false);
});
