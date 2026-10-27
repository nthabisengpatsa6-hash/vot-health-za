# HANDOVER

**Last updated:** 2026-10-27 09:44 SAST

**Read this first, then docs/PROJECT_CONTEXT.md.** This file is the current state of the build. Claude Code updates it and commits at the end of every task, so any new Claude Code session can start from here. The repo is public: no keys, passwords or personal data in this file.

## Where we are
Day 1 (Tue 27 Oct). Day 0 setup is done. Today: confirm transcription works with uploaded files, record 10 test voice notes, build the case card extraction function and prompt.

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

## In progress
- Nothing yet.

## Next steps (in order)
1. Record the model IDs returned by checkMetaConnection under "Decisions and why", and pick the Muse Spark version.
2. Transcription check. Found in public docs on 27 Oct, unverified until a real call works:
   - File endpoint: POST https://api.meta.ai/v1/asr/transcribe with the key as a Bearer token in the Authorization header. multipart/form-data with a JSON part named "request" (fields include mode, model "muse-voice-transcribe-1.0", audioEncoding "WAV") and a part named "audio" holding the WAV file.
   - Audio must be mono 16-bit PCM WAV at 24 kHz (native) or 16 kHz; recordings up to 10 minutes. Phone and browser recordings must be converted first.
   - The response includes a transcript and a turns array.
   - Optional hints: keywords (such as place names) and a language bias.
   - Streaming alternative: wss://api.meta.ai/v1/asr/realtime.
3. Record 10 test voice notes (fast, noisy, several voices, mixed languages) into test-audio/ (gitignored), convert them to WAV, transcribe them.
4. Case card extraction: a Cloud Function and prompt that turn a transcript into a card (PROJECT_CONTEXT section 5), scored against the 10 test notes.
5. Day 2: Report screen end to end.

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

## Open decisions (ask Nthabiseng; don't decide in code)
- Product name (before the video is recorded).
- Licence for the public repo.
- Which Muse Spark model version to use.
- File upload vs streaming transcription.
- Fictional area names for the demo town, checked so they aren't real places.
- How simulation data is kept apart from real data (Day 3).

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
- functions/index.js — Cloud Functions; right now only checkMetaConnection.
- functions/constants.js — shared constants (Meta API base URL).
- functions/package.json, functions/package-lock.json — Functions libraries, Node 22, npm scripts.
- functions/.gitignore — keeps node_modules/ and *.local (including .secret.local) out of git.

## How to run, test and deploy (Windows PowerShell)
Run these from the repo root. `--prefix functions` tells npm to work inside the functions folder, so there's no need to change folders. The Firebase CLI (`firebase`) is installed globally, not as a project library.

**Install**
- `npm install` — downloads the web app's libraries.
- `npm --prefix functions install` — downloads the Cloud Functions libraries.

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
- No automated tests yet: neither package.json has a test script.

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
- No automated tests yet.

## Recent changes (newest first; keep the last 10)
- 2026-10-27 — Added HANDOVER.md, docs/PROJECT_CONTEXT.md and CLAUDE.md; checked .gitignore.
