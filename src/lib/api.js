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

function callError(code, message) {
  return Object.assign(new Error(message), { code: `functions/${code}` });
}

// Like callFunction, but passes each progress message the function sends
// (such as { stage: "building" }) to onProgress as it arrives. The SDK
// ignores the timeout option for streamed calls, so the same 310 s limit is
// applied here.
export async function streamFunction(name, data, onProgress) {
  const callable = httpsCallable(functions, name);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const { stream, data: result } = await callable.stream(data, { signal: controller.signal });
    // The stream reports any error too; this stops it also counting as unhandled.
    result.catch(() => {});
    for await (const message of stream) onProgress(message);
    // A connection that closes without an answer would otherwise leave the
    // result waiting until the timeout.
    const closedEarly = new Promise((_, reject) => {
      setTimeout(() => reject(callError("unavailable", "The connection closed before an answer arrived.")), 0);
    });
    return await Promise.race([result, closedEarly]);
  } catch (err) {
    if (controller.signal.aborted) throw callError("deadline-exceeded", "No answer in time.");
    // The SDK adds the HTTP status to every message ("… [400]"), but our
    // functions' messages are written for people to read as they are.
    if (err && typeof err.message === "string") err.message = err.message.replace(/ \[\d+\]$/, "");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
