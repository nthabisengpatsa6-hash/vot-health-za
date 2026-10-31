import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function deriveScorecard(data) {
  const { tuning, heldOut } = data.statistics;
  const high = data.ranking.rows.filter((row) => row.sources.find((source) => source.rank === 1)?.confidence === "high");
  const first = data.ranking.rows.filter((row) => row.roles.includes("firstAlert"));
  const misses = first.map((row) => ({ seed: row.seed, top: row.sources.find((source) => source.rank === 1) })).filter(({ top }) => top?.sourceId !== "water:A").map(({ seed, top }) => ({ seed, source: top.sourceId, confidence: top.confidence }));
  const stats = (value) => ({ first: Object.fromEntries(Object.entries(value.first).map(([level, row]) => [level, { median: row.median, min: row.min, max: row.max }])), falseSignals: value.falseSignals });
  const ranking = (value) => ({ worksFirst: value.worksFirst, ranked: value.ranked });
  return { sampleSize: data.sampleSize, totalRuns: heldOut.sampleSize * 2, firstSeed: heldOut.rows[0].seed, lastSeed: heldOut.rows.at(-1).seed, tuning: stats(tuning), heldOut: stats(heldOut), firstAlert: ranking(data.ranking.summary.firstAlert), day19: ranking(data.ranking.summary.day19), tuningRanking: data.tuningRanking, quietRunsWithWatch: heldOut.rows.filter((row) => row.quietFalseSignals.watch > 0).length, rankingCount: data.ranking.rows.length, highCount: high.length, highWorks: high.filter((row) => row.sources.find((source) => source.rank === 1)?.sourceId === "water:A").length, misses };
}

export function renderedScorecard(data) { return `${JSON.stringify(deriveScorecard(data), null, 2)}\n`; }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = JSON.parse(readFileSync(new URL("../src/sim/held-out/scorecard-held-out-seeds-11-20.json", import.meta.url), "utf8"));
  writeFileSync(new URL("../src/sim/held-out/scorecard-screen.json", import.meta.url), renderedScorecard(input));
}
