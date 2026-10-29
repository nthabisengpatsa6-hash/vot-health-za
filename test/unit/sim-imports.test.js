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
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SIM = join(ROOT, "src", "sim");
const rel = (path) => relative(ROOT, path).split(sep).join("/");

// The app files the simulation may use: the card lists, the profile lists,
// the card builder and the town file. All are free of Firebase.
const SIM_MAY_USE = ["src/config/cardOptions.js", "src/config/profileOptions.js", "src/lib/cardDraft.js", "functions/data/places.json"];
const MAY_READ_SETTINGS = ["src/sim/background.js", "src/sim/draws.js", "src/sim/seededCluster.js", "src/sim/engine.js", "src/sim/groundTruth.js"];
// The Day 8 scorecard, not written yet.
const MAY_READ_GROUND_TRUTH = ["src/sim/scorecard.js"];

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

// Every file the simulation reaches, following imports from each sim file.
function reachedFromSim() {
  const reached = new Map();
  const queue = [...SIM_FILES];
  while (queue.length > 0) {
    const file = queue.pop();
    if (reached.has(file)) continue;
    const imports = file.endsWith(".json") ? [] : importsOf(file);
    reached.set(file, imports);
    for (const { path } of imports) if (path) queue.push(path);
  }
  return reached;
}

test("the import scanner sees static imports, import() and require", () => {
  assert.deepEqual(specifiers('import a from "./a.js";\nimport {\n  b,\n} from "./b.js";\nexport { c } from "./c.js";\nconst d = await import("./d.js");\nconst e = require("./e");\n// import f from "./f.js";'), ["./a.js", "./b.js", "./c.js", "./d.js", "./e"]);
  assert.ok(importersOf("src/sim/scenarios.js").includes("src/sim/engine.js"));
});

test("the simulation reaches only its own files, the app's lists, the card builder and the town file: no Firebase, no packages", () => {
  assert.ok(SIM_FILES.length >= 10);
  for (const [file, imports] of reachedFromSim()) {
    assert.ok(file.startsWith(SIM + sep) || SIM_MAY_USE.includes(rel(file)), `the simulation reaches ${rel(file)}`);
    for (const { specifier, path } of imports) assert.ok(path, `${rel(file)} imports the package "${specifier}"`);
  }
});

test("no file the simulation reaches uses the network, storage, the clock, the time zone or engine-dependent maths", () => {
  const forbidden = [
    [/\bfetch\s*\(/, "fetch"], [/XMLHttpRequest|WebSocket|EventSource|sendBeacon/, "a network call"], [/firebase/i, "Firebase"],
    [/\b(?:window|document|navigator|localStorage|sessionStorage|indexedDB)\b/, "the browser"],
    [/Math\.random/, "Math.random"], [/Date\.now|performance\.now|new Date\(\s*\)/, "the clock"],
    [/\.get(?:FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds|TimezoneOffset)\(|toLocale|\bIntl\b/, "the computer's time zone"],
    [/Math\.(?!floor\b|ceil\b|round\b|min\b|max\b|abs\b|imul\b|trunc\b)\w+|\*\*/, "maths that browsers may round differently"],
  ];
  for (const file of reachedFromSim().keys()) {
    if (file.endsWith(".json")) continue;
    const code = codeOnly(readFileSync(file, "utf8"));
    for (const [pattern, what] of forbidden) assert.doesNotMatch(code, pattern, `${rel(file)} uses ${what}`);
  }
});

test("outside src/sim, only engine.js may be imported, and the app doesn't import the simulation yet", () => {
  for (const file of APP_FILES.filter((path) => !path.startsWith(SIM + sep))) {
    for (const { path } of importsOf(file)) {
      if (!path || !path.startsWith(SIM + sep)) continue;
      assert.equal(rel(path), "src/sim/engine.js", `${rel(file)} imports ${rel(path)}`);
      assert.ok(!rel(file).startsWith("src/"), `${rel(file)} puts the simulation in the app's main bundle`);
    }
  }
});

test("only the generator reads the scenario settings, and only the scorecard reads the ground truth", () => {
  for (const file of importersOf("src/sim/scenarios.js")) assert.ok(MAY_READ_SETTINGS.includes(file), `${file} reads the scenario settings`);
  for (const file of importersOf("src/sim/groundTruth.js")) assert.ok(MAY_READ_GROUND_TRUTH.includes(file), `${file} reads the ground truth`);
});
