const assert = require("node:assert/strict");
const {test} = require("node:test");
const {createRankHandler, OPTIONS} = require("../lib/rankSources");
const {callRanker, PROMPT_HASH} = require("../lib/callRanker");
const {rankSources} = require("../index");

const data = {day: 17, symptomGroup: "diarrhoea_vomiting", area: "Leeba View"};
const signed = (request = data) => ({auth: {uid: "ranking-test-user"}, data: request});
function harness(overrides = {}) {
  const logs = [];
  const calls = [];
  let reservations = 0;
  let secretReads = 0;
  const handler = createRankHandler({
    apiKey: () => { secretReads++; return "offline-placeholder"; },
    now: () => new Date("2026-10-30T10:00:00Z"),
    reserve: async () => { reservations++; return {allowed: true}; },
    rank: async (input, options) => {
      calls.push(input);
      assert.equal(reservations, 1, "allowance reserved before the provider");
      return callRanker(input, {...options, fetch: async (_url, request) => {
        const body = JSON.parse(request.body);
        assert.equal(body.model, "muse-spark-1.3");
        assert.equal(body.reasoning_effort, "low");
        assert.equal(body.max_completion_tokens, 8000);
        const sourceId = input.sources[0].id;
        const fact = input.sourceEvidence.find((source) => source.sourceId === sourceId).supporting[0];
        return {ok: true, text: async () => JSON.stringify({choices: [{finish_reason: "stop", message: {content: JSON.stringify({sources: [{sourceId, rank: 1, confidence: "low", supporting: [fact.id], contradicting: [], reason: "Evidence worth checking."}]})}}], usage: {prompt_tokens: 7, completion_tokens: 9}})};
      }});
    },
    write: (entry) => logs.push(entry), ...overrides,
  });
  return {handler, logs, calls, get reservations() { return reservations; }, get secretReads() { return secretReads; }};
}

test("rankSources deployment config has one CPU for concurrent 512 MiB requests", () => {
  assert.deepEqual(OPTIONS, {region: "africa-south1", memory: "512MiB", cpu: 1, timeoutSeconds: 150, maxInstances: 3, minInstances: 0, concurrency: 4});
  assert.equal(rankSources.__endpoint.cpu, 1);
  assert.equal(rankSources.__endpoint.concurrency, 4);
  assert.equal(rankSources.__endpoint.secretEnvironmentVariables[0].key, "META_API_KEY");
});

test("signed-out calls cannot reserve allowance or read the secret", async () => {
  const h = harness();
  await assert.rejects(h.handler({data}), {code: "unauthenticated"});
  assert.equal(h.reservations, 0); assert.equal(h.secretReads, 0);
  assert.equal(h.logs[0].outcome, "signed_out");
});

test("exact request schema rejects wrong types, extra keys, seed and run", async () => {
  const h = harness();
  const requests = [null, [], {}, {...data, day: "17"}, {...data, day: 17.5}, {...data, day: -1}, {...data, day: 29}, {...data, day: NaN}, {...data, area: 1}, {...data, area: "Unknown"}, {...data, symptomGroup: []}, {...data, symptomGroup: "unknown"}, {...data, seed: 1}, {...data, run: "seeded"}, {...data, extra: true}];
  for (const request of requests) await assert.rejects(h.handler(signed(request)), {code: "invalid-argument"});
  assert.equal(h.reservations, 0); assert.equal(h.calls.length, 0); assert.equal(h.secretReads, 0);
  assert.equal(h.logs.length, requests.length);
});

test("no signal and Watch are refused before any allowance is reserved", async () => {
  const h = harness();
  for (const day of [0, 15, 16, 28]) await assert.rejects(h.handler(signed({...data, day})), {code: "failed-precondition"});
  await assert.rejects(h.handler(signed({...data, area: "Lebone Gardens"})), {code: "failed-precondition"});
  assert.equal(h.reservations, 0); assert.equal(h.calls.length, 0); assert.equal(h.secretReads, 0);
  assert.ok(h.logs.every((line) => line.outcome === "no_signal"));
});

test("full callable with fake HTTP returns only cleaned ranking and allowed metadata", async () => {
  const h = harness();
  const reply = await h.handler(signed());
  assert.deepEqual(Object.keys(reply).sort(), ["ranking", "model", "effort", "promptHash", "ms", "rankedAt"].sort());
  assert.equal(reply.promptHash, PROMPT_HASH);
  assert.equal(reply.rankedAt, "2026-10-30T10:00:00.000Z");
  assert.ok(reply.ranking.sources[0].supporting[0].cardIds.every((id) => id.startsWith("sim-")));
  assert.doesNotMatch(JSON.stringify(reply), /reporter|rawOutput|inputTokens|offline-placeholder/);
  assert.equal(h.logs.length, 1);
  assert.deepEqual(Object.keys(h.logs[0]).sort(), ["model", "effort", "promptHash", "inputTokens", "outputTokens", "ms", "attempts", "outcome"].sort());
  assert.doesNotMatch(JSON.stringify(h.logs), /ranking-test-user|Evidence worth|sim-|diarrhoea|Leeba|offline-placeholder/);
  assert.equal(h.logs[0].outcome, "ok");
});

test("cap refusal and counter failure prevent provider and secret access", async () => {
  for (const [reserve, code] of [[async () => ({allowed: false}), "resource-exhausted"], [async () => { throw new Error("private-content-marker"); }, "unavailable"]]) {
    const h = harness({reserve});
    await assert.rejects(h.handler(signed()), (error) => {
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private-content-marker/);
      if (error.code === "resource-exhausted") assert.equal(error.message, "Today's live-ranking limit is reached. The saved ranking is still shown.");
      return true;
    });
    assert.equal(h.secretReads, 0); assert.equal(h.calls.length, 0); assert.equal(h.logs.length, 1);
  }
});

test("provider failures stay counted, are sanitized, and log exactly once", async () => {
  for (const rank of [async () => { throw new Error("private-content-marker"); }, async (_input, options) => {
    options.log({model: "muse-spark-1.3", effort: "low", promptHash: PROMPT_HASH, ms: 123, attempts: 1, outcome: "timeout"});
    return {unavailable: true};
  }, async () => ({raw: {sources: []}, ms: 1})]) {
    const h = harness({rank});
    await assert.rejects(h.handler(signed()), {code: "unavailable"});
    assert.equal(h.reservations, 1); assert.equal(h.logs.length, 1);
    assert.notEqual(h.logs[0].outcome, "ok");
    assert.doesNotMatch(JSON.stringify(h.logs), /private-content-marker|ranking-test-user/);
  }
});
