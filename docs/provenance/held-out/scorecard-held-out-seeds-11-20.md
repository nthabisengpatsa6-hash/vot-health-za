# Held-out scorecard: seeds 11 to 20

Simulation: made-up data. Sample size: 10 held-out seeds.

## Pre-unlock proof

Commit: ccff74acf67183b48193a7631b98a87c817716ef. Signal hash: abc36af17d67a689. Ranking prompt hash: 01622c7f95af2326.

The existing fingerprint test generates seed 11 to 20 cards only to hash them. It computes no statistics, signals, rankings or outcomes from them. No held-out statistics, signals, rankings or outcomes were computed during Part C.

| Seed | Seeded fingerprint | Quiet fingerprint |
|---|---|---|
| 11 | match | match |
| 12 | match | match |
| 13 | match | match |
| 14 | match | match |
| 15 | match | match |
| 16 | match | match |
| 17 | match | match |
| 18 | match | match |
| 19 | match | match |
| 20 | match | match |

| Frozen file | Baseline Git blob | HEAD Git blob | Comparison |
|---|---|---|---|
| functions/data/places.json | cde108f3ffe87570868282ecae09469eb13fa957 | cde108f3ffe87570868282ecae09469eb13fa957 | same |
| functions/lib/callRanker.js | 2f0a43d2eb44c58cd69abf32f49707dede6a1621 | 2f0a43d2eb44c58cd69abf32f49707dede6a1621 | same |
| functions/lib/rankTiming.js | 94fbfe101b88d9f352ede00b802c54f7951ccfa7 | 94fbfe101b88d9f352ede00b802c54f7951ccfa7 | same |
| functions/prompts/rank-sources.md | 359391d34613bdba98ae359c231b39f46d220274 | 359391d34613bdba98ae359c231b39f46d220274 | same |
| functions/shared/baseline.mjs | 0a54dfd4dbf09eacdb654899b4f4bbe7c4207a5d | 0a54dfd4dbf09eacdb654899b4f4bbe7c4207a5d | same |
| functions/shared/cardDoc.mjs | 535816ede7e512b20daf81b4925c231f73deab84 | 535816ede7e512b20daf81b4925c231f73deab84 | same |
| functions/shared/cardFields.mjs | fdbd791d082850e0c09dbd1162e2ed1ace30fcc1 | fdbd791d082850e0c09dbd1162e2ed1ace30fcc1 | same |
| functions/shared/layers.mjs | c7982b66e892984bcffc51b65e13df6607e530a2 | c7982b66e892984bcffc51b65e13df6607e530a2 | same |
| functions/shared/rank/clues.mjs | 79fa979a35a482e3f3032f9351eca2d359080385 | 79fa979a35a482e3f3032f9351eca2d359080385 | same |
| functions/shared/rank/input.mjs | c8ae5d1bccb8e3b2f8b3282796c7a1037f4f1def | c8ae5d1bccb8e3b2f8b3282796c7a1037f4f1def | same |
| functions/shared/rank/match.mjs | a2f2f9b4afcd166dbe2069db62620b8f8e654825 | a2f2f9b4afcd166dbe2069db62620b8f8e654825 | same |
| functions/shared/rank/schema.mjs | f7e9827eab066aa8ded8d606a57bb0f0d48d4996 | f7e9827eab066aa8ded8d606a57bb0f0d48d4996 | same |
| functions/shared/rank/settings.mjs | 47ac6bff9c99ee070d3c9f251e438fb56aa631e6 | 47ac6bff9c99ee070d3c9f251e438fb56aa631e6 | same |
| functions/shared/rank/validate.mjs | 1ae1c16da9d3552b7e8c3a2ae1b22697a6b25657 | 1ae1c16da9d3552b7e8c3a2ae1b22697a6b25657 | same |
| functions/shared/sastDay.mjs | 90a39660bdfc4667d94d93859142bd93e0562600 | 90a39660bdfc4667d94d93859142bd93e0562600 | same |
| functions/shared/settings.mjs | 4bd45f30290f7e4504ed5465594001f789bacc74 | 4bd45f30290f7e4504ed5465594001f789bacc74 | same |
| functions/shared/signals.mjs | 5b3bad24abb1963e53630a61ab6067c9d1d6162f | 5b3bad24abb1963e53630a61ab6067c9d1d6162f | same |
| functions/shared/sim/background.mjs | ec48007f937ea6ab6b4d60c6b9a26d11be956369 | ec48007f937ea6ab6b4d60c6b9a26d11be956369 | same |
| functions/shared/sim/calendar.mjs | ce6b218441192860e07e8953dfd011565cb07403 | ce6b218441192860e07e8953dfd011565cb07403 | same |
| functions/shared/sim/card.mjs | ec2166fdc205f838d611be8166896a3ea81d6456 | ec2166fdc205f838d611be8166896a3ea81d6456 | same |
| functions/shared/sim/draws.mjs | 9472a1076340f43e468c99acfd1422fdcc6d200a | 9472a1076340f43e468c99acfd1422fdcc6d200a | same |
| functions/shared/sim/engine.mjs | 502cfacdc5918b53e84b900a2ddb20ceebd18690 | 502cfacdc5918b53e84b900a2ddb20ceebd18690 | same |
| functions/shared/sim/phrases.mjs | 00f0fa5e2e95ca106e79b3c30478a6a3cc9c4322 | 00f0fa5e2e95ca106e79b3c30478a6a3cc9c4322 | same |
| functions/shared/sim/random.mjs | f66d804cfe8f52fbd23003c2c953f6e54079df3b | f66d804cfe8f52fbd23003c2c953f6e54079df3b | same |
| functions/shared/sim/reporters.mjs | 94ca8338f9a6ae9c6524a069c01711f09fadca78 | 94ca8338f9a6ae9c6524a069c01711f09fadca78 | same |
| functions/shared/sim/scenarios.mjs | 21037eaae22340fbef679b64b7055ab6ee67c0ff | 21037eaae22340fbef679b64b7055ab6ee67c0ff | same |
| functions/shared/sim/seededCluster.mjs | 344e0583f14d70da78781caf3fcd2eeb3d132375 | 344e0583f14d70da78781caf3fcd2eeb3d132375 | same |
| functions/shared/sim/town.mjs | 60be9c9dc03b3fe0a73d99ca52ea55a6c00e26f3 | 60be9c9dc03b3fe0a73d99ca52ea55a6c00e26f3 | same |
| functions/shared/tail.mjs | b23f1eff4002967e2ff5c4e6ce20b74a8f882124 | b23f1eff4002967e2ff5c4e6ce20b74a8f882124 | same |
| scripts/lib/rankArtifacts.mjs | f3a4ad1ca19351dba51f70c1e91e8f5d3a99ed2b | f3a4ad1ca19351dba51f70c1e91e8f5d3a99ed2b | same |
| scripts/lib/rankPlans.mjs | 4989ca179d8ffc973abe582b7ef48799ea583f9e | 4989ca179d8ffc973abe582b7ef48799ea583f9e | same |
| scripts/rank-saved.mjs | 21e5afceeae4a89e494fd1c76e01b23a2075d60c | 21e5afceeae4a89e494fd1c76e01b23a2075d60c | same |
| scripts/scorecard.mjs | 2932efd3e8725034a97b34e7c530996158031cd5 | 2932efd3e8725034a97b34e7c530996158031cd5 | same |
| src/sim/background.js | fffa6a1d5d9175f3ba730397ec193bed1f14595c | fffa6a1d5d9175f3ba730397ec193bed1f14595c | same |
| src/sim/calendar.js | 62228cc35011b1dadaa340bedfe1c7b9964a4740 | 62228cc35011b1dadaa340bedfe1c7b9964a4740 | same |
| src/sim/card.js | 4db8bd79b8a7178737ab06b5a0b41e739a9352e1 | 4db8bd79b8a7178737ab06b5a0b41e739a9352e1 | same |
| src/sim/draws.js | af05d6eeccce4227962f681f34ead81d536b0513 | af05d6eeccce4227962f681f34ead81d536b0513 | same |
| src/sim/engine.js | 30ac13696d9301ed9d9d8a5f464fd7ae68c3e610 | 30ac13696d9301ed9d9d8a5f464fd7ae68c3e610 | same |
| src/sim/groundTruth.js | 6046db234fb6c187f10304e4292b418c15ab2878 | 6046db234fb6c187f10304e4292b418c15ab2878 | same |
| src/sim/phrases.js | a6dbb5041d2ab34f113e5e4d2f35c0b7d489c425 | a6dbb5041d2ab34f113e5e4d2f35c0b7d489c425 | same |
| src/sim/random.js | 1c46d389d232757ac3bfd56c523def51b2cebc2c | 1c46d389d232757ac3bfd56c523def51b2cebc2c | same |
| src/sim/reporters.js | fa299608671e4db961809b343a9444689ac30fbc | fa299608671e4db961809b343a9444689ac30fbc | same |
| src/sim/saved-rankings/seed-1.json | 0a1fe7b9a9ef93035ce64f7f8cf33b6ee1444ad2 | 0a1fe7b9a9ef93035ce64f7f8cf33b6ee1444ad2 | same |
| src/sim/scenarios.js | 1af13f55fe882456671753ef24a1c5f617320cd1 | 1af13f55fe882456671753ef24a1c5f617320cd1 | same |
| src/sim/scorecard.js | 82356a905fc91db3a84fc6aa2abec9e72b6cc4fc | 82356a905fc91db3a84fc6aa2abec9e72b6cc4fc | same |
| src/sim/seededCluster.js | 7cab3263821137bb9027fe7a71309e669aa8feaa | 7cab3263821137bb9027fe7a71309e669aa8feaa | same |
| src/sim/town.js | 60c2e4f03ccc616cb9b63495530fbf4361bad726 | 60c2e4f03ccc616cb9b63495530fbf4361bad726 | same |
| test-fixtures/sim-move-fingerprints.json | 2c68d1533791edcffa83a9a10f1028da68be65fb | 2c68d1533791edcffa83a9a10f1028da68be65fb | same |

