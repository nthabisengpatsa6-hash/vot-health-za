const test = require("node:test");
const assert = require("node:assert/strict");
const {transcribeWithSpark} = require("../lib/sparkAudio");
const {SYSTEM_PROMPT, extractCard} = require("../lib/extractCard");
const {AREA_NAMES, TOWN} = require("../lib/cardSchema");
const {makeWav} = require("./make-wav");

const OPTIONS = {apiKey: "test-key", attemptTimeoutMs: 50, retryDelayMs: 0};

// A stand-in for fetch that answers every call with one Chat Completions
// reply, and records what was sent.
function fakeChat(content, finishReason = "stop") {
  const calls = [];
  async function fetch(url, init) {
    calls.push({url, body: JSON.parse(init.body)});
    return new Response(JSON.stringify({
      choices: [{message: {content}, finish_reason: finishReason}],
      usage: {prompt_tokens: 10, completion_tokens: 20, total_tokens: 30},
    }), {status: 200, headers: {"Content-Type": "application/json"}});
  }
  return {fetch, calls};
}

const cardReply = (changes = {}) => JSON.stringify({
  isReport: true,
  cards: [{
    symptomGroup: "fever_rash",
    unusualDescription: null,
    symptomsInWords: "fever and a rash",
    caseCount: 2,
    comparedWithUsual: "not_sure",
    ageGroup: "adult",
    area: "Amanzimtoti",
    areaHeard: null,
    onset: "last_3_days",
    exposure: {types: ["event"], words: "a church event"},
    observations: {
      moreSevere: false,
      notResponding: false,
      unusualSymptoms: false,
      shortOfSupplies: false,
      suppliesNote: null,
    },
    unsureFields: [],
    questions: [],
  }],
  notifiableConditionMentioned: null,
  adviceRequested: false,
  transcriptClean: "Two adults with fever and a rash.",
  disagreements: [],
  ...changes,
});

test("the Spark ear sends the audio with the no-invention instruction", async () => {
  const {fetch, calls} = fakeChat("  Two adults came in today.  ");
  const result = await transcribeWithSpark(makeWav(), {...OPTIONS, fetch});

  assert.equal(result.transcript, "Two adults came in today.");
  assert.equal(result.model, "muse-spark-1.2");
  assert.equal(calls[0].url, "https://api.meta.ai/v1/chat/completions");
  const {body} = calls[0];
  assert.equal(body.model, "muse-spark-1.2");
  assert.equal(body.reasoning_effort, "minimal");
  assert.equal(body.max_completion_tokens, 4000);
  const [text, audio] = body.messages[0].content;
  assert.match(text.text, /Never add words that were not spoken\./);
  assert.match(text.text, /write \[\?\] rather than guessing/);
  assert.equal(audio.type, "input_audio");
  assert.equal(audio.input_audio.format, "wav");
  assert.ok(audio.input_audio.data.length > 0);
});

test("the Spark ear refuses a contributor model before calling", async () => {
  const {fetch, calls} = fakeChat("unused");
  await assert.rejects(
      transcribeWithSpark(makeWav(), {
        ...OPTIONS,
        fetch,
        model: "muse-spark-1.3-contributor",
      }),
      /only Standard-mode model IDs/,
  );
  assert.equal(calls.length, 0);
});

test("a reply cut off at the token limit is a failure, not retried", async () => {
  const {fetch, calls} = fakeChat("Two adults came", "length");
  await assert.rejects(
      transcribeWithSpark(makeWav(), {...OPTIONS, fetch}),
      (err) => err.kind === "bad-reply" && err.attempts === 1,
  );
  assert.equal(calls.length, 1);
});

test("the prompt has the town and every area, with nothing unfilled", () => {
  assert.ok(SYSTEM_PROMPT.includes(TOWN));
  for (const area of AREA_NAMES) assert.ok(SYSTEM_PROMPT.includes(area), area);
  assert.ok(!SYSTEM_PROMPT.includes("{{"));
});

test("extraction asks for the strict schema and runs the guards", async () => {
  const {fetch, calls} = fakeChat(cardReply());
  const {reply} = await extractCard(
      {transcriptA: "Two adults with fever.", transcriptB: "Two adults."},
      {...OPTIONS, fetch, effort: "medium"},
  );

  const {body} = calls[0];
  assert.equal(body.model, "muse-spark-1.3");
  assert.equal(body.reasoning_effort, "medium");
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.strict, true);
  assert.match(body.messages[1].content, /Transcript A[\s\S]*Transcript B/);
  // The guard moved the off-list area out and asks about it.
  assert.equal(reply.cards[0].area, null);
  assert.equal(reply.cards[0].areaHeard, "Amanzimtoti");
  assert.ok(reply.cards[0].unsureFields.includes("area"));
});

test("extraction says when only one transcript is available", async () => {
  const {fetch, calls} = fakeChat(cardReply());
  await extractCard(
      {transcriptA: null, transcriptB: "Two adults."},
      {...OPTIONS, fetch},
  );
  assert.match(calls[0].body.messages[1].content, /^Only one transcript/);
  assert.ok(!calls[0].body.messages[1].content.includes("Transcript A"));
});

test("extraction skips the model when both transcripts are empty", async () => {
  const {fetch, calls} = fakeChat(cardReply());
  const {reply} = await extractCard(
      {transcriptA: "  ", transcriptB: ""},
      {...OPTIONS, fetch},
  );
  assert.equal(reply.isReport, false);
  assert.deepEqual(reply.cards, []);
  assert.equal(calls.length, 0);
});

test("extraction treats a reply that isn't JSON as a failure", async () => {
  const {fetch} = fakeChat("Here is your card: {");
  await assert.rejects(
      extractCard({transcriptA: "Two adults."}, {...OPTIONS, fetch}),
      (err) => err.kind === "bad-reply" && err.attempts === 1,
  );
});
