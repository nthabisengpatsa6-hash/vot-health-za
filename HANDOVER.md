# HANDOVER

**Last updated:** 2026-10-27 10:29 SAST

**Read this first, then docs/PROJECT_CONTEXT.md.** This file is the current state of the build. Claude Code updates it and commits at the end of every task, so any new Claude Code session can start from here. The repo is public: no keys, passwords or personal data in this file.

## Where we are
Day 1 (Tue 27 Oct). Transcription is proven: the Muse Voice Transcribe file endpoint works, and the code the Report screen will use exists (not deployed). Next: the case card extraction function and prompt.

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

### Day 1 — Tue 27 Oct
- HANDOVER.md, docs/PROJECT_CONTEXT.md and CLAUDE.md created; .gitignore checked.
- Muse Voice Transcribe file endpoint confirmed working (format below).
- functions/lib/transcribe.js: checkWav (WAV header check with plain-English errors) and transcribeWav (one note in, transcript and timings out; logs nothing).
- Callable function transcribeNote (africa-south1, META_API_KEY, sign-in required, 120 s / 6 MB cap, logs timings only). Not deployed.
- 13 unit tests for the WAV header check (npm --prefix functions test), no network calls.
- scripts/convert-audio.mjs (phone recordings to 16 and 24 kHz WAVs) and scripts/transcribe-test.mjs (three-way hint test).
- 2 test voice notes recorded (clear English; fast Sesotho–English mix with background noise), converted, and transcribed in two full runs.

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
- The server silently ignores unknown field names, modes and (probably) hint values, so a typo looks like a hint with no effect. We send hints only when they have values.
- languageBias format is unconfirmed: the docs show "English", the cookbook "english". We send "English".
- Supported languages (25) don't include Sesotho, Zulu or Afrikaans; the model handles code-switching between its own languages.

### Transcription test results (27 Oct)
2 notes (31 s clear English; 24 s fast Sesotho–English with noise) × 2 sample rates × 3 hint settings (none; keywords "Amanzimtoti"; keywords + languageBias "English") × 2 runs = 24 calls. Full results stay in test-audio/results/ (gitignored).
- The endpoint worked on the first call. 21 of 24 calls succeeded. The 3 failures were network-level ("fetch failed", no API error code), all in run 1, back to back, on one file. Error messages now include the network cause.
- Latency: run 1 8.0–51.0 s (median 37 s); run 2 5.5–29.4 s (median 7.9 s). The same file varied from 8 to 43 s, so the swings come from the network or server load, not the audio.
- 16 vs 24 kHz: the same words at both rates. 16 kHz files are smaller but weren't faster. Recommendation for the browser recorder: 24 kHz (native, no server resampling).
- Keywords: not properly tested yet, because neither note said "Amanzimtoti". The keyword was never inserted when it wasn't spoken.
- Language hint "English": no visible effect.
- Calls with hints repeated a word more often: no hints 2 of 7 calls, keywords 5 of 7, keywords + language 7 of 7.
- Mixed note: the English parts were accurate in every call. Common Sesotho words came through in recognisable spelling, but some were unstable (a two-word greeting was right in 4 of 9 calls), and whole Sesotho phrases were sometimes dropped silently (a closing phrase appeared in only 2 of 9 calls).

## In progress
- Nothing.

## Next steps (in order)
1. Call checkMetaConnection and record the model IDs under "Decisions and why"; pick the Muse Spark version.
2. Case card extraction: a Cloud Function and prompt that turn a transcript into a card (PROJECT_CONTEXT section 5), scored against the test notes. It must tolerate repeated words and flag fields it can't fill (Sesotho phrases may be missing).
3. Record the remaining 8 test voice notes (fast, noisy, several voices, mixed languages), including notes that actually say demo area names, so the keyword hint gets a real test.
4. Day 2: Report screen end to end. The browser recorder should produce 24 kHz mono 16-bit WAV for transcribeNote.

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

