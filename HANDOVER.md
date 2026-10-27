# HANDOVER

**Last updated:** 2026-10-27 11:35 SAST

**Read this first, then docs/PROJECT_CONTEXT.md.** This file is the current state of the build. Claude Code updates it and commits at the end of every task, so any new Claude Code session can start from here. The repo is public: no keys, passwords or personal data in this file.

## Where we are
Day 1 (Tue 27 Oct). Transcription is proven and now retries once on temporary failures (not deployed). The live Hosting URL is https://vot-health-za.web.app; it still shows the Vite starter page. The Sesotho transcription experiment is done (results below). Next: the case card extraction function and prompt.

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
- Callable function transcribeNote (africa-south1, META_API_KEY, sign-in required, 120 s / 6 MB cap, logs timings only). Not deployed.
- 13 unit tests for the WAV header check (npm --prefix functions test), no network calls.
- scripts/convert-audio.mjs (phone recordings to 16 and 24 kHz WAVs) and scripts/transcribe-test.mjs (three-way hint test).
- 2 test voice notes recorded (clear English; fast Sesotho–English mix with background noise), converted, and transcribed in two full runs.
- Model IDs recorded and the Muse Spark model chosen (see "Decisions and why").
- transcribeWav retries once on a dropped connection, a timed-out attempt, or HTTP 429, 500, 502, 503 or 504; never on any other 4xx. transcribeNote's timeout raised to 150 s; it logs attempts and timings (plus failure kind and HTTP status on failure). Not deployed.
- 7 retry unit tests with a fake fetch, no network (20 unit tests in total).
- Test runner: --runs and --files flags, 24 kHz files only, numbered result files that are never overwritten, and Muse Spark audio runs (d: 1.3, e: 1.2) as an experiment. The converter skips files it has already converted.
- Sesotho experiment: 2 new test notes (all-Sesotho; mixed Sesotho–English with a place name) compared across Voice Transcribe and Muse Spark audio, 11 calls (results below).

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

## In progress
- Nothing.

## Next steps (in order)
1. Case card extraction: a Cloud Function and prompt on muse-spark-1.3 that turn a transcript into a card (PROJECT_CONTEXT section 5), scored against the test notes. It must tolerate repeated words, and ask for any field it can't fill, because non-English speech may be missing from the transcript.
2. Record the remaining test voice notes (fast, noisy, several voices, mixed languages), including more that say demo area names, and more all-Sesotho and mixed notes to repeat the Task 3 comparison.
3. Day 2: Report screen end to end.
   - The browser records 24 kHz mono 16-bit WAV for transcribeNote.
   - Call transcribeNote with a callable timeout of at least 150 s, for example httpsCallable(functions, "transcribeNote", { timeout: 150000 }); the client's default is 70 s, shorter than the function's 150 s.
   - Show the transcript and tell the clinician to check it.
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

## Open decisions (ask Nthabiseng; don't decide in code)
- Product name (before the video is recorded).
- Licence for the public repo.
- Fictional area names for the demo town, checked so they aren't real places.
- How simulation data is kept apart from real data (Day 3).
- Keywords for place names: keep or drop, based on Task 3's place-name test (results above: the keyword fixed the place name, but that run still doubled words).
- Transcription route for mixed-language notes: Muse Spark audio did much better than Voice Transcribe on mixed notes in Task 3, but on all-Sesotho audio 1.3 returned nothing and 1.2 invented a sentence. Needs more test notes before choosing.

## File map
- CLAUDE.md — rules every Claude Code session follows.
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
- functions/index.js — Cloud Functions: checkMetaConnection and transcribeNote (not deployed).
- functions/constants.js — shared constants (Meta API base URL, transcription model, audio limits).
- functions/lib/transcribe.js — WAV header check and the Muse Voice Transcribe file client, with one retry.
- functions/test/transcribe.test.js — unit tests for the WAV header check.
- functions/test/transcribe-retry.test.js — unit tests for the retry logic, using a fake fetch.
- functions/test/make-wav.js — builds WAVs in memory for the tests.
- functions/package.json, functions/package-lock.json — Functions libraries, Node 22, npm scripts.
- functions/.gitignore — keeps node_modules/ and *.local (including .secret.local) out of git.
- scripts/convert-audio.mjs — converts test recordings to 16 and 24 kHz WAVs, skipping ones already converted (local tool; needs ffmpeg).
- scripts/transcribe-test.mjs — sends 24 kHz test WAVs through the chosen runs (a–e) and writes numbered results (local tool; calls the Meta API).
- test-audio/ — local only, gitignored: raw/ (recordings), wav/ (converted), results/ (run-NNN-summary.md and run-NNN-transcripts.json).

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
- `npm --prefix functions test` — runs the unit tests (WAV header check and retry logic, with a fake fetch; no network calls).

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
- Muse Spark audio can invent text: in Task 3, 1.2 added a sentence that wasn't spoken. Any Spark audio route needs a check for this.
- checkMetaConnection can be called by anyone. It only lists models; add a sign-in check on Day 2 when Auth exists.
- npm audit reports "high" issues in @grpc/grpc-js via the firebase SDK (Node-only code path). Don't run "npm audit fix --force", because it would downgrade firebase.
- Local Node is v24 but Functions run nodejs22. It's only a warning.
- The Firebase CLI sometimes prints its results, then exits with "Timed out". Harmless.
- Run gcloud from PowerShell, not Git Bash; under Git Bash it can't find Python.

## Recent changes (newest first; keep the last 10)
- 2026-10-27 — Recorded the Day 0–1 decisions and facts; transcription now retries once on temporary failures; test runner gained run selection, numbered results and Muse Spark audio runs; ran the Sesotho experiment (runs 003–004).
- 2026-10-27 — Confirmed the Muse Voice Transcribe file endpoint; added functions/lib/transcribe.js, the transcribeNote callable (not deployed), WAV header unit tests, and the audio conversion and transcription test scripts.
- 2026-10-27 — Added HANDOVER.md, docs/PROJECT_CONTEXT.md and CLAUDE.md; checked .gitignore.
