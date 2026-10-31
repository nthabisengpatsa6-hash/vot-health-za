import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignalDetailLoader } from "../../src/lib/loadSignalDetail.js";

test("a rejected screen import is evicted while pending and successful loads are shared", async () => {
  let attempts = 0;
  const module = { default() {} };
  const load = createSignalDetailLoader(async () => { if (++attempts === 1) throw Error("Offline test failure"); return module; });
  const first = load();
  assert.equal(load(), first);
  await assert.rejects(first, /Offline test failure/);
  const second = load();
  assert.notEqual(second, first);
  assert.equal(await second, module);
  assert.equal(await load(), module);
  assert.equal(attempts, 2);
});