## Held-out seeds 11 to 20

Simulation: made-up data; sample size 10 seeds; replay days 0 to 28.

False counts are false signals (signal-days), at the exact recorded level. Multiple false signals on a calendar day count separately.

| Seed | First Watch | First Signal | First Alert | Seeded false signals (signal-days): W / S / A | Quiet false signals (signal-days): W / S / A |
|---|---|---|---|---|---|
| 11 | 15 | 17 | 17 | 0 / 0 / 0 | 0 / 0 / 0 |
| 12 | 15 | 16 | 16 | 0 / 0 / 0 | 0 / 0 / 0 |
| 13 | 15 | 15 | 15 | 0 / 0 / 0 | 0 / 0 / 0 |
| 14 | 15 | 15 | 15 | 0 / 0 / 0 | 0 / 0 / 0 |
| 15 | 15 | 17 | 17 | 1 / 0 / 0 | 1 / 0 / 0 |
| 16 | 15 | 15 | 15 | 0 / 0 / 0 | 0 / 0 / 0 |
| 17 | 15 | 16 | 16 | 0 / 0 / 0 | 0 / 0 / 0 |
| 18 | 16 | 18 | 18 | 2 / 0 / 0 | 3 / 0 / 0 |
| 19 | 15 | 18 | 18 | 0 / 0 / 0 | 0 / 0 / 0 |
| 20 | 15 | 18 | 18 | 0 / 0 / 0 | 0 / 0 / 0 |

