const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {execFileSync} = require("node:child_process");
const Module = require("node:module");
const {isDeepStrictEqual} = require("node:util");
const {
  PRACTICE_DIR,
  nextPracticeResult,
  practiceModeOn,
} = require("../lib/practice");
const noteLimit = require("../lib/noteLimit");
const {processNote} = require("../index");
const {makeWav} = require("./make-wav");

const EMULATOR_DEMO = {FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-fola"};

test("practice mode is on only in the emulator under a demo- project", () => {
  assert.equal(practiceModeOn(EMULATOR_DEMO), true);
  const off = {
    "no environment at all": {},
    "a deployed function under the real project": {
      GCLOUD_PROJECT: "vot-health-za",
    },
    "the emulator under the real project": {
      FUNCTIONS_EMULATOR: "true",
      GCLOUD_PROJECT: "vot-health-za",
    },
    "a demo- project outside the emulator": {GCLOUD_PROJECT: "demo-fola"},
    "an emulator flag that isn't exactly \"true\"": {
      FUNCTIONS_EMULATOR: "1",
      GCLOUD_PROJECT: "demo-fola",
    },
    "the emulator with no project ID": {FUNCTIONS_EMULATOR: "true"},
    "\"demo-\" in the middle of the project ID": {
      FUNCTIONS_EMULATOR: "true",
      GCLOUD_PROJECT: "vot-demo-fola",
    },
  };
  for (const [label, env] of Object.entries(off)) {
    assert.equal(practiceModeOn(env), false, label);
  }
});

test("a practice result can't be read when practice mode is off", () => {
  const env = {FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "vot-health-za"};
  assert.throws(() => nextPracticeResult(env), /only for the local emulators/);
});

test("practice results come round in turn and are marked as practice", () => {
  const count = fs.readdirSync(PRACTICE_DIR)
      .filter((name) => name.endsWith(".json")).length;
  assert.equal(count, 5);
  const seen = [];
  for (let i = 0; i < count * 2; i += 1) {
    const result = nextPracticeResult(EMULATOR_DEMO);
    assert.equal(result.practice, true);
    assert.equal(typeof result.isReport, "boolean");
    assert.ok(Array.isArray(result.cards));
    seen.push(JSON.stringify(result));
  }
  assert.equal(new Set(seen).size, count);
  assert.deepEqual(seen.slice(0, count), seen.slice(count));
});

test("every practice file says where it came from", () => {
  for (const name of fs.readdirSync(PRACTICE_DIR)) {
    const file = JSON.parse(fs.readFileSync(`${PRACTICE_DIR}/${name}`, "utf8"));
    assert.match(file.from, /score-006/, name);
    assert.ok("edits" in file, name);
  }
});

// Sets environment variables for one test and puts them back afterwards.
function withEnv(t, values) {
  const saved = {};
  for (const [name, value] of Object.entries(values)) {
    saved[name] = process.env[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  t.after(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

// Lets every note through without Firestore.
function withRoomToday(t) {
  const real = noteLimit.reserveNote;
  noteLimit.reserveNote = async () => ({allowed: true, count: 1});
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

const signedInNote = () => ({
  auth: {uid: "practice-test"},
  data: {audioBase64: makeWav({seconds: 1}).toString("base64")},
  rawRequest: {},
});

test("an emulator under a non-demo project refuses before counters, fixtures or Meta", async (t) => {
  withEnv(t, {
    FUNCTIONS_EMULATOR: "true",
    GCLOUD_PROJECT: "vot-health-za",
    META_API_KEY: "not-a-real-key",
  });
  t.mock.method(noteLimit, "reserveNote", () => { throw Error("No counter access allowed."); });
  let calls = 0;
  withFetch(t, async () => {
    calls += 1;
    throw new TypeError("fetch failed");
  });
  await assert.rejects(processNote.run(signedInNote()), {code: "failed-precondition"});
  assert.equal(calls, 0);
});

test("in the emulator under demo-, processNote returns a practice result " +
    "without calling Meta", async (t) => {
  withEnv(t, {...EMULATOR_DEMO, META_API_KEY: undefined});
  withRoomToday(t);
  withFetch(t, () => {
    throw new Error("practice mode must not call the network");
  });
  const result = await processNote.run(signedInNote());
  assert.equal(result.practice, true);
});

for (const key of ["", "   "]) test(`demo emulator with ${key ? "whitespace" : "empty"} key returns marked practice without Meta`, async (t) => {
  withEnv(t, {...EMULATOR_DEMO, META_API_KEY:key});
  withRoomToday(t);
  let calls = 0;
  withFetch(t, () => { calls++; throw Error("No network allowed."); });
  const result = await processNote.run(signedInNote());
  assert.equal(result.practice, true);
  assert.equal(calls, 0);
});

test("demo emulator with a key runs both ears and extraction without a practice marker", async (t) => {
  withEnv(t, {...EMULATOR_DEMO, META_API_KEY:"synthetic-test-value"});
  withRoomToday(t);
  const json = (body) => new Response(JSON.stringify(body), {headers:{"Content-Type":"application/json"}});
  let calls = 0;
  withFetch(t, async (url, init) => {
    calls++;
    if (url.endsWith("/asr/transcribe")) return json({transcript:"Synthetic authored non-report."});
    const body = JSON.parse(init.body);
    const content = Array.isArray(body.messages[0].content) ? "Synthetic authored non-report." : JSON.stringify({
      isReport:false, cards:[], transcriptClean:"", disagreements:[], adviceRequested:false, notifiableConditionMentioned:null,
    });
    return json({choices:[{message:{content}, finish_reason:"stop"}]});
  });
  const reply = await processNote.run(signedInNote());
  assert.equal(calls, 3);
  assert.equal(Object.hasOwn(reply, "practice"), false);
});

// Load the starting handler in memory, with the same module dependencies.
// This is an error-contract comparison, never a model or fixture replay.
function startingHandler() {
  const file = require.resolve("../index.js");
  const original = execFileSync("git", ["show", "6022dc4cdecafa307355bb978ae7d2b5734cdc07:functions/index.js"], {encoding:"utf8"});
  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.paths = module.paths;
  loaded._compile(original, file);
  return loaded.exports.processNote;
}

for (const key of [undefined, ""]) test(`outside emulator with ${key === undefined ? "missing" : "empty"} key matches starting HEAD error and cannot read fixtures`, async (t) => {
  const before = startingHandler();
  withEnv(t, {FUNCTIONS_EMULATOR:undefined, GCLOUD_PROJECT:"demo-fola", META_API_KEY:key});
  withRoomToday(t);
  const read = fs.readFileSync;
  t.mock.method(fs, "readFileSync", (path, ...args) => {
    assert.ok(!String(path).includes("practice-results"), "Fixtures must never be read outside the emulator.");
    return read(path, ...args);
  });
  let calls = 0;
  withFetch(t, async () => { calls++; return new Response("{}", {status:401}); });
  const failure = async (handler) => {
    try { await handler.run(signedInNote()); assert.fail("Expected the starting missing-key error path."); }
    catch (error) { assert.equal(Object.hasOwn(error, "practice"), false); return {code:error.code, message:error.message, details:error.details}; }
  };
  const expected = await failure(before), actual = await failure(processNote);
  assert.ok(isDeepStrictEqual(actual, expected), "Missing-key error contract changed.");
  assert.equal(actual.code, "unavailable");
  assert.equal(calls, 0);
});
