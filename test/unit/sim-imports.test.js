import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// What the simulation may touch, and who may touch it. The simulation runs
// with no sign-in, no Firestore and no network, the same in Node and in any
// browser; signal code reaches it only through engine.js, so it can't read
// the rates (the honesty rule) or the ground truth (the scorecard's alone);
// and the app doesn't import it yet, so it can't grow the main bundle (on
// Day 4 it's loaded with import() on the /demo route).
// The statistics (functions/shared/) follow the same rules, and more: they
// take cards as input and never reach the simulation, Firebase, a package
// or a Node built-in, so the browser and a Cloud Function run the same code.
// Only the scorecard brings the two together.
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SIM = join(ROOT, "src", "sim");
const SHARED = join(ROOT, "functions", "shared");
const DATA = join(ROOT, "functions", "data");
const rel = (path) => relative(ROOT, path).split(sep).join("/");

// The app files the simulation may use: the card lists, the profile lists,
// the card builder and the town file, plus the statistics (for the
// scorecard). All are free of Firebase.
const SIM_MAY_USE = ["src/config/cardOptions.js", "src/config/profileOptions.js", "src/lib/cardDraft.js", "functions/data/places.json"];
const MAY_READ_SETTINGS = ["src/sim/background.js", "src/sim/draws.js", "src/sim/seededCluster.js", "src/sim/engine.js", "src/sim/groundTruth.js"];
// The scorecard, the only sim file that also runs the statistics.
const MAY_READ_GROUND_TRUTH = ["src/sim/scorecard.js"];
const MAY_USE_STATISTICS = ["src/sim/scorecard.js"];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx|mjs|cjs)$/.test(name) ? [path] : [];
  });
}
// Everything except the tests, which may import any module they check.
const APP_FILES = ["src", "scripts", "functions"].flatMap((dir) => sourceFiles(join(ROOT, dir)));
const SIM_FILES = sourceFiles(SIM);
const SHARED_FILES = sourceFiles(SHARED);

// Code without its comments, so a comment can't hide or fake an import. A
// "//" after a colon (as in https://) isn't a comment.
const codeOnly = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const IMPORT_PATTERNS = [
  /\b(?:import|export)\b[^"';]*?\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];
function specifiers(source) {
  const code = codeOnly(source);
  return IMPORT_PATTERNS.flatMap((pattern) => [...code.matchAll(pattern)].map((match) => match[1]));
}

// A relative import as a file path; anything else (a package) as null.
function resolveImport(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(file), specifier);
  const found = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, join(base, "index.js")].find((path) => existsSync(path) && statSync(path).isFile());
  assert.ok(found, `${rel(file)} imports "${specifier}", which doesn't exist`);
  return found;
}
const importsOf = (file) => specifiers(readFileSync(file, "utf8")).map((specifier) => ({ specifier, path: resolveImport(file, specifier) }));
const importersOf = (target) => APP_FILES.filter((file) => importsOf(file).some(({ path }) => path === join(ROOT, target))).map(rel);

// Every file reached by following imports from the given files.
function reachedFrom(files) {
  const reached = new Map();
  const queue = [...files];
  while (queue.length > 0) {
    const file = queue.pop();
    if (reached.has(file)) continue;
    const imports = file.endsWith(".json") ? [] : importsOf(file);
    reached.set(file, imports);
    for (const { path } of imports) if (path) queue.push(path);
  }
  return reached;
}
const reachedFromSim = () => reachedFrom(SIM_FILES);
const isStatistics = (file) => file.startsWith(SHARED + sep);

