const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
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

test("under the real project ID, processNote calls Meta, never a practice " +
    "result", async (t) => {
  withEnv(t, {
    FUNCTIONS_EMULATOR: "true",
    GCLOUD_PROJECT: "vot-health-za",
    META_API_KEY: "not-a-real-key",
  });
  withRoomToday(t);
  let calls = 0;
  withFetch(t, async () => {
    calls += 1;
    throw new TypeError("fetch failed");
  });
  await assert.rejects(processNote.run(signedInNote()), {code: "unavailable"});
  assert.ok(calls > 0, "the Meta API should have been called");
});

test("in the emulator under demo-, processNote returns a practice result " +
    "without calling Meta", async (t) => {
  withEnv(t, EMULATOR_DEMO);
  withRoomToday(t);
  withFetch(t, () => {
    throw new Error("practice mode must not call the network");
  });
  const result = await processNote.run(signedInNote());
  assert.equal(result.practice, true);
});
