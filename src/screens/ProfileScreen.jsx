import { useState } from "react";
import { signOut } from "firebase/auth";
import Message from "../components/Message";
import { PRODUCT_NAME } from "../config/product";
import { FACILITY_TYPES, ROLES } from "../config/profileOptions";
import { auth } from "../lib/firebase";
import { AREA_NAMES, TOWN } from "../lib/places";
import { saveProfile } from "../lib/profile";

const SAVE_FAILED = "Your profile couldn't be saved. Check your connection and try again.";

// The first-time set-up and the Profile screen are the same form. With
// firstTime, saving creates the profile and App moves on by itself.
export default function ProfileScreen({ user, profile, firstTime = false }) {
  const [role, setRole] = useState(profile?.role || "");
  const [facilityType, setFacilityType] = useState(profile?.facilityType || "");
  const [area, setArea] = useState(profile?.area || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const missing = [
      !role && "your role",
      !facilityType && "where you work",
      !area && "your area",
    ].filter(Boolean);
    setSaved(false);
    if (missing.length > 0) {
      setError(`Please choose ${joinWords(missing)}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveProfile(user.uid, { role, facilityType, area }, { isNew: !profile });
      if (!firstTime) setSaved(true);
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function clearStatus() {
    setSaved(false);
    setError(null);
  }

  const Wrapper = firstTime ? "main" : "section";

  return (
    <Wrapper className={firstTime ? "auth" : "screen"}>
      {firstTime && <p className="wordmark">{PRODUCT_NAME}</p>}
      <h1>{firstTime ? "Set up your profile" : "Profile"}</h1>
      <p className="lead">
        {firstTime
          ? "You only do this once. You can change it later on the Profile screen."
          : "Your role and where you work go on your reports. Your area is used for Today and Near me."}
      </p>

      <form className="panel" onSubmit={handleSubmit} noValidate>
        {/* Radio buttons, not a dropdown: the longer role names would be cut
            off in a dropdown on a narrow phone. */}
        <fieldset className="field choices">
          <legend className="field-label">Your role</legend>
          {ROLES.map((option) => (
            <label key={option.value} className="choice">
              <input type="radio" name="role" value={option.value} checked={role === option.value} onChange={() => { setRole(option.value); clearStatus(); }} />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        <label className="field">
          <span className="field-label">Where you work</span>
          <span className="select">
            <select className="input" value={facilityType} onChange={(e) => { setFacilityType(e.target.value); clearStatus(); }}>
              <option value="" disabled>Choose a facility type</option>
              {FACILITY_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </span>
        </label>

        <label className="field">
          <span className="field-label">Your area in {TOWN}</span>
          <span className="select">
            <select className="input" value={area} onChange={(e) => { setArea(e.target.value); clearStatus(); }}>
              <option value="" disabled>Choose your area</option>
              {AREA_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </span>
          <span className="field-hint">Today and Near me show what's going around here.</span>
        </label>

        {error && <Message kind="error" role="alert">{error}</Message>}
        {saved && <Message kind="ok" role="status" centred>Saved.</Message>}

        <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Saving…" : firstTime ? "Save and continue" : "Save changes"}</button>
      </form>

      <p className="note">{PRODUCT_NAME} never asks for your name, phone number or ID number. Your email stays with your sign-in and isn't stored with your profile.</p>

      <div className="account">
        <p>Signed in as <strong>{user.email || "a Google account"}</strong></p>
        <button type="button" className="button button-secondary" onClick={() => signOut(auth)}>Sign out</button>
      </div>
    </Wrapper>
  );
}

function joinWords(words) {
  if (words.length < 2) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
