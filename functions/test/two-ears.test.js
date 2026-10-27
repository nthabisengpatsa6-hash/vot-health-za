const test = require("node:test");
const assert = require("node:assert/strict");
const {listenWithTwoEars} = require("../lib/twoEars");

// Grace shortened from 30 s to milliseconds so the tests run quickly.
const GRACE_MS = 40;

// A fake ear that answers (or fails) after `ms`, and records whether it was
// cancelled.
function fakeEar(ms, outcome) {
  const ear = (signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (outcome === "fail") {
        reject(Object.assign(new Error("fake failure"), {kind: "network"}));
      } else {
        resolve({transcript: outcome});
      }
    }, ms);
    signal.addEventListener("abort", () => {
      ear.cancelled = true;
      clearTimeout(timer);
      reject(Object.assign(new Error("cancelled"), {kind: "cancelled"}));
    });
  });
  ear.cancelled = false;
  return ear;
}

test("uses both ears when both answer", async () => {
  const heard = await listenWithTwoEars(
      {voice: fakeEar(5, "A"), spark: fakeEar(15, "B")},
      {graceMs: GRACE_MS},
  );
  assert.equal(heard.singleSource, false);
  assert.equal(heard.ears.voice.value.transcript, "A");
  assert.equal(heard.ears.spark.value.transcript, "B");
});

test("uses the other ear when one fails", async () => {
  const heard = await listenWithTwoEars(
      {voice: fakeEar(5, "fail"), spark: fakeEar(15, "B")},
      {graceMs: GRACE_MS},
  );
  assert.equal(heard.singleSource, true);
  assert.equal(heard.ears.voice.ok, false);
  assert.equal(heard.ears.spark.value.transcript, "B");
});

test("stops waiting for a slow ear and cancels it", async () => {
  const slow = fakeEar(500, "B");
  const heard = await listenWithTwoEars(
      {voice: fakeEar(5, "A"), spark: slow},
      {graceMs: GRACE_MS},
  );
  assert.equal(heard.singleSource, true);
  assert.equal(heard.ears.voice.value.transcript, "A");
  assert.equal(heard.ears.spark.ok, false);
  assert.equal(heard.ears.spark.error.kind, "grace-timeout");
  assert.equal(slow.cancelled, true);
  assert.ok(heard.totalMs < 400, `took ${heard.totalMs} ms`);
});

test("waits out a slow ear when the other has already failed", async () => {
  const heard = await listenWithTwoEars(
      {voice: fakeEar(5, "fail"), spark: fakeEar(150, "B")},
      {graceMs: GRACE_MS},
  );
  assert.equal(heard.singleSource, true);
  assert.equal(heard.ears.spark.value.transcript, "B");
});

test("fails clearly when both ears fail", async () => {
  await assert.rejects(
      listenWithTwoEars(
          {voice: fakeEar(5, "fail"), spark: fakeEar(10, "fail")},
          {graceMs: GRACE_MS},
      ),
      (err) => {
        assert.equal(err.kind, "both-ears-failed");
        assert.equal(err.ears.voice.ok, false);
        assert.equal(err.ears.spark.ok, false);
        return true;
      },
  );
});
