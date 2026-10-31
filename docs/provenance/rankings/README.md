# Saved ranking runs

Tuning runs belong at this level and in experiments/. Task 18's separate held-out/
subfolder accepts only the approved held-out run; tuning tools remain locked.
Cards are rebuilt from the generator; whole cards,
transcripts, account data and credentials are never saved here.

From the repository root in PowerShell:

```powershell
npm.cmd run rank:saved -- --set all --plan
npm.cmd run rank:saved -- --set all
```

The first command prints the plan without calling a model or writing rankings.
The second shows missing or unavailable calls, an estimate, and `Run N calls? (y/n)`.
After `y`, enter the Meta key at the hidden terminal prompt. Never paste it into chat.
The script keeps it in memory only. A rerun skips every completed record and keeps
previous unavailable attempts when filling them.

Sets: main (67 calls), effort (5), repeat (2), swap (5); all (79).
`--seeds 1,2` restricts seeds. `--effort medium` selects medium for main, repeat
and swap; the effort experiment always uses medium.

Each main seed has one `seed-NN.json` file with a `records` array. Experiments use
the same filenames inside `experiments/`. Records include the input and hash,
raw output with short citations, cleaned ranking with real evidence references,
drop counts, model, effort, prompt hash, date, timings and tokens. Appending a
retry preserves its earlier unavailable record. Different configurations have
different record identities. The seed-one output projection contains no inputs.

After the paid run has been reviewed:

```powershell
node scripts/scorecard.mjs --rankings
```

This writes `scorecard-tuning-seeds-1-10.md`. Use `--effort medium` after an
approved medium main rerun. The evaluator alone reads the hidden scenario answer.

Public documentation checked 30 Oct 2026:

- [Structured output](https://dev.meta.ai/docs/structured-output): JSON schema and strict mode.
- [Request schema](https://dev.meta.ai/docs/api-reference/chat-completions/schemas):
  temperature 0; `reasoning_effort`; `max_completion_tokens` includes reasoning.
- [Pricing](https://dev.meta.ai/docs/pricing-rate-limits): Standard Muse Spark 1.3,
  USD 1.25 per million input tokens and USD 4.25 per million output tokens,
  unchanged from the figures checked on 27 Oct. The estimate assumes no cache discount.

The output cap is 8,000. Input token estimates use UTF-8 bytes divided by four,
plus a message allowance; actual usage can differ. One invalid-JSON retry is
allowed. No HTTP, connection or timeout retry is made.
