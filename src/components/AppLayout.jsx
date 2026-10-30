import { Suspense, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { CalendarIcon, MicIcon, PersonIcon, PinIcon, ReplayIcon } from "./Icons";
import Wordmark from "./Wordmark";

// Header and bottom navigation around every signed-in screen. NavLink marks
// the current screen with aria-current, which the styles also use, so the
// active tab is shown by more than colour.
export default function AppLayout() {
  const { pathname } = useLocation();

  // A new screen starts at the top, as it would on a fresh page load.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/report" className="header-wordmark"><Wordmark /></Link>
        <nav className="header-links" aria-label="More">
          <NavLink to="/app/replay" className="header-link">
            <ReplayIcon />
            Replay
          </NavLink>
          <NavLink to="/profile" className="header-link">
            <PersonIcon />
            Profile
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        {/* A screen that loads its own code (Near me) keeps the header and tabs while it does. */}
        <Suspense fallback={<p className="note" role="status">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="tab-bar" aria-label="Main">
        <NavLink to="/report" className="tab">
          <MicIcon />
          <span>Report</span>
        </NavLink>
        <NavLink to="/today" className="tab">
          <CalendarIcon />
          <span>Today</span>
        </NavLink>
        <NavLink to="/near-me" className="tab">
          <PinIcon />
          <span>Near me</span>
        </NavLink>
      </nav>
    </div>
  );
}
