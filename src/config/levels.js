// Watch, Signal and Alert: the word on screen and what it means, in plain
// words. The rules behind them are in functions/shared/settings.mjs and
// HANDOVER ("The statistics").
export const LEVELS = {
  watch: { label: "Watch", meaning: "Clearly more cases than usual, on 3 or more cards." },
  signal: { label: "Signal", meaning: "A Watch reported from 2 or more places of care, and clearly more than twice the usual number." },
  alert: { label: "Alert", meaning: "A Signal with a possible common source, or 2 or more cards saying patients are sicker than usual or not getting better." },
};

export const LEVEL_ORDER = ["watch", "signal", "alert"];
