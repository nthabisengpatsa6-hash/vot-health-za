const {FieldValue} = require("firebase-admin/firestore");
const {DAILY_NOTE_LIMIT, APP_DAILY_NOTE_LIMIT} = require("../constants");
const {defaultDb} = require("./admin");

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

// The SAST calendar day as "YYYY-MM-DD". South Africa has no daylight
// saving, so SAST is always UTC+2.
function sastDay(now) {
  return new Date(now.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10);
}

// The counter after one more note, or null when today's notes are used up.
// A counter from an earlier day starts again.
function nextUsage(current, today, limit) {
  const used = current && current.day === today ? current.count : 0;
  if (used >= limit) return null;
  return {day: today, count: used + 1};
}

// Counts one note against the caller's daily limit. A transaction, so two
// notes sent at once can't both take the last place. noteUsage/{uid} has no
// client rules, so only this code can read or write it. Returns
// { allowed, count }; a refused note isn't counted.
async function reserveNote(uid, {
  db = defaultDb(),
  now = new Date(),
  limit = DAILY_NOTE_LIMIT,
  appLimit = APP_DAILY_NOTE_LIMIT,
} = {}) {
  const ref = db.collection("noteUsage").doc(uid);
  const appRef = db.collection("noteAppUsage").doc("app");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const appSnap = await transaction.get(appRef);
    const current = snap.exists ? snap.data() : null;
    const today = sastDay(now);
    const next = nextUsage(current, today, limit);
    const appNext = nextUsage(appSnap.exists ? appSnap.data() : null, today, appLimit);
    if (!appNext) return {allowed: false, count: current && current.day === today ? current.count : 0, reason: "app-note-limit"};
    if (!next) return {allowed: false, count: current.count};
    transaction.set(ref, {...next, updatedAt: FieldValue.serverTimestamp()});
    transaction.set(appRef, {...appNext, updatedAt: FieldValue.serverTimestamp()});
    return {allowed: true, count: next.count};
  });
}

exports.reserveNote = reserveNote;
exports.sastDay = sastDay;
