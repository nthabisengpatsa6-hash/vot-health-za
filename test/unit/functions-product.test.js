import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PRODUCT_NAME} from "../../functions/shared/product.mjs";
import {PRODUCT_NAME as WEB_NAME} from "../../src/config/product.js";

test("web name re-exports the deployed canonical setting without another literal", () => {
  assert.equal(WEB_NAME, PRODUCT_NAME);
  const source = readFileSync(new URL("../../src/config/product.js", import.meta.url), "utf8");
  assert.ok(source.includes("functions/shared/product.mjs"));
  assert.ok(!source.includes(`"${PRODUCT_NAME}"`));
});
test("both agent rule 8 lines name the canonical file identically", () => {
  const line = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8").split(/\r?\n/).find((line) => line.startsWith("8."));
  assert.equal(line("AGENTS.md"), line("CLAUDE.md"));
  assert.ok(line("AGENTS.md").includes("functions/shared/product.mjs"));
});
