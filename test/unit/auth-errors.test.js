import assert from "node:assert/strict";
import { test } from "node:test";
import { authErrorMessage, GENERAL_MESSAGE } from "../../src/lib/authErrors.js";

test("a wrong password and an unknown email get the same message", () => {
  const message = authErrorMessage({ code: "auth/invalid-credential" });
  assert.match(message, /don't match/);
  for (const code of ["auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"]) {
    assert.equal(authErrorMessage({ code }), message, code);
  }
});

test("closing the Google window shows no message", () => {
  assert.equal(authErrorMessage({ code: "auth/popup-closed-by-user" }), null);
  assert.equal(authErrorMessage({ code: "auth/cancelled-popup-request" }), null);
});

test("an unknown or missing code falls back to the general message", () => {
  assert.equal(authErrorMessage({ code: "auth/something-new" }), GENERAL_MESSAGE);
  assert.equal(authErrorMessage(new Error("no code")), GENERAL_MESSAGE);
  assert.equal(authErrorMessage(null), GENERAL_MESSAGE);
});

test("messages are plain English, without codes or the word Firebase", () => {
  const codes = [
    "auth/missing-email",
    "auth/invalid-email",
    "auth/missing-password",
    "auth/weak-password",
    "auth/email-already-in-use",
    "auth/too-many-requests",
    "auth/network-request-failed",
    "auth/popup-blocked",
  ];
  for (const code of codes) {
    const message = authErrorMessage({ code });
    assert.notEqual(message, GENERAL_MESSAGE, `${code} has its own message`);
    assert.doesNotMatch(message, /firebase|auth\//i, code);
  }
});
