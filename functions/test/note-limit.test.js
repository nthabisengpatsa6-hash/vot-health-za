const test = require("node:test");
const assert = require("node:assert/strict");
const {reserveNote, sastDay} = require("../lib/noteLimit");
const noteLimit = require("../lib/noteLimit");
const {processNote} = require("../index");
const {makeWav} = require("./make-wav");

// A stand-in for the Admin SDK: one in-memory document per path, and a
// transaction that reads and writes it.
function fakeDb(start = {}) {
  const docs = new Map(Object.entries(start));
  return {
    docs,
    collection: (name) => ({doc: (id) => ({path: `${name}/${id}`})}),
    runTransaction: (work) => work({
      get: async (ref) => ({
        exists: docs.has(ref.path),
        data: () => docs.get(ref.path),
      }),
      set: (ref, value) => docs.set(ref.path, value),
    }),
  };
}

const NOON_SAST = new Date("2026-10-28T10:00:00Z");

test("the first note of the day is counted as 1", async () => {
  const db = fakeDb();
  const usage = await reserveNote("u1", {db, now: NOON_SAST});
  assert.deepEqual(usage, {allowed: true, count: 1});
  const saved = db.docs.get("noteUsage/u1");
  assert.equal(saved.day, "2026-10-28");
  assert.equal(saved.count, 1);
  assert.ok(saved.updatedAt, "updatedAt is the server's time");
});

test("the 40th note is allowed and the 41st is refused, uncounted", async () => {
  const db = fakeDb({"noteUsage/u1": {day: "2026-10-28", count: 39}});
  assert.deepEqual(
      await reserveNote("u1", {db, now: NOON_SAST}),
      {allowed: true, count: 40},
  );
  assert.deepEqual(
      await reserveNote("u1", {db, now: NOON_SAST}),
      {allowed: false, count: 40},
  );
  assert.equal(db.docs.get("noteUsage/u1").count, 40);
});

test("a new SAST day starts again at 1", async () => {
  const db = fakeDb({"noteUsage/u1": {day: "2026-10-27", count: 40}});
  assert.deepEqual(
      await reserveNote("u1", {db, now: NOON_SAST}),
      {allowed: true, count: 1},
  );
});

test("each user has their own count", async () => {
  const db = fakeDb({"noteUsage/u1": {day: "2026-10-28", count: 40}});
  assert.equal((await reserveNote("u2", {db, now: NOON_SAST})).allowed, true);
});

test("the day turns at midnight SAST, which is 22:00 UTC", () => {
  assert.equal(sastDay(new Date("2026-10-28T21:59:59Z")), "2026-10-28");
  assert.equal(sastDay(new Date("2026-10-28T22:00:00Z")), "2026-10-29");
  assert.equal(sastDay(new Date("2026-10-28T00:30:00Z")), "2026-10-28");
});

test("the 200th app note is allowed and the next is refused without changing either counter", async () => {
  const db = fakeDb({"noteAppUsage/app": {day: "2026-10-28", count: 199}});
  assert.equal((await reserveNote("u1", {db, now: NOON_SAST})).allowed, true);
  assert.equal(db.docs.get("noteAppUsage/app").count, 200);
  assert.equal((await reserveNote("u2", {db, now: NOON_SAST})).reason, "app-note-limit");
  assert.equal(db.docs.has("noteUsage/u2"), false);
  assert.equal(db.docs.get("noteAppUsage/app").count, 200);
});

test("an account refusal leaves the app counter alone; both reset on a new SAST day", async () => {
  const db = fakeDb({"noteUsage/u1": {day: "2026-10-28", count: 40}, "noteAppUsage/app": {day: "2026-10-28", count: 199}});
  assert.equal((await reserveNote("u1", {db, now: NOON_SAST})).allowed, false);
  assert.equal(db.docs.get("noteAppUsage/app").count, 199);
  assert.equal((await reserveNote("u1", {db, now: new Date("2026-10-28T22:00:00Z")})).count, 1);
  assert.equal(db.docs.get("noteAppUsage/app").count, 1);
});

test("a UID named app cannot collide with the app-wide counter", async () => {
  const db = fakeDb();
  await reserveNote("app", {db, now: NOON_SAST});
  assert.equal(db.docs.get("noteUsage/app").count, 1);
  assert.equal(db.docs.get("noteAppUsage/app").count, 1);
});

const signedInNote = () => ({
  auth: {uid: "limit-test"},
  data: {audioBase64: makeWav({seconds: 1}).toString("base64")},
  rawRequest: {},
});

function withReserve(t, fake) {
  const real = noteLimit.reserveNote;
  noteLimit.reserveNote = fake;
  t.after(() => {
    noteLimit.reserveNote = real;
  });
}

function withNoNetwork(t) {
  const real = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("fetch was called after the daily limit");
  };
  t.after(() => {
    globalThis.fetch = real;
  });
}

test("over the limit, processNote says so plainly and calls no model",
    async (t) => {
      withReserve(t, async () => ({allowed: false, count: 40}));
      withNoNetwork(t);
      await assert.rejects(processNote.run(signedInNote()), {
        code: "resource-exhausted",
        message: "Daily limit reached. Try again tomorrow.",
      });
    });

test("if the counter can't be reached, the note is refused", async (t) => {
  withReserve(t, async () => {
    throw new Error("Firestore is down");
  });
  withNoNetwork(t);
  await assert.rejects(processNote.run(signedInNote()), {code: "unavailable"});
});

test("the app-wide cap stops processNote before either Meta call", async (t) => {
  withReserve(t, async () => ({allowed: false, count: 0, reason: "app-note-limit"}));
  withNoNetwork(t);
  await assert.rejects(processNote.run(signedInNote()), {code: "resource-exhausted", details: {reason: "app-note-limit"}});
});

test("bad audio is refused before it is counted", async (t) => {
  let counted = 0;
  withReserve(t, async () => {
    counted += 1;
    return {allowed: true, count: 1};
  });
  withNoNetwork(t);
  const note = signedInNote();
  note.data.audioBase64 = Buffer.from("not a wav").toString("base64");
  await assert.rejects(processNote.run(note), {code: "invalid-argument"});
  assert.equal(counted, 0);
});