| Level | Median first day | Range | Seeds reaching level | Seeds not reaching level |
|---|---|---|---|---|
| watch | 15 | 15 to 16 | 10/10 | none |
| signal | 16.5 | 15 to 18 | 10/10 | none |
| alert | 16.5 | 15 to 18 | 10/10 | none |

| Scenario | False signals (signal-days): Watch | Signal | Alert |
|---|---|---|---|
| seeded | 3 | 0 | 0 |
| quiet | 4 | 0 | 0 |
| combined | 7 | 0 | 0 |

## Tuning seeds 1 to 10, recomputed

Simulation: made-up data; sample size 10 seeds; replay days 0 to 28.

False counts are false signals (signal-days), at the exact recorded level. Multiple false signals on a calendar day count separately.

| Seed | First Watch | First Signal | First Alert | Seeded false signals (signal-days): W / S / A | Quiet false signals (signal-days): W / S / A |
|---|---|---|---|---|---|
| 1 | 15 | 17 | 17 | 0 / 0 / 0 | 0 / 0 / 0 |
| 2 | 15 | 15 | 15 | 4 / 0 / 0 | 4 / 0 / 0 |
| 3 | 15 | 16 | 16 | 0 / 0 / 0 | 0 / 0 / 0 |
| 4 | 14 | 15 | 15 | 1 / 0 / 0 | 1 / 0 / 0 |
| 5 | 16 | 17 | 17 | 3 / 0 / 0 | 3 / 0 / 0 |
| 6 | 14 | 16 | 16 | 0 / 0 / 0 | 0 / 0 / 0 |
| 7 | 15 | 16 | 18 | 0 / 0 / 0 | 0 / 0 / 0 |
| 8 | 14 | 15 | 15 | 2 / 0 / 0 | 2 / 0 / 0 |
| 9 | 14 | 15 | 15 | 0 / 0 / 0 | 0 / 0 / 0 |
| 10 | 18 | 18 | 18 | 0 / 0 / 0 | 0 / 0 / 0 |

