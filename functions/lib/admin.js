const {getApps, initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

const DEFAULT_APP_NAME = "[DEFAULT]";

// The only place that creates the default Admin app. "Is there any app?" is
// the wrong question: to check a signed-in caller's token, firebase-functions
// makes an app of its own, "__FIREBASE_FUNCTIONS_SDK__", before our code
// runs, so the default app is looked for by name. Opened on first use, so
// tests that only load index.js never start the Admin SDK.
function defaultApp() {
  const existing = getApps().find((app) => app.name === DEFAULT_APP_NAME);
  return existing || initializeApp();
}

// Firestore for the default app, the same instance on every call.
function defaultDb() {
  return getFirestore(defaultApp());
}

exports.defaultApp = defaultApp;
exports.defaultDb = defaultDb;
