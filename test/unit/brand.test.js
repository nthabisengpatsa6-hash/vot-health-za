import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { PRODUCT_NAME } from "../../src/config/product.js";

// index.html and the web app manifest are static files that can't read
// src/config/product.js, so they hold the product name themselves. These
// tests keep them in step with it, and check that every icon they point to
// is there at the size it claims.
const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const html = read("index.html");
const manifest = JSON.parse(read("public/manifest.webmanifest"));

// A PNG's width and height are the two 4-byte numbers after "IHDR".
function pngSize(path) {
  const bytes = readFileSync(new URL(path, root));
  assert.equal(bytes.toString("latin1", 12, 16), "IHDR", `${path} is a PNG`);
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

test("the manifest names the product and opens the app on its own", () => {
  assert.equal(manifest.name, PRODUCT_NAME);
  assert.equal(manifest.short_name, PRODUCT_NAME);
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
});

test("every manifest icon is in public/ at the size it claims, and the 512 px one also comes maskable", () => {
  assert.equal(manifest.icons.length, 3);
  for (const icon of manifest.icons) {
    assert.equal(icon.type, "image/png", icon.src);
    assert.equal(pngSize(`public${icon.src}`), icon.sizes, icon.src);
  }
  assert.deepEqual(manifest.icons.filter((icon) => icon.purpose === "maskable").map((icon) => icon.sizes), ["512x512"]);
});

test("index.html has the product name as its title and links the favicons, the iPhone icon and the manifest", () => {
  assert.match(html, new RegExp(`<title>${PRODUCT_NAME}</title>`));
  const hrefs = [...html.matchAll(/<link [^>]*href="\/([^"]+)"/g)].map(([, href]) => href);
  assert.deepEqual(hrefs.toSorted(), ["apple-touch-icon.png", "favicon-32.png", "favicon.svg", "manifest.webmanifest"]);
  for (const href of hrefs) assert.ok(existsSync(new URL(`public/${href}`, root)), `public/${href} exists`);
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/);
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest" \/>/);
  assert.equal(pngSize("public/favicon-32.png"), "32x32");
  assert.equal(pngSize("public/apple-touch-icon.png"), "180x180");
});

test("the wordmark's ring is the same drawing as src/assets/brand/wordmark-o.svg", () => {
  const shapes = (text) => [...text.matchAll(/<(path|circle) ([^>]*?)\s*\/>/g)].map(([, tag, attributes]) => `${tag} ${attributes.match(/\b(d|cx|cy|r)="[^"]+"/g).join(" ")}`);
  const fromFile = shapes(read("src/assets/brand/wordmark-o.svg"));
  assert.equal(fromFile.length, 2);
  assert.deepEqual(shapes(read("src/components/Wordmark.jsx")), fromFile);
});
