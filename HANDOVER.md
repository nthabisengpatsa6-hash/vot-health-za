# HANDOVER

**Last updated:** 2026-10-29 09:41 SAST

The product is **Lemoha** (Sesotho for "to notice"; working name Fola until 28 Oct 2026). The domain lemoha.co.za was bought on 28 Oct 2026 and serves the live app. Not renamed, on purpose: the repo and codename vot-health-za, the Firebase project (display name "Fola", web app "Fola web"), the local project ID demo-fola, function names, Firestore collections and stored values.

**Read this first, then docs/PROJECT_CONTEXT.md.** This file is the current state of the build: what's live, how it works, the rules, and what's next. Claude Code updates it and commits at the end of every task, so any new Claude Code session can start from here. The dated record (the day-by-day build log, test results, replaced decisions and the change log) is in docs/HISTORY.md. The repo is private until Day 8 (Tue 3 Nov), then made public. Treat it as public now: the full history becomes visible. No keys, passwords or personal data in this file.

## Where we are
Thu 29 Oct. The Report flow is live end to end at https://lemoha.co.za: a clinician records a voice note, two "ears" transcribe it in parallel (Muse Voice Transcribe and Muse Spark audio), Muse Spark 1.3 builds draft case cards from both behind code guards, the clinician checks the cards, and they're saved. Two notes from Nthabiseng's phone on mobile data worked end to end (22 and 30 s in all). Task 11 is done and live (29 Oct): Observations are optional and never block saving, "Answer N more to save" goes to the first unanswered question, sign-in goes through lemoha.co.za, Hosting sends proper cache headers, and the font licences are in the repo. Its phone checks are with Nthabiseng (Next steps 3). Today, Near me, Signal detail and Replay are still placeholders. What comes next is under Next steps.

## Live setup
- Live at https://lemoha.co.za and https://vot-health-za.web.app (Firebase Hosting). https://www.lemoha.co.za returns 301 to https://lemoha.co.za. DNS: lemoha.co.za A 199.36.158.100; www CNAME vot-health-za.web.app.
- Firebase project vot-health-za (display name "Fola", web app "Fola web"; the ID is in .firebaserc). Blaze plan with a USD 10 budget alert (its 50% alert is the planned R100 warning). Firestore and Functions in africa-south1; Firestore's location can never change.
- Deployed (details in docs/HISTORY.md, Task 10 Part C and Task 11):
  - Functions, both in africa-south1. processNote from aeb9073 (29 Oct; code hash 851f9cbd…): 1 GiB, concurrency 8, timeout 300 s, min 0 and max 5 instances, secret META_API_KEY. checkMetaConnection from 919bb7e (28 Oct). All functions are capped at 10 instances (setGlobalOptions). Both refuse a signed-out call (401 UNAUTHENTICATED). Neither sets `cors`, so onCall's default allows any origin.
  - Firestore rules (28 Oct): users/{uid} and cards/{cardId}; everything else, noteUsage included, deny-all. No query needs an index.
  - Hosting from 388c790 (29 Oct; 16 files, every live file identical to dist/). Cache-Control: no-cache on everything (index.html, every app address such as /report, the manifest, icons, the licence files), and `public, max-age=31536000, immutable` on Vite's hashed /assets/ files. Firebase's own /__/ paths (the sign-in handler) keep Firebase's headers.
- Sign-in: Google (a popup) or email and password, with authDomain lemoha.co.za (since 29 Oct), so Google's popup opens https://lemoha.co.za/__/auth/handler (live: 200). Nthabiseng added that OAuth redirect URI on 29 Oct, and lemoha.co.za is in Firebase Auth's authorized domains. https://vot-health-za.web.app uses the same authDomain.
- Models: muse-voice-transcribe-1.0 and the Muse Spark audio ear muse-spark-1.2 (SPARK_AUDIO_MODEL), card extraction muse-spark-1.3 at effort low (EXTRACT_EFFORT). Never a "-contributor" model ID.
- processNote runs as the default compute service account, which has Cloud Build Service Account and Cloud Datastore User (added on 28 Oct).
- Two permission changes were made on purpose and should stay:
  - the Cloud Build builder role on the default compute service account, needed for deploys
  - allUsers as Cloud Run Invoker plus a project-level org-policy exception, needed so callable functions can be reached at all. The sign-in check inside each function is the real gate.
