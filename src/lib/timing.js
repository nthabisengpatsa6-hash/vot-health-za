// Where a note's time goes, for phone tests: shown only when the page was
// opened with ?timing=1, and never sent anywhere.

export function timingRequested(search) {
  return new URLSearchParams(search).get("timing") === "1";
}

// Read once, as the app loads: the redirect from / to /report drops the
// query, so a later read would miss it.
export const SHOW_TIMING = typeof window !== "undefined" && timingRequested(window.location.search);

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;

// "Upload 2.1 s, server 18.4 s, total 21.0 s", leaving out what isn't known
// (yet, or at all: a failed note has no server time).
export function formatTiming({ uploadMs = null, serverMs = null, totalMs = null } = {}) {
  const parts = [
    ["upload", uploadMs],
    ["server", serverMs],
    ["total", totalMs],
  ].filter(([, ms]) => Number.isFinite(ms)).map(([name, ms]) => `${name} ${seconds(ms)}`);
  const text = parts.join(", ");
  return text && text[0].toUpperCase() + text.slice(1);
}
