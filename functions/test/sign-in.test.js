const test = require("node:test");
const assert = require("node:assert/strict");
const {checkMetaConnection, processNote} = require("../index");

// Any network call means a check ran too late, so fetch fails the test.
function withNoNetwork(t) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("fetch was called before the sign-in check");
  };
  t.after(() => {
    globalThis.fetch = realFetch;
  });
}

// run() calls the handler directly, as the callable would after decoding
// the request; a missing auth means the caller isn't signed in.
const CALLABLES = {checkMetaConnection, processNote};

for (const [name, callable] of Object.entries(CALLABLES)) {
  test(`${name} refuses a caller who isn't signed in`, async (t) => {
    withNoNetwork(t);
    await assert.rejects(
        callable.run({data: {}, rawRequest: {}}),
        {code: "unauthenticated"},
    );
  });
}
