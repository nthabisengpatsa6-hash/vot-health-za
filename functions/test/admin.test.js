const test = require("node:test");
const assert = require("node:assert/strict");
const {deleteApp, getApp, getApps, initializeApp} =
    require("firebase-admin/app");
const {Firestore, getFirestore} = require("firebase-admin/firestore");
const {defaultApp, defaultDb} = require("../lib/admin");
const {reserveNote} = require("../lib/noteLimit");

// Made up: a "demo-" project ID never reaches a live project.
const PROJECT_ID = "demo-admin-test";
// The app firebase-functions makes to check a signed-in caller's token,
// before our code runs (node_modules/firebase-functions/lib/common/app.js).
const FUNCTIONS_SDK_APP = "__FIREBASE_FUNCTIONS_SDK__";
const NOON_SAST = new Date("2026-10-28T10:00:00Z");

// Starts with no Admin app and removes every app afterwards, so each test
// sets up its own.
function freshAdmin(t) {
  assert.equal(getApps().length, 0);
  const saved = process.env.GCLOUD_PROJECT;
  process.env.GCLOUD_PROJECT = PROJECT_ID;
  t.after(async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
    if (saved === undefined) delete process.env.GCLOUD_PROJECT;
    else process.env.GCLOUD_PROJECT = saved;
  });
}

// What a signed-in call to processNote looks like live.
const withFunctionsSdkApp = () =>
  initializeApp({projectId: PROJECT_ID}, FUNCTIONS_SDK_APP);

test("with firebase-functions' own app already there, the default app is " +
    "still made, once", (t) => {
  freshAdmin(t);
  const sdkApp = withFunctionsSdkApp();

  const app = defaultApp();
  assert.equal(app.name, "[DEFAULT]");
  assert.equal(defaultApp(), app, "a second call reuses it");
  assert.deepEqual(
      getApps().map((each) => each.name).sort(),
      ["[DEFAULT]", FUNCTIONS_SDK_APP],
  );
  assert.equal(defaultDb(), getFirestore(app));
  assert.notEqual(defaultDb(), getFirestore(sdkApp));
});

test("the counter gets its Firestore from the default app, with " +
    "firebase-functions' own app already there", async (t) => {
  freshAdmin(t);
  withFunctionsSdkApp();
  // Firestore's own transaction is replaced, so nothing reaches the network.
  const writes = [];
  let usedDb = null;
  const real = Firestore.prototype.runTransaction;
  Firestore.prototype.runTransaction = function(work) {
    usedDb = this;
    return work({
      get: async () => ({exists: false, data: () => undefined}),
      set: (ref, value) => writes.push({path: ref.path, value}),
    });
  };
  t.after(() => {
    Firestore.prototype.runTransaction = real;
  });

  // No db passed: the counter opens the default one itself, as it does live.
  const usage = await reserveNote("u1", {now: NOON_SAST});

  assert.deepEqual(usage, {allowed: true, count: 1});
  assert.equal(usedDb, getFirestore(getApp()), "the default app's Firestore");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, "noteUsage/u1");
  assert.equal(writes[0].value.count, 1);
});
