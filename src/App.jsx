import { lazy } from "react";
import { signOut } from "firebase/auth";
import { Navigate, Route, Routes, useParams } from "react-router";
import AppLayout from "./components/AppLayout";
import { LevelKey } from "./components/LevelBadge";
import LoadingScreen from "./components/LoadingScreen";
import Message from "./components/Message";
import Wordmark from "./components/Wordmark";
import { auth, onLocalEmulators } from "./lib/firebase";
import { useSession } from "./lib/useSession";
import PlaceholderScreen from "./screens/PlaceholderScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ReportScreen from "./screens/ReportScreen";
import SignInScreen from "./screens/SignInScreen";

// Near me carries the map, so it loads only when it's opened.
const NearMeScreen = lazy(() => import("./screens/NearMeScreen"));

// What each placeholder says until its screen is built.
const SCREENS = {
  today: { title: "Today", day: 6, summary: "Your morning briefing: what's going around near you this week, and open signals nearby." },
  signal: { title: "Signal detail", day: 6, summary: "The reports behind a signal, possible common sources with their evidence, and a draft notification for a person to review and send." },
};

export default function App() {
  const session = useSession();
  return (
    <>
      {onLocalEmulators && <p className="local-banner">Local test mode: emulators, nothing is live</p>}
      <SessionContent session={session} />
    </>
  );
}

function SessionContent({ session }) {
  const { status, user, profile } = session;
  if (status === "checking" || status === "loading-profile") return <LoadingScreen />;
  if (status === "signed-out") return <SignInScreen />;
  if (status === "error") return <ProfileErrorScreen />;
  if (status === "needs-profile") return <ProfileScreen key={user.uid} user={user} profile={null} firstTime />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/report" element={<ReportScreen key={user.uid} user={user} profile={profile} />} />
        <Route path="/today" element={<PlaceholderScreen {...SCREENS.today}><AreaNote area={profile.area} /><LevelKey /></PlaceholderScreen>} />
        <Route path="/near-me" element={<NearMeScreen area={profile.area} />} />
        <Route path="/signals/:signalId" element={<SignalDetailPlaceholder />} />
        <Route path="/profile" element={<ProfileScreen key={user.uid} user={user} profile={profile} />} />
        <Route path="*" element={<Navigate to="/report" replace />} />
      </Route>
    </Routes>
  );
}

function AreaNote({ area }) {
  return <p>Your area: <strong>{area}</strong>. You can change it on the Profile screen.</p>;
}

function SignalDetailPlaceholder() {
  const { signalId } = useParams();
  return (
    <PlaceholderScreen {...SCREENS.signal}>
      <p className="note">Signal: {signalId}</p>
    </PlaceholderScreen>
  );
}

function ProfileErrorScreen() {
  return (
    <main className="center-screen">
      <p className="auth-wordmark"><Wordmark size="large" /></p>
      <Message kind="error" role="alert">Your profile couldn't be loaded. Please try again.</Message>
      <button type="button" className="button button-primary" onClick={() => window.location.reload()}>Try again</button>
      <button type="button" className="text-button" onClick={() => signOut(auth)}>Sign out</button>
    </main>
  );
}
