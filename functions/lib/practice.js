const fs = require("node:fs");
const path = require("node:path");

// Outside functions/, so the practice files are never part of a deploy.
const PRACTICE_DIR = path.join(
    __dirname, "..", "..", "test-fixtures", "practice-results",
);

// Practice mode stands in for the Meta calls with prepared, made-up results,
// because the emulators run under a "demo-" project and can't reach Meta.
// Both checks must pass: the emulator sets FUNCTIONS_EMULATOR, and Firebase
// never lets a "demo-" project reach a live one. A deployed function has
// neither.
function practiceModeOn(env = process.env) {
  return env.FUNCTIONS_EMULATOR === "true" &&
      typeof env.GCLOUD_PROJECT === "string" &&
      env.GCLOUD_PROJECT.startsWith("demo-");
}

let nextIndex = 0;

// Hands out the prepared results in turn, so every card-screen case comes
// up. The files are read only after the check, so if the check ever passed
// in production this would fail on the missing files instead of returning
// made-up cards.
function nextPracticeResult(env = process.env) {
  if (!practiceModeOn(env)) {
    throw new Error("Practice results are only for the local emulators.");
  }
  const files = fs.readdirSync(PRACTICE_DIR)
      .filter((name) => name.endsWith(".json"))
      .sort();
  const file = files[nextIndex % files.length];
  nextIndex += 1;
  const {result} = JSON.parse(
      fs.readFileSync(path.join(PRACTICE_DIR, file), "utf8"),
  );
  return {...result, practice: true};
}

exports.PRACTICE_DIR = PRACTICE_DIR;
exports.nextPracticeResult = nextPracticeResult;
exports.practiceModeOn = practiceModeOn;
