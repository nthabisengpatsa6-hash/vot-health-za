import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { replayBrowser } from "../helpers/client-browser.mjs";

test("judge Firebase SDK traffic stays on loopback and the practice label requires its marker", async () => {
  const browser = await replayBrowser({ entry:"./judge-client.jsx", firebase:true, define:{"import.meta.env.DEV":"true"}, respond(request) {
    const url = new URL(request.url);
    if (url.port === "5173") return { headers:{"Content-Type":"text/html"}, body:"<!doctype html><html><body></body></html>" };
    if (request.method === "OPTIONS") return { headers:{"Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"*", "Access-Control-Allow-Methods":"GET, POST, OPTIONS"} };
    if (url.port === "9099") return { status:400, body:JSON.stringify({error:{message:"OPERATION_NOT_ALLOWED"}}) };
    if (url.port === "5001") return { status:503, body:JSON.stringify({error:{status:"UNAVAILABLE", message:"Synthetic local response."}}) };
    return { status:400, body:"{}" };
  } });
  try {
    assert.equal(await browser.evaluate("window.__judge.local"), true);
    const label = "Practice card: no Meta key is set, so this card is made up and not from your recording.";
    assert.ok((await browser.evaluate("window.__judge.label(true)")).includes(label));
    for (const value of ["undefined", "false", "null", "0"]) assert.equal(await browser.evaluate(`window.__judge.label(${value})`), "");
    const report = readFileSync(new URL("../../src/screens/ReportScreen.jsx", import.meta.url), "utf8");
    assert.ok(report.includes("<PracticeLabel practice={note.practice} />"));
    await browser.evaluate("window.__judge.auth()");
    await browser.evaluate("window.__judge.callables()");
    await browser.evaluate("window.__judge.firestore()");
    for (let i = 0; i < 50 && !browser.requests.some((url) => new URL(url).port === "8080"); i++) await new Promise((resolve) => setTimeout(resolve, 100));
    for (const port of ["9099", "8080", "5001"]) assert.ok(browser.requests.some((url) => new URL(url).port === port), `Expected SDK request to local port ${port}.`);
    for (const name of ["processNote", "rankSources", "draftNotification"]) assert.ok(browser.requests.some((url) => new URL(url).pathname.endsWith(`/demo-fola/africa-south1/${name}`)));
    // Include an explicit SDK connectivity image and connection attempt after
    // the failed local transport. The local policy must prevent either leaving.
    await browser.evaluate('fetch("https://example.invalid/judge-network-check").catch(() => {}); const probe = new Image(); probe.src = "https://example.invalid/judge-image-check";');
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.deepEqual(browser.external, []);
    assert.ok(browser.requests.every((url) => ["127.0.0.1", "localhost"].includes(new URL(url).hostname)));
    await browser.evaluate("window.__judge.close()");
  } finally { await browser.close(); }
});
