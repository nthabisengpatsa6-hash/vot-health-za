import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

// docs/DESIGN.md is the source of truth for the look. These tests keep
// src/styles/tokens.css in step with it, make sure a colour change can't
// quietly break legibility, and keep colours and fonts out of everything
// but the tokens.
const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const design = read("docs/DESIGN.md");
const tokensCss = read("src/styles/tokens.css");

const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

// Outside tokens.css, only these brand files and index.html's theme colour
// may write a colour, and only a token's value. PNGs are pictures, not text,
// so they aren't read.
const BRAND_FILES = [
  "src/assets/brand/mark.svg",
  "src/assets/brand/mark-white.svg",
  "src/assets/brand/mark-small.svg",
  "public/favicon.svg",
  "public/manifest.webmanifest",
];
const TEXT_FILE = /\.(css|jsx?|svg|html|json|webmanifest)$/;

function tokenColours() {
  return Object.fromEntries([...tokensCss.matchAll(/(--color-[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, name, value]) => [name, value.toUpperCase()]));
}

function designColours() {
  return Object.fromEntries([...design.matchAll(/^\|\s*(--color-[a-z-]+)\s*\|\s*(#[0-9a-fA-F]{6})\s*\|/gm)].map(([, name, value]) => [name, value.toUpperCase()]));
}

// The bullets under "Contrast pairs that must pass", as [foreground, background].
function contrastPairs() {
  const section = design.split(/^### Contrast pairs that must pass.*$/m)[1].split(/^#/m)[0];
  return section
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .flatMap((line) => line.slice(2).split(","))
    .map((pair) => pair.trim().split(" on ").map((name) => name.trim()));
}

// WCAG 2 relative luminance and contrast ratio.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function filesUnder(path) {
  return readdirSync(new URL(path, root)).flatMap((name) => {
    const child = `${path}${name}`;
    return statSync(new URL(child, root)).isDirectory() ? filesUnder(`${child}/`) : [child];
  });
}

test("tokens.css has exactly DESIGN.md's colours, with the same values", () => {
  const expected = designColours();
  assert.ok(Object.keys(expected).length >= 20, "DESIGN.md's colour table was found");
  assert.deepEqual(tokenColours(), expected);
});

test("every contrast pair in DESIGN.md is at least 4.5:1", () => {
  const colours = tokenColours();
  const pairs = contrastPairs();
  assert.ok(pairs.length >= 12, `found ${pairs.length} pairs`);
  for (const [foreground, background] of pairs) {
    const resolve = (name) => (name.startsWith("#") ? name.toUpperCase() : colours[`--color-${name}`]);
    const [fg, bg] = [resolve(foreground), resolve(background)];
    assert.ok(fg && bg, `unknown colour in "${foreground} on ${background}"`);
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
  }
});

test("no colour is written anywhere in src/ except tokens.css and the brand files", () => {
  for (const file of filesUnder("src/")) {
    if (file === "src/styles/tokens.css" || BRAND_FILES.includes(file) || !TEXT_FILE.test(file)) continue;
    const text = read(file);
    assert.deepEqual(text.match(HEX), null, `${file} has a hex colour`);
    assert.doesNotMatch(text, /\b(rgba?|hsla?)\(/, `${file} has an rgb or hsl colour`);
  }
});

test("outside src/, only index.html's theme colour and the brand files have colours, all from the tokens", () => {
  const colours = tokenColours();
  assert.deepEqual(read("index.html").match(HEX), [colours["--color-ground"]]);
  for (const file of filesUnder("public/")) {
    if (BRAND_FILES.includes(file) || !TEXT_FILE.test(file)) continue;
    assert.deepEqual(read(file).match(HEX), null, `${file} has a hex colour`);
  }
  const tokenValues = new Set(Object.values(colours));
  for (const file of BRAND_FILES) {
    const found = read(file).match(HEX);
    assert.ok(found, `${file} was found, with its colours`);
    for (const value of found) assert.ok(tokenValues.has(value.toUpperCase()), `${file}: ${value} isn't a token colour`);
    assert.doesNotMatch(read(file), /\b(rgba?|hsla?)\(/, `${file} has an rgb or hsl colour`);
  }
});

test("fonts come only from the tokens: no font family is named in the app's styles", () => {
  for (const file of filesUnder("src/")) {
    if (file.startsWith("src/styles/") || !/\.(css|jsx?)$/.test(file)) continue;
    for (const [, value] of read(file).matchAll(/font-family:\s*([^;}]+)/g)) {
      assert.match(value.trim(), /^var\(--font-(ui|voice)\)$/, `${file}: font-family ${value}`);
    }
  }
  assert.match(tokensCss, /--font-ui: 'Hanken Grotesk Variable', 'Hanken Grotesk', system-ui, sans-serif;/);
  assert.match(tokensCss, /--font-voice: 'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif;/);
});
