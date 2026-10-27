import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// processNote may use its full 300 s server limit. Waiting 310 s lets the
// server's own answer or timeout error arrive before the browser gives up;
// the SDK's default of 70 s would cut slow notes off.
export const CALL_TIMEOUT_MS = 310_000;

// Calls one of our callable Cloud Functions and returns its result. On
// localhost, firebase.js has already pointed `functions` at the emulator.
export async function callFunction(name, data = {}) {
  const callable = httpsCallable(functions, name, { timeout: CALL_TIMEOUT_MS });
  const result = await callable(data);
  return result.data;
}
