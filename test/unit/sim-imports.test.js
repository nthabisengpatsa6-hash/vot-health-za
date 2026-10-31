import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// What the simulation may touch, and who may touch it. The simulation runs
// with no sign-in, no Firestore and no network, the same in Node and in any
// browser; signal code reaches it only through engine.js, so it can't read
// the rates (the honesty rule) or the ground truth (the scorecard's alone);
// and in the app only the /demo route loads it, with import(), so it can't
// grow the main file.
// The statistics (functions/shared/) follow the same rules, and more: they
// take cards as input and never reach the simulation, Firebase, a package
// or a Node built-in, so the browser and a Cloud Function run the same code.
// Only the scorecard brings the two together. Every page loads the main
// file, so neither it nor the /demo route may reach Firebase: a signed-out
// visitor to the replay never loads it.
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LEGACY_SIM = join(ROOT, "src", "sim");
const SIM = join(ROOT, "functions", "shared", "sim");
const RANK = join(ROOT, "functions", "shared", "rank");
const SHARED = join(ROOT, "functions", "shared");
const DATA = join(ROOT, "functions", "data");
const rel = (path) => relative(ROOT, path).split(sep).join("/");

// The app files the simulation may use: the card lists, the profile lists,
// the card builder and the town file, plus the statistics (for the
// scorecard). All are free of Firebase.
const SIM_MAY_USE = ["functions/shared/cardDoc.mjs", "functions/shared/cardFields.mjs", "functions/data/places.json"];
const MAY_READ_SETTINGS = ["functions/shared/sim/background.mjs", "functions/shared/sim/draws.mjs", "functions/shared/sim/engine.mjs", "src/sim/groundTruth.js", "src/sim/scenarios.js"];
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
const APP_FILES = ["src", "scripts", "functions"].flatMap((dir) => sourceFiles(join(ROOT, dir))).filter((file) => !rel(file).startsWith("functions/test/"));
const SHIMS = sourceFiles(LEGACY_SIM).filter((file) => !["groundTruth.js", "scorecard.js"].includes(file.split(sep).at(-1)));
const SIM_FILES = sourceFiles(SIM);
const SHARED_FILES = sourceFiles(SHARED).filter((file) => dirname(file) === SHARED && !["cardDoc.mjs", "cardFields.mjs"].includes(file.split(sep).at(-1)));

// Code without its comments, so a comment can't hide or fake an import. A
// "//" after a colon (as in https://) isn't a comment.
const codeOnly = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const IMPORT_PATTERNS = [
  /\b(?:import|export)\b[^"';]*?\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  DYNAMIC_IMPORT,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];
// Each import, and whether it's import(), which Vite gives a file of its own.
function importList(source) {
  const code = codeOnly(source);
  return IMPORT_PATTERNS.flatMap((pattern) => [...code.matchAll(pattern)].map((match) => ({ specifier: match[1], dynamic: pattern === DYNAMIC_IMPORT })));
}
const specifiers = (source) => importList(source).map(({ specifier }) => specifier);

// A relative import as a file path; anything else (a package) as null.
function resolveImport(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(file), specifier);
  const found = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, join(base, "index.js")].find((path) => existsSync(path) && statSync(path).isFile());
  assert.ok(found, `${rel(file)} imports "${specifier}", which doesn't exist`);
  return found;
}
const importsOf = (file) => importList(readFileSync(file, "utf8")).map(({ specifier, dynamic }) => ({ specifier, dynamic, path: resolveImport(file, specifier) }));
const importersOf = (target) => APP_FILES.filter((file) => importsOf(file).some(({ path }) => path === join(ROOT, target))).map(rel);

// Every file reached by following imports from the given files. With
// staticOnly, only what loads with them, not what import() fetches later.
// Stylesheets and JSON are reached but not read.
function reachedFrom(files, { staticOnly = false } = {}) {
  const reached = new Map();
  const queue = [...files];
  while (queue.length > 0) {
    const file = queue.pop();
    if (reached.has(file)) continue;
    const imports = /\.(js|jsx|mjs|cjs)$/.test(file) ? importsOf(file) : [];
    reached.set(file, imports);
    for (const { path, dynamic } of imports) if (path && !(staticOnly && dynamic)) queue.push(path);
  }
  return reached;
}
const reachedFromSim = () => reachedFrom(SIM_FILES);
const isStatistics = (file) => SHARED_FILES.includes(file);

