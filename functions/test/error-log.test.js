const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const noteLimit = require("../lib/noteLimit");
const noteTiming = require("../lib/noteTiming");
const {errorDetails} = require("../lib/errorLog");
const {checkMetaConnection, processNote} = require("../index");
const {makeWav} = require("./make-wav");

// Made up. The UID must never reach the log.
const UID = "error-log-test-uid";
const FUNCTIONS_DIR = path.resolve(__dirname, "..");
const DOC_NAME = "projects/vot-health-za/databases/(default)/documents/" +
    `noteUsage/${UID}`;

// The real Firebase logger writes each line as JSON to stderr. Catching it
// there keeps the logger's own handling of the entry (it overwrites
// "message") inside the test.
function captureLogLines(t) {
  const lines = [];
  const real = process.stderr.write;
  process.stderr.write = (chunk, ...rest) => {
    const text = String(chunk);
    if (!text.startsWith("{")) return real.call(process.stderr, chunk, ...rest);
    lines.push({text, entry: JSON.parse(text)});
    return true;
  };
  t.after(() => {
    process.stderr.write = real;
  });
  return lines;
}

function lineFor(lines, words) {
  const found = lines.filter(({entry}) => entry.message.includes(words));
  assert.equal(found.length, 1, words);
  return found[0];
}

function withValue(t, object, key, value) {
  const real = object[key];
  object[key] = value;
  t.after(() => {
    object[key] = real;
  });
}

test("a counter failure's log line keeps the reason and leaves out the " +
    "UID", async (t) => {
  withValue(t, noteTiming, "write", () => {});
  withValue(t, noteLimit, "reserveNote", async () => {
    throw Object.assign(new Error("7 PERMISSION_DENIED: Missing or " +
        `insufficient permissions on ${DOC_NAME} for ${UID}.`), {code: 7});
  });
  const lines = captureLogLines(t);

  await assert.rejects(processNote.run({
    auth: {uid: UID},
    data: {audioBase64: makeWav({seconds: 1}).toString("base64")},
    rawRequest: {},
  }), {code: "unavailable"});

  const {text, entry} = lineFor(lines, "Daily note counter failed");
  assert.equal(entry.severity, "ERROR");
  assert.equal(entry.errorName, "Error");
  assert.equal(entry.errorCode, 7);
  assert.equal(entry.reason, "7 PERMISSION_DENIED: Missing or insufficient " +
      "permissions on projects/vot-health-za/databases/(default)/documents/" +
      "[redacted] for [redacted].");
  assert.match(entry.where, /^test\/error-log\.test\.js:\d+$/);
  assert.ok(!text.includes(UID), "the UID is in the log line");
});

test("a Meta connection failure logs the cause's code", async (t) => {
  withValue(t, process.env, "META_API_KEY", "not-a-real-key");
  withValue(t, globalThis, "fetch", async () => {
    const cause = Object.assign(
        new Error("getaddrinfo ENOTFOUND api.meta.ai"),
        {code: "ENOTFOUND"},
    );
    throw new TypeError("fetch failed", {cause});
  });
  const lines = captureLogLines(t);

  await assert.rejects(
      checkMetaConnection.run({auth: {uid: UID}, data: {}, rawRequest: {}}),
      {code: "unavailable"},
  );

  const {text, entry} = lineFor(lines, "Could not reach the Meta API");
  assert.equal(entry.errorName, "TypeError");
  assert.equal(entry.errorCode, "ENOTFOUND");
  assert.equal(entry.reason, "fetch failed");
  assert.match(entry.where, /^test\/error-log\.test\.js:\d+$/);
  assert.ok(!text.includes(UID), "the UID is in the log line");
});

test("the reason loses the UID and our document paths", () => {
  const err = new Error(`5 NOT_FOUND: no document at ${DOC_NAME}; also ` +
      `users/${UID}, cards/abc123 and noteUsage/x, seen by ${UID}`);
  assert.equal(errorDetails(err, {uid: UID}).reason, "5 NOT_FOUND: no " +
      "document at projects/vot-health-za/databases/(default)/documents/" +
      "[redacted]; also [redacted], [redacted] and [redacted], seen by " +
      "[redacted]");
});

test("other slash-separated text stays readable", () => {
  const message = "Expected application/json but got text/html from " +
      "https://firestore.googleapis.com/v1/users/guide";
  assert.equal(errorDetails(new Error(message), {uid: UID}).reason, message);
});

test("a long reason is cut, and an empty UID changes nothing", () => {
  assert.equal(errorDetails(new Error("x".repeat(600))).reason.length, 500);
  assert.equal(errorDetails(new Error("abc"), {uid: ""}).reason, "abc");
});

test("a thrown value that isn't an error still gives a reason", () => {
  assert.deepEqual(errorDetails("plain text"), {
    errorName: null,
    errorCode: null,
    reason: "plain text",
    where: null,
  });
  const odd = Object.assign(new Error("odd"), {code: {nested: true}});
  assert.equal(errorDetails(odd).errorCode, null);
});

test("where is the first line in our own code, file and line only", () => {
  const ours = (...parts) => path.join(FUNCTIONS_DIR, ...parts);
  const grpc = ours("node_modules", "@grpc", "grpc-js", "build", "call.js");
  const err = new Error("boom");
  err.stack = [
    "Error: boom",
    `    at callErrorFromStatus (${grpc}:31:19)`,
    "    at process.processTicksAndRejections " +
        "(node:internal/process/task_queues:105:5)",
    `    at async reserveNote (${ours("lib", "noteLimit.js")}:38:13)`,
    `    at ${ours("index.js")}:123:13`,
  ].join("\n");
  assert.equal(errorDetails(err).where, "lib/noteLimit.js:38");

  err.stack = [
    "Error: boom",
    `    at callErrorFromStatus (${grpc}:31:19)`,
    `    at outside (${path.join(FUNCTIONS_DIR, "..", "src", "x.js")}:1:1)`,
    "    at node:internal/process/task_queues:105:5",
  ].join("\n");
  assert.equal(errorDetails(err).where, null);
});