- Test accounts 1 and 2 (made-up @example.com addresses, used on 28 Oct) are deleted, in Firestore and sign-in. Nthabiseng's phone account holds the only live test data (In progress).
- Latest scoring, score-007 (29 Oct, after Task 11's observations guard; Stage 1 text, `--repeat 3 --effort low`): 342 of 342 checks (100%), 0 confident wrong, 1.60 questions per card (expected 1.60), 0 extra questions; the same as score-006 (27 Oct). Earlier runs are in docs/HISTORY.md.

## What's built
- Sign-in (Google, or email and password with reset; plain-English errors), a one-time profile at users/{uid} (role, facility type, area and two server timestamps; editable on the Profile screen), and the mobile layout: a header with the wordmark, Replay and Profile, and bottom navigation (Report, Today, Near me).
- Report: hold or tap to record (90 s limit), the voice note row for playback, Send, progress stages that processNote itself streams, card review, then Confirm and save. The audio lives only in memory and is never stored.
- processNote: sign-in, the WAV check (120 s, 6 MB), the daily limit (40 notes per user per SAST day, counted on noteUsage/{uid}), both ears in parallel (at most 30 s more for the second), the card step with code guards, and one note_timing log line per call. In the local emulators it returns 5 prepared made-up results instead (practice mode).
- Card review: unsure fields start empty and are question blocks in their place; the transcript is read-only and never stored; fixed notices (single source, advice with the two hotlines, the NMC reminder, not a report). Saved cards have exactly 17 fields, and firestore.rules checks them against the reporter's own profile.
  - Observations are optional and never asked: "Anything else you noticed?" (Sicker than usual; Not getting better with usual treatment), then "Supplies" (Running short of anything?, with "What is running short?" only while ticked). A box starts ticked only when the note said so. unusualSymptoms is never shown and always saved as false.
  - While answers are missing, the save button says "Answer N more to save" and looks disabled, but a tap (or Enter) jumps instantly to the first unanswered question and focuses its first control; the save itself refuses until every kept card is complete. For half a second after a jump, an invisible cover takes taps, so a quick second tap can't land on an answer.
- Design: the Shweshwe direction (docs/DESIGN.md), tokens in src/styles/tokens.css, self-hosted Hanken Grotesk and Source Serif 4, the ring logo, favicon, app icons and the web app manifest.
- Tests: web 42, Functions 79, rules 89 (what each covers is under "Check"). Functions tests use node:test on plain modules, because firebase-functions-test doesn't support firebase-admin 14. The browser checks are local scripts outside the repo; docs/HISTORY.md lists what each task checked.

## Working rules
CLAUDE.md (and AGENTS.md) hold the full rules: show the plan and stop for "approved"; a separate STOP for every permanent or risky action. Also:
- Git: stop and ask before any git reset, rebase, amend or force operation, even on unpushed commits (Nthabiseng, 29 Oct). Push only after "Push now?" gets a yes, with the pre-push scan below.
- Commit messages: write the message to a file and use `git commit -F <file>`. Windows PowerShell 5.1 splits a `-m` here-string at its double quotes and git reads the pieces as file names (it happened on 29 Oct).
- Deploys: Firebase CLI only (gcloud's sign-in has expired). No --force on any deploy. If the CLI asks any question, stop and show the exact words; don't answer it. Don't trust the CLI's exit code: "Error: An unexpected error has occurred" sometimes follows a successful deploy, so always check the live result. Never run anything that prints a secret's value.

## In progress
- Task 11's phone checks, with Nthabiseng (Next steps 3).
- Task 10 Part D, the rest of the phone test (Next steps 2).
- Delete list, after Part D and in any case before Day 4 (all live test cards must be gone before signals read cards):
  - Nthabiseng's phone account's data: its users and noteUsage documents, and every test card it saved. Its email isn't recorded here.
  - The iPhone test account (29 Oct, Safari, one card): its sign-in account is already deleted in the console, but its users, noteUsage and card documents are still in Firestore under a UID that no longer exists. Nobody can sign in as that owner, so the delete step must find these documents by listing the users, noteUsage and cards collections (for example in the Firebase console's Firestore data view), not through the app or the owner's account.

## Next steps (in order)
1. Score the 10 test recordings when they arrive: convert them, add an expected card for each to test-fixtures/expected-cards.json (made up, as now), run `--stage audio --audio-model both --effort low --repeat 2`, and confirm the audio-ear model. Prompt changes go in the same run, because each changes what the model does:
   - keep South African spelling ("diarrhoea") in symptomsInWords
   - "Fola" → "Lemoha" in the extraction prompt (Open decisions)
   - remove "observations" from the fields the model may mark unsure (the unsureFields list in the reply schema, functions/lib/cardSchema.js, and any prompt wording), so the model's instructions match the code guard, which drops it from Task 11 on
2. Task 10 Part D, the rest of the phone test, against the live project with real Meta calls. Nthabiseng works through it and reports back. Done so far (28 Oct): two notes from her phone on mobile data at ?timing=1 (results in docs/HISTORY.md, Task 10 Part C).
   1. Use made-up scripts only (the 10 test scripts, or: "Three children under five with watery diarrhoea from Leeba View today. Bomme ba re ba nwa metsi a pompo."). Never real patient details.
   2. Android, Chrome, on mobile data, at https://lemoha.co.za/?timing=1
      - sign in with Google, then sign out and sign in with email
      - set a profile
      - record three notes of about 15, 30 and 60 seconds; write down the Upload, Server and Total numbers for each
      - answer the questions and save each card
      - tap anywhere on the symptom-group box: the phone's own list opens, and the chosen label shows in full
      - "Add to home screen": the Lemoha icon and name show correctly
      - If the timing line is missing, reload with ?timing=1 at the end of the address.
   3. The same on Wi-Fi for one 30-second note, to compare upload times.
   4. iPhone, Safari (borrow one): sign in, one 30-second note, save, the symptom-group box, the timing line.
   5. Send the numbers and anything odd to the planning chat.
   6. Afterwards: delete the phone account's data (In progress).

   Also worth watching on the phones (from earlier tasks): iPhone Safari has never been tested (no Safari on Windows), so check it records, plays back, sends, shows the stages and saves, the microphone permission steps, and that holding the record button doesn't open a long-press menu; the wordmark's "o" at the phone's own screen density.
3. Task 11's phone checks (Nthabiseng, on mobile data, with the made-up script from step 2.1, which says nothing about severity or supplies). Report back anything odd.
   1. Google sign-in on https://lemoha.co.za: the account chooser names lemoha.co.za, and sign-in finishes.
   2. Google sign-in on https://vot-health-za.web.app still works.
   3. A note: both "Anything else you noticed?" boxes and "Running short of anything?" start unticked, and Save works without ticking anything once the other questions are answered.
   4. Leave one question unanswered and tap "Answer 1 more to save": it jumps straight (no smooth scroll) to that question.
   5. Tick "Running short of anything?": the note box appears; untick it: the box goes.
   - If a phone still shows the old screen, close the tab and open it again (the old version was cached for up to an hour; the new headers stop that).
4. Nthabiseng, in the consoles (by hand; no code): the name people see outside the app.
   - Firebase console → the cog next to "Project overview" → Project settings → General → "Public-facing name" → the pencil → "Lemoha" → Save. Firebase's help page says it fills %APP_NAME% in the sign-in emails (password reset); setup guides say Google sign-in uses it as the app name too.
   - Firebase console → Authentication → Templates → Password reset: check the sender name and the subject; change any "Fola" to "Lemoha".
   - Google Cloud console (same project) → Google Auth Platform → Branding → "App name": check it says Lemoha, and change it if it says Fola. Google shows this name on its account chooser only after the app's branding is verified; until then the chooser shows the authDomain (see step 3).
   - Don't rename the Firebase project itself (display name "Fola").
5. Speed, on Day 7 with "Check later". From the phone test: the server time is almost all transcription (5.5–7.5 s, both ears side by side) plus the card step (7–12 s, the largest and most variable). Upload on mobile data was about 10 s per MB, and a cold start about 5.6 s. Planned order: compressed audio from the phone; then a card step that no longer writes the cleaned transcript (re-score); then one warm instance in judging week.
6. The logo, on Day 7 (moved from Task 11): the wordmark ring's spacing, the ring's line weight and the logo lump.
7. Later, with the privacy notice: a "Delete my profile" button (the rules already allow it). Day 4 decides how signals read cards (now owner-only).
   - Day 6 (Signal detail): cards hold no transcript, so the evidence trail points to each card's own fields, which hold the clinician's words: symptomsInWords, exposure.words and unusualDescription.
8. Day 8 (Tue 3 Nov): Make the repo public, then check it from a logged-out browser. README notes for that day: the first commit was 27 Oct 2026 at 08:50 SAST (4815aef, after the kickoff on 26 Oct at 18:00 SAST), and Fola was the working name until 28 Oct.

## Decisions and why
- 26 Oct — Firestore and Functions in africa-south1: data stays in South Africa. Firestore's location can never be changed.
- 26 Oct — Statistics do all counting; Muse Spark reads, weighs and explains: the numbers stay checkable and the AI can't invent counts.
- 26 Oct — Symptom groups, not diseases, and TB excluded: diagnosis stays the clinician's job, slow lab-tracked diseases have their own registers, and Lemoha stays clear of the "medical advice" anti-project.
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
- 27 Oct — Muse Spark model: muse-spark-1.3 (Standard mode). Never a "-contributor" model ID. Why: contributor models let Meta train on our prompts and outputs, which contradicts Lemoha's privacy story, and 1.3 is Meta's recommended version for new work.
- 27 Oct — Transcription by file upload (POST /v1/asr/transcribe, mode PUSH_TO_TALK), not streaming. Why: it worked first time, push-to-talk notes are short, and streaming would need a websocket proxy.
- 27 Oct — Record at 24 kHz. Why: it's the model's native rate; 16 kHz gave the same words and wasn't faster.
- 27 Oct — Transcription retries once on a dropped connection, a timeout, or HTTP 429/500/502/503/504, and never on other 4xx: those are usually temporary, while other 4xx mean the request itself is wrong.
- 27 Oct — Two ears. Every voice note goes to Muse Voice Transcribe AND to Muse Spark (audio input), in parallel. Muse Spark 1.3 (text) then builds the card from both transcripts. Where they disagree on a card fact, that field is marked unsure and the card asks the clinician. Why: Task 3 showed the two routes fail in different ways. Voice Transcribe keeps every sentence, but spells Sesotho by sound and mishears it in mixed notes (a Sesotho phrase came back as a similar-sounding English word; a Sesotho request was dropped). Muse Spark audio understands mixed speech, but on all-Sesotho speech it either gave up (1.3) or dropped phrases and invented a sentence (1.2).
- 27 Oct — Keywords back ON for the Voice Transcribe ear, using the place list. Why: they fixed "Amanzimtoti" both times, and the extraction step absorbs the doubled words. Language bias stays off. This replaces "hints off by default" for this ear.
- 27 Oct — The demo town is Kganya. Areas fed by works A: Thaga Park, Leeba View, Sefate Extension, Nonyana Flats, Mmutla Ridge. Areas fed by works B: Kgwedi Heights, Lebone Gardens. On 27 Oct, web searches found no South African place with these exact names. Stored in functions/data/places.json.
- 27 Oct — Six extraction rules: (1) one note can make more than one card; (2) every personal name is stripped, colleagues' too; (3) vague counts, ages and dates are flagged, never guessed; (4) a treatment question gets no advice: the app shows fixed text pointing to official guidance, and the model never writes advice; (5) a clinician-stated notifiable condition is captured word for word, in the clinician's own words and language, for the NMC reminder, and Lemoha never adds a diagnosis of its own; (6) a note that isn't a report makes no card.
- 27 Oct — Startup track confirmed. Organisers said solo founders qualify if they're incorporated in their home country, and Vault of Time (Pty) Ltd is incorporated in South Africa.
- 27 Oct — Extraction effort: low (EXTRACT_EFFORT). Why: in Task 4, medium scored the same as low and was slower and dearer.
- 27 Oct — Audio ear: muse-spark-1.2 for now (SPARK_AUDIO_MODEL); the final choice comes after the 10 recordings. Why: 1.3 invented a disease name, which was caught, and 1.2 gave one confident wrong onset.
- 27 Oct — Router: react-router (MIT), declarative mode only (BrowserRouter, Routes, NavLink), pinned to 8.4.0 because 8.5.0 was only 8 days old. Why: it's React's standard router; NavLink marks the current tab for screen readers; Signal detail needs URL parameters. wouter was ruled out (its "Unlicense" isn't on our licence list), and a home-made router would rebuild links, Back and active tabs.
- 27 Oct — The web app imports functions/data/places.json directly (src/lib/places.js), instead of copying it. Why: Vite's root is the repo root, so there's one file, no copy step and no copy to go stale; functions/ is unchanged and still deploys on its own. firestore.rules has to keep its own copy of the area list, and the rules tests check it against places.json.
- 27 Oct — All local emulator work runs under the made-up project ID demo-fola (npm run emulators, npm run test:rules), and the app switches to it on localhost. Why: Firebase never lets a "demo-" project reach a live one. Without functions/.secret.local, the Functions emulator asks Secret Manager for META_API_KEY; under demo-fola that fails with 403, but under the real project ID it would read the live key.
- 27 Oct — Profile: role, facilityType and area only, plus server timestamps. Never a name, phone number or ID number; the email stays in Firebase Auth. The signed-in owner may read, change and delete their own profile; nobody can list profiles. (Owner delete was Nthabiseng's call; the delete button comes later with the privacy notice.)
- 27 Oct — Google sign-in uses a popup and a plain "Continue with Google" button with no Google logo, so we use no third-party trademark artwork. Google sign-in stores the Google name and photo in the Firebase Auth record; the app never reads, shows or copies them.
- 27 Oct — How three Task 4 cases are read: the day patients came in isn't the onset, so it's asked; very weak, unable to walk, collapsed, unconscious, badly dehydrated, admitted or a death counts as moreSevere, in any language; schoolchildren can be 5 to 17, so their age group is asked.
- 27 Oct — Unsure fields start empty; the AI's guess isn't filled in (Nthabiseng approved). Why: "unsure means ask", and a pre-filled guess tends to get confirmed without a look. An unsure Exposure gets an explicit "None" answer. (Observations are never asked since Task 11.)
- 27 Oct — "You said ‘…’. Which area is it?" only when the area is unsure (approved). Why: the model often sets areaHeard to the same name as an area it is sure of, and asking then is noise.
- 27 Oct — On-screen labels say "your words", not "her words" (approved): the person using the app is the clinician.
- 27 Oct — Practice mode in the local emulators, with a "Practice result: made up, not from your recording" line (approved). Five prepared results, one hand-edited and labelled as such (approved). Fenced by FUNCTIONS_EMULATOR plus a "demo-" project ID, with the files outside functions/ so they're never deployed. Why: the emulators can't reach Meta under demo-fola, and the card screen needs every case exercised.
- 27 Oct — Daily limit: 40 notes per user per SAST day; a note that passes the audio check counts even if Meta then fails (approved), because the Meta call may already have cost money. processNote maxInstances 5 (approved). Why: anyone can create an account.
- 27 Oct — Progress stages come from processNote itself (one streamed message when the transcripts are in), not from timers. Why: the stages must be honest, and Firebase callables can stream with no new library.
- 27 Oct — MediaRecorder gets no format; each browser records in its own default. Why: a browser can always decode its own default, while a chosen format can be one the browser lists but can't decode.
- 27 Oct — Hotline numbers come only from the organisations' own pages, and hours aren't shown because the official pages disagree on them.
- 27 Oct — Visual direction: "Shweshwe" (Nthabiseng's choice). docs/DESIGN.md is the single source of truth for all UI; every colour goes through src/styles/tokens.css. Why: a look that is distinctive and crafted, from here, and never reads like a generic AI-built app.
- 28 Oct — The case card is restyled in place: every field keeps its own control. Tap-to-change fields (DESIGN.md's first idea) are parked, with no task for them. Why: tap-to-change changes how editing works, and Task 8 was presentation only.
- 28 Oct — Privacy lines promise only what the app does: "Leave out patients' names. {PRODUCT_NAME} doesn't keep the recording." and "Check there are no names, then save. {PRODUCT_NAME} doesn't keep the recording." Why: "The recording is deleted" went too far (the audio goes to Meta's API, and on the free credits Meta may keep content), and so did "Names are removed" (the model can miss a name).
- 28 Oct — The voice note row replaces the browser's audio player, with bars from the recording's real loudness. Why: the native player is a default look that can't be styled. The loudness values are only drawn, never saved or sent.
- 28 Oct — DESIGN.md's motion rules win over Task 8's "no other animation" line: the recording ring pulses and state changes take 120 ms, both off with reduced motion.
- 28 Oct — Fonts self-hosted with Fontsource, latin and latin-ext only, pinned exactly; OFL-1.1 is allowed for fonts only. Why: nothing is fetched from Google at runtime (speed on mobile data, and the privacy story), and latin-ext covers letters used in some South African languages.
- 28 Oct — Product name: Lemoha (Sesotho for "to notice", lowercase in the logo), chosen by Nthabiseng; "Fola" was the working name. Logo C, "the ring": a dot circled by hand, which is also the "o" in the wordmark. Only what a person sees changes; the codename, Firebase project, function names, collections and stored values stay.
- 28 Oct — index.html's title and the manifest hold the product name themselves (static files can't read product.js), guarded by test/unit/brand.test.js; the manifest is on the colour allow-list for its two #F6F7FB values (approved).
- 28 Oct — The wordmark also replaces the plain-text name on the loading, profile error and first-time profile screens, at the sign-in size (approved).
- 28 Oct — The extraction prompt keeps "Fola" for now: changing a prompt changes what the model does, so it changes with a re-score (see Open decisions).
- 28 Oct — Long dropdown labels: the chosen label is shown as wrapping text with the real select laid invisibly over it (DESIGN.md, "Long option labels"). Why: a closed select can't wrap, and the phone's own list is the most familiar picker. Only the symptom group needs it today.
- 28 Oct — The cleaned transcript is shown during review and never stored; saved cards have 17 fields. Why: it was decided before the first deploy, so live data never holds a transcript. The evidence trail uses the card's own fields (the clinician's words).
- 28 Oct — The transcript on card review is read-only text (Nthabiseng's call), with "Not saved. Fix anything wrong in the card above." ("cards" with two or more). Why: a box that says "you can edit it" when edits go nowhere is misleading. The notice above it asks the clinician to check the card against what they said, and no longer asks them to remove names from the transcript.
- 28 Oct — processNote: 1 GiB, concurrency 8, timeout 300 s, maxInstances 5, minInstances 0 (approved). Why: running out of memory fails every note on the instance, and at our volume the extra memory costs a fraction of a cent a day; 300 s is above the worst case of about 243 s. Keeping one instance warm is only for judging week, a later decision.
- 28 Oct — One "note_timing" log line per processNote call, holding numbers, model IDs and an outcome code only, never content or who sent it; the app shows timings only with ?timing=1 and sends them nowhere. Why: to see where the 23–47 s per note go before deciding anything about speed.
- 28 Oct — processNote's first streamed message is {stage: "received"} (approved). Why: the browser has no "finished sending" event, and the server otherwise sends nothing until the "building" stage, so this is the only way to time the upload. It carries nothing else and the screen ignores it.
- 28 Oct — Every push gets the standard pre-push scan below (approved), so it can't get lost again.
- 28 Oct — A caught error is logged as errorName, errorCode, reason (the caller's UID and our document paths replaced by "[redacted]") and where (file and line in our code); never the transcript, audio, card content or the UID (approved). Why: the counter's live failure couldn't be diagnosed, because the logger overwrote the reason.
- 28 Oct — functions/lib/admin.js is the only place that makes the default Admin app, and looks for it by name (approved). Why: firebase-functions makes its own named app to verify a signed-in caller, so "is there any app?" is the wrong check.
- 28 Oct — Live tests run from Nthabiseng's phone, not headless Edge on the computer (her call). Why: the computer's Wi-Fi sometimes couldn't open a connection to the functions server.
- 28 Oct — All live test cards are deleted before signals read cards (before Day 4); the phone account's data goes after Part D (Nthabiseng's call).
- 28 Oct — Observations on card review become optional and never block saving (done in Task 11). Why: in the phone test, a required-looking box led to a false severity flag on a saved card.
- 28 Oct — Speed order for Day 7: compressed audio from the phone, then a card step that no longer writes the cleaned transcript (re-scored), then one warm instance in judging week. Why: the phone test's note_timing numbers (Next steps 5).
- 29 Oct — Observations are never asked (approved). processNote's guard drops "observations" from unsureFields and its question, and if the model was unsure, every box starts unticked (Nthabiseng's answer: unticked, because a pre-filled severity tick is what the phone test produced). The model's request is unchanged (the prompt and the reply schema; same fingerprint before and after), so the prompt catches up in the recordings run (Next steps 1). The web app does the same for an older reply. Why: a box is ticked only when the note says so.
- 29 Oct — unusualSymptoms is hidden and always saved as false, enforced in draftFromCard (the draft never holds true) and toCardDoc (the only place the saved card is built). Why: a tick nobody can see must never reach a card; the "Something unusual" symptom group covers it.
- 29 Oct — "Answer N more to save" stays tappable and jumps to the first unanswered question in screen order (DESIGN.md's disabled-button line says so). The scroll uses behavior "auto" (instant; no CSS sets smooth scrolling), not "instant", which couldn't be confirmed on iPhone Safari; if a scroll form throws, the plain form and then the focus still run. Why: on the phone, the disabled button gave no way to find the missing answer.
- 29 Oct — A half-second invisible cover after each jump (aria-hidden, can't take focus, cancels only the press) takes a quick second tap; its own timer removes it, and the keyboard and screen readers aren't blocked. Why: the browser check found that a double tap's second tap landed on an age-group option that had moved under the finger.
- 29 Oct — Sign-in authDomain lemoha.co.za for both domains (approved). Why: Google's account chooser named vot-health-za.firebaseapp.com.
- 29 Oct — Hosting cache headers: no-cache first for everything, then a year (immutable) for /assets/ only; test/unit/hosting.test.js keeps public/ free of an assets/ folder and Vite's hashed names unchanged, so nothing unhashed can be immutable. Why: after a redeploy, phones kept the old app for up to an hour.
- 29 Oct — Font licences are Google Fonts' own OFL.txt copies (Nthabiseng's call), because Fontsource builds both fonts from Google Fonts' releases, the files are subsets (Modified Versions under the OFL), and Adobe's copy of the Source Serif 4 licence reserves the name "Source" while Google Fonts' release reserves none.
- 29 Oct — HANDOVER holds the current state only; the dated record moved to docs/HISTORY.md, and neither file holds an email address or a user ID (approved).

## Open decisions (ask Nthabiseng; don't decide in code)
- Change 'Fola' to 'Lemoha' in the extraction prompt during the next scoring run, and re-score in that same run.
- The privacy notice (with the profile delete UI) must say that Google's platform logs keep technical data such as IP addresses and browser details for a limited time.
- Day 4 planning: Cards are written directly from the browser, so any signed-in user with a profile can save valid-looking cards without a voice note. There's no daily cap on that (the 40-a-day limit only covers processNote), and email sign-ups aren't verified. Before signals read real cards, decide between: server-written cards (a confirm function, which fits the 'Check later' drafts design), a per-user cap in the rules, email verification, and App Check.
- Licence for the public repo.
- How simulation data is kept apart from real data (Day 3).
- Audio-ear model: the final choice comes after scoring the 10 recordings (now muse-spark-1.2).
- Should a [?] in one transcript count as a disagreement when the other transcript is clear? It adds questions (five on one card in Task 4). Decide after the 10 recordings are scored. (The other three Task 4 questions were closed in Task 5; see "Decisions and why".)

## Official hotlines (checked 27 Oct 2026, on each organisation's own pages)
Shown, with tap-to-call links, when a note asks about treatment (src/config/hotlines.js).
- NICD: 0800 212 552, "a 24-hour service for healthcare professionals only". Source: NICD, situational update on the Ebola disease outbreak caused by Bundibugyo virus, 29 June 2026, https://www.nicd.ac.za/situational-update-on-the-ebola-disease-outbreak-caused-by-bundibugyo-virus/ (several other 2025–2026 NICD pages give the same number; older NICD pages give other numbers).
- Poisons Information Centre helpline: 0861 555 777. Sources: University of Cape Town, Poisons information centre, https://health.uct.ac.za/pathology-learning-centre/disease-themes-harmful-substances/poisons-information-centre ("Poisons Information Helpline, 0861 555 777, 24 hours / 7 days per week"); Western Cape Government, Know who you can call in an emergency, https://www.westerncape.gov.za/know-who-you-can-call-emergency ("Poisons Information Helpline of the Western Cape, 0861 555 777").
- Hours aren't shown in the app, because the pages disagree: the UCT Pathology Learning Centre page says 24/7, while the Red Cross centre's UCT page (https://health.uct.ac.za/node/71338) says the helpline runs 08:30 to 01:30 daily.
- Stellenbosch University's poison centre pages refused automated access (HTTP 403), so they weren't used.

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

## File map
- CLAUDE.md — rules every Claude Code session follows.
- AGENTS.md — the same rules for any other coding agent (Codex reads it automatically). Keep the two files in step.
- HANDOVER.md — current state of the build (this file).
- docs/HISTORY.md — the dated record: the build log, test results, replaced decisions and the change log.
- docs/PROJECT_CONTEXT.md — the brief and the decisions.
- docs/DESIGN.md — the Shweshwe design direction: colours, type, spacing, components, motion, copy and accessibility rules. Every screen follows it.
- README.md — public project summary.
- index.html — the page shell Vite builds from: the title "Lemoha" (kept equal to PRODUCT_NAME by a test; main.jsx also sets it from product.js), the favicon, iPhone icon and manifest links, and theme-color.
- vite.config.js — Vite settings (React plugin only).
- package.json, package-lock.json — web app libraries and npm scripts.
- .oxlintrc.json — linter rules.
- .firebaserc — links this folder to the Firebase project vot-health-za.
- firebase.json — Firebase settings: Firestore (africa-south1, rules, indexes), Functions folder, Hosting from dist/ with its cache headers (no-cache, then a year for /assets/), emulator ports.
- firestore.rules — Firestore security rules: users/{uid} for its owner only; cards/{cardId} (exactly the 17 fields, no transcript) created by the reporter (matching their profile), read and deleted by the owner only, never changed; everything else (including noteUsage) deny-all. Deployed 28 Oct (Task 10 Part C).
- firestore.indexes.json — Firestore indexes (none yet).
- .gitignore — what git never commits (logs, env files, secrets, service-account keys, test-audio/).
- Brand folders (docs/DESIGN.md, Logo):
  - src/assets/brand/ — the master SVGs: mark.svg (indigo, for light backgrounds), mark-white.svg (for indigo), mark-small.svg (32 px and below), wordmark-o.svg (the wordmark's ring, in currentColor).
  - public/favicon.svg — the browser-tab icon: indigo rounded square, the small mark in white.
  - public/favicon-32.png — the same as a PNG, for browsers without SVG icons.
  - public/icon-192.png, public/icon-512.png, public/icon-maskable-512.png — the app icons in the manifest.
  - public/apple-touch-icon.png — the iPhone home-screen icon (180 px, no transparency).
  - public/manifest.webmanifest — the web app manifest (name, colours, icons).
- src/main.jsx — starts the React app inside the router and sets the tab title.
- src/App.jsx — chooses what to show (loading, sign-in, first-time profile, or the app) and holds the routes and the placeholders' text.
- src/index.css — the app's stylesheet: layout, forms, navigation, level badges, motion. It uses only the tokens; no colour is written in it.
- src/styles/tokens.css — the design tokens from docs/DESIGN.md; the only file with colour values.
- src/styles/fonts.css — the self-hosted fonts (Hanken Grotesk and Source Serif 4, latin and latin-ext).
- src/config/product.js — PRODUCT_NAME, the only place the product name is set.
- src/config/profileOptions.js — the role and facility-type lists (stored value and label).
- src/config/cardOptions.js — the case card lists (stored value and label) and the text limits; mirrors functions/lib/cardSchema.js. PATIENT_FLAGS and SUPPLIES_FLAG are the observation boxes the card shows.
- src/config/hotlines.js — the fixed advice text and the NICD and Poisons Information Centre numbers, with their sources.
- src/lib/firebase.js — Firebase web config; Auth, Firestore and Functions (africa-south1); on localhost, the emulators under demo-fola.
- src/lib/api.js — callFunction(name, data) and streamFunction(name, data, onProgress): call a callable function with a 310 s timeout; streamFunction also passes on progress messages.
- src/lib/recorder.js — the microphone and MediaRecorder, with the 90 s limit and plain error kinds.
- src/lib/wav.js — decode and resample a recording to 24 kHz mono, the WAV encoder, base64, and the waveform's bar heights.
- src/lib/cardDraft.js — a card while it's being checked (unsure fields empty; observations never asked), what still needs answering in screen order (fieldsToFix, answersNeeded, firstToFix), the save button's gate (saveButtonAction, handleSaveTap), and the exact document that's saved (unusualSymptoms always false).
- src/lib/cards.js — saveCards: one cards/{cardId} document per card, in one batch.
- src/lib/authErrors.js — plain-English messages for sign-in errors.
- src/lib/places.js — the town and area names, read from functions/data/places.json.
- src/lib/timing.js — the ?timing=1 flag (read once at load) and the timing line's wording.
- src/lib/profile.js — watchProfile and saveProfile for users/{uid}.
- src/lib/useSession.js — the hook that says who's signed in and whether their profile is set up.
- src/components/AppLayout.jsx — header (with the wordmark) and bottom navigation around the signed-in screens.
- src/components/Wordmark.jsx — the wordmark: the lowercase name with the ring as its "o", one image to screen readers.
- src/components/RecordButton.jsx — the hold-or-tap record button.
- src/components/CaseCardForm.jsx — one case card panel, with unsure fields highlighted and their questions; the symptom group shows as wrapping text over an invisible select; "Anything else you noticed?" and "Supplies". Each field block has the id card-N-field, which the save button's jump looks for.
- src/components/NoteNotices.jsx — the read-only transcript ("What we heard", never saved) and the fixed notices under the cards (single source, advice and hotlines, NMC reminder).
- src/components/LevelBadge.jsx — the Watch, Signal and Alert badges (40 px swatch with the print, and the word) and their key.
- src/components/Icons.jsx — the line icons (drawn for this app).
- src/components/Message.jsx — an information or error message: a wash block with an icon.
- src/components/Waveform.jsx — waveform bars: a still picture of a note, or the processing waveform.
- src/components/VoiceNoteRow.jsx — the recorded note: play button, waveform and length (a still summary once the audio is dropped).
- src/screens/SignInScreen.jsx — Google, email sign-in, create account, password reset.
- src/screens/ProfileScreen.jsx — the first-time set-up and the Profile screen.
- src/screens/PlaceholderScreen.jsx — "Arrives on Day N" for screens not built yet.
- src/screens/ReportScreen.jsx — record, review, send with progress stages, check the cards, confirm and save.
- test/unit/auth-errors.test.js — unit tests for the sign-in error messages.
- test/unit/wav.test.js — unit tests for the WAV encoder, checked against the server's own WAV check.
- test/unit/card-options.test.js — checks the card screen's lists match functions/lib/cardSchema.js.
- test/unit/cards.test.js — unit tests for card drafts and the saved document, using the practice results.
- test/unit/design-tokens.test.js — tokens match docs/DESIGN.md, every listed contrast pair is at least 4.5:1, no font name is written outside the tokens, and colours appear only in the tokens and the allowed brand files.
- test/unit/brand.test.js — the manifest and index.html carry PRODUCT_NAME, every icon is there at its stated size, and the wordmark's ring matches wordmark-o.svg.
- test/unit/timing.test.js — the ?timing=1 flag and the timing line's wording.
- test/unit/hosting.test.js — firebase.json's cache headers, and that nothing unhashed can land in /assets/.
- public/fonts/hanken-grotesk/OFL.txt, public/fonts/source-serif-4/OFL.txt — the fonts' licences with their copyright lines, copied byte for byte from the Google Fonts releases; served with the app.
- test/rules/users.rules.test.js — Firestore rules tests for users/{uid} (run with npm run test:rules).
- test/rules/cards.rules.test.js — Firestore rules tests for cards/{cardId} and the closed noteUsage counter.
- test-fixtures/practice-results/ — the 5 made-up results practice mode returns (from Stage 1 run score-006; one hand-edited, as its "edits" field says).
- functions/index.js — Cloud Functions: checkMetaConnection and processNote (deployed 28 Oct); processNote's settings (1 GiB, concurrency 8, 300 s, at most 5 instances) and its one note_timing line per call.
- functions/constants.js — shared constants and settings (Meta API base URL, models, extraction effort, audio limits, the 30 s wait between ears, the daily note limit, practice-mode stage time).
- functions/lib/noteLimit.js — the daily note limit: the SAST day and the counter transaction on noteUsage/{uid}.
- functions/lib/admin.js — the only place that makes the default Admin app (looked for by name, since firebase-functions makes its own named app first) and its Firestore.
- functions/lib/noteTiming.js — the note_timing log entry: its allowed keys, the cold-start flag, ear timings and retries.
- functions/lib/errorLog.js — errorDetails: a caught error's name, code, reason (UID and our document paths redacted) and where, for one log line. Only for errors whose message can't contain note content.
- functions/lib/practice.js — practice mode: the emulator-and-demo check and the prepared results in turn.
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
- functions/test/sign-in.test.js — checks that both callables refuse signed-out callers before any network call.
- functions/test/spark-and-extract.test.js — unit tests for the Spark ear and extraction requests, with a fake fetch.
- functions/test/practice.test.js — practice mode is on only in the emulator under demo-, and processNote under the real project ID calls Meta.
- functions/test/note-limit.test.js — the daily limit, with a fake Firestore transaction.
- functions/test/note-timing.test.js — the note_timing entry (allowed keys only, no content) and one entry per processNote call for each outcome, with fake Meta replies.
- functions/test/admin.test.js — with firebase-functions' own named app already there, the default app is still made and the counter opens its Firestore.
- functions/test/error-log.test.js — the counter's and the Meta connection's error lines keep the reason and leave out the UID (through the real logger); redaction and where.
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
- Java 21 (for the Firestore emulator) is installed system-wide with winget (`winget install --id Microsoft.OpenJDK.21 -e`). After installing, close and reopen PowerShell windows (and VS Code) so they find it; `java -version` should print 21.

**Run the app locally with the emulators (nothing touches the live project)**
Use two PowerShell windows, both in the repo folder.
1. Window 1: `npm run emulators`. This starts local copies of Auth (9099), Firestore (8080) and Functions (5001) under the made-up project ID demo-fola. Wait for "All emulators ready", then leave it running. Ctrl+C stops it, and that wipes every test account and profile.
2. Window 2: `npm run dev`. This starts the web app with live reload. Open http://localhost:5173. The indigo strip at the top, "Local test mode: emulators, nothing is live", confirms the app is using the emulators.
3. Optional: the Emulator UI at http://127.0.0.1:4000 shows the test accounts (Authentication tab) and saved profiles and cards (Firestore tab, collections "users", "cards" and "noteUsage").

Trying the Report screen locally (practice mode):
- Record any note on the Report screen and tap Send. Locally, processNote doesn't call Meta: it returns the 5 prepared made-up results in test-fixtures/practice-results/ in turn (1-n02 first), and the card screen says "Practice result: made up, not from your recording". The cards won't match what you said. Restarting `npm run emulators` starts the turn again at the first result.
- The audio check and the daily limit still run for real. To try the limit, set noteUsage/<your uid> to count 40 in the Emulator UI.
- Microphone: the browser asks once for localhost. The Report screen explains how to allow it if it was blocked.

Signing in locally:
- Email: choose Create account, then any made-up @example.com address and any password of at least 6 characters. No email is ever sent.
- Google, with the emulator's fake account: tap "Continue with Google". A window from the Auth emulator opens instead of Google, titled "Sign-in with Google.com". Tap "Add new account", then "Auto-generate user information", then "Sign in with Google.com". No real Google account is involved. Next time, the fake account is listed; tap it.
- Password reset: no email is sent. The reset link appears in window 1 (the emulator output).
- Only http://localhost and http://127.0.0.1 use the emulators. Opening the dev server from a phone by the computer's network address would use the live project, so check phone widths with the browser's device toolbar (F12, then the phone icon) instead.

Other local commands:
- `npm run build` — builds the finished web app into dist/. It warns that the main file is over 500 kB; see Known issues.
- `npm run preview` — serves the built dist/ at http://localhost:4173; with `npm run emulators` running, it uses the emulators too.
- Avoid a plain `firebase emulators:start`, `npm --prefix functions run serve` and `npm --prefix functions run shell` for app testing. They run under the real project ID, which the app on localhost doesn't use, and without functions/.secret.local the Functions emulator would then read the live META_API_KEY from Secret Manager.
- The Functions emulator reads META_API_KEY from functions/.secret.local (gitignored), which Nthabiseng creates herself. Under demo-fola, without that file it logs "Unable to access secret … 403" when a function first runs. That's harmless: under demo-fola, processNote is in practice mode and never calls Meta, and only checkMetaConnection would fail.

**Check**
- `npm run lint` — checks the code for common mistakes.
- `npm test` — runs the 42 web unit tests (sign-in error messages, the WAV encoder and waveform, card lists, card drafts and the 17-field saved document, optional observations, unusualSymptoms always false, the supplies note only with its tick, the answers-needed count and the first question to answer, the save button's gate; the design tokens: colours match DESIGN.md, contrast, no colours or fonts outside the tokens and brand files; the brand: manifest, icons, title, the wordmark's ring; the timing line; and Hosting's cache headers).
- `npm --prefix functions test` — runs the 79 Functions unit tests (WAV header, retries, code guards including observations never asked, two ears, Spark and extraction requests, sign-in checks, practice mode, the daily limit, the default Admin app, the note_timing log line, the error log lines), all with fakes and no network calls.
- `npm run test:rules` — runs the 89 Firestore rules tests (users and cards), one file after the other. It starts its own temporary Firestore emulator under demo-fola and stops it afterwards (about 40 s; needs Java). Stop `npm run emulators` first, because both use port 8080. The "Timed out" line at the very end is harmless (see Known issues).
- If a terminal says it can't find Java, it was opened before Java was installed: close and reopen it (or VS Code).
- `node -e "console.log(Object.keys(require('./functions/index.js')))"` — loads the Functions code on its own and lists its exports (checkMetaConnection, processNote); a quick check that functions/ finds its prompt and data files.

**Extraction scoring (local; calls the Meta API and uses credits)**
- Load the key the same way as the transcription test below, in the same one-line command, and end the line with `; Remove-Item Env:META_API_KEY`, so the key is cleared when the run finishes. The runs:
  - `node scripts/score-extraction.mjs --stage text --repeat 3 --effort low` — the 10 text fixtures, 3 times each, 5 calls at a time (about 30 s and $0.22).
  - `node scripts/score-extraction.mjs --stage audio --audio-model both --effort low` — every 24 kHz WAV with an expected card, through both ears and extraction, one at a time (about 2 minutes and $0.09 for 2 notes).
  - Also: `--notes n01,n04` limits the notes; `--audio-model 1.2` or `1.3` picks one audio ear.
  - `node scripts/score-extraction.mjs --rescore test-audio/results/score-001-results.json` — re-scores a saved run against the current fixtures, for example after correcting an expected answer. No API calls and no key needed.
  - Every run reports the pass rate, questions per card, extra questions and "confident wrong" (wrong values the card doesn't flag as unsure, the most dangerous kind of error).

**Transcription test (local; sends test audio to Meta's API and uses credits)**
- `node scripts/convert-audio.mjs` — converts every new recording in test-audio/raw/ into test-audio/wav/<name>-16k.wav and <name>-24k.wav.
- `$env:META_API_KEY = ((firebase functions:secrets:access META_API_KEY) | Out-String).Trim(); "Key loaded: $([bool]$env:META_API_KEY), length $($env:META_API_KEY.Length)"; node scripts/transcribe-test.mjs --runs a,b --keywords "Amanzimtoti"; Remove-Item Env:META_API_KEY` — one line: loads the key into this PowerShell window's memory (shows just its length), runs the chosen runs on every 24 kHz WAV, writes the next numbered results files, then clears the key. Never run the `firebase functions:secrets:access` part on its own: that prints the key.
  - `--runs` picks runs: a (no hints), b (keywords), c (keywords + language), d (Muse Spark 1.3 audio), e (Muse Spark 1.2 audio). Default a,b.
  - `--files all-sesotho,mixed-amanzimtoti` limits the run to those notes.

**Watch**
- `npm --prefix functions run logs` — shows recent logs from the deployed functions (read-only).
- Each processNote call writes one line with the message "note_timing", holding only numbers, model IDs and an outcome code: noteMs, audioBytes, audioSeconds, asrMs, audioEarMs, extractMs, asrRetries, audioEarRetries, extractRetries, coldStart, cardCount, outcome, asrModel, audioEarModel, extractModel. A step that never ran logs null; an ear cut off by the 30 s wait logs when we stopped waiting, with retries null. Outcome codes: ok, practice, signed_out, bad_audio, limit, counter_failed, asr_failed or asr_timeout (both ears), extract_failed or extract_timeout (the card step), error (anything unexpected). A note killed by the 300 s function timeout can't write its line; Cloud Run's request log shows the 504. In the Google Cloud console's Logs Explorer, `jsonPayload.message="note_timing"` finds them.
- A failed counter or Meta connection writes an error line ("Daily note counter failed", "Could not reach the Meta API") with errorName, errorCode, reason (UID and our document paths shown as "[redacted]") and where (file and line in functions/).
- `firebase functions:log --only processNote --lines 40` reads the latest lines; the times are UTC (SAST minus 2 hours).
- Phone tests: open the live site with `?timing=1` at the end of the address to see "Upload …, server …, total …" on the Report screen. Upload includes preparing the request and, on a cold start, the instance starting.

**Deploy (each one is a separate STOP: ask first)**
- `npm run build`, then `firebase deploy --only hosting` — publishes the web app to the live link.
- `npm --prefix functions run deploy` — publishes the Cloud Functions. It runs `firebase deploy --only functions` (from functions/package.json).
- `firebase deploy --only functions:processNote` — publishes processNote alone (used on 29 Oct). Before a Functions deploy: `git status` clean and `git diff --stat <last deployed commit> HEAD -- functions/` shows only the intended files. Afterwards, `firebase functions:list --json` shows each function's settings and a code hash that changes with every deploy.
- `firebase deploy --only firestore:rules` — publishes the Firestore security rules.
- Secrets: `firebase functions:secrets:get META_API_KEY` shows that the secret exists and its versions, never the value. Claude Code never runs `firebase functions:secrets:access` or anything else that prints a secret's value.
- Deleting live test data: Claude Code deletes Firestore documents only with `firebase firestore:delete` on exact paths, listed first for "approved delete". Sign-in accounts are deleted by Nthabiseng in the Firebase console (Authentication → Users), so no access token is handled in a script.

**Standard pre-push scan (every push; report a–g before asking "Push now?")**
- a. `git status` is clean; list the commits that would be pushed (`git log --oneline origin/main..HEAD`).
- b. `git diff --stat origin/main..HEAD`, naming any file over 500 kB.
- c. None of these in the push: .env or .env.*, .secret.local, test-audio/, audio files, credential JSON, logs, emulator exports, dist/, scripts or screenshots from outside the repo.
- d. No keys, tokens or passwords in added lines (the public Firebase web apiKey in src/lib/firebase.js is the only exception).
- e. No personal data: no real emails, phone numbers other than the two hotlines, real names other than Nthabiseng's, personal folder paths or transcript text.
- f. No "-contributor" model IDs.
- g. The product name only where the brand rules allow it (src/config/product.js, index.html's title, public/manifest.webmanifest; "Fola" only where HANDOVER records it).

## Known issues
- Google's account chooser shows the sign-in authDomain, not the app name, until Google verifies the app's branding (Next steps 4). Since 29 Oct the authDomain is lemoha.co.za, so it should show lemoha.co.za; the phone check is Next steps 3.
- The wordmark's ring is level with "e" and "a" to within 1 px at 4x (Task 9 follow-up), checked in headless Edge as a real 4x screen. Phones at other densities (2.625x, 3x) haven't been checked; look at the wordmark in the Task 10 phone test. Measuring under DevTools device emulation shows a false 4 px jump (see the Task 9 follow-up in docs/HISTORY.md).
- The symptom-group box's tap-to-open has only been checked in headless Edge (taps land on the select); the phones' own lists are in the Task 10 phone test.
- The case card's arrival motion plays again when a removed card is brought back with Undo.
- Source Serif 4 is loaded at its default optical size (14), to keep the files small; the clinician's words are set at 20 px.
- Starting the emulators from a terminal opened before Java was installed fails with "Could not spawn java -version" (in that window, `$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")` reloads the saved path so Java is found); stopping `npm run emulators` from a tool can leave its Java and Node processes holding ports 8080, 9099 and 5001 until they're ended.
- src/lib/firebase.js has the Firebase web config written in, including its apiKey, and it is already in the repo history, which becomes public on Day 8. Firebase web keys identify the project rather than grant access (security rules do that). Day 7: restrict the Firebase web API key to the app's domains.
- iPhone Safari has never been tested (no Safari on Windows). Edge forced to record Safari's format (audio/mp4) worked, which is the closest check available here. The deploy task's phone test covers it.
- A saved test card from the 28 Oct phone test holds a false severity flag (a box was ticked just to save, before Task 11). It goes with the phone account's data (In progress).
- The local Hosting emulator on Windows never applies firebase.json's header rules: its path helper (glob-slasher) turns "/" into "\", so no glob matches. Check headers on the live site with `curl.exe -sI` instead. Firebase's reserved /__/ paths (the sign-in handler) always carry Firebase's own headers (max-age=1800).
- The tap cover after a jump lasts 500 ms. A screen reader that activates a button by tapping its spot on screen within that half second would be absorbed; untested on VoiceOver and TalkBack. The cover doesn't block the keyboard by design, so pressing Enter twice quickly after a jump chooses the focused first option.
- Source Serif 4's font files still carry Adobe's older copyright line, with Reserved Font Name 'Source', in their built-in name table; the licence file in public/fonts/ is Google Fonts' copy, which reserves no name (Decisions and why, 29 Oct). The font files are served unchanged.
- The card's arrival motion has delays for its first 14 parts; a card has at most 13 today (12 without "What is unusual?"). A card given more parts would show the extra ones out of order, so add a delay line in src/index.css with any new field.
- Headless Edge on the computer's Wi-Fi sometimes can't open a connection to the functions server (net::ERR_CONNECTION_TIMED_OUT after about 21 s), while plain connections from the same computer work. Live tests run from a phone instead.
- gcloud's sign-in has expired: Nthabiseng runs `gcloud auth login` at a terminal before any gcloud command. The Firebase CLI still works.
- The Functions emulator skips sign-in token verification, so anything firebase-functions does only for a verified signed-in caller never happens locally. That hid the live counter failure of 28 Oct (app/no-app: firebase-functions makes its own named Admin app to verify the token, so "no app yet" checks are wrong; fixed in 919bb7e, proven live by the phone test at 16:05 SAST). Check signed-in paths live after a Functions change that touches the Admin SDK.
- processNote runs as the default compute service account. After the hackathon, give it its own service account with only Cloud Datastore User and access to the META_API_KEY secret.
- The timing line's upload time isn't pure network time: it runs from Send until processNote says "received", so it includes preparing the request (base64, the sign-in token) and, on a cold start, the instance starting (26 s in the local emulators after a code reload). The note_timing line's coldStart says when that happened.
- A note stopped by processNote's own 300 s timeout writes no note_timing line; Cloud Run's request log shows the 504.
- firestore.rules also keeps its own copy of the card lists (symptom groups, age groups, compared with usual, onset, exposure types, areas). Changing src/config/cardOptions.js, functions/lib/cardSchema.js or functions/data/places.json means changing firestore.rules too; the unit and rules tests fail until they match.
- The browser check and the break-the-rule check are local scripts, not part of the repo (they need a local test recording and Edge). Re-running them means rewriting them; docs/HISTORY.md lists what they checked.
- Practice mode's turn is held in the Functions emulator's memory, so it starts again at the first result whenever the emulator restarts or reloads the code.
- firestore.rules keeps its own copies of the role, facility-type and area lists, because rules can't import files. Changing src/config/profileOptions.js or functions/data/places.json means changing firestore.rules too; `npm run test:rules` fails until they match.
- The web app ships as one JavaScript file of about 877 kB (269 kB compressed), mostly the Firebase libraries, plus 26 kB of CSS and four font files (147 kB in all; an English-only screen downloads the two latin files, about 86 kB). Vite warns about it on every build. Splitting it (for example, loading Firestore only after sign-in) can wait until after P0.
- Anyone can create an account and choose any role: there's no email verification, and checking clinicians against the SANC and HPCSA registers is out of scope.
- Hosting has no automatic build before deploy: run `npm run build` first or the deploy sends a stale or missing dist/.
- Voice Transcribe can silently drop non-English speech. In Task 2, a Sesotho closing phrase appeared in only 2 of 9 calls. Consequence for the design: missing card fields are always asked, and the Report screen tells the clinician to check the transcript.
- Latency: usually 6 to 8 seconds, with spikes to 51 seconds, plus 3 dropped connections in one run. transcribeWav now retries once (see "Confirmed API formats").
- Transcripts sometimes repeat a word, more often when hints are sent; hints are now off by default.
- Muse Spark audio can invent text: in Task 3, 1.2 added a sentence that wasn't spoken, and in Task 4, 1.3 invented a disease name. The two-ears comparison and the rule 5 guard kept both off the cards, but the audio ear can't be trusted alone.
- The cleaned transcript once swapped a name for an unrelated word (Task 4), and once kept a misheard word from one ear. The clinician reviews the transcript before confirming, and the Report screen presents it as "what we heard, please check". Since Task 5 the prompt says never to replace a name with another word.
- A [?] in one transcript counts as a disagreement, so a weak audio ear can add questions about facts the other ear heard clearly (five questions on one card in Task 4).
- npm audit reports "high" issues in @grpc/grpc-js via the firebase SDK (Node-only code path), listed again under @firebase/rules-unit-testing because it depends on firebase. Don't run "npm audit fix --force", because it would downgrade firebase.
- Local Node is v24 but Functions run nodejs22. It's only a warning.
- The Firebase CLI sometimes prints its results, then exits with "Timed out". Harmless.
- Run gcloud from PowerShell, not Git Bash; under Git Bash it can't find Python.
