# Held-out evaluation

Simulation: made-up data. Ten seeds (11 to 20), after approval to unlock.
Part C builds and tests the tools; it does not compute held-out outcomes.

From the repository root, in a VS Code PowerShell terminal:

```powershell
npm.cmd run heldout:preflight -- --held-out
```

This checks a clean working tree, the frozen configuration and prompt hashes,
every original dependency blob against ab40db5, and both fingerprints per seed.
It writes the proof to ignored `.scratch/heldout-proof.json`. The implementation
commit is the proof's commit. The existing fingerprint test generates seed 11 to
20 cards only to hash them; it computes no statistics, signals, rankings or
outcomes from them. Fingerprint preflight has the same limited purpose.

Only after **approved unlock**:

```powershell
npm.cmd run heldout:stats -- --held-out
```

This uses the unchanged scoreRun for both scenarios, recomputes tuning results,
selects ranking inputs, and exclusively creates the proof, statistics and plan.
Existing result files refuse a second run. Commit these files before ranking.
Neither the generator, statistics nor event selection may be changed after unlock.

```powershell
npm.cmd run heldout:rank -- --held-out --dry-run
```

This reads the committed plan, lists selected events, and prints input estimates,
full 8,000-token output costs, maximum retries and time. It makes no network call
and does not prompt for a key. It is deferred to Part D, because no actual event
plan exists before unlock.

Nthabi alone runs the paid command in an interactive VS Code PowerShell terminal:

```powershell
npm.cmd run heldout:rank -- --held-out
```

It asks `Run N calls? (y/n)` before hidden temporary-key entry. No environment or
credential file is read for a key. The key stays in memory and is not echoed.
Meta Standard muse-spark-1.3, low effort, prompt, schema, caps and guards are frozen.
Public Standard prices checked 31 Oct 2026: USD 1.25 per million input tokens and
USD 4.25 per million output tokens. No cached-input discount is assumed.
Source: https://dev.meta.ai/docs/pricing-rate-limits

The separate approved adapter retries once for a connection failure, timeout,
HTTP 429 or 5xx. It never retries invalid JSON. This differs from the production
ranker's invalid-JSON-only retry; the production ranker is unchanged.

A durable started marker precedes each call. Every finished response, including
an unavailable response, is terminal and will not be called again. An interrupted
call requires review, not an automatic retry. Each attempt with missing usage is
accounted at estimated input plus 8,000 output tokens. Accounted spending of USD 2
pauses further calls. After interruption, inspect and commit completed journals
before restarting: every invocation requires a clean working tree. No spending
override or additional-call flag is provided.

The summary contains counts, timings, token usage and cost only. Then:
"Now delete the temporary key (Meta: ai.developer.meta.com, API keys) and clear clipboard history with Win+V."

After **Run done** and review, checkpoint the journals before generating reports:

```powershell
npm.cmd run heldout:scorecard -- --held-out
```

It creates the Markdown report here and the same numeric report in
`src/sim/held-out/scorecard-held-out-seeds-11-20.json`. No screen imports that JSON
in this task. A later screen can load it with a dynamic import, without Firebase.
Reports can be regenerated from observations; statistics and journals are retained.

## Definitions

The frozen scoreRun counts false signals (signal-days), by their exact level.
Two signals on one day count twice. First-level days use the primary planted
symptom group; higher levels satisfy lower first-level checks. Medians use only
reached values and show the reached denominator plus unreached seed lists.
HANDOVER.md's tuning figures are 10 false Watch signals (signal-days) in each
scenario, zero Signal/Alert: 20 Watch combined. Recompute and report differences.

Event selection never reads the answer key. First Alert follows the original
planner's chronological order. At day 19, select the matching active first-Alert
signal, otherwise the first eligible signal in the original signal order. Take
its latest saved ranking event under matchSignal/rankingChange, with the original
evidence day. Identical first-Alert/day-19 events share one call. No active Signal
or Alert means none on day 19. At most two calls per seed, 20 total.

Works A first at first Alert is out of seeds with a ranked first Alert. No Alert,
unavailable and missing seeds are listed on the same summary line and are not
counted as right or wrong. The day-19 report also states seeds with an event.
Tuning's 7/10 first-Alert result is comparable; its 10/10 ever-first-by-day-19
result differs from the carried event active on day 19 and is labelled separately.
Full source order, confidence, school/shop ranks, clues-only flags, guard counts,
timings, attempts, usage and outcomes are retained. Sample size is stated plainly.

## Scan boundaries

Held-out seeds are permitted only under the exact path segments
`docs/provenance/held-out/`, `docs/provenance/rankings/held-out/`, and at the exact
JSON path above. A sibling such as `docs/provenance/held-out-x/` is refused.
Credential, header and private-field restrictions still apply. Tuning writers
and tools keep their original seed refusals. Transcript-scan classification and
fixed text allowances are unchanged; any rejected overlap still blocks pushing.
