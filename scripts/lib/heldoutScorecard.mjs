import {scoreRun} from "../../src/sim/scorecard.js";
import {identity} from "./heldoutArtifacts.mjs";
import town from "../../functions/data/places.json" with {type:"json"};

const LEVELS = ["watch", "signal", "alert"];
const blank = () => Object.fromEntries(LEVELS.map((level) => [level,0]));
const counts = (entries) => entries.reduce((sum,row) => {sum[row.level]++; return sum;},blank());
export function median(values) {
  const ordered = values.filter((value) => value !== null).sort((a,b) => a-b);
  return ordered.length ? (ordered[Math.floor((ordered.length-1)/2)] + ordered[Math.floor(ordered.length/2)]) / 2 : null;
}
export function aggregateStatistics(rows) {
  const first = Object.fromEntries(LEVELS.map((level) => {
    const days = rows.map((row) => row.first[level]).filter((day) => day !== null);
    return [level,{median:median(days), min:days.length ? Math.min(...days) : null, max:days.length ? Math.max(...days) : null,
      reached:days.length, notReachedSeeds:rows.filter((row) => row.first[level] === null).map((row) => row.seed)}];
  }));
  const totals = {seeded:blank(), quiet:blank(), combined:blank()};
  for (const row of rows) for (const level of LEVELS) {
    totals.seeded[level] += row.seededFalseSignals[level]; totals.quiet[level] += row.quietFalseSignals[level];
  }
  for (const level of LEVELS) totals.combined[level] = totals.seeded[level]+totals.quiet[level];
  return {sampleSize:rows.length, rows, first, falseSignals:totals};
}
export function collectStatistics(seeds, {allowHeldOut = false, score = scoreRun} = {}) {
  return aggregateStatistics(seeds.map((seed) => {
    const seeded = score({seed, scenario:"water", allowHeldOut});
    const quiet = score({seed, scenario:"none", allowHeldOut});
    return {seed, first:Object.fromEntries(LEVELS.map((level) => [level,seeded.cluster.first[level]?.day ?? null])),
      seededFalseSignals:counts(seeded.falseAlarms), quietFalseSignals:counts(quiet.falseAlarms)};
  }));
}
export function reconcileTuning(tuning) {
  const rows = [
    ["First Watch minimum",14,tuning.first.watch.min], ["First Watch maximum",18,tuning.first.watch.max],
    ["First Watch median",15,tuning.first.watch.median], ["First Signal median",16,tuning.first.signal.median],
    ["First Alert median",16,tuning.first.alert.median],
  ];
  for (const scenario of ["seeded","quiet"]) for (const level of LEVELS) rows.push([
    `${scenario}: false signals (signal-days), ${level}`,level === "watch" ? 10 : 0,tuning.falseSignals[scenario][level],
  ]);
  return rows.map(([metric,published,actual]) => ({metric,published,actual,match:published === actual}));
}
const shown = (value) => value === null ? "never" : value;
const seedList = (values) => values.length ? values.join(", ") : "none";
export function statisticsMarkdown(statistics) {
  const lines = [];
  for (const [label,data] of [["Held-out seeds 11 to 20",statistics.heldOut],["Tuning seeds 1 to 10, recomputed",statistics.tuning]]) {
    lines.push(`## ${label}`, "", `Simulation: made-up data; sample size ${data.sampleSize} seeds; replay days 0 to 28.`, "",
      "False counts are false signals (signal-days), at the exact recorded level. Multiple false signals on a calendar day count separately.", "",
      "| Seed | First Watch | First Signal | First Alert | Seeded false signals (signal-days): W / S / A | Quiet false signals (signal-days): W / S / A |",
      "|---|---|---|---|---|---|");
    for (const row of data.rows) lines.push(`| ${row.seed} | ${shown(row.first.watch)} | ${shown(row.first.signal)} | ${shown(row.first.alert)} | ${LEVELS.map((level) => row.seededFalseSignals[level]).join(" / ")} | ${LEVELS.map((level) => row.quietFalseSignals[level]).join(" / ")} |`);
    lines.push("", "| Level | Median first day | Range | Seeds reaching level | Seeds not reaching level |", "|---|---|---|---|---|");
    for (const level of LEVELS) {const row = data.first[level]; lines.push(`| ${level} | ${shown(row.median)} | ${shown(row.min)} to ${shown(row.max)} | ${row.reached}/${data.sampleSize} | ${seedList(row.notReachedSeeds)} |`);}
    lines.push("", "| Scenario | False signals (signal-days): Watch | Signal | Alert |", "|---|---|---|---|");
    for (const scenario of ["seeded","quiet","combined"]) lines.push(`| ${scenario} | ${LEVELS.map((level) => data.falseSignals[scenario][level]).join(" | ")} |`);
    lines.push("");
  }
  lines.push("## Tuning recomputation against HANDOVER.md", "", "| Metric | Published | Recomputed | Match |", "|---|---|---|---|");
  for (const row of statistics.tuningReconciliation) lines.push(`| ${row.metric} | ${row.published} | ${row.actual} | ${row.match ? "yes" : "no"} |`);
  lines.push("", "HANDOVER.md records 10 false Watch signals (signal-days) in the quiet runs and the same 10 in the seeded runs: 20 combined. Task 18's original expectation of 10 combined differs. The figures above are reported without changing the scoring logic.", "");
  return lines.join("\n");
}
export function rankingMetrics(bundle, records) {
  const works = "water:A";
  const school = `school:${town.schools[0].name}`;
  const shop = `shop:${town.shops[0].name}`;
  const rows = bundle.seeds.flatMap((seed) => seed.plans.map((plan) => {
    const record = records.find((row) => row.recordId === identity(plan));
    const ranked = !!record && record.cleanedRanking?.unavailable !== true && !!record.cleanedRanking?.sources?.length;
    const sources = ranked ? record.cleanedRanking.sources : [];
    const rank = (id) => !record ? "missing" : !ranked ? "unavailable" : sources.find((source) => source.sourceId === id)?.rank ?? "not ranked";
    return {seed:seed.seed, evidenceDay:plan.day, roles:plan.roles, recordId:identity(plan), ranked, outcome:record?.outcome ?? "missing",
      sources, worksRank:rank(works), schoolRank:rank(school), shopRank:rank(shop), dropCounts:record?.dropCounts ?? null,
      ms:record?.ms ?? null, tokens:record?.tokens ?? null, attempts:record?.attempts ?? null,
      accountedCost:record?.accountedCost ?? null, costIncludesEstimate:record?.costIncludesEstimate ?? null};
  }));
  const summary = Object.fromEntries(["firstAlert","day19"].map((role) => {
    const selected = rows.filter((row) => row.roles.includes(role));
    const ranked = selected.filter((row) => row.ranked);
    return [role,{worksFirst:ranked.filter((row) => row.worksRank === 1).length, ranked:ranked.length, withEvent:selected.length,
      noEventSeeds:bundle.seeds.filter((seed) => !seed[role]).map((seed) => seed.seed),
      unavailableSeeds:selected.filter((row) => row.outcome !== "missing" && !row.ranked).map((row) => row.seed),
      missingSeeds:selected.filter((row) => row.outcome === "missing").map((row) => row.seed)}];
  }));
  return {rows, summary};
}
export function buildScorecard(statistics,bundle,records) {
  const ranking = rankingMetrics(bundle,records);
  const comparison = [];
  for (const level of LEVELS) comparison.push({metric:`First ${level} median day`, tuning:statistics.tuning.first[level].median, heldOut:statistics.heldOut.first[level].median});
  for (const scenario of ["seeded","quiet"]) for (const level of LEVELS) comparison.push({metric:`${scenario} false signals (signal-days): ${level}`, tuning:statistics.tuning.falseSignals[scenario][level], heldOut:statistics.heldOut.falseSignals[scenario][level]});
  const observations = comparison.filter((row) => row.tuning !== null && row.heldOut !== null && row.heldOut > row.tuning).map((row) => `Held-out ${row.metric} is higher than tuning (${row.heldOut} versus ${row.tuning}).`);
  const first = ranking.summary.firstAlert;
  if (first.ranked && first.worksFirst/first.ranked < 0.7) observations.push(`Works A ranks first less often at ranked first Alerts in the held-out sample (${first.worksFirst}/${first.ranked}) than tuning (7/10).`);
  return {version:1, simulation:true, sampleSize:10, proof:statistics.proof, statistics, ranking, comparison, observations,
    tuningRanking:{worksFirstAtFirstAlert:7, rankedFirstAlerts:10, worksEverFirstByDay19:10, seeds:10},
    day19Definition:"Latest ranking event carried forward by frozen matching and change rules, with original evidence day. Tuning's ever-first-by-day-19 metric is different.",
    retryPolicy:"Held-out: once for connection failure, timeout, HTTP 429 or 5xx only. Production: invalid JSON only; unchanged."};
}
export function scorecardMarkdown(report) {
  const lines = ["# Held-out scorecard: seeds 11 to 20", "", "Simulation: made-up data. Sample size: 10 held-out seeds.", "",
    "## Pre-unlock proof", "", `Commit: ${report.proof.commit}. Signal hash: ${report.proof.signalHash}. Ranking prompt hash: ${report.proof.rankingPromptHash}.`, "",
    report.proof.preUnlockStatement, "", "| Seed | Seeded fingerprint | Quiet fingerprint |", "|---|---|---|"];
  for (const row of report.proof.fingerprints) lines.push(`| ${row.seed} | ${row.water} | ${row.none} |`);
  lines.push("", "| Frozen file | Baseline Git blob | HEAD Git blob | Comparison |", "|---|---|---|---|");
  for (const row of report.proof.dependencies) lines.push(`| ${row.file} | ${row.baselineBlob} | ${row.headBlob} | ${row.status} |`);
  lines.push("", statisticsMarkdown(report.statistics), "## Rankings", "", report.day19Definition, "", report.retryPolicy, "");
  for (const [role,label] of [["firstAlert","first Alert"],["day19","day 19"]]) {
    const row = report.ranking.summary[role];
    lines.push(`Works A first at ${label}: ${row.worksFirst}/${row.ranked} seeds with a ranked event; seeds with an event: ${row.withEvent}/10; ${role === "firstAlert" ? "no Alert" : "none on day 19"}: ${seedList(row.noEventSeeds)}; unavailable: ${seedList(row.unavailableSeeds)}; missing: ${seedList(row.missingSeeds)}.`, "");
  }
  lines.push("| Seed | Event roles | Evidence day | Full source order (confidence; clinicians' clues only) | School rank | Shop rank | Drops and repairs | ms | Input / output tokens | Attempts | Outcome |", "|---|---|---|---|---|---|---|---|---|---|---|");
  for (const row of report.ranking.rows) {
    const order = row.sources.map((source) => `${source.rank}. ${source.sourceId} (${source.confidence}; ${source.fromClinicianCluesOnly ? "yes" : "no"})`).join("; ") || row.outcome;
    const drops = row.dropCounts ? Object.entries(row.dropCounts).map(([key,value]) => `${key}:${value}`).join("; ") : "missing";
    lines.push(`| ${row.seed} | ${row.roles.join(" + ")} | ${row.evidenceDay} | ${order} | ${row.schoolRank} | ${row.shopRank} | ${drops} | ${row.ms ?? "missing"} | ${row.tokens ? `${row.tokens.input ?? "unknown"} / ${row.tokens.output ?? "unknown"}` : "missing"} | ${row.attempts ?? "missing"} | ${row.outcome} |`);
  }
  lines.push("", "## Comparison with tuning", "", "| Metric | Tuning seeds 1 to 10 | Held-out seeds 11 to 20 |", "|---|---|---|");
  for (const row of report.comparison) lines.push(`| ${row.metric} | ${shown(row.tuning)} | ${shown(row.heldOut)} |`);
  const first = report.ranking.summary.firstAlert, day19 = report.ranking.summary.day19;
  lines.push(`| Works A first at ranked first Alert | 7/10 | ${first.worksFirst}/${first.ranked} |`,
    `| Works A ever first by day 19 | 10/10 | Not measured by this two-event design |`,
    `| Works A first in carried event at day 19 | Not established by the published tuning metric | ${day19.worksFirst}/${day19.ranked} ranked; ${day19.withEvent}/10 with event |`, "",
    ...report.observations, "", "Counts describe this simulation and these samples only. Missing and unavailable calls are excluded from ranked-event denominators and listed explicitly.", "");
  return lines.join("\n");
}
