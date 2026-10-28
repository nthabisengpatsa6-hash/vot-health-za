import assert from "node:assert/strict";
import { test } from "node:test";
import { SHOW_TIMING, formatTiming, timingRequested } from "../../src/lib/timing.js";

test("the timing line is asked for only with ?timing=1", () => {
  assert.equal(timingRequested("?timing=1"), true);
  assert.equal(timingRequested("?foo=bar&timing=1"), true);
  for (const search of ["", "?timing=0", "?timing=true", "?timing", "?Timing=1"]) {
    assert.equal(timingRequested(search), false, search);
  }
  // No page here, so it's off.
  assert.equal(SHOW_TIMING, false);
});

test("the timing line in seconds, one decimal, leaving out what isn't known", () => {
  assert.equal(formatTiming({ uploadMs: 2100, serverMs: 18_449, totalMs: 21_000 }), "Upload 2.1 s, server 18.4 s, total 21.0 s");
  assert.equal(formatTiming({ uploadMs: 2100 }), "Upload 2.1 s");
  // A failed note has no server time; a note that failed before the upload
  // finished has no upload time either.
  assert.equal(formatTiming({ uploadMs: 2100, totalMs: 30_000 }), "Upload 2.1 s, total 30.0 s");
  assert.equal(formatTiming({ uploadMs: null, totalMs: 960 }), "Total 1.0 s");
  assert.equal(formatTiming({}), "");
});
