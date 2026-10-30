const KEYS = ["model", "effort", "promptHash", "inputTokens", "outputTokens", "ms", "attempts", "outcome"];

function rankTimingEntry(value) {
  return Object.fromEntries(KEYS.map((key) => [key, value[key] ?? null]));
}

function writeRankTiming(value) {
  console.info(JSON.stringify({message: "rank_timing", ...rankTimingEntry(value)}));
}

exports.rankTimingEntry = rankTimingEntry;
exports.writeRankTiming = writeRankTiming;
