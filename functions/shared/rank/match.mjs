const levelOrder = {watch: 0, signal: 1, alert: 2};
const textOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const overlap = (a, b) => a.areas.filter((area) => b.areas.includes(area)).length;

export function matchSignal(prevSignals, signal) {
  return prevSignals.filter((prev) => prev.symptomGroup === signal.symptomGroup && overlap(prev, signal) > 0)
      .sort((a, b) => overlap(b, signal) - overlap(a, signal) || textOrder(a.id, b.id))[0] || null;
}

export function rankingChange(previous, signal) {
  if (levelOrder[signal.level] < 1) return [];
  if (!previous || levelOrder[previous.level] < 1) return ["new"];
  const changes = [];
  if (levelOrder[signal.level] > levelOrder[previous.level]) changes.push("level");
  if (signal.areas.some((area) => !previous.areas.includes(area))) changes.push("areas");
  const candidates = (entry) => entry.sources.filter((source) => source.candidate).map((source) => source.layer);
  if (JSON.stringify(candidates(previous)) !== JSON.stringify(candidates(signal))) changes.push("sources");
  return changes;
}
