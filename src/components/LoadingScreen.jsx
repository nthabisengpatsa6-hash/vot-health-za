import { useEffect, useState } from "react";
import Wordmark from "./Wordmark";

// While the app's code or the session loads. After 10 s it says what to check.
export default function LoadingScreen() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10_000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="center-screen" aria-busy="true">
      <p className="auth-wordmark"><Wordmark size="large" /></p>
      <p role="status">{slow ? "Still connecting. Check your internet connection." : "Loading…"}</p>
    </main>
  );
}