| Level | Median first day | Range | Seeds reaching level | Seeds not reaching level |
|---|---|---|---|---|
| watch | 15 | 14 to 18 | 10/10 | none |
| signal | 16 | 15 to 18 | 10/10 | none |
| alert | 16 | 15 to 18 | 10/10 | none |

| Scenario | False signals (signal-days): Watch | Signal | Alert |
|---|---|---|---|
| seeded | 10 | 0 | 0 |
| quiet | 10 | 0 | 0 |
| combined | 20 | 0 | 0 |

## Tuning recomputation against HANDOVER.md

| Metric | Published | Recomputed | Match |
|---|---|---|---|
| First Watch minimum | 14 | 14 | yes |
| First Watch maximum | 18 | 18 | yes |
| First Watch median | 15 | 15 | yes |
| First Signal median | 16 | 16 | yes |
| First Alert median | 16 | 16 | yes |
| seeded: false signals (signal-days), watch | 10 | 10 | yes |
| seeded: false signals (signal-days), signal | 0 | 0 | yes |
| seeded: false signals (signal-days), alert | 0 | 0 | yes |
| quiet: false signals (signal-days), watch | 10 | 10 | yes |
| quiet: false signals (signal-days), signal | 0 | 0 | yes |
| quiet: false signals (signal-days), alert | 0 | 0 | yes |

HANDOVER.md records 10 false Watch signals (signal-days) in the quiet runs and the same 10 in the seeded runs: 20 combined. Task 18's original expectation of 10 combined differs. The figures above are reported without changing the scoring logic.

## Rankings

Latest ranking event carried forward by frozen matching and change rules, with original evidence day. Tuning's ever-first-by-day-19 metric is different.

Held-out: once for connection failure, timeout, HTTP 429 or 5xx only. Production: invalid JSON only; unchanged.

Works A first at first Alert: 7/10 seeds with a ranked event; seeds with an event: 10/10; no Alert: none; unavailable: none; missing: none.

Works A first at day 19: 10/10 seeds with a ranked event; seeds with an event: 10/10; none on day 19: none; unavailable: none; missing: none.

