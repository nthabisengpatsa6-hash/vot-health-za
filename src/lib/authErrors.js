// Plain-English messages for Firebase sign-in errors. Plain module with no
// Firebase imports, so the unit tests can load it in Node.

const MESSAGES = {
  "auth/missing-email": "Please enter your email address.",
  "auth/invalid-email": "That email address doesn't look right. Check it and try again.",
  "auth/missing-password": "Please enter your password.",
  "auth/weak-password": "That password is too short. Use at least 6 characters; longer is safer.",
  "auth/password-does-not-meet-requirements": "That password isn't strong enough. Try a longer one with a mix of letters and numbers.",
  "auth/email-already-in-use": "There's already an account with this email. Sign in instead, or reset your password.",
  "auth/invalid-credential": "That email and password don't match. Check them, or reset your password.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes, then try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site, or use your email instead.",
  "auth/account-exists-with-different-credential": "This email already signs in another way. Use your email and password instead.",
  "auth/user-disabled": "This account has been switched off. Contact the person who runs this app.",
  "auth/operation-not-allowed": "This way of signing in isn't switched on yet. Try another one.",
  "auth/unauthorized-domain": "Sign-in isn't allowed from this web address.",
};

// Older Firebase versions, or projects without email enumeration
// protection, report a wrong password or unknown email separately. Both get
// the same message so the app never reveals which emails have accounts.
const SAME_AS = {
  "auth/invalid-login-credentials": "auth/invalid-credential",
  "auth/wrong-password": "auth/invalid-credential",
  "auth/user-not-found": "auth/invalid-credential",
};

// The person closed or replaced the Google window themselves: not an error.
const CANCELLED = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

export const GENERAL_MESSAGE = "Something went wrong. Please try again.";

// Returns the message to show, or null when there is nothing to show.
export function authErrorMessage(error) {
  const code = error && error.code;
  if (CANCELLED.has(code)) return null;
  return MESSAGES[SAME_AS[code] || code] || GENERAL_MESSAGE;
}