// Code that must run the same in Node and in any browser, with no sign-in,
// no network and no clock.
const FORBIDDEN = [
  [/\bfetch\s*\(/, "fetch"], [/XMLHttpRequest|WebSocket|EventSource|sendBeacon/, "a network call"], [/firebase/i, "Firebase"],
  [/\b(?:window|document|navigator|localStorage|sessionStorage|indexedDB)\b/, "the browser"],
  [/import\.meta\.env/, "environment settings"],
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

test("the import scanner sees static imports, import() and require, and tells import() apart", () => {
  assert.deepEqual(specifiers('import a from "./a.js";\nimport {\n  b,\n} from "./b.js";\nexport { c } from "./c.js";\nconst d = await import("./d.js");\nconst e = require("./e");\n// import f from "./f.js";'), ["./a.js", "./b.js", "./c.js", "./d.js", "./e"]);
  assert.deepEqual(importList('import a from "./a.js";\nconst [b] = await Promise.all([import("./b.js")]);').map(({ dynamic }) => dynamic), [false, true]);
  assert.ok(importersOf("functions/shared/sim/scenarios.mjs").includes("functions/shared/sim/engine.mjs"));
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

test("production files never import compatibility shims; generator access is through its engine", () => {
  for (const file of APP_FILES) for (const {path} of importsOf(file)) {
    if (!path) continue;
    assert.ok(!SHIMS.includes(path), rel(file) + " imports a compatibility shim");
    if (path.startsWith(SIM + sep) && !file.startsWith(SIM + sep) && !SHIMS.includes(file) && rel(file) !== "src/sim/groundTruth.js") {
      assert.equal(rel(path), "functions/shared/sim/engine.mjs", rel(file) + " bypasses the generator engine");
    }
    if (rel(path) === "src/sim/scorecard.js") assert.ok(rel(file).startsWith("scripts/"), rel(file) + " imports the scorecard");
  }
});

// The /demo route is the only part of the app that loads the engine and the
// statistics (decision T1), and only with import(), so neither reaches the
// main file.
const DEMO_ROUTE = "src/screens/DemoScreen.jsx";
const DEMO_LOADS = ["functions/shared/sastDay.mjs", "functions/shared/signals.mjs", "functions/shared/sim/engine.mjs"];

test("in the app, only the /demo route loads the engine and the statistics, and only with import()", () => {
  for (const file of APP_FILES.filter((path) => rel(path).startsWith("src/") && !path.startsWith(LEGACY_SIM + sep))) {
    for (const { path, dynamic } of importsOf(file)) {
      if (path && rel(path) === "functions/shared/product.mjs") {
        assert.equal(rel(file), "src/config/product.js");
        assert.equal(dynamic, false);
        assert.equal(importsOf(path).length, 0, "the shared product setting stays data-only");
        continue;
      }
      if (!path || !(path.startsWith(SIM + sep) || isStatistics(path))) continue;
      assert.equal(rel(file), DEMO_ROUTE, `${rel(file)} loads ${rel(path)}: only the /demo route may`);
      assert.ok(dynamic, `${DEMO_ROUTE} imports ${rel(path)} without import(), which puts it in the main file`);
      assert.ok(DEMO_LOADS.includes(rel(path)), `${DEMO_ROUTE} loads ${rel(path)}`);
    }
  }
  const loaded = importsOf(join(ROOT, DEMO_ROUTE)).filter(({ dynamic }) => dynamic).map(({ path }) => rel(path));
  assert.deepEqual(loaded.sort(), DEMO_LOADS);
});

test("following every import from the app, the ground truth and the scorecard are never reached", () => {
  const reached = [...reachedFrom([join(ROOT, "src", "main.jsx")]).keys()].map(rel);
  assert.ok(reached.includes("functions/shared/sim/engine.mjs"), "the scan follows import() into the replay");
  for (const file of ["src/sim/groundTruth.js", "src/sim/scorecard.js"]) assert.ok(!reached.includes(file), `the app reaches ${file}`);
});

test("the main file and the /demo route reach no Firebase: the signed-in app loads only with import()", () => {
  for (const start of ["src/main.jsx", DEMO_ROUTE]) {
    for (const [file, imports] of reachedFrom([join(ROOT, start)], { staticOnly: true })) {
      assert.notEqual(rel(file), "src/lib/firebase.js", `${start} loads Firebase with it`);
      for (const { specifier, path } of imports) {
        if (!path) assert.doesNotMatch(specifier, /^@?firebase(\/|$)/, `${rel(file)} imports ${specifier}, which ${start} would load with it`);
      }
    }
  }
  assert.ok(importsOf(join(ROOT, "src", "lib", "loadApp.js")).some(({ path, dynamic }) => dynamic && rel(path) === "src/App.jsx"), "the signed-in app is loaded with import()");
});

test("every public replay dependency, including lazy imports, excludes the callable and Google", () => {
  for (const [file, imports] of reachedFrom([join(ROOT, DEMO_ROUTE)])) {
    assert.ok(!["src/lib/firebase.js", "src/lib/api.js", "src/lib/rankApi.js", "src/screens/ReplayScreen.jsx", "functions/lib/callRanker.js", "functions/lib/rankSources.js"].includes(rel(file)), "public replay reaches " + rel(file));
    for (const { specifier } of imports) assert.doesNotMatch(specifier, /^@?firebase(\/|$)/);
    if (/\.(js|jsx|mjs)$/.test(file)) assert.doesNotMatch(codeOnly(readFileSync(file, "utf8")), /httpsCallable|callFunction|apis\.google\.com|accounts\.google\.com/);
  }
});

test("saved JSON is dynamically loaded only by the panel loader and excluded from initial replay imports", () => {
  const target = "src/sim/saved-rankings/seed-1.json";
  assert.deepEqual(importersOf(target), ["src/lib/savedRankings.js"]);
  assert.ok(importsOf(join(ROOT, "src/lib/savedRankings.js")).find(({ path }) => path && rel(path) === target).dynamic);
  assert.ok(![...reachedFrom([join(ROOT, DEMO_ROUTE)], { staticOnly: true }).keys()].map(rel).includes(target));
  const sheet = codeOnly(readFileSync(join(ROOT, "src/components/AreaSheet.jsx"), "utf8"));
  assert.match(sheet, /runId === "seeded" && \["signal", "alert"\]\.includes\(signal.level\) && <ReplayRanking/);
});

test("only the generator reads the scenario settings, and only the scorecard reads the ground truth and runs the statistics", () => {
  for (const file of importersOf("functions/shared/sim/scenarios.mjs")) assert.ok(MAY_READ_SETTINGS.includes(file), `${file} reads the scenario settings`);
  for (const file of importersOf("src/sim/groundTruth.js")) assert.ok(MAY_READ_GROUND_TRUTH.includes(file), `${file} reads the ground truth`);
  for (const file of SIM_FILES) {
    if (importsOf(file).some(({ path }) => path && isStatistics(path))) assert.ok(MAY_USE_STATISTICS.includes(rel(file)), `${rel(file)} runs the statistics`);
  }
});


test("nothing in functions reaches the ground truth or the scorecard", () => {
  for (const file of reachedFrom(APP_FILES.filter((path) => rel(path).startsWith("functions/"))).keys()) {
    assert.ok(!["src/sim/groundTruth.js", "src/sim/scorecard.js"].includes(rel(file)), "functions reaches " + rel(file));
  }
});

test("ranking code and the runner never reach ground truth or the scorecard", () => {
  const starts = [...sourceFiles(RANK), join(ROOT, "functions/lib/callRanker.js"), join(ROOT, "scripts/rank-saved.mjs"), join(ROOT,"scripts/heldout-rank.mjs"), join(ROOT,"scripts/lib/heldoutPlans.mjs")];
  for (const file of reachedFrom(starts).keys()) assert.ok(!["src/sim/groundTruth.js", "src/sim/scorecard.js"].includes(rel(file)), "ranking reaches " + rel(file));
});

test("pure ranking modules reach only ranking and statistics, never the generator or Node", () => {
  const reached = reachedFrom(sourceFiles(RANK));
  for (const [file, imports] of reached) {
    assert.ok(file.startsWith(RANK + sep) || isStatistics(file), "pure ranking reaches " + rel(file));
    for (const {path} of imports) assert.ok(path, "pure ranking imports a package or Node module");
  }
  assertPure(reached.keys());
});
