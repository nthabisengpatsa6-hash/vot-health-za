import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { PRODUCT_NAME } from "../config/product";
import { authErrorMessage } from "../lib/authErrors";
import { auth } from "../lib/firebase";

const RESET_SENT = "If there's an account for that email, a reset link is on its way. Check your inbox and spam folder.";

// Google or email and password. Signing in or up changes the auth state, and
// App then moves on by itself.
export default function SignInScreen() {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function switchMode(next) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function run(action) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleGoogle() {
    const provider = new GoogleAuthProvider();
    // Always offer the account chooser: clinic phones and computers are
    // often shared.
    provider.setCustomParameters({ prompt: "select_account" });
    run(() => signInWithPopup(auth, provider));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const address = email.trim();
    if (!address) {
      setError(authErrorMessage({ code: "auth/missing-email" }));
    } else if (mode === "reset") {
      run(async () => {
        await sendPasswordResetEmail(auth, address);
        setNotice(RESET_SENT);
      });
    } else if (!password) {
      setError(authErrorMessage({ code: "auth/missing-password" }));
    } else if (mode === "sign-up") {
      run(() => createUserWithEmailAndPassword(auth, address, password));
    } else {
      run(() => signInWithEmailAndPassword(auth, address, password));
    }
  }

  const submitLabel = { "sign-in": "Sign in", "sign-up": "Create account", reset: "Send reset link" }[mode];

  return (
    <main className="auth">
      <div className="auth-brand">
        <h1 className="wordmark">{PRODUCT_NAME}</h1>
        <p className="lead">Quick voice reports from health workers, joined up into early signals for your area.</p>
      </div>

      <div className="panel">
        {mode === "reset" ? (
          <>
            <h2>Reset your password</h2>
            <p>Enter your email and we'll send you a link to choose a new password.</p>
          </>
        ) : (
          <>
            <button type="button" className="button button-secondary" onClick={handleGoogle} disabled={busy}>Continue with Google</button>
            <p className="divider">or use your email</p>
            <div className="segmented" role="group" aria-label="Choose">
              <button type="button" aria-pressed={mode === "sign-in"} onClick={() => switchMode("sign-in")}>Sign in</button>
              <button type="button" aria-pressed={mode === "sign-up"} onClick={() => switchMode("sign-up")}>Create account</button>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Email</span>
            <input className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          {mode !== "reset" && (
            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="password-row">
                <input id="password" className="input" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="button button-secondary button-fit" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              {mode === "sign-up" && <span className="field-hint">At least 6 characters. Longer is safer.</span>}
            </div>
          )}

          {error && <p className="message message-error" role="alert">{error}</p>}
          {notice && <p className="message message-ok" role="status">{notice}</p>}

          <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Please wait…" : submitLabel}</button>
        </form>

        {mode === "sign-in" && (
          <button type="button" className="text-button" onClick={() => switchMode("reset")}>Forgot your password?</button>
        )}
        {mode === "reset" && (
          <button type="button" className="text-button" onClick={() => switchMode("sign-in")}>Back to sign in</button>
        )}
      </div>

      <p className="note">For health professionals. Never enter patient names.</p>
      <p className="note">Demo build: use made-up information only.</p>
    </main>
  );
}
