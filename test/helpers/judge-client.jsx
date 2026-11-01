import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDocFromServer, setLogLevel, terminate } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, onLocalEmulators } from "../../src/lib/firebase.js";
import PracticeLabel from "../../src/components/PracticeLabel.jsx";

setLogLevel("silent");
const mount = document.createElement("div");
document.body.append(mount);
const root = createRoot(mount);
window.__judge = {
  local: onLocalEmulators,
  label(practice) { flushSync(() => root.render(<PracticeLabel practice={practice} />)); return mount.innerHTML; },
  async auth() { try { await createUserWithEmailAndPassword(auth, "judge-test@example.com", "synthetic-local-only"); } catch { /* Expected synthetic local error. */ } },
  firestore() { getDocFromServer(doc(db, "users", "synthetic-local-user")).catch(() => {}); },
  async callables() {
    for (const name of ["processNote", "rankSources", "draftNotification"]) {
      try { await httpsCallable(functions, name)({}); } catch { /* No server or inference is involved. */ }
    }
  },
  close: () => terminate(db),
};
