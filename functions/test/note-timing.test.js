const test = require("node:test");
const assert = require("node:assert/strict");
const noteLimit = require("../lib/noteLimit");
const noteTiming = require("../lib/noteTiming");
const {NOTE_TIMING_KEYS, noteTimingEntry} = noteTiming;
const {processNote} = require("../index");
const {makeWav} = require("./make-wav");

// Made up. None of these may ever reach the log.
const UID = "timing-test-uid";
const TRANSCRIPT = "Three children with watery diarrhoea from Leeba View.";
const FORBIDDEN = [UID, "watery", "diarrhoea", "Leeba View", "note.wav"];

const MODELS = ["asrModel", "audioEarModel", "extractModel"];

// Catches every note_timing entry instead of writing it to the log.
function captureLog(t) {
  const entries = [];
  const real = noteTiming.write;
  noteTiming.write = (entry) => entries.push(entry);
  t.after(() => {
    noteTiming.write = real;
  });
  return entries;
}

// Sets environment variables for one test and puts them back afterwards.
function withEnv(t, values) {
  const saved = {};
  for (const [name, value] of Object.entries(values)) {
    saved[name] = process.env[name];
    process.env[name] = value;
  }
  t.after(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

// The real project ID with no emulator flag, so practice mode stays off.
function asDeployed(t) {
  withEnv(t, {
    GCLOUD_PROJECT: "vot-health-za",
    META_API_KEY: "not-a-real-key",
  });
}

function withUsage(t, reserveNote) {
  const real = noteLimit.reserveNote;
  noteLimit.reserveNote = reserveNote;
  t.after(() => {
    noteLimit.reserveNote = real;
  });
}

function withFetch(t, fake) {
  const real = globalThis.fetch;
  globalThis.fetch = fake;
  t.after(() => {
    globalThis.fetch = real;
  });
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {"Content-Type": "application/json"},
});

const chat = (content) => json({
  choices: [{message: {content}, finish_reason: "stop"}],
  usage: {prompt_tokens: 10, completion_tokens: 20, total_tokens: 30},
});

const CARD_REPLY = JSON.stringify({
  isReport: true,
  cards: [{
    symptomGroup: "diarrhoea_vomiting",
    unusualDescription: null,
    symptomsInWords: "watery diarrhoea",
    caseCount: 3,
    comparedWithUsual: "more",
    ageGroup: "under_5",
    area: "Leeba View",
    areaHeard: null,
    onset: "today",
    exposure: {types: [], words: null},
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
  transcriptClean: TRANSCRIPT,
  disagreements: [],
});

// Answers like Meta: both ears hear TRANSCRIPT, and the card step builds
// one card, unless `extraction` says otherwise.
function fakeMeta({extraction = () => chat(CARD_REPLY)} = {}) {
  return async (url, init) => {
    if (url.endsWith("/asr/transcribe")) {
      return json({transcript: TRANSCRIPT, audioDurationMs: 1000});
    }
    const body = JSON.parse(init.body);
    const audio = Array.isArray(body.messages[0].content);
    return audio ? chat(TRANSCRIPT) : extraction();
  };
}

const note = (data = {}) => ({
  auth: {uid: UID},
  data: {audioBase64: makeWav({seconds: 1}).toString("base64"), ...data},
  rawRequest: {},
});

// Every entry: exactly the allowed keys, plain values only, and nothing
// that was said or who said it.
function assertClean(entry) {
  assert.deepEqual(Object.keys(entry), NOTE_TIMING_KEYS);
  for (const [key, value] of Object.entries(entry)) {
    const plain = value === null || typeof value === "number" ||
        typeof value === "boolean" || typeof value === "string";
    assert.ok(plain, `${key} must be a plain value`);
    if (typeof value === "string") assert.ok(value.length <= 40, key);
  }
  const text = JSON.stringify(entry);
  for (const word of FORBIDDEN) assert.ok(!text.includes(word), word);
}

// First in this file, so its first call is this process's first call.
test("only the first call an instance handles is a cold start", async (t) => {
  const entries = captureLog(t);
  for (let i = 0; i < 2; i += 1) {
    await assert.rejects(processNote.run({data: {}, rawRequest: {}}));
  }
  assert.deepEqual(entries.map((entry) => entry.coldStart), [true, false]);
});

test("the log entry holds only the allowed keys, whatever else the timing " +
    "holds", () => {
  const entry = noteTimingEntry({
    started: 1234.5,
    noteMs: 900,
    outcome: "ok",
    transcript: TRANSCRIPT,
    uid: UID,
    email: "nurse.test@example.com",
    fileName: "note.wav",
    audioBase64: "UklGRg==",
    profile: {role: "nurse", area: "Leeba View"},
    card: {symptomsInWords: "watery diarrhoea"},
  });
  assertClean(entry);
  assert.equal(entry.noteMs, 900);
  assert.equal(entry.outcome, "ok");
  assert.equal(entry.cardCount, null);
});

test("a note that works logs every step, and the reply carries the same " +
    "server time", async (t) => {
  asDeployed(t);
  withUsage(t, async () => ({allowed: true, count: 1}));
  withFetch(t, fakeMeta());
  const entries = captureLog(t);
  const chunks = [];
  const response = {sendChunk: async (chunk) => chunks.push(chunk)};

  const reply = await processNote.run(note(), response);

  assert.equal(entries.length, 1);
  const [entry] = entries;
  assertClean(entry);
  assert.equal(entry.outcome, "ok");
  assert.equal(entry.cardCount, 1);
  assert.equal(entry.noteMs, reply.noteMs);
  assert.equal(entry.audioBytes, makeWav({seconds: 1}).length);
  assert.equal(entry.audioSeconds, 1);
  for (const key of ["asrMs", "audioEarMs", "extractMs"]) {
    assert.equal(typeof entry[key], "number", key);
  }
  for (const key of ["asrRetries", "audioEarRetries", "extractRetries"]) {
    assert.equal(entry[key], 0, key);
  }
  assert.equal(entry.asrModel, "muse-voice-transcribe-1.0");
  assert.equal(entry.audioEarModel, "muse-spark-1.2");
  assert.equal(entry.extractModel, "muse-spark-1.3");
  // The upload is timed by the first message; the reply is otherwise as
  // before, plus noteMs.
  assert.deepEqual(chunks, [{stage: "received"}, {stage: "building"}]);
  assert.equal(reply.transcriptClean, TRANSCRIPT);
  assert.equal(reply.singleSource, false);
});

test("a signed-out call is logged, with nothing else known", async (t) => {
  const entries = captureLog(t);
  await assert.rejects(
      processNote.run({data: {}, rawRequest: {}}),
      {code: "unauthenticated"},
  );
  assert.equal(entries.length, 1);
  assertClean(entries[0]);
  assert.equal(entries[0].outcome, "signed_out");
  assert.equal(typeof entries[0].noteMs, "number");
  for (const key of ["audioBytes", "asrMs", "cardCount", ...MODELS]) {
    assert.equal(entries[0][key], null, key);
  }
});

test("bad audio, the daily limit and a lost counter each get their own " +
    "code", async (t) => {
  asDeployed(t);
  withFetch(t, () => {
    throw new Error("no Meta call may happen here");
  });
  const entries = captureLog(t);
  let usage = {allowed: false, count: 40};
  withUsage(t, async () => {
    if (usage instanceof Error) throw usage;
    return usage;
  });

  await assert.rejects(
      processNote.run(note({audioBase64: "bm90IGEgd2F2"})),
      {code: "invalid-argument"},
  );
  await assert.rejects(processNote.run(note()), {code: "resource-exhausted"});
  usage = new Error("Firestore is unreachable");
  await assert.rejects(processNote.run(note()), {code: "unavailable"});

  entries.forEach(assertClean);
  assert.deepEqual(
      entries.map((entry) => entry.outcome),
      ["bad_audio", "limit", "counter_failed"],
  );
  assert.equal(entries[0].audioBytes, null);
  assert.equal(entries[1].audioSeconds, 1);
  for (const entry of entries) {
    for (const key of MODELS) assert.equal(entry[key], null, key);
  }
});

test("both ears failing is logged with their retries", async (t) => {
  asDeployed(t);
  withUsage(t, async () => ({allowed: true, count: 1}));
  withFetch(t, async () => {
    throw new TypeError("fetch failed");
  });
  const entries = captureLog(t);

  await assert.rejects(processNote.run(note()), {code: "unavailable"});

  assertClean(entries[0]);
  assert.equal(entries[0].outcome, "asr_failed");
  assert.equal(entries[0].asrRetries, 1);
  assert.equal(entries[0].audioEarRetries, 1);
  assert.equal(entries[0].extractMs, null);
  assert.equal(entries[0].extractModel, null);
});

test("a failed card step is logged with its time and model", async (t) => {
  asDeployed(t);
  withUsage(t, async () => ({allowed: true, count: 1}));
  withFetch(t, fakeMeta({
    extraction: () => json({error: {message: "bad request"}}, 400),
  }));
  const entries = captureLog(t);

  await assert.rejects(processNote.run(note()), {code: "internal"});

  assertClean(entries[0]);
  assert.equal(entries[0].outcome, "extract_failed");
  assert.equal(typeof entries[0].extractMs, "number");
  assert.equal(entries[0].extractRetries, 0);
  assert.equal(entries[0].extractModel, "muse-spark-1.3");
  assert.equal(entries[0].cardCount, null);
});
