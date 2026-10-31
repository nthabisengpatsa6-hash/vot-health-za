import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import LoadFailed from "./components/LoadFailed";
import LoadingScreen from "./components/LoadingScreen";
import { DEMO_PATH, loadApp } from "./lib/loadApp";

const App = lazy(loadApp);
const DemoScreen = lazy(() => import("./screens/DemoScreen.jsx"));
const ScorecardScreen = lazy(() => import("./screens/ScorecardScreen.jsx"));

// Above the sign-in gate: the public replay needs no account, and
// everything else is the signed-in app.
export default function Root() {
  return (
    <LoadFailed>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path={DEMO_PATH} element={<DemoScreen />} />
          <Route path="/demo/scorecard" element={<ScorecardScreen />} />
          <Route path="/replay" element={<Navigate to={DEMO_PATH} replace />} />
          <Route path="*" element={<App />} />
        </Routes>
      </Suspense>
    </LoadFailed>
  );
}
