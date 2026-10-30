const assert = require("node:assert/strict");
const {createHash} = require("node:crypto");
const {test} = require("node:test");
const {SYSTEM_PROMPT} = require("../lib/callRanker");

test("signal settings match the approved 30 Oct freeze at low effort", async () => {
  const {SIGNAL_SETTINGS} = await import("../shared/settings.mjs");
  const {RANK_SETTINGS, PROVIDERS, BANNED_WORDS, BANNED_PREFIXES} = await import("../shared/rank/settings.mjs");
  const {RANK_SCHEMA} = await import("../shared/rank/schema.mjs");
  // Same ordered SHA-256 update method as the extraction-input pin.
  // SYSTEM_PROMPT is exactly the normalized, trimmed text sent by the provider.
  const hash = createHash("sha256")
      .update(JSON.stringify(SIGNAL_SETTINGS))
      .update(SYSTEM_PROMPT)
      .update(JSON.stringify(RANK_SCHEMA))
      .update(JSON.stringify(RANK_SETTINGS))
      .update(JSON.stringify(PROVIDERS))
      .update(JSON.stringify(BANNED_WORDS))
      .update(JSON.stringify(BANNED_PREFIXES))
      .digest("hex").slice(0, 16);
  assert.equal(hash, "abc36af17d67a689",
      "Signal settings changed after the 30 Oct freeze: add a tuning-log entry and update the hash.");
});
