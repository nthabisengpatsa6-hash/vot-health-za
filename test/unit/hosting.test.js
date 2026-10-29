import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Hosting's cache headers: everything is checked again on every visit
// (no-cache), except Vite's /assets/ files, whose names carry a hash of
// their content, so they can be kept for a year. Nothing without a hash may
// be marked immutable, or a phone could keep an old file after a deploy.
const root = new URL("../../", import.meta.url);
const hosting = JSON.parse(readFileSync(new URL("firebase.json", root), "utf8")).hosting;
const cacheControl = (rule) => rule.headers.find((header) => header.key === "Cache-Control")?.value;

test("every file is no-cache, then only /assets/ is kept for a year", () => {
  assert.deepEqual(hosting.headers.map((rule) => [rule.source, cacheControl(rule)]), [
    ["**", "no-cache"],
    ["/assets/**", "public, max-age=31536000, immutable"],
  ]);
});

test("only Vite's hashed files can land in /assets/", () => {
  // public/ is copied into dist/ as it is, unhashed; an assets/ folder there
  // would put unhashed files under the immutable rule.
  assert.equal(existsSync(new URL("public/assets", root)), false);
  // Vite's own names for its output (name-hash.ext) must not be overridden.
  const viteConfig = readFileSync(new URL("vite.config.js", root), "utf8");
  for (const option of ["assetsDir", "entryFileNames", "chunkFileNames", "assetFileNames"]) {
    assert.equal(viteConfig.includes(option), false, option);
  }
});
