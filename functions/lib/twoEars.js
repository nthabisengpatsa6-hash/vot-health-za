const {EARS_GRACE_MS} = require("../constants");

// Runs both transcription "ears" at once. Once one succeeds, the other gets
// at most `graceMs` more, so one slow ear can't double the wait. If the first
// to finish failed, the other is the only source left and gets its full run.
// Each ear is a function that takes an AbortSignal, so an ear we stop waiting
// for is cancelled instead of left running after we reply.
async function listenWithTwoEars(ears, {graceMs = EARS_GRACE_MS} = {}) {
  const names = Object.keys(ears);
  if (names.length !== 2) {
    throw new Error("listenWithTwoEars needs exactly two ears.");
  }
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const controllers = {};
  const runs = {};
  for (const name of names) {
    controllers[name] = new AbortController();
    runs[name] = Promise.resolve()
        .then(() => ears[name](controllers[name].signal))
        .then(
            (value) => ({name, ok: true, value, ms: elapsed()}),
            (error) => ({name, ok: false, error, ms: elapsed()}),
        );
  }

  const first = await Promise.race(Object.values(runs));
  const otherName = names.find((name) => name !== first.name);
  let second;
  if (first.ok) {
    let timer;
    const grace = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), graceMs);
    });
    second = await Promise.race([runs[otherName], grace]);
    clearTimeout(timer);
    if (second === null) {
      controllers[otherName].abort();
      const error = new Error(
          `stopped waiting ${graceMs / 1000} s after the other ear finished`,
      );
      error.kind = "grace-timeout";
      second = {name: otherName, ok: false, error, ms: elapsed()};
    }
  } else {
    second = await runs[otherName];
  }

  const results = {[first.name]: first, [second.name]: second};
  const heard = [first, second].filter((result) => result.ok).length;
  if (heard === 0) {
    const error = new Error("Both transcriptions failed.");
    error.kind = "both-ears-failed";
    error.ears = results;
    throw error;
  }
  return {ears: results, singleSource: heard === 1, totalMs: elapsed()};
}

exports.listenWithTwoEars = listenWithTwoEars;
