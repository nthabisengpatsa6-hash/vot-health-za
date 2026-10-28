const path = require("node:path");

// Use errorDetails only for errors whose message can't contain note content:
// never, for example, an error built from a raw Meta response body, which
// can echo the transcript.
//
// The Firebase logger overwrites a "message" key with the line's own text,
// so the error's message goes in as "reason".

const FUNCTIONS_DIR = path.resolve(__dirname, "..");
const REASON_LIMIT = 500;
const REDACTED = "[redacted]";

// Our own collections, whose document IDs can be a user's UID. A new
// collection goes here too. Other slash-separated text (text/html, links)
// stays, because it may be the clue.
const OUR_COLLECTIONS = ["users", "cards", "noteUsage"];
// A path ends at a space, a quote or ",;)", so the sentence around it stays
// readable; our document IDs never contain those.
const OUR_PATH = new RegExp(
    `(?<![\\w/.-])(?:${OUR_COLLECTIONS.join("|")})/[^\\s"'\`,;)]+`, "g");
// Everything after "documents/" in a full Firestore name. The project and
// database before it stay.
const DOCUMENT_PATH = /(\/documents\/)[^\s"'`,;)]+/g;

function redact(text, uid) {
  const withoutUid = typeof uid === "string" && uid ?
      text.split(uid).join(REDACTED) : text;
  return withoutUid
      .replace(DOCUMENT_PATH, `$1${REDACTED}`)
      .replace(OUR_PATH, REDACTED);
}

// A code is a short number or name, such as Firestore's 7 or "ENOTFOUND".
const plainCode = (code) =>
  typeof code === "number" || typeof code === "string" ? code : null;

// "at fn (file:line:column)" or "at file:line:column".
function frameLocation(line) {
  const text = line.trim();
  if (!text.startsWith("at ")) return null;
  const open = text.lastIndexOf("(");
  const location = text.endsWith(")") && open !== -1 ?
      text.slice(open + 1, -1) : text.slice(3).replace(/^async /, "");
  const match = /^(.+):(\d+):\d+$/.exec(location);
  return match ? {file: match[1], line: match[2]} : null;
}

// The first stack line in our own code (not node_modules), as file and line
// relative to functions/, so no folder path reaches the log. Null when the
// error never passed through our code.
function whereFrom(stack) {
  if (typeof stack !== "string") return null;
  for (const line of stack.split("\n")) {
    const frame = frameLocation(line);
    if (!frame || !path.isAbsolute(frame.file)) continue;
    const relative = path.relative(FUNCTIONS_DIR, frame.file);
    const parts = relative.split(path.sep);
    if (path.isAbsolute(relative) || parts[0] === ".." ||
        parts.includes("node_modules")) {
      continue;
    }
    return `${parts.join("/")}:${frame.line}`;
  }
  return null;
}

// What a caught error says about itself, for one log line: its name, its
// code (or its cause's, where fetch keeps the real one), its message with
// the caller's UID and our document paths taken out, and where in our code
// it was thrown. Nothing else is copied from the error.
function errorDetails(err, {uid} = {}) {
  const message = err && typeof err.message === "string" ?
      err.message : String(err);
  return {
    errorName: err && typeof err.name === "string" ? err.name : null,
    errorCode: plainCode(err?.code) ?? plainCode(err?.cause?.code),
    reason: redact(message, uid).slice(0, REASON_LIMIT),
    where: whereFrom(err?.stack),
  };
}

exports.errorDetails = errorDetails;
