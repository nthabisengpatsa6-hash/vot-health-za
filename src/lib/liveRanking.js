// One gate belongs to the signed-in Replay, so changing the selected day
// while a request is in flight cannot open a second spending path.
export function createRankingGate() {
  let pending = false;
  return {
    async run(work) {
      if (pending) return null;
      pending = true;
      try { return await work(); } finally { pending = false; }
    },
    get pending() { return pending; },
  };
}
