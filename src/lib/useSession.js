import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { watchProfile } from "./profile";

const PROFILE_STATUS = { ready: "ready", missing: "needs-profile", error: "error" };

// Who is signed in and whether their profile is set up. status is one of
// "checking", "signed-out", "loading-profile", "needs-profile", "ready" or
// "error".
export function useSession() {
  const [user, setUser] = useState(undefined);
  const [profileState, setProfileState] = useState({ uid: null });

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return undefined;
    return watchProfile(user.uid, (next) => setProfileState({ uid: user.uid, ...next }));
  }, [user]);

  if (user === undefined) return { status: "checking" };
  if (user === null) return { status: "signed-out" };
  // A profile left over from an earlier sign-in doesn't count.
  if (profileState.uid !== user.uid) return { status: "loading-profile", user };
  return {
    status: PROFILE_STATUS[profileState.status],
    user,
    profile: profileState.profile,
    error: profileState.error,
  };
}
