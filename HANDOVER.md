# HANDOVER

**Last updated:** 2026-10-27 13:35 SAST

**Read this first, then docs/PROJECT_CONTEXT.md.** This file is the current state of the build. Claude Code updates it and commits at the end of every task, so any new Claude Code session can start from here. The repo is public: no keys, passwords or personal data in this file.

## Where we are
Day 1 (Tue 27 Oct). A voice note now becomes draft case cards: two "ears" (Muse Voice Transcribe and Muse Spark audio) transcribe it in parallel, and Muse Spark 1.3 builds the cards from both, behind code guards. The callable processNote does this end to end (not deployed). Scoring: 99.1% on the 10 text fixtures after Task 5's fixture corrections and prompt changes, with 3 confident-wrong values left; 91.7–95.8% on the two real recordings in Task 4 (results below). The live Hosting URL is https://vot-health-za.web.app; it still shows the Vite starter page. Next: score the 10 recordings when they arrive, then Day 2's Report screen.

## Done

### Day 0 — Mon 26 Oct (setup)
- React + Vite (JavaScript) app at the repo root.
- src/config/product.js with PRODUCT_NAME = "Fola" (renaming the product is a one-line change).
- src/lib/firebase.js (Firebase web set-up).
- Firebase Hosting, Firestore (deny-all rules), Cloud Functions and the Emulator Suite configured.
- Firebase project: display name "Fola", Blaze plan with a budget alert, Firestore and Functions in africa-south1, web app "Fola web".
- Callable function checkMetaConnection: calls the Meta Model API and returns the list of model IDs.
- Meta API key stored as the Firebase secret META_API_KEY.
- README.md: project summary, the "built during the hackathon" statement and the made-up-data note.
- functions/constants.js holds the Meta API base URL (https://api.meta.ai/v1).
- Cloud Functions in JavaScript (CommonJS) on Node 22, firebase-functions v7, capped at 10 instances.
- oxlint linter with React hooks rules (npm run lint).
- .gitignore covers logs, env files, functions/.secret.local and service-account key files.
- Empty Firestore indexes file (firestore.indexes.json).
- The web page is still Vite's starter page (src/App.jsx); src/lib/firebase.js only starts the Firebase app.
- firebase init was done by hand, because it needs an interactive terminal.
- Oxlint is the template default instead of ESLint.
- firebase-functions-test isn't used (it doesn't support firebase-admin 14), so tests use node:test on plain modules.
- The budget alert is USD 10; its 50% alert is about the planned R100 warning.
- Two permission changes were made on purpose and should stay:
  - the Cloud Build builder role on the default compute service account, needed for deploys
  - allUsers as Cloud Run Invoker plus a project-level org-policy exception, needed so callable functions can be reached at all. The sign-in check inside each function is the real gate.

### Day 1 — Tue 27 Oct
- HANDOVER.md, docs/PROJECT_CONTEXT.md and CLAUDE.md created; .gitignore checked.
- Muse Voice Transcribe file endpoint confirmed working (format below).
- functions/lib/transcribe.js: checkWav (WAV header check with plain-English errors) and transcribeWav (one note in, transcript and timings out; logs nothing).
- Callable function transcribeNote (africa-south1, META_API_KEY, sign-in required, 120 s / 6 MB cap, logs timings only). Never deployed; replaced by processNote in Task 4.
- 13 unit tests for the WAV header check (npm --prefix functions test), no network calls.
- scripts/convert-audio.mjs (phone recordings to 16 and 24 kHz WAVs) and scripts/transcribe-test.mjs (three-way hint test).
- 2 test voice notes recorded (clear English; fast Sesotho–English mix with background noise), converted, and transcribed in two full runs.
- Model IDs recorded and the Muse Spark model chosen (see "Decisions and why").
- transcribeWav retries once on a dropped connection, a timed-out attempt, or HTTP 429, 500, 502, 503 or 504; never on any other 4xx. transcribeNote's timeout raised to 150 s; it logs attempts and timings (plus failure kind and HTTP status on failure). Not deployed.
- 7 retry unit tests with a fake fetch, no network (20 unit tests in total).
- Test runner: --runs and --files flags, 24 kHz files only, numbered result files that are never overwritten, and Muse Spark audio runs (d: 1.3, e: 1.2) as an experiment. The converter skips files it has already converted.
- Sesotho experiment: 2 new test notes (all-Sesotho; mixed Sesotho–English with a place name) compared across Voice Transcribe and Muse Spark audio, 11 calls (results below).
- Task 4, "two ears" case card extraction (not deployed):
  - functions/data/places.json: the demo town Kganya, its 7 areas and which works feeds each.
  - functions/lib/metaRequest.js: the shared 60 s-per-attempt, one-retry request code (moved out of transcribe.js), with failure kinds, the reason for each retried attempt, cancelling, and a guard that refuses any "-contributor" model ID.
  - functions/lib/sparkAudio.js: the Muse Spark audio ear (model from SPARK_AUDIO_MODEL; prompt in functions/prompts/spark-audio.md).
  - functions/lib/extractCard.js and functions/lib/cardSchema.js: Muse Spark 1.3 (text) with structured output builds the cards from one or two transcripts; the prompt is in functions/prompts/extract-card.md, with the lists filled in from code. Code guards: shape validation, known keys only (stray text such as advice is dropped), allowed values, whole-number counts, off-list areas moved to areaHeard, every required gap marked unsure, one question per unsure field, and a notifiable condition kept only if a transcript says it.
  - functions/lib/twoEars.js: both ears in parallel; after the first succeeds, at most 30 s more for the other, which is then cancelled; if one fails, the card comes from the other (singleSource: true).
  - Callable processNote (replaces transcribeNote): sign-in required, africa-south1, META_API_KEY, 300 s timeout; logs timings, attempts and failure kinds only.
  - 25 new unit tests (45 in total): guards, two ears, and the Spark and extraction requests, all with fakes.
  - scripts/score-extraction.mjs and the made-up fixtures in test-fixtures/; the Task 3 runner now records why a retried attempt failed.
