const test = require("node:test");
const assert = require("node:assert/strict");
const {transcribeWav} = require("../lib/transcribe");
const {makeWav} = require("./make-wav");

// Short timers so the timeout and retry paths run in milliseconds.
const OPTIONS = {apiKey: "test-key", attemptTimeoutMs: 20, retryDelayMs: 0};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type": "application/json"},
  });
}

// A stand-in for fetch that plays back one scripted outcome per call:
// "ok", "drop" (connection lost), "hang" (never answers) or an HTTP status.
function fakeFetch(...outcomes) {
  const calls = [];
  async function fetch(url, init) {
    calls.push({url, init});
    const outcome = outcomes[calls.length - 1];
    if (outcome === "drop") {
      throw new TypeError("fetch failed", {cause: {code: "ECONNRESET"}});
    }
    if (outcome === "hang") {
      // Only our own timeout ends this, the way a stalled request would.
      return new Promise((resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("This operation was aborted", "AbortError"));
        });
      });
    }
    if (typeof outcome === "number") {
      return jsonResponse({error: {message: `fake ${outcome}`}}, outcome);
    }
    return jsonResponse({
      sessionId: "fake-session",
      transcript: "fake transcript",
      audioDurationMs: 1000,
      turns: [],
    });
  }
  return {fetch, calls};
}

test("succeeds first time and sends no hints by default", async () => {
  const {fetch, calls} = fakeFetch("ok");
  const result = await transcribeWav(makeWav(), {...OPTIONS, fetch});

  assert.equal(result.transcript, "fake transcript");
  assert.equal(result.attempts, 1);
  assert.equal(result.attemptMs.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.meta.ai/v1/asr/transcribe");
  const request = JSON.parse(await calls[0].init.body.get("request").text());
  assert.deepEqual(request, {
    mode: "PUSH_TO_TALK",
    model: "muse-voice-transcribe-1.0",
    audioEncoding: "WAV",
  });
});

test("retries once after a dropped connection", async () => {
  const {fetch, calls} = fakeFetch("drop", "ok");
  const result = await transcribeWav(makeWav(), {...OPTIONS, fetch});

  assert.equal(result.transcript, "fake transcript");
  assert.equal(result.attempts, 2);
  assert.equal(result.attemptMs.length, 2);
  assert.equal(calls.length, 2);
});

test("retries once after an attempt times out", async () => {
  const {fetch, calls} = fakeFetch("hang", "ok");
  const result = await transcribeWav(makeWav(), {...OPTIONS, fetch});

  assert.equal(result.attempts, 2);
  assert.equal(calls.length, 2);
});

test("retries once after a 500", async () => {
  const {fetch, calls} = fakeFetch(500, "ok");
  const result = await transcribeWav(makeWav(), {...OPTIONS, fetch});

  assert.equal(result.attempts, 2);
  assert.equal(calls.length, 2);
});

test("retries once after 429, 502, 503 and 504", async () => {
  for (const status of [429, 502, 503, 504]) {
    const {fetch, calls} = fakeFetch(status, "ok");
    const result = await transcribeWav(makeWav(), {...OPTIONS, fetch});
    assert.equal(result.attempts, 2, `status ${status}`);
    assert.equal(calls.length, 2, `status ${status}`);
  }
});

test("doesn't retry a 400", async () => {
  const {fetch, calls} = fakeFetch(400, "ok");
  await assert.rejects(
      transcribeWav(makeWav(), {...OPTIONS, fetch}),
      (err) => {
        assert.equal(err.kind, "http");
        assert.equal(err.status, 400);
        assert.equal(err.attempts, 1);
        assert.match(err.message, /status 400: fake 400/);
        return true;
      },
  );
  assert.equal(calls.length, 1);
});

test("gives a clear error when both attempts fail", async () => {
  const {fetch, calls} = fakeFetch("drop", "hang");
  await assert.rejects(
      transcribeWav(makeWav(), {...OPTIONS, fetch}),
      (err) => {
        assert.equal(err.kind, "timeout");
        assert.equal(err.attempts, 2);
        assert.equal(err.attemptMs.length, 2);
        assert.match(err.message, /^Transcription failed after 2 attempts: /);
        return true;
      },
  );
  assert.equal(calls.length, 2);
});