## Open decisions (ask Nthabiseng; don't decide in code)
- Product name (before the video is recorded).
- Licence for the public repo.
- Which Muse Spark model version to use.
- File upload vs streaming transcription. The file endpoint works, but latency ranged from 5.5 to 51 s per note; streaming would transcribe while the clinician is still talking.
- Fictional area names for the demo town, checked so they aren't real places.
- How simulation data is kept apart from real data (Day 3).
- Whether to send keywords at all, given the repeated-word pattern. Decide after a test with notes that actually say the keywords.

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
- functions/lib/transcribe.js — WAV header check and the Muse Voice Transcribe file client.
- functions/test/transcribe.test.js — unit tests for the WAV header check.
- functions/package.json, functions/package-lock.json — Functions libraries, Node 22, npm scripts.
- functions/.gitignore — keeps node_modules/ and *.local (including .secret.local) out of git.
- scripts/convert-audio.mjs — converts test recordings to 16 and 24 kHz WAVs (local tool; needs ffmpeg).
- scripts/transcribe-test.mjs — sends each test WAV three ways and writes the results (local tool; calls the Meta API).
- test-audio/ — local only, gitignored: raw/ (recordings), wav/ (converted), results/ (transcripts and summaries).

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
- `npm --prefix functions test` — runs the unit tests (WAV header check; no network calls).

**Transcription test (local; sends test audio to Meta's API and uses credits)**
- `node scripts/convert-audio.mjs` — converts every recording in test-audio/raw/ into test-audio/wav/<name>-16k.wav and <name>-24k.wav.
- `$env:META_API_KEY = ((firebase functions:secrets:access META_API_KEY) | Out-String).Trim(); "Key loaded: $([bool]$env:META_API_KEY), length $($env:META_API_KEY.Length)"; node scripts/transcribe-test.mjs --keywords "Amanzimtoti"` — one line: loads the key into memory for this command only (shows just its length), then runs every WAV three ways and writes test-audio/results/. Never run the `firebase functions:secrets:access` part on its own: that prints the key. Add `--language english` to try the lowercase hint format.

**Watch**
- `npm --prefix functions run logs` — shows recent logs from the deployed functions (read-only).

**Deploy (each one is a separate STOP: ask first)**
- `npm run build`, then `firebase deploy --only hosting` — publishes the web app to the live link.
- `npm --prefix functions run deploy` — publishes the Cloud Functions.
- `firebase deploy --only firestore:rules` — publishes the Firestore security rules.

## Known issues
- src/lib/firebase.js has the Firebase web config written in, including its apiKey, and it is already in the public repo history. Firebase web keys identify the project rather than grant access (security rules do that), but this conflicts with "no keys in any file" and "the browser never sees a key". Decision for the planning chat; suggested: keep it and restrict the key in Google Cloud console to the Hosting domains and Firebase APIs.
- src/lib/firebase.js only starts the Firebase app: Auth, Firestore, the Functions client and emulator connections aren't wired in, and nothing imports it yet.
- src/App.jsx is still Vite's starter page: it doesn't use PRODUCT_NAME and has multi-line JSX tags.
- This machine runs Node 24; functions/package.json asks for Node 22. The emulator warns and runs functions on Node 24 locally; deployed functions run on Node 22.
- Hosting has no automatic build before deploy: run `npm run build` first or the deploy sends a stale or missing dist/.
- Transcription latency swings widely (5.5–51 s for a 24–31 s note), and 3 of 24 test calls failed with a network error. transcribeWav gives up after 60 s and transcribeNote after 90 s; a slow spell could hit those limits.
- Transcripts sometimes repeat a word, more often when hints are sent.
- Sesotho isn't one of the model's languages: Sesotho words are sometimes misheard or silently dropped.
- Meta's docs moved to dev.meta.ai; docs/PROJECT_CONTEXT.md section 13 still links ai.developer.meta.com.

## Recent changes (newest first; keep the last 10)
- 2026-10-27 — Confirmed the Muse Voice Transcribe file endpoint; added functions/lib/transcribe.js, the transcribeNote callable (not deployed), WAV header unit tests, and the audio conversion and transcription test scripts.
- 2026-10-27 — Added HANDOVER.md, docs/PROJECT_CONTEXT.md and CLAUDE.md; checked .gitignore.
