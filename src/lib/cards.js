import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { toCardDoc } from "./cardDraft";
import { db } from "./firebase";

// Saves one cards/{cardId} document per card. A batch, so a note's cards are
// saved together or not at all.
export function saveCards({ drafts, note, profile, uid }) {
  const batch = writeBatch(db);
  for (const draft of drafts) {
    const card = toCardDoc({ draft, note, profile, uid, createdAt: serverTimestamp() });
    batch.set(doc(collection(db, "cards")), card);
  }
  return batch.commit();
}
