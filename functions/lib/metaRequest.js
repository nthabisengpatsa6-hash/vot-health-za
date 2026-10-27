const {META_API_BASE_URL} = require("../constants");

// One retry covers the dropped connections and slow spells seen in testing.
// 60 s per attempt sits above the slowest successful call (51 s).
const ATTEMPT_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
// Rate limiting and server-side failures are usually temporary; any other
// 4xx means the request itself is wrong, so retrying can't help.
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

// Tags an error with what went wrong ("network", "timeout", "http",
// "bad-reply" or "cancelled"), so the retry decision and the logs don't
// parse messages.
function failure(kind, message, status) {
  const err = new Error(message);
  err.kind = kind;
  if (status) err.status = status;
  return err;
}

function shouldRetry(err) {
  return err.kind === "network" || err.kind === "timeout" ||
      (err.kind === "http" && RETRYABLE_STATUSES.includes(err.status));
}

// Contributor models let Meta train on what we send, which contradicts
// Fola's privacy promise, so they are refused here instead of trusting every
// caller to remember.
function assertStandardModel(model) {
  if (typeof model !== "string" || model.length === 0 ||
      model.includes("contributor")) {
    throw new Error(
        `Model "${model}" isn't allowed: only Standard-mode model IDs ` +
        "are used.",
    );
  }
}

// Meta's errors carry a short client-safe message; keep only that.
async function readErrorMessage(response) {
  const text = await response.text();
  try {
    const body = JSON.parse(text);
    const message = (body.error && body.error.message) || body.message;
    if (message) return String(message).slice(0, 200);
  } catch {
    // Not JSON, so fall back to the raw text.
  }
  return text.slice(0, 200) || "no details";
}

// Reads a Chat Completions reply. A reply cut off at the token limit is
// treated as a failure: half a transcript or half a card is worse than none.
async function readChatReply(response) {
  const body = await response.json();
  const choice = (body.choices && body.choices[0]) || {};
  const content = choice.message && choice.message.content;
  const text = Array.isArray(content) ?
      content.map((part) => part.text || "").join("") :
      (content || "");
  if (choice.finish_reason === "length") {
    throw failure("bad-reply", "the reply was cut off at the token limit");
  }
  return {
    text,
    finishReason: choice.finish_reason || null,
    usage: body.usage || null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One HTTP attempt. The timer covers reading the reply too, because a
// stalled body is as stuck as a stalled connection. `outerSignal` lets a
// caller cancel, for example when an ear is no longer needed.
async function attemptOnce(fetchImpl, path, init, readReply, timeoutMs,
    outerSignal) {
  if (outerSignal && outerSignal.aborted) {
    throw failure("cancelled", "the request was cancelled");
  }
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCancel = () => controller.abort();
  if (outerSignal) outerSignal.addEventListener("abort", onCancel);
  try {
    const response = await fetchImpl(`${META_API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw failure(
          "http",
          `Meta API returned status ${response.status}: ` +
          await readErrorMessage(response),
          response.status,
      );
    }
    return await readReply(response);
  } catch (err) {
    if (err.kind) throw err;
    if (timedOut) {
      throw failure(
          "timeout",
          `the attempt took longer than ${timeoutMs / 1000} seconds`,
      );
    }
    if (outerSignal && outerSignal.aborted) {
      throw failure("cancelled", "the request was cancelled");
    }
    if (err instanceof SyntaxError) {
      throw failure("bad-reply", "Meta API sent a reply that isn't JSON");
    }
    // fetch's own message is just "fetch failed"; the cause says why.
    const cause = err.cause ? `: ${err.cause.code || err.cause.message}` : "";
    throw failure("network", `the connection failed (${err.message}${cause})`);
  } finally {
    clearTimeout(timer);
    if (outerSignal) outerSignal.removeEventListener("abort", onCancel);
  }
}

// Sends one Meta API request with a per-attempt timeout and one retry on a
// dropped connection, a timeout or a temporary HTTP error. `buildInit` is
// called per attempt so a request body is never reused after a failed
// upload. Returns the reply plus attempts, timings and why any attempt
// failed; never logs.
async function requestWithRetry({
  label,
  path,
  buildInit,
  readReply = (response) => response.json(),
  fetch: fetchImpl = globalThis.fetch,
  attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
  retryDelayMs = RETRY_DELAY_MS,
  signal,
}) {
  const started = performance.now();
  const attemptMs = [];
  const failures = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const attemptStarted = performance.now();
    try {
      const value = await attemptOnce(
          fetchImpl,
          path,
          buildInit(),
          readReply,
          attemptTimeoutMs,
          signal,
      );
      attemptMs.push(Math.round(performance.now() - attemptStarted));
      return {
        value,
        latencyMs: Math.round(performance.now() - started),
        attempts: attempt,
        attemptMs,
        failures,
      };
    } catch (err) {
      attemptMs.push(Math.round(performance.now() - attemptStarted));
      failures.push({kind: err.kind || "error", status: err.status || null});
      if (attempt === MAX_ATTEMPTS || !shouldRetry(err)) {
        if (attempt > 1) {
          err.message =
              `${label} failed after ${attempt} attempts: ${err.message}.`;
        }
        err.attempts = attempt;
        err.attemptMs = attemptMs;
        err.failures = failures;
        throw err;
      }
      await sleep(retryDelayMs);
    }
  }
}

exports.assertStandardModel = assertStandardModel;
exports.failure = failure;
exports.readChatReply = readChatReply;
exports.requestWithRetry = requestWithRetry;