- Task 5 (not deployed):
  - Corrected three expected answers in test-fixtures/expected-cards.json: n01 and n06 onset (now asked), n09 second card's age group (now asked).
  - Extraction prompt: what counts as moreSevere (in any language), time phrases about other things aren't the onset, and a name only ever becomes [name].
  - Scorer: a "confident wrong" count per note and overall, and --rescore to score a saved run against the current fixtures with no API calls.
  - AGENTS.md added with the same rules as CLAUDE.md; both gained three rules (no "-contributor" models; no transcript text, real names, keys or personal folder paths in the repo; keep the two files in step).
  - Stage 1 re-scored and re-run (results below).

## Confirmed API formats

### Muse Voice Transcribe, file endpoint (confirmed 27 Oct with real calls)
Sources: Meta's cookbook (meta-models/meta-model-cookbook, 06_muse_voice/01_voice_api_fundamentals) and the API reference at dev.meta.ai (/docs/api-reference/voice/transcribe, /docs/speech-to-text).
- POST https://api.meta.ai/v1/asr/transcribe with headers Authorization: Bearer <key> and Accept: application/json.
- multipart/form-data, two parts:
  - "request": JSON sent as application/json: { "mode": "PUSH_TO_TALK", "model": "muse-voice-transcribe-1.0", "audioEncoding": "WAV" }, plus optional "keywords": [strings] and "languageBias": [language names].
  - "audio": the whole WAV file (header included), sent as audio/wav with a filename.
