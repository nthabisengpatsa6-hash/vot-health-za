const KEYS = ["model","provider","promptHash","outcome","ms","inputTokens","outputTokens","reasoningTokens"];
const draftTimingEntry = (entry) => Object.fromEntries(KEYS.map((key) => [key,entry[key] ?? null]));
function writeDraftTiming(entry) {console.info(JSON.stringify({message:"draft_timing",...draftTimingEntry(entry)}));}
module.exports = {draftTimingEntry,writeDraftTiming};