// Code that must run the same in Node and in any browser, with no sign-in,
// no network and no clock.
const FORBIDDEN = [
  [/\bfetch\s*\(/, "fetch"], [/XMLHttpRequest|WebSocket|EventSource|sendBeacon/, "a network call"], [/firebase/i, "Firebase"],
  [/\b(?:window|document|navigator|localStorage|sessionStorage|indexedDB)\b/, "the browser"],
  [/Math\.random/, "Math.random"], [/Date\.now|performance\.now|new Date\(\s*\)/, "the clock"],
  [/\.get(?:FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds|TimezoneOffset)\(|toLocale|\bIntl\b/, "the computer's time zone"],
  [/Math\.(?!floor\b|ceil\b|round\b|min\b|max\b|abs\b|imul\b|trunc\b)\w+|\*\*/, "maths that browsers may round differently"],
];
function assertPure(files) {
  for (const file of files) {
    if (file.endsWith(".json")) continue;
    const code = codeOnly(readFileSync(file, "utf8"));
    for (const [pattern, what] of FORBIDDEN) assert.doesNotMatch(code, pattern, `${rel(file)} uses ${what}`);
  }
}

test("the import scanner sees static imports, import() and require", () => {
  assert.deepEqual(specifiers('import a from "./a.js";\nimport {\n  b,\n} from "./b.js";\nexport { c } from "./c.js";\nconst d = await import("./d.js");\nconst e = require("./e");\n// import f from "./f.js";'), ["./a.js", "./b.js", "./c.js", "./d.js", "./e"]);
  assert.ok(importersOf("src/sim/scenarios.js").includes("src/sim/engine.js"));
});

test("the simulation reaches only its own files, the app's lists, the card builder, the town file and the statistics: no Firebase, no packages", () => {
  assert.ok(SIM_FILES.length >= 10);
  for (const [file, imports] of reachedFromSim()) {
    assert.ok(file.startsWith(SIM + sep) || SIM_MAY_USE.includes(rel(file)) || isStatistics(file), `the simulation reaches ${rel(file)}`);
    for (const { specifier, path } of imports) assert.ok(path, `${rel(file)} imports the package "${specifier}"`);
  }
});

test("no file the simulation reaches uses the network, storage, the clock, the time zone or engine-dependent maths", () => {
  assertPure(reachedFromSim().keys());
});

test("the statistics reach only functions/shared/ and functions/data/: no simulation, Firebase, packages or Node built-ins", () => {
  assert.ok(SHARED_FILES.length >= 6);
  for (const [file, imports] of reachedFrom(SHARED_FILES)) {
    assert.ok(isStatistics(file) || file.startsWith(DATA + sep), `the statistics reach ${rel(file)}`);
    for (const { specifier, path } of imports) assert.ok(path, `${rel(file)} imports "${specifier}", which isn't in functions/shared/ or functions/data/`);
  }
});

test("no file the statistics reach uses the network, storage, the clock, the time zone or engine-dependent maths", () => {
  assertPure(reachedFrom(SHARED_FILES).keys());
});

test("outside src/sim, only engine.js may be imported (and the scorecard, by scripts), and the app imports neither the simulation nor the statistics yet", () => {
  for (const file of APP_FILES.filter((path) => !path.startsWith(SIM + sep))) {
    for (const { path } of importsOf(file)) {
      if (!path) continue;
      if (isStatistics(path)) assert.ok(!rel(file).startsWith("src/"), `${rel(file)} puts the statistics in the app's main bundle`);
      if (!path.startsWith(SIM + sep)) continue;
      assert.ok(["src/sim/engine.js", "src/sim/scorecard.js"].includes(rel(path)), `${rel(file)} imports ${rel(path)}`);
      if (rel(path) === "src/sim/scorecard.js") assert.ok(rel(file).startsWith("scripts/"), `${rel(file)} imports the scorecard`);
      assert.ok(!rel(file).startsWith("src/"), `${rel(file)} puts the simulation in the app's main bundle`);
    }
  }
});

test("only the generator reads the scenario settings, and only the scorecard reads the ground truth and runs the statistics", () => {
  for (const file of importersOf("src/sim/scenarios.js")) assert.ok(MAY_READ_SETTINGS.includes(file), `${file} reads the scenario settings`);
  for (const file of importersOf("src/sim/groundTruth.js")) assert.ok(MAY_READ_GROUND_TRUTH.includes(file), `${file} reads the ground truth`);
  for (const file of SIM_FILES) {
    if (importsOf(file).some(({ path }) => path && isStatistics(path))) assert.ok(MAY_USE_STATISTICS.includes(rel(file)), `${rel(file)} runs the statistics`);
  }
});
