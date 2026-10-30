const assert = require("node:assert/strict");
const {test} = require("node:test");
const {callRanker, PROMPT_HASH} = require("../lib/callRanker");
const {rankTimingEntry} = require("../lib/rankTiming");

const API_KEY = "offline-placeholder";
const input = {signal: {}, sources: [], sourceEvidence: [], cards: []};
const envelope = (text, finish = "stop") => new Response(JSON.stringify({choices: [{message: {content: text}, finish_reason: finish}], usage: {prompt_tokens: 10, completion_tokens: 20}}));
function fake(responses) {
  const requests = [];
  const logs = [];
  const options = {apiKey: API_KEY, log: (entry) => logs.push(entry), fetch: async (_url, init) => {
    requests.push(JSON.parse(init.body));
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response;
  }};
  return {options, requests, logs};
}

test("ranker sends the approved settings and one content-free timing line", async () => {
  const {options, requests, logs} = fake([envelope('{"sources":[]}')]);
  const result = await callRanker(input, {...options, effort: "medium"});
  const request = requests[0];
  assert.equal(request.model, "muse-spark-1.3");
  assert.equal(request.reasoning_effort, "medium");
  assert.equal(request.temperature, 0);
  assert.equal(request.max_completion_tokens, 8000);
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(request.store, false);
  assert.equal(result.unavailable, false);
  assert.equal(result.promptHash, PROMPT_HASH);
  assert.deepEqual(result.tokens, {input: 10, output: 20});
  assert.equal(logs.length, 1);
  assert.ok(!JSON.stringify(logs).includes(API_KEY));
  assert.deepEqual(Object.keys(logs[0]), ["model", "effort", "promptHash", "inputTokens", "outputTokens", "ms", "attempts", "outcome"]);
  assert.ok(!Object.hasOwn(rankTimingEntry({content: "private", Authorization: "private"}), "content"));
});

test("only invalid JSON earns one retry; usage and raw attempts are preserved", async () => {
  const {options, requests, logs} = fake([envelope("not JSON"), envelope('{"sources":[]}')]);
  const result = await callRanker(input, options);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(result.attempts, 2);
  assert.deepEqual(result.tokens, {input: 20, output: 40});
  assert.deepEqual(result.rawAttempts, ["not JSON", '{"sources":[]}']);
  assert.equal(logs.length, 1);
});

test("two invalid JSON replies return unavailable", async () => {
  const {options, requests} = fake([envelope("bad"), envelope("still bad")]);
  const result = await callRanker(input, options);
  assert.equal(result.unavailable, true);
  assert.equal(result.outcome, "invalid_json");
  assert.equal(requests.length, 2);
});

test("HTTP and connection failures never retry or expose error text", async () => {
  for (const response of [{ok: false, text: () => {throw new Error("must not read HTTP error body");}}, new Error(`Authorization: Bearer ${API_KEY}`)]) {
    const {options, requests, logs} = fake([response]);
    const result = await callRanker(input, options);
    assert.equal(result.unavailable, true);
    assert.equal(requests.length, 1);
    assert.ok(!JSON.stringify({result, logs}).includes(API_KEY));
    assert.ok(!JSON.stringify({result, logs}).includes("Authorization"));
  }
});

test("timeout covers reading the body and emits no second request", async () => {
  let calls = 0;
  const result = await callRanker(input, {apiKey: API_KEY, timeoutMs: 5, log: () => {}, fetch: async () => {
    calls++;
    return {ok: true, text: () => new Promise(() => {})};
  }});
  assert.equal(result.outcome, "timeout");
  assert.equal(calls, 1);
});

test("non-stop replies are unavailable even when their content is valid JSON", async () => {
  const {options, requests} = fake([envelope('{"sources":[]}', "length")]);
  const result = await callRanker(input, options);
  assert.equal(result.unavailable, true);
  assert.equal(result.outcome, "incomplete_reply");
  assert.equal(requests.length, 1);
});

test("a credential echo is refused before it can be persisted", async () => {
  const {options} = fake([envelope(`{"sources":[],"echo":"${API_KEY}"}`)]);
  const result = await callRanker(input, options);
  assert.equal(result.outcome, "unsafe_reply");
  assert.ok(!JSON.stringify(result).includes(API_KEY));
});

test("Baseten and nonstandard models are refused before any call", async () => {
  const {options, requests} = fake([]);
  await assert.rejects(callRanker(input, {...options, provider: "baseten"}), /Only the Meta/);
  await assert.rejects(callRanker(input, {...options, model: "unapproved-model"}), /Standard-mode/);
  assert.equal(requests.length, 0);
});
