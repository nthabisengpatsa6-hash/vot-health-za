import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// users/{uid} holds role, facilityType and area, plus server timestamps.
// Never a name, phone number or ID number; the email stays in Firebase Auth.
function profileRef(uid) {
  return doc(db, "users", uid);
}

// Calls onChange with { status, profile, error }, where status is
// "ready", "missing" or "error". Returns the unsubscribe function.
export function watchProfile(uid, onChange) {
  return onSnapshot(
    profileRef(uid),
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.exists()) {
        onChange({ status: "ready", profile: snap.data(), error: null });
      } else if (!snap.metadata.fromCache) {
        onChange({ status: "missing", profile: null, error: null });
      }
      // An empty answer from the browser's cache only means we're offline.
      // Treating it as "no profile" would send someone with a poor
      // connection back to the first-time set-up.
    },
    (error) => onChange({ status: "error", profile: null, error }),
  );
}

// The rules accept createdAt only on create and updatedAt only as the
// server's time, so the two cases write different fields.
export function saveProfile(uid, { role, facilityType, area }, { isNew }) {
  const fields = { role, facilityType, area, updatedAt: serverTimestamp() };
  if (isNew) {
    return setDoc(profileRef(uid), { ...fields, createdAt: serverTimestamp() });
  }
  return updateDoc(profileRef(uid), fields);
}