- Audio: RIFF/WAVE, mono, 16-bit integer PCM, 16 or 24 kHz (24 kHz is the engine's native rate). Server limits: 10 minutes or 32 MB. Our own cap: 120 s and 6 MB.
- Modes: PUSH_TO_TALK (default; ours), ENDPOINTING, DIARIZATION.
- Response: { sessionId, transcript, audioDurationMs, turns: [{ turnId, startMs, endMs, transcript, speaker? }] }. turns can be absent.
- Errors: 400 (bad audio, over 10 min, not multipart), 401 (key rejected), 406, 413 (over 32 MB), 429 (rate limit), 500.
- The server silently ignores unknown field names, modes and (probably) hint values, so a typo looks like a hint with no effect. We send hints only when they have values, and by default we send none.
- languageBias is dropped (decision, 27 Oct). Its format was never confirmed: the docs show "English", the cookbook "english".
- Supported languages (25) don't include Sesotho, Zulu or Afrikaans; the model handles code-switching between its own languages.
- Our client: 60 s per attempt (including reading the reply), at most 2 attempts, 1 s pause before the retry.

### Muse Spark, audio input (experiment only; test runner runs d and e)
Source: dev.meta.ai (/docs/models, /docs/api-reference/chat-completions/schemas, /docs/reasoning, /docs/file-handling).
- POST https://api.meta.ai/v1/chat/completions. A user content part { "type": "input_audio", "input_audio": { "data": "<base64>", "format": "wav" } }; wav and mp3 only.
- Standard mode is the model ID without "-contributor"; there is no separate setting.
- Meta's models page: "Audio understanding in Muse Spark 1.3 is not fully supported"; it points to 1.2 or Muse Voice Transcribe for audio.
- reasoning_effort can't be "none" for Muse Spark (HTTP 400); "low" is Meta's advice for direct tasks. Reasoning tokens count toward max_completion_tokens.
- usage: prompt_tokens, completion_tokens, total_tokens, completion_tokens_details.reasoning_tokens.
- Confirmed 27 Oct: both muse-spark-1.3 and muse-spark-1.2 accept this audio part with reasoning_effort "low" and max_completion_tokens 4000; every call finished with "stop".

### Muse Spark structured output (confirmed 27 Oct with real calls)
Source: dev.meta.ai/docs/structured-output.
- Chat Completions with "response_format": { "type": "json_schema", "json_schema": { "name": "case_cards", "strict": true, "schema": { ... } } }. The reply's choices[0].message.content is a JSON string.
- strict: true means every object sets additionalProperties: false and lists every key as required; anyOf is allowed below the root, so "can be null" is written as anyOf with { "type": "null" }. JSON mode isn't documented.
- Works together with reasoning_effort "low" and "medium" on muse-spark-1.3 (64 extraction calls in Task 4, no schema errors).
- Prices (Standard mode, 27 Oct): Muse Spark 1.3 and 1.2 $1.25 per million input tokens, $4.25 per million output tokens; Muse Voice Transcribe $0.18 per hour of audio. Rate limit 3,000 requests per minute.

### Transcription test results (27 Oct)
2 notes (31 s clear English; 24 s fast Sesotho–English with noise) × 2 sample rates × 3 hint settings (none; keywords "Amanzimtoti"; keywords + languageBias "English") × 2 runs = 24 calls. Full results stay in test-audio/results/ (gitignored).
- The endpoint worked on the first call. 21 of 24 calls succeeded. The 3 failures were network-level ("fetch failed", no API error code), all in run 1, back to back, on one file.
- Latency: run 1 8.0–51.0 s (median 37 s); run 2 5.5–29.4 s (median 7.9 s). The same file varied from 8 to 43 s, so the swings come from the network or server load, not the audio.
- 16 vs 24 kHz: the same words at both rates. 16 kHz files are smaller but weren't faster.
- Keywords: not properly tested, because neither note said "Amanzimtoti". The keyword was never inserted when it wasn't spoken.
- Language hint "English": no visible effect.
- Calls with hints repeated a word more often: no hints 2 of 7 calls, keywords 5 of 7, keywords + language 7 of 7.
- Mixed note: the English parts were accurate in every call. Common Sesotho words came through in recognisable spelling, but some were unstable (a two-word greeting was right in 4 of 9 calls), and whole Sesotho phrases were sometimes dropped silently (a closing phrase appeared in only 2 of 9 calls).

### Sesotho experiment results (27 Oct, Task 3)
3 notes at 24 kHz: all-Sesotho (38 s), mixed Sesotho–English saying the keyword "Amanzimtoti" twice (19 s), and Task 2's mixed note (24 s). Runs: a (Voice Transcribe, no hints), b (keywords; new notes only), d (muse-spark-1.3 audio), e (muse-spark-1.2 audio). One call per setting (11 calls), so these are early signals, not settled results. Transcripts were checked against the scripts the speaker read; full results stay in test-audio/results/ (run-003, run-004).
- All-Sesotho note: no route was reliable.
  - Voice Transcribe (a, b) kept every sentence but spelled Sesotho by sound and garbled key facts: the case count (run a), the symptom word (run b) and a day of the week (both). A spoken name came back split into two words.
  - Muse Spark 1.3 returned only "[?]", in line with Meta's warning that its audio support is incomplete.
  - Muse Spark 1.2 had the best Sesotho spelling where it heard the words, but silently dropped two parts (one of them a day of the week), marked two others (one of them the name) as [?], and added a sentence that wasn't spoken.
- Mixed notes: both Muse Spark versions were close to word-perfect, kept two Sesotho phrases that Voice Transcribe dropped from the Task 2 note, and doubled no words. Voice Transcribe turned one Sesotho phrase into a plausible English word that changes the meaning, and doubled words in both runs.
- Keyword: with no hint, Voice Transcribe misspelled "Amanzimtoti" both times (as on 26 Oct); with the keyword (run b) it was right both times. Muse Spark got it right both times with no hint.
- Latency: Voice Transcribe 6.6–8.4 s on the mixed notes and 51–63 s on the all-Sesotho note; Muse Spark 9.6–16.2 s on the mixed notes and 25–27 s on the all-Sesotho note.
- The retry fired once in practice: a first attempt failed after 10.7 s and the retry succeeded (63 s in total). The runner doesn't record why the first attempt failed.
- Tokens (Muse Spark): 334–566 input tokens per note (about 15–17 per second of audio); 600–1,456 output tokens, 91–98% of them reasoning even at "low". No call came near the 4,000 limit.

### Case card extraction results (27 Oct, Task 4)
Full results stay in test-audio/results/ (score-001 to score-003, gitignored).

Stage 1 (text): the 10 made-up ideal transcripts in test-fixtures/, each given as both transcripts, 3 repeats per effort (60 calls).
- Effort low: 331 of 342 checks (96.8%); 1.60 questions per card (the expected cards ask 1.30); 9 extra questions in 30 results; extraction 4.8 s on average (1.9–8.7 s, 5 calls at a time); about $0.22.
- Effort medium: also 96.8%, with the same four misses; 1.63 questions per card, 10 extra questions; 6.7 s on average (2.2–10.9 s); 2.3 times the reasoning tokens; about $0.34.
- The four misses, the same in every repeat: onset left null when a note only says when the patients came in (n01, n06); a very weak patient not counted as moreSevere (n05); school-age children left without an age group and asked about (n09).
- Held in every run: names stripped, the notifiable condition captured, the treatment question flagged, the two-group note split into two cards, and no card for the non-report.

Stage 2 (audio): the two Task 3 recordings that have expected cards, both ears for real, each audio model once, effort low (12 calls).
- Audio ear muse-spark-1.2: 22 of 24 checks (91.7%); 1.0 question per card; no extra questions. Misses: moreSevere, and an onset taken from a date that was about the water, not the illness.
- Audio ear muse-spark-1.3: 23 of 24 checks (95.8%); 3.5 questions per card; 3 extra questions. Miss: moreSevere. In the mixed note its transcript invented a disease name that wasn't said; the extraction flagged the disagreement and the notifiable field stayed null. On the all-Sesotho note it marked much of the audio [?], which produced five questions on one card.
- No single-source fallbacks. The Spark ear was the slower one every time, and the second ear finished within 13 s of the first (the wait is 30 s).
- Latency per note: Voice Transcribe 10–25 s, Spark ear 14–38 s, extraction 6–14 s, total 23–47 s.
- With the place list as keywords, both ears misspelled the off-list place name, and the area was asked, as the expected cards want.
- The cleaned transcript twice took a wrong word from one ear (once in place of a name, once a misheard verb). The card fields weren't affected.
- Whole task: about $0.65.
- Recommendation (to confirm): keep the audio ear on muse-spark-1.2 and extraction at "low", which are the current settings. 1.2 asked far fewer questions and didn't invent anything; "medium" scored no better and was slower and dearer. One run per model is a small sample, so confirm on the 10 recordings.

### Stage 1 after Task 5's corrections (27 Oct)
Three expected answers were wrong (n01 and n06 onset, n09's school-age group) and the prompt changed (moreSevere, onset, names). To separate the two effects, Task 4's saved low-effort run was first re-scored against the corrected fixtures (no API calls), then Stage 1 ran again with the new prompt (--repeat 3 --effort low, 30 calls, about $0.22). Results in test-audio/results/ (score-004 is the re-score, score-005 the new run).

| | Task 4 as scored | Fixtures corrected, old prompt | Fixtures corrected, new prompt |
|---|---|---|---|
| Checks passed | 96.8% | 98.8% | 99.1% |
| Questions per card | 1.60 (expected 1.30) | 1.60 (expected 1.60) | 1.50 (expected 1.60) |
| Extra questions | 9 | 1 | 0 |
| Confident wrong | not counted | 4 | 3 |

- The new prompt fixed moreSevere for the very weak patient (n05: 3 of 3, was 0 of 3), and n06's onset is now always asked.
- New confident-wrong problem: n01's onset is now filled in as "today" in all 3 repeats instead of being asked. The note only says when the patients came in; the new onset sentence covers other events (water, gatherings) but not the day patients came in.
- Extraction 4.8 s on average (1.5–9.0 s).

## In progress
- Nothing.

## Next steps (in order)
1. Extraction prompt (needs Nthabiseng's approval): say that the day patients came in isn't the onset, since n01 still fills onset in with confidence (3 of 3); then re-run Stage 1 (`--stage text --repeat 3 --effort low`) and check the confident-wrong count.
2. Score the 10 test recordings when they arrive: convert them, add an expected card for each to test-fixtures/expected-cards.json (made up, as now), run `--stage audio --audio-model both --effort low --repeat 2`, and confirm the audio-ear model.
3. Day 2: Report screen end to end.
   - The browser records 24 kHz mono 16-bit WAV for processNote.
   - Call processNote with a callable timeout of at least 300 s, for example httpsCallable(functions, "processNote", { timeout: 300000 }); the client's default is 70 s.
   - Show each card with its unsure fields highlighted and its questions; Confirm stays disabled until they're answered.
   - Show transcriptClean as "what we heard, please check".
   - adviceRequested shows fixed text pointing to official guidance (NICD, Poisons Information Centre); notifiableConditionMentioned shows the NMC reminder.
   - Add a sign-in check to checkMetaConnection once Auth exists.

## Decisions and why
- 26 Oct — Firestore and Functions in africa-south1: data stays in South Africa. Firestore's location can never be changed.
- 26 Oct — Statistics do all counting; Muse Spark reads, weighs and explains: the numbers stay checkable and the AI can't invent counts.
- 26 Oct — Symptom groups, not diseases, and TB excluded: diagnosis stays the clinician's job, slow lab-tracked diseases have their own registers, and Fola stays clear of the "medical advice" anti-project.
- 26 Oct — Made-up data only: content sent on Meta's free credits may be used for product improvement.
- 26 Oct — Baseten (not Modal) for Muse Spark Open: OpenAI-compatible with generous credits and throughput; keeps health signals on infrastructure we control and targets the open-weights bonus prize.
- 26 Oct — A fictional town drawn as plain shapes, not a real map: it can't be mistaken for a real place, and the demo stays non-political.
- 26 Oct — Neutral repo codename and the product name in one file: renaming is a one-line change.
- 26 Oct — Keys only in Cloud Functions as Firebase secrets: the browser never sees a key.
- 27 Oct — CLAUDE.md added so every Claude Code session reads these docs and follows the plan-then-STOP workflow automatically.
- 27 Oct — PUSH_TO_TALK mode for transcription: the clinician decides when the note ends.
- 27 Oct — Every function that calls a model requires sign-in: nobody who merely finds the endpoint can spend the API credits.
- 27 Oct — Audio capped at 120 s and 6 MB per note: voice notes are short, and this keeps one upload well inside a callable function's memory and time budget.
- 27 Oct — Model IDs returned by checkMetaConnection: muse-wonder-1.0, sam-3.1, muse-spark-1.3-contributor, muse-voice-transcribe-1.0, muse-spark-1.3, muse-image-1.0, muse-spark-1.2-contributor, muse-spark-1.2, muse-spark-1.1.
- 27 Oct — Muse Spark model: muse-spark-1.3 (Standard mode). Never a "-contributor" model ID. Why: contributor models let Meta train on our prompts and outputs, which contradicts Fola's privacy story, and 1.3 is Meta's recommended version for new work.
- 27 Oct — Transcription by file upload (POST /v1/asr/transcribe, mode PUSH_TO_TALK), not streaming. Why: it worked first time, push-to-talk notes are short, and streaming would need a websocket proxy.
- 27 Oct — Record at 24 kHz. Why: it's the model's native rate; 16 kHz gave the same words and wasn't faster.
- 27 Oct — Hints off by default. Language bias is dropped. Keywords get re-tested with place-name notes. Why: in Task 2, hints increased repeated words (a doubled word in 2 of 7 calls without hints, 5 of 7 with keywords, 7 of 7 with keywords plus language).
- 27 Oct — Transcription retries once on a dropped connection, a timeout, or HTTP 429/500/502/503/504, and never on other 4xx: those are usually temporary, while other 4xx mean the request itself is wrong.
- 27 Oct — Two ears. Every voice note goes to Muse Voice Transcribe AND to Muse Spark (audio input), in parallel. Muse Spark 1.3 (text) then builds the card from both transcripts. Where they disagree on a card fact, that field is marked unsure and the card asks the clinician. Why: Task 3 showed the two routes fail in different ways. Voice Transcribe keeps every sentence, but spells Sesotho by sound and mishears it in mixed notes (a Sesotho phrase came back as a similar-sounding English word; a Sesotho request was dropped). Muse Spark audio understands mixed speech, but on all-Sesotho speech it either gave up (1.3) or dropped phrases and invented a sentence (1.2).
- 27 Oct — The audio-ear model (muse-spark-1.2 or muse-spark-1.3, never "-contributor") is chosen by Task 4's Stage 2 scores, and kept as a single setting (SPARK_AUDIO_MODEL in functions/constants.js).
- 27 Oct — Keywords back ON for the Voice Transcribe ear, using the place list. Why: they fixed "Amanzimtoti" both times, and the extraction step absorbs the doubled words. Language bias stays off. This replaces "hints off by default" for this ear.
- 27 Oct — The demo town is Kganya. Areas fed by works A: Thaga Park, Leeba View, Sefate Extension, Nonyana Flats, Mmutla Ridge. Areas fed by works B: Kgwedi Heights, Lebone Gardens. On 27 Oct, web searches found no South African place with these exact names. Stored in functions/data/places.json.
- 27 Oct — Six extraction rules: (1) one note can make more than one card; (2) every personal name is stripped, colleagues' too; (3) vague counts, ages and dates are flagged, never guessed; (4) a treatment question gets no advice: the app shows fixed text pointing to official guidance, and the model never writes advice; (5) a clinician-stated notifiable condition is captured word for word, in the clinician's own words and language, for the NMC reminder, and Fola never adds a diagnosis of its own; (6) a note that isn't a report makes no card.
- 27 Oct — Startup track confirmed. Organisers said solo founders qualify if they're incorporated in their home country, and Vault of Time (Pty) Ltd is incorporated in South Africa.
- 27 Oct — Extraction effort: low (EXTRACT_EFFORT). Why: in Task 4, medium scored the same as low and was slower and dearer.
- 27 Oct — Audio ear: muse-spark-1.2 for now (SPARK_AUDIO_MODEL); the final choice comes after the 10 recordings. Why: 1.3 invented a disease name, which was caught, and 1.2 gave one confident wrong onset.
- 27 Oct — How three Task 4 cases are read: the day patients came in isn't the onset, so it's asked; very weak, unable to walk, collapsed, unconscious, badly dehydrated, admitted or a death counts as moreSevere, in any language; schoolchildren can be 5 to 17, so their age group is asked.

## Open decisions (ask Nthabiseng; don't decide in code)
- Product name (before the video is recorded).
- Licence for the public repo.
- How simulation data is kept apart from real data (Day 3).
- Audio-ear model: the final choice comes after scoring the 10 recordings (now muse-spark-1.2).
- Should a [?] in one transcript count as a disagreement when the other transcript is clear? It adds questions (five on one card in Task 4). Decide after the 10 recordings are scored. (The other three Task 4 questions were closed in Task 5; see "Decisions and why".)

## File map
- CLAUDE.md — rules every Claude Code session follows.
- AGENTS.md — the same rules for any other coding agent (Codex reads it automatically). Keep the two files in step.
- HANDOVER.md — current state of the build (this file).
- docs/PROJECT_CONTEXT.md — the brief and the decisions.
- README.md — public project summary.
- index.html — the page shell Vite builds from.
- vite.config.js — Vite settings (React plugin only).
- package.json, package-lock.json — web app libraries and npm scripts.
- .oxlintrc.json — linter rules.
- .firebaserc — links this folder to the Firebase project vot-health-za.
- firebase.json — Firebase settings: Firestore (africa-south1, rules, indexes), Functions folder, Hosting from dist/, emulator ports.
- firestore.rules — Firestore security rules (deny-all).
- firestore.indexes.json — Firestore indexes (none yet).
- .gitignore — what git never commits (logs, env files, secrets, service-account keys, test-audio/).
- public/ — files served as-is (favicon.svg, icons.svg).
- src/main.jsx — starts the React app.
- src/App.jsx, src/App.css, src/index.css — Vite's starter page and styles (placeholder).
- src/assets/ — starter images (hero.png, react.svg, vite.svg).
- src/config/product.js — PRODUCT_NAME, the only place the product name is set.
- src/lib/firebase.js — Firebase web config and app start-up (not imported anywhere yet).
- functions/index.js — Cloud Functions: checkMetaConnection and processNote (not deployed).
- functions/constants.js — shared constants and settings (Meta API base URL, models, extraction effort, audio limits, the 30 s wait between ears).
- functions/data/places.json — the demo town Kganya: 7 areas and which works feeds each (Day 3's town file grows from this).
- functions/prompts/spark-audio.md — the instruction for the Muse Spark audio ear.
- functions/prompts/extract-card.md — the extraction prompt; {{placeholders}} are filled from cardSchema.js.
- functions/lib/metaRequest.js — shared Meta API request code: 60 s per attempt, one retry, failure kinds, Standard-model guard.
- functions/lib/transcribe.js — WAV header check and the Muse Voice Transcribe ear.
- functions/lib/sparkAudio.js — the Muse Spark audio ear.
- functions/lib/twoEars.js — runs both ears in parallel with the 30 s wait.
- functions/lib/cardSchema.js — the card lists, the structured-output schema, the reply validator and the code guards.
- functions/lib/extractCard.js — builds the cards from one or two transcripts with Muse Spark 1.3.
- functions/test/transcribe.test.js — unit tests for the WAV header check.
- functions/test/transcribe-retry.test.js — unit tests for the retry logic, using a fake fetch.
- functions/test/card-guards.test.js — unit tests for the code guards.
- functions/test/two-ears.test.js — unit tests for the parallel ears, with fake ears.
- functions/test/spark-and-extract.test.js — unit tests for the Spark ear and extraction requests, with a fake fetch.
- functions/test/make-wav.js — builds WAVs in memory for the tests.
- functions/package.json, functions/package-lock.json — Functions libraries, Node 22, npm scripts.
- functions/.gitignore — keeps node_modules/ and *.local (including .secret.local) out of git.
- scripts/convert-audio.mjs — converts test recordings to 16 and 24 kHz WAVs, skipping ones already converted (local tool; needs ffmpeg).
- scripts/transcribe-test.mjs — sends 24 kHz test WAVs through the chosen runs (a–e) and writes numbered results (local tool; calls the Meta API).
- scripts/score-extraction.mjs — scores card extraction against test-fixtures/ (Stage 1 text, Stage 2 audio) and writes numbered results (local tool; calls the Meta API).
- test-fixtures/ — made-up ideal transcripts and expected cards for the scorer (committed on purpose).
- test-audio/ — local only, gitignored: raw/ (recordings), wav/ (converted), results/ (run-NNN-… from the transcription runner, score-NNN-… from the scorer).

## How to run, test and deploy (Windows PowerShell)
Run these from the repo root. `--prefix functions` tells npm to work inside the functions folder, so there's no need to change folders. The Firebase CLI (`firebase`) is installed globally, not as a project library.

**Install**
- `npm install` — downloads the web app's libraries.
- `npm --prefix functions install` — downloads the Cloud Functions libraries.
- ffmpeg (for the audio test tools only) is installed system-wide with winget (`winget install Gyan.FFmpeg`). It is deliberately not a project dependency.

**Run locally**
- `npm run dev` — runs the web app on this computer with live reload; it prints the local address.
- `npm run build` — builds the finished web app into dist/.
- `npm run preview` — serves the built dist/ locally so you can check it before deploying.
- `firebase emulators:start` — starts local copies of Auth (9099), Functions (5001), Firestore (8080) and Hosting (5000), plus the Emulator UI (address printed on start). Hosting serves dist/, so run `npm run build` first.
- `npm --prefix functions run serve` — starts only the Functions emulator.
- `npm --prefix functions run shell` — a prompt for calling functions locally by hand (`npm --prefix functions start` does the same).
- The Functions emulator reads META_API_KEY from functions/.secret.local (gitignored), which Nthabiseng creates herself.

**Check**
- `npm run lint` — checks the code for common mistakes.
- `npm --prefix functions test` — runs the 45 unit tests (WAV header, retries, code guards, two ears, Spark and extraction requests), all with fakes and no network calls.
- `node -e "console.log(Object.keys(require('./functions/index.js')))"` — loads the Functions code on its own and lists its exports (checkMetaConnection, processNote); a quick check that functions/ finds its prompt and data files.

**Extraction scoring (local; calls the Meta API and uses credits)**
- Load the key the same way as the transcription test below, in the same one-line command, then:
  - `node scripts/score-extraction.mjs --stage text --repeat 3 --effort low` — the 10 text fixtures, 3 times each, 5 calls at a time (about 30 s and $0.22).
  - `node scripts/score-extraction.mjs --stage audio --audio-model both --effort low` — every 24 kHz WAV with an expected card, through both ears and extraction, one at a time (about 2 minutes and $0.09 for 2 notes).
  - Also: `--notes n01,n04` limits the notes; `--audio-model 1.2` or `1.3` picks one audio ear.
  - `node scripts/score-extraction.mjs --rescore test-audio/results/score-001-results.json` — re-scores a saved run against the current fixtures, for example after correcting an expected answer. No API calls and no key needed.
  - Every run reports the pass rate, questions per card, extra questions and "confident wrong" (wrong values the card doesn't flag as unsure, the most dangerous kind of error).

**Transcription test (local; sends test audio to Meta's API and uses credits)**
- `node scripts/convert-audio.mjs` — converts every new recording in test-audio/raw/ into test-audio/wav/<name>-16k.wav and <name>-24k.wav.
- `$env:META_API_KEY = ((firebase functions:secrets:access META_API_KEY) | Out-String).Trim(); "Key loaded: $([bool]$env:META_API_KEY), length $($env:META_API_KEY.Length)"; node scripts/transcribe-test.mjs --runs a,b --keywords "Amanzimtoti"` — one line: loads the key into memory for this command only (shows just its length), then runs the chosen runs on every 24 kHz WAV and writes the next numbered results files. Never run the `firebase functions:secrets:access` part on its own: that prints the key.
  - `--runs` picks runs: a (no hints), b (keywords), c (keywords + language), d (Muse Spark 1.3 audio), e (Muse Spark 1.2 audio). Default a,b.
  - `--files all-sesotho,mixed-amanzimtoti` limits the run to those notes.

**Watch**
- `npm --prefix functions run logs` — shows recent logs from the deployed functions (read-only).

**Deploy (each one is a separate STOP: ask first)**
- `npm run build`, then `firebase deploy --only hosting` — publishes the web app to the live link.
- `npm --prefix functions run deploy` — publishes the Cloud Functions.
- `firebase deploy --only firestore:rules` — publishes the Firestore security rules.

## Known issues
- src/lib/firebase.js has the Firebase web config written in, including its apiKey, and it is already in the public repo history. Firebase web keys identify the project rather than grant access (security rules do that). Day 7: restrict the Firebase web API key to the app's domains.
- src/lib/firebase.js only starts the Firebase app: Auth, Firestore, the Functions client and emulator connections aren't wired in, and nothing imports it yet.
- src/App.jsx is still Vite's starter page: it doesn't use PRODUCT_NAME and has multi-line JSX tags.
- Hosting has no automatic build before deploy: run `npm run build` first or the deploy sends a stale or missing dist/.
- Voice Transcribe can silently drop non-English speech. In Task 2, a Sesotho closing phrase appeared in only 2 of 9 calls. Consequence for the design: missing card fields are always asked, and the Report screen tells the clinician to check the transcript.
- Latency: usually 6 to 8 seconds, with spikes to 51 seconds, plus 3 dropped connections in one run. transcribeWav now retries once (see "Confirmed API formats").
- Transcripts sometimes repeat a word, more often when hints are sent; hints are now off by default.
- Muse Spark audio can invent text: in Task 3, 1.2 added a sentence that wasn't spoken, and in Task 4, 1.3 invented a disease name. The two-ears comparison and the rule 5 guard kept both off the cards, but the audio ear can't be trusted alone.
- The cleaned transcript once swapped a name for an unrelated word (Task 4), and once kept a misheard word from one ear. The clinician reviews the transcript before confirming, and the Report screen presents it as "what we heard, please check". Since Task 5 the prompt says never to replace a name with another word.
- A [?] in one transcript counts as a disagreement, so a weak audio ear can add questions about facts the other ear heard clearly (five questions on one card in Task 4).
- checkMetaConnection can be called by anyone. It only lists models; add a sign-in check on Day 2 when Auth exists.
- npm audit reports "high" issues in @grpc/grpc-js via the firebase SDK (Node-only code path). Don't run "npm audit fix --force", because it would downgrade firebase.
- Local Node is v24 but Functions run nodejs22. It's only a warning.
- The Firebase CLI sometimes prints its results, then exits with "Timed out". Harmless.
- Run gcloud from PowerShell, not Git Bash; under Git Bash it can't find Python.

## Recent changes (newest first; keep the last 10)
- 2026-10-27 — Task 5: corrected three expected answers, tightened the extraction prompt, added the confident-wrong count and --rescore, added AGENTS.md (CLAUDE.md in step), recorded the Startup track, effort and audio-ear decisions; Stage 1 re-scored and re-run.
- 2026-10-27 — Two-ears case card extraction: places list, Spark audio ear, extraction with structured output and code guards, processNote (replaces transcribeNote; not deployed), shared retry code, scoring runner and fixtures; Stage 1 and Stage 2 scored.
- 2026-10-27 — Recorded the Day 0–1 decisions and facts; transcription now retries once on temporary failures; test runner gained run selection, numbered results and Muse Spark audio runs; ran the Sesotho experiment (runs 003–004).
- 2026-10-27 — Confirmed the Muse Voice Transcribe file endpoint; added functions/lib/transcribe.js, the transcribeNote callable (not deployed), WAV header unit tests, and the audio conversion and transcription test scripts.
- 2026-10-27 — Added HANDOVER.md, docs/PROJECT_CONTEXT.md and CLAUDE.md; checked .gitignore.
