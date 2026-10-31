import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { replayBrowser } from "../helpers/client-browser.mjs";

let browser;
before(async () => { browser = await replayBrowser(); });
after(async () => {
  if (browser) {
    try { assert.deepEqual(browser.external, []); }
    finally { await browser.close(); }
  }
});
const run = (body) => browser.evaluate(`(async () => { const app = window.task20; ${body} })()`);

test("both signal entry points pause playback and preserve their own origin, day and area", async () => {
  const result = await run(`
    await app.mountDemo(); await app.day(19);
    app.clickText("Play"); await app.openToday(); const todayDetail = await app.detail();
    const todayPaused = window.__runningTimers.size === 0;
    await app.back(); const todayBack = app.snapshot();
    await app.view("Replay"); app.clickText("Play"); await app.openSheet("Thaga Park"); const sheetDetail = await app.detail();
    const sheetPaused = window.__runningTimers.size === 0;
    await app.back(); const sheetBack = app.snapshot();
    return { todayDetail, sheetDetail, todayBack, sheetBack, todayPaused, sheetPaused };
  `);
  assert.deepEqual(result.todayDetail, result.sheetDetail);
  assert.equal(result.todayDetail.day, 19);
  assert.equal(result.todayDetail.area, "Thaga Park");
  for (const state of [result.todayBack, result.sheetBack]) { assert.equal(state.day, "19"); assert.equal(state.area, "Thaga Park"); assert.equal(state.paused, true); }
  assert.equal(result.todayPaused, true); assert.equal(result.sheetPaused, true);
  assert.equal(result.todayBack.today, true);
  assert.equal(result.sheetBack.today, false);
});

test("invalid profile area falls back without profile, storage or service writes", async () => {
  const result = await run(`
    await app.mountDemo({ embedded: true, area: app.profile.area }); const initial = app.snapshot();
    app.resetCalls(); await app.area("Lebone Gardens"); return { initial, changed: app.snapshot() };
  `);
  assert.equal(result.initial.area, "Thaga Park");
  assert.equal(result.changed.area, "Lebone Gardens");
  assert.deepEqual(result.changed.profile, { area: "Outside the demo town" });
  assert.deepEqual(result.changed.calls, { fetch: 0, xhr: 0, localStorage: 0, sessionStorage: 0, service: 0 });
});

test("Today area and day changes use no fetch or XMLHttpRequest in either replay", async () => {
  for (const embedded of [false, true]) {
    const result = await run(`
      app.resetCalls(); await app.mountDemo({ embedded: ${embedded} });
      await app.day(8); await app.area("Leeba View"); await app.day(16); await app.area("Lebone Gardens");
      return app.snapshot();
    `);
    assert.deepEqual(result.calls, { fetch: 0, xhr: 0, localStorage: 0, sessionStorage: 0, service: 0 });
    assert.equal(result.day, "16"); assert.equal(result.area, "Lebone Gardens");
  }
  assert.deepEqual(browser.external, []);
});

test("the signed-in Today link navigates directly to replay Today with the profile area", async () => {
  const result = await run(`await app.routeToday(); return app.snapshot();`);
  assert.equal(result.today, true); assert.equal(result.area, "Leeba View");
});

test("a failed detail download keeps Simulation and retries without reloading or losing state", async () => {
  const result = await run(`
    await app.mountDemo({ failures: 1 }); await app.day(19); await app.openToday();
    await app.wait(() => document.querySelector('[role="alert"]'));
    const failure = { pill: document.querySelector('.pill')?.textContent, message: document.querySelector('[role="alert"]').textContent, state: app.snapshot() };
    app.clickText("Try again"); const detail = await app.detail(); const attempts = window.__importAttempts;
    await app.back(); return { failure, detail, attempts, back: app.snapshot() };
  `);
  assert.equal(result.failure.pill, "Simulation: a made-up town and made-up data");
  assert.equal(result.failure.message, "Signal detail couldn't load. Check your connection, then try again.");
  assert.equal(result.failure.state.attempts, 1); assert.equal(result.attempts, 2);
  assert.equal(result.detail.day, 19); assert.equal(result.detail.area, "Thaga Park");
  assert.equal(result.back.today, true); assert.equal(result.back.day, "19"); assert.equal(result.back.area, "Thaga Park");
});

test("Back after a rejected detail import preserves Today and area-sheet origins", async () => {
  for (const today of [true, false]) {
    const result = await run(`
      await app.mountDemo({ failures: 1, today: ${today} }); await app.day(19);
      ${today ? 'await app.openToday();' : 'await app.openSheet("Thaga Park");'}
      await app.wait(() => document.querySelector('[role="alert"]')); await app.back("Back"); return app.snapshot();
    `);
    assert.equal(result.today, today); assert.equal(result.day, "19"); assert.equal(result.area, "Thaga Park"); assert.equal(result.attempts, 1); assert.equal(result.paused, true);
  }
});
