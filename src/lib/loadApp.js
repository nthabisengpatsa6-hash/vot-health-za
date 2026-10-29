// The signed-in app, with all of Firebase, is its own file, so the public
// replay never loads it (decision T1). One download, shared by main.jsx's
// early start and the route that shows the app.
export const DEMO_PATH = "/demo";

let app = null;
export const loadApp = () => (app ??= import("../App.jsx"));

// /demo, and /replay, which only redirects to it, never need the app. The
// router matches them in any case, with or without a trailing slash.
const REPLAY_PATHS = [DEMO_PATH, "/replay"];
export const isReplayPath = (pathname) => REPLAY_PATHS.includes(pathname.replace(/\/+$/, "").toLowerCase());