| Seed | Event roles | Evidence day | Full source order (confidence; clinicians' clues only) | School rank | Shop rank | Drops and repairs | ms | Input / output tokens | Attempts | Outcome |
|---|---|---|---|---|---|---|---|---|---|---|
| 11 | firstAlert | 17 | 1. water:A (high; no); 2. shop:Leeba View spaza shop (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 14041 | 5417 / 1264 | 1 | ok |
| 11 | day19 | 19 | 1. water:A (medium; no); 2. shop:Leeba View spaza shop (low; no); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 12951 | 5528 / 1859 | 1 | ok |
| 12 | firstAlert | 16 | 1. shop:Leeba View spaza shop (medium; no); 2. water:A (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 1 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 17566 | 4701 / 2023 | 1 | ok |
| 12 | day19 | 19 | 1. water:A (medium; yes); 2. shop:Leeba View spaza shop (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 17670 | 6860 / 2143 | 1 | ok |
| 13 | firstAlert | 15 | 1. water:A (medium; no); 2. shop:Leeba View spaza shop (low; no); 3. school:Leeba View Primary School (low; yes); 4. shop:Lebone Gardens spaza shop (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 13893 | 4890 / 1743 | 1 | ok |
| 13 | day19 | 19 | 1. water:A (high; no) | not ranked | not ranked | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 13844 | 4912 / 1195 | 1 | ok |
| 14 | firstAlert | 15 | 1. school:Leeba View Primary School (medium; yes); 2. shop:Leeba View spaza shop (low; no); 3. water:A (low; yes) | 1 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 17448 | 4409 / 2202 | 1 | ok |
| 14 | day19 | 19 | 1. water:A (medium; no); 2. shop:Leeba View spaza shop (low; yes) | not ranked | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 10317 | 5260 / 1249 | 1 | ok |
| 15 | firstAlert | 17 | 1. water:A (high; no); 2. shop:Leeba View spaza shop (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 13335 | 5478 / 1716 | 1 | ok |
| 15 | day19 | 19 | 1. water:A (medium; no); 2. shop:Leeba View spaza shop (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 15731 | 6044 / 1622 | 1 | ok |
| 16 | firstAlert | 15 | 1. shop:Leeba View spaza shop (medium; no); 2. school:Leeba View Primary School (medium; yes); 3. water:A (low; yes) | 2 | 1 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 10938 | 3851 / 1287 | 1 | ok |
| 16 | day19 | 19 | 1. water:A (high; no); 2. shop:Leeba View spaza shop (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 14464 | 5494 / 1743 | 1 | ok |
| 17 | firstAlert | 16 | 1. water:A (medium; no); 2. shop:Leeba View spaza shop (low; no); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 14613 | 5257 / 1803 | 1 | ok |
| 17 | day19 | 18 | 1. water:A (high; no); 2. shop:Leeba View spaza shop (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 12072 | 5529 / 1310 | 1 | ok |
| 18 | firstAlert | 18 | 1. water:A (medium; no); 2. shop:Leeba View spaza shop (low; yes); 3. school:Leeba View Primary School (low; yes) | 3 | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 12688 | 4450 / 1423 | 1 | ok |
| 18 | day19 | 19 | 1. water:A (high; no); 2. shop:Leeba View spaza shop (low; yes) | not ranked | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 13015 | 5372 / 1204 | 1 | ok |
| 19 | firstAlert + day19 | 18 | 1. water:A (high; no) | not ranked | not ranked | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 10635 | 5500 / 1367 | 1 | ok |
| 20 | firstAlert | 18 | 1. water:A (medium; no); 2. shop:Leeba View spaza shop (low; yes) | not ranked | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 15169 | 4426 / 1742 | 1 | ok |
| 20 | day19 | 19 | 1. water:A (high; no); 2. shop:Leeba View spaza shop (low; yes) | not ranked | 2 | invalidJson:0; invalidShape:0; unknownSource:0; unknownCitation:0; noSupporting:0; invalidConfidence:0; extraSources:0; duplicateSource:0; ranksRepaired:0; bannedReason:0; idInReason:0; invalidReason:0 | 14042 | 5711 / 1670 | 1 | ok |

## Comparison with tuning

| Metric | Tuning seeds 1 to 10 | Held-out seeds 11 to 20 |
|---|---|---|
| First watch median day | 15 | 15 |
| First signal median day | 16 | 16.5 |
| First alert median day | 16 | 16.5 |
| seeded false signals (signal-days): watch | 10 | 3 |
| seeded false signals (signal-days): signal | 0 | 0 |
| seeded false signals (signal-days): alert | 0 | 0 |
| quiet false signals (signal-days): watch | 10 | 4 |
| quiet false signals (signal-days): signal | 0 | 0 |
| quiet false signals (signal-days): alert | 0 | 0 |
| Works A first at ranked first Alert | 7/10 | 7/10 |
| Works A ever first by day 19 | 10/10 | Not measured by this two-event design |
| Works A first in carried event at day 19 | Not established by the published tuning metric | 10/10 ranked; 10/10 with event |

Held-out First signal median day is higher than tuning (16.5 versus 16).
Held-out First alert median day is higher than tuning (16.5 versus 16).

Counts describe this simulation and these samples only. Missing and unavailable calls are excluded from ranked-event denominators and listed explicitly.
