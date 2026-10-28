# HANDOVER

**Last updated:** 2026-10-28 06:45 SAST

The product is **Lemoha** (Sesotho for "to notice"; working name Fola until 28 Oct 2026). Dated entries below keep the name used at the time. The domain lemoha.co.za was bought on 28 Oct 2026 and isn't connected yet. Not renamed, on purpose: the repo and codename vot-health-za, the Firebase project (display name "Fola", web app "Fola web"), the local project ID demo-fola, function names, Firestore collections and stored values.

**Read this first, then docs/PROJECT_CONTEXT.md.** This file is the current state of the build. Claude Code updates it and commits at the end of every task, so any new Claude Code session can start from here. The repo is private until Day 8 (Tue 3 Nov), then made public. Treat it as public now: the full history becomes visible. No keys, passwords or personal data in this file.

## Where we are
Day 1 (Tue 27 Oct). A voice note now becomes draft case cards: two "ears" (Muse Voice Transcribe and Muse Spark audio) transcribe it in parallel, and Muse Spark 1.3 builds the cards from both, behind code guards. The callable processNote does this end to end (not deployed). Scoring: 100% on the 10 text fixtures after Task 5's fixture corrections and prompt changes, with no confident-wrong values; 91.7–95.8% on the two real recordings in Task 4 (results below). Task 6 (Day 2, part 1) added sign-in (Google, or email and password), a one-time profile (role, facility type, area) at users/{uid}, and the mobile app layout. Task 7 (Day 2, part 2) built the Report screen end to end: record a voice note (hold, or tap to start and stop), play it back, send it, watch honest progress stages, check the draft cards (unsure fields highlighted, with their questions), confirm, and the cards are saved to cards/{cardId}. processNote now has a daily limit of 40 notes per user and maxInstances 5, and in the local emulators it returns prepared made-up results ("practice mode") instead of calling Meta. Firestore rules for users/{uid} and cards/{cardId} are tested in the emulator (88 tests) but not deployed. Locally, the app uses only the emulators, under the made-up project ID demo-fola. Task 8 gave the app its look: the "Shweshwe" design direction, written down in docs/DESIGN.md (the single source of truth for all UI), turned into design tokens and self-hosted fonts, and applied to every existing screen, with no change to behaviour, data or rules. Task 9 (Wed 28 Oct) renamed the product to Lemoha, added the logo (the ring: wordmark in the header and on the sign-in and set-up screens, favicon, app icons and a web app manifest), added a Logo section to DESIGN.md, and fixed the cut-off symptom-group dropdown. Nothing from Tasks 6 to 9 is deployed: the live Hosting URL, https://vot-health-za.web.app, still shows the Vite starter page. Next: Task 10, the deploy task (Functions, rules, Hosting), then a real end-to-end test on phones, including an iPhone. Score the 10 recordings when they arrive.

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
  - Follow-up: the onset guidance now also says "The day patients came in is not the onset."; Stage 1 re-run once.

### Day 2 work — Task 6: sign-in, profile and app layout (done Tue 27 Oct; nothing deployed)
- Sign-in screen: "Continue with Google" (a popup; no Google logo), plus email and password with Sign in, Create account and Forgot your password. Show/Hide password. Plain-English errors from src/lib/authErrors.js; a wrong password and an unknown email get the same message.
- One-time profile at users/{uid}: role, facilityType, area, createdAt and updatedAt (both server timestamps), and nothing else. Role is a list of radio buttons (long role names were cut off in a dropdown at 360 px); facility type and area are dropdowns. Editable later on the Profile screen, which also shows the signed-in email (read from Auth, never stored) and Sign out. There is no delete button yet, although the rules allow the owner to delete.
- App layout: a header with the product name (from src/config/product.js), Replay and Profile. Bottom navigation: Report, Today and Near me. Routes: /report, /today, /near-me, /signals/:signalId, /replay and /profile; any other address goes to /report. Placeholders say when each screen arrives: Report Day 2, Replay Day 3, Near me Day 4, Signal detail and Today Day 6. Near me and Today show the user's area and the Watch/Signal/Alert key.
- Style: light theme, one deep teal accent, system fonts, 17 px body text, tap targets of at least 48 px, content at most 640 px wide. Watch, Signal and Alert are always shown as a word plus 1, 2 or 3 bars plus a colour (src/components/LevelBadge.jsx).
- The Vite starter page is gone: src/App.css, src/assets/ (hero.png, react.svg, vite.svg) and public/icons.svg are deleted (with Nthabiseng's yes), and src/index.css and public/favicon.svg are replaced.
- Emulators: on localhost or 127.0.0.1, src/lib/firebase.js connects Auth (9099), Firestore (8080) and Functions (5001) to the emulators, switches the project ID to demo-fola, and the app shows a "Local test mode" strip.
- src/lib/api.js: callFunction(name, data) uses httpsCallable with a 310 s timeout (processNote's limit is 300 s).
- firestore.rules: users/{uid} can be read (get only, never listed), created, updated and deleted only by its signed-in owner, with only the five fields, allowed values and server timestamps; createdAt can't change. Everything else stays deny-all. Not deployed.
- Rules tests: test/rules/users.rules.test.js, 28 tests with @firebase/rules-unit-testing. They try every role, facility type and area from the app's own lists (src/config/profileOptions.js and functions/data/places.json), so if firestore.rules drifts from those lists the tests fail. They were also checked against 13 deliberately broken copies of the rules: every break except removing hasAll was caught (a missing field already makes the other checks deny).
- checkMetaConnection now refuses callers who aren't signed in ("unauthenticated"). Not deployed. 2 new unit tests check both callables refuse signed-out calls before any network call (47 Functions tests in total).
- Web unit tests: test/unit/auth-errors.test.js (4 tests).
- Libraries added: react-router 8.4.0 (MIT) and, for tests only, @firebase/rules-unit-testing 6.0.0 (Apache-2.0).
- Java 21 (Microsoft Build of OpenJDK, installed with winget) for the Firestore emulator.
- Checked in headless Microsoft Edge at 360 × 740 against the emulators (27 checks, all passing):
  - sign-up and the error messages
  - the first-time profile and the five stored fields
  - a profile edit that keeps createdAt and moves updatedAt
  - every route, Back, deep-link reloads and unknown addresses
  - sign out and back in; password reset
  - the emulator's fake Google sign-in
  - checkMetaConnection through api.js while signed out
  - at 360 px: no sideways scrolling, every tap target at least 44 px, smallest text 14.5 px
  - no unexpected console errors

### Day 2 work — Task 7: the Report screen, from recording to a saved card (done Tue 27 Oct; nothing deployed)
- Recording (src/lib/recorder.js, src/components/RecordButton.jsx):
  - One large round button: hold it while speaking and let go to stop, or tap to start and tap again to stop. Keyboard and screen readers work like a tap. Long-press menus and text selection are switched off on the button.
  - A timer out of 1:30, "10 seconds left" from 1:20, and an automatic stop at 90 s. A note under 1 s gets "That was too short".
  - MediaRecorder records in each browser's own default format (webm/Opus on Android Chrome, mp4/AAC on iPhone Safari); no format is chosen, because a browser can always decode its own default.
  - The microphone is released as soon as recording stops.
  - Plain messages for a blocked microphone (with steps for Android Chrome and iPhone Safari), no microphone, a microphone busy in another app, and a browser that can't record.
- Audio (src/lib/wav.js): decodeAudioData (callback form, for older Safari), then OfflineAudioContext resamples to 24 kHz mono, then our own encoder writes a 16-bit PCM WAV. Base64 is built in slices. No new library.
- Review: the note's length and a player with no download option (it plays the WAV that will be sent); Send or Record again.
- The audio lives only in memory. It is dropped (and its playback link revoked) once the cards arrive, or when the note is thrown away. A failed send keeps it, so Try again resends without re-recording.
- Progress: "Listening…" while recording; after Send, "Reading your note…" until processNote says the transcripts are in, then "Building the card…". processNote sends that one progress message with Firebase's built-in callable streaming (src/lib/api.js streamFunction). The SDK ignores the timeout option for streamed calls, so streamFunction applies the 310 s limit itself, and also stops waiting if the connection closes without an answer.
- Errors: plain messages with Try again (or Record again for bad audio, OK for the daily limit). The SDK adds " [status]" to error messages; streamFunction removes it, because our functions' messages are written for people.
- Card screen (src/components/CaseCardForm.jsx, src/lib/cardDraft.js):
  - One panel per card ("Card 1 of 2").
  - Symptom group dropdown, plus "What is unusual?" for Something unusual. "Symptoms, in your words". Number of cases with − and + (1–500). Compared with usual (3 buttons). Age group (5 buttons). Area dropdown. When it started (3 buttons). Exposure chips plus "In your words". 4 observation tick boxes plus a supplies note.
  - Unsure fields are highlighted (a bar, a tint and a "Please check" label, which becomes "Answered"), with the card's question above them.
  - Unsure fields start empty: the AI's guess isn't filled in. An unsure Exposure gets a "None" chip and unsure Observations a "None of these" tick box.
  - "You said ‘…’. Which area is it?" appears only when the area is unsure and areaHeard is set.
  - Confirm and save stays disabled until every unsure field is answered and every needed field is filled; the line above it says how many answers are still needed.
  - "This card isn't right" folds a card to one line with Undo.
- Under the cards (src/components/NoteNotices.jsx), all fixed text:
  - "Check the transcript. Fola can miss or mishear words, especially in languages other than English. Remove any names before confirming." Then "What we heard", folded away by default, with the transcript editable.
  - Single source: "Only one transcription came back. Please check carefully."
  - Advice requested: "Fola can't advise on treatment. Use your facility's protocols or official clinical guidelines." Then the two hotlines as tap-to-call links (see "Official hotlines").
  - Notifiable condition: "You mentioned <words>. If it's a notifiable medical condition, remember to notify it through the NMC system."
  - Not a report: "This didn't sound like a report. Record again?", with the transcript readable but not editable and nothing to save.
  - In practice mode only: "Practice result: made up, not from your recording."
- Saving (src/lib/cards.js): one cards/{cardId} document per card, all of a note's cards in one batch (all or nothing). Fields: reporterUid, reporterRole, reporterFacilityType, reporterArea (from the profile), symptomGroup, unusualDescription, symptomsInWords, caseCount, comparedWithUsual, ageGroup, area, onset, exposure, observations, notifiableConditionMentioned, transcriptClean (after edits), source "voice", createdAt (server time). Nothing else: no areaHeard, unsure fields, questions, raw transcripts, disagreements or audio. Then "Saved. Thank you." with Record another.
- firestore.rules for cards/{cardId} (not deployed):
  - create: signed in; reporterUid is the caller; the reporter role, facility type and area match the caller's own users/{uid} profile (read with get(); no profile, no card); only the 18 fields; allowed values only; caseCount a whole number from 1 to 500; text caps (symptomsInWords 1–300, unusualDescription 300 and required for Something unusual, exposure words 300, supplies note 300, notifiable condition 300, transcriptClean 5000); exposure types without repeats; source "voice"; createdAt the server's time.
  - read and delete: the owner only. Update: never (a correction is a delete and a new card).
  - noteUsage/{uid}, the daily counter, has no client rule, so the deny-all rule keeps clients out.
- Rules tests: test/rules/cards.rules.test.js (60 tests; 88 rules tests in all). Every list value is swept from the app's own lists. Break-the-rule check: 45 broken copies of the cards rules, each with one condition removed or loosened. The tests caught 38. The other 7 are "equivalent" breaks: the write is still denied without that line, because reading a missing or wrong-typed field makes the rules deny anyway (signed-in check on create, hasAll on the card, exposure and observations, "is map" on both, "is list" on exposure types). The check first found one real gap (a card naming someone else as reporter was also caught by the profile check, so the uid check itself went untested); the test was fixed.
- Daily limit (functions/lib/noteLimit.js): at most 40 notes per user per SAST day (DAILY_NOTE_LIMIT). processNote checks sign-in, then the audio, then counts the note in a transaction on noteUsage/{uid} ({ day, count, updatedAt }), then calls Meta. Over the limit: "Daily limit reached. Try again tomorrow." (resource-exhausted), and the refused note isn't counted. If the counter can't be reached, the note is refused. A note that passes the audio check counts even if Meta then fails. processNote has maxInstances 5.
- Practice mode (functions/lib/practice.js): only when FUNCTIONS_EMULATOR is "true" AND the project ID starts with "demo-", processNote returns the prepared results in test-fixtures/practice-results/ in turn (holding each stage 1.5 s), instead of calling Meta. The files sit outside functions/, so they are never deployed, and they are read only after the check. The audio check and the daily limit still run for real.
  - The 5 files come from Stage 1 run score-006 (made-up text fixtures only): 1-n02 (hand-edited: off-list area "Nonyana Flat" and single source; the edit is described in the file), 2-n09 (two cards), 3-n08 (advice), 4-n04 (NMC), 5-n10 (not a report). Each file has "from" and "edits" fields.
- Unit tests: web 20 (WAV encoder, checked against the server's own checkWav; card lists against functions/lib/cardSchema.js; card drafts and the saved document), Functions 61 (practice mode on and off, including that processNote under the real project ID calls Meta and never a practice result; the daily limit, including the SAST midnight edge).
- Checked in headless Edge at 360 × 740 against the emulators in practice mode, with a fake microphone fed from a local test WAV (109 checks, all passing):
  - sign-up and profile, then the Report screen in place of the placeholder
  - microphone blocked: the help message; allowed again: Try again records
  - all five ways of recording: mouse tap, touch hold, keyboard, mouse hold, touch tap
  - each upload a 24 kHz mono 16-bit PCM WAV of the recorded length (3–4 s notes, and a 90 s note of 4.3 MB that stopped by itself at 1:30 after the "10 seconds left" warning); every call streamed
  - stages shown in order: Listening… done, Reading your note…, Building the card…
  - all 5 practice results: questions, highlights, "You said ‘Nonyana Flat’", single source, two cards with remove and Undo, the advice text and both tel: links, the NMC reminder, not a report; Confirm disabled until every answer is in; the edited transcript saved
  - the saved Firestore documents: exactly the 18 fields, reporter fields from the profile, the answers given; nothing saved for not-a-report
  - the daily counter at 5 after 5 notes; set to 40, the next note gets the limit message and isn't counted
  - Edge forced to record audio/mp4 (Safari's format): decoded, sent as WAV, accepted
  - after processing, the playback link is revoked; no audio in local or session storage, IndexedDB or caches
  - at 360 px on every state: no sideways scrolling, every tap target at least 44 px, smallest text 14.45 px
  - no unexpected console errors (the one expected error is the check's own fetch of the revoked link)
- iPhone Safari itself wasn't tested (there's no Safari on Windows); it's in the deploy task.

### Day 2 work — Task 8: design system, the Shweshwe direction (done Wed 28 Oct; nothing deployed)
- docs/DESIGN.md: the design direction Nthabiseng chose on 27 Oct, word for word, with six amendments she approved: --color-white in the colour table; case card fields restyled in place (every field keeps its own control; tap-to-change is parked); options that don't fit in one row at 360 px stack in the same style; an "Inputs and dropdowns" bullet; the two privacy lines; the processing line ("This usually takes under a minute. Please keep this screen open.").
- src/styles/tokens.css: every colour, font, type role, space, radius, shadow, size and motion time from DESIGN.md as CSS custom properties on :root. It's the only file with colour values. Text sizes are in rem (1rem = 16 px), so they match DESIGN.md at the default text size and follow a phone's larger-text setting. Body text is now 16 px (was 17) and the side gutter 20 px (was 16).
- Fonts, self-hosted with Fontsource (src/styles/fonts.css), so nothing is fetched from Google: Hanken Grotesk for everything Fola says, Source Serif 4 for the clinician's own words (symptoms, "What is unusual?", exposure and supplies words, the transcript, the area they said, the words in the NMC reminder). Only the latin and latin-ext files, weight axis, normal style, font-display swap. Packages @fontsource-variable/hanken-grotesk 5.3.0 and @fontsource-variable/source-serif-4 5.3.1, pinned exactly (OFL-1.1, now allowed for fonts in PROJECT_CONTEXT). Hanken Grotesk's figures are tabular by default.
- src/index.css rewritten on the tokens; the teal palette and system fonts are gone. Every screen restyled: sign-in (Google, email, create account, reset, errors), the first-time profile and Profile screen, the header and bottom navigation, the placeholders, and the whole Report flow.
- New pieces: Message (the wash block with an icon for every information and error message; never red), Waveform, VoiceNoteRow, eight more line icons, and the level badge with the shweshwe print (Watch: indigo with a dashed ochre border; Signal: orange with the sparse print; Alert: crimson with the dense print), each with its word.
- Report screen:
  - The record button is an 88 px indigo circle with its label under it (still one button), the timer above it, and a 3 px ring that pulses while recording.
  - The review screen's browser audio player is replaced by DESIGN.md's voice note row: a play/pause button, waveform bars drawn from the recording's real loudness (wavePeaks in src/lib/wav.js, 32 bars, RMS), and the length. The audio still stays in memory only; the loudness values are only drawn, never saved or sent. Once the cards arrive the playback link is revoked as before, and card review shows the waveform and length as a still summary with no play button.
  - Processing shows the rising and falling waveform (no spinner), the wait line and the stages. All three stages are real events: Listening is the finished recording, Reading starts when the note is sent, Building the card comes from processNote's own message; none runs on a timer.
  - Card review: unsure fields are wash question blocks in their place ("Please check" becomes "Answered"); single answers are segmented controls (Compared with usual and Age group stacked); the case card's parts fade in and rise 6 px in reading order.
  - Privacy lines (lock icon, 14 px, centred): under the record button (also while recording) and under Send, "Leave out patients' names. Fola doesn't keep the recording."; under the save button, "Check there are no names, then save. Fola doesn't keep the recording." The product name comes from src/config/product.js.
- Motion: only the processing waveform, the card arriving, the recording ring and 120 ms state changes; with prefers-reduced-motion nothing moves.
- Copy changes (approved): "This card isn't right" is now "Remove this card"; the disabled save button says "Answer N more to save", or "No cards to save" when every card is removed (the "N more answers needed" line stays as a screen-reader announcement while the button says it); the sign-in fallback error is now "Sign-in didn't work. Check your connection, then try again."
- Also: theme-color #F6F7FB (the ground) and the favicon in indigo, the only colours outside tokens.css; a long email on the Profile screen now wraps instead of running off the screen; focus scrolls clear of the sticky header and the bottom navigation (scroll-padding).
- CLAUDE.md and AGENTS.md gained rule 13 (every screen follows docs/DESIGN.md). README.md has a Fonts credit.
- Tests: test/unit/design-tokens.test.js checks that tokens.css has exactly DESIGN.md's colours, that every contrast pair DESIGN.md lists is at least 4.5:1 (lowest today 6.05:1), that no colour appears in src/ outside tokens.css, that only index.html's theme colour and the favicon have colours outside src/ (both token values), and that no font family is named outside the tokens. Two new wav.js tests for the waveform. Web unit tests: 27.
- Checked in headless Edge against the emulators in practice mode (fake microphone, a speech-like test tone), on every screen and state: sign-in and its errors, reset, create account, the first-time profile and its error, the Report screen idle, the three microphone messages, too short, recording, the last ten seconds, review and playback, a failed send and Try again, both processing stages, all five practice results (area heard with single source, two cards with Remove, Undo and "No cards to save", advice with both tel: links, the NMC reminder, not a report), answered cards, a save error (a deny rule loaded into the local emulator's memory for a moment, then firestore.rules again), "Still saving" (Firestore traffic blocked, then let through), saved, the daily limit, Profile and saved, Today, Near me, Signal detail, Replay, and the profile load error.
  - 360 × 740 with reduced motion throughout: 351 of 351 checks; 390 × 844: 316 of 316; 390 × 844 with reduced motion from the first frame (recording, processing, the card arriving): 22 of 22. No sideways scrolling, every tap target at least 44 px, smallest text 14 px, every computed font Hanken Grotesk or (only for the clinician's words) Source Serif 4, and both drawn from the web fonts (no system font). With reduced motion nothing moves and the card's parts are in their final state at once.
  - The saved Firestore documents (5 cards in each pass) each have exactly the 18 fields.
  - 360 × 740 with the text at 125% (root 20 px): nothing overlaps or scrolls sideways. What wraps: the practice pill, both privacy lines, the hotline names, the local test strip, "Last 3 days" when chosen, and the long role and observation options. What's cut off: the closed symptom-group dropdown (see Known issues).
  - The only console errors were the deliberate "disconnected" ones from the blocked requests.
  - `npm run test:rules` afterwards: 88 of 88, so the rules swap left nothing behind.

### Day 2 work — Task 9: rename to Lemoha, the logo, the symptom-group dropdown (done Wed 28 Oct; nothing deployed)
- The name: PRODUCT_NAME is "Lemoha", so every name a person sees changes with it (tab title, wordmarks, privacy lines, the transcript and advice notices, the microphone message, the profile note). index.html's title and the manifest hold "Lemoha" themselves, because static files can't read product.js; test/unit/brand.test.js fails if either drifts.
- functions/ is untouched. functions/prompts/extract-card.md still says "Fola" (line 1 twice, line 48), and so does a comment in functions/lib/metaRequest.js; see Open decisions.
- The logo, "the ring" (logo C): a dot circled by hand, which is also the "o" in the wordmark.
  - Master SVGs in src/assets/brand/: mark.svg (indigo), mark-white.svg, mark-small.svg (the closed ring for 32 px and below), wordmark-o.svg (the heavier ring for the wordmark, in currentColor). Nothing imports them yet; the wordmark draws its ring inline, and a test checks it matches wordmark-o.svg.
  - In public/: favicon.svg (indigo rounded square, rx 22 of 100, small mark in white at 64%), favicon-32.png (the same), icon-192.png and icon-512.png (indigo square, white mark at 62%), icon-maskable-512.png (mark at 50%, inside Android's circle crop), apple-touch-icon.png (180 px, mark at 60%, no transparency), manifest.webmanifest. The PNGs are 1–12 kB each.
  - The PNGs were rendered from the SVGs in headless Edge (DevTools protocol, sRGB, exact pixel size) by a one-off script outside the repo, then read back: right sizes, exact indigo, see-through corners only on favicon-32. To redo them, rebuild the same compositions from the numbers above.
  - index.html links favicon-32.png, favicon.svg, apple-touch-icon.png and the manifest; theme-color stays #F6F7FB.
- src/components/Wordmark.jsx: lowercase name with the ring as its "o" (letters from PRODUCT_NAME, split at the first "o"), Hanken Grotesk 700, letter-spacing -0.025em, ring box 0.72em with a 0.083em drop and 1 px either side; colour "indigo" (default) or "white". Screen readers get one image named "Lemoha". Used in the header (24 px) and, at 40 px, on sign-in, the first-time profile, the loading screen and the profile error screen. The sign-in line under it moved from 8 to 16 px for clear space. Sizes are tokens in rem, so they follow the phone's text size.
- Symptom-group dropdown: the chosen group shows as wrapping text in the same 50 px-minimum box (it grows to two lines for the longest labels), with the real select laid invisibly over the whole box, so a tap anywhere opens the phone's own list. The select keeps its label, value, onChange and stored values; the focus ring shows on the box (:focus-within). No other dropdown needed it: at 360 px and 125% text the widest other label, "Choose a facility type", is 194 px in 227 px of room.
- docs/DESIGN.md: the product line at the top, the Logo section, "Long option labels", the voice note row once the recording is gone, and {PRODUCT_NAME} in both privacy lines. README, PROJECT_CONTEXT, CLAUDE.md and AGENTS.md say Lemoha; rule 8 in both now names the two copies of the name.
- Tests: the design-token test now reads every text file in src/ and public/ (SVGs included) and allows colours only in tokens.css, the three coloured master SVGs, favicon.svg, the manifest and index.html's theme colour, all token values. New test/unit/brand.test.js: manifest names and icons (PNG sizes read from the files), index.html's title and links, the wordmark's ring against wordmark-o.svg. Web unit tests: 31.
- Checked in headless Edge against the emulators in practice mode at 360 × 740, 390 × 844 and 360 × 740 with 125% text (the browser's default text size set to 20 px): 475 of 475 checks.
  - Sign-in, first-time profile, loading (Firestore held back), the profile error (a deny rule in the local emulator's memory, then firestore.rules again), card review, and the header on Report, Today, Near me, Signal detail, Replay and Profile: no sideways scrolling, every tap target at least 44 px, smallest text 14 px (17.5 px at 125%), only Hanken Grotesk and Source Serif 4.
  - The wordmark: Edge reports the letters drawn from the Hanken Grotesk web font at weight 700; ring box 0.72em square. The ring's lowest pixel, from a 4x screenshot, is within 0.25 px of the flat letters' baseline at 24 and 30 px, and 1–1.25 px below it at 40 and 50 px (within 0.75 px of the round letters "e" and "a"), so the shift was kept. Clear space under the large wordmark: 16.8–23 px against the 14.4–18 px needed.
  - All eight symptom groups chosen in turn with the keyboard at each size: shown in full, at most two lines (at 125%: "Fever with a stiff neck or confusion", "Sudden illness after eating or drinking" and "Red eyes or itchy skin rash"). A touch tap at five points of the box (centre, corners, chevron, start of the text) lands on the select and focuses it. Headless Edge can't show or drive the phone's own list, so after the tap the choice was made with the list's keys.
  - The saved card has exactly the 18 fields, with symptomGroup "sudden_after_eating_drinking".
  - The built app (vite preview) serves favicon.svg, favicon-32.png, the three manifest icons, apple-touch-icon.png and the manifest (application/manifest+json) with status 200; Edge reads the manifest with no errors and reports no installability errors.
  - The only console error was the expected "Could not reach Cloud Firestore backend" while Firestore was held back on purpose.

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
- Follow-up, after adding "The day patients came in is not the onset." (score-006): 342 of 342 checks (100%), 0 confident wrong, 1.60 questions per card (expected 1.60), 0 extra questions. n01's onset is now asked in all 3 repeats. Extraction 5.3 s on average (1.3–13.1 s); about $0.22.

## In progress
- Nothing.

## Next steps (in order)
1. Score the 10 test recordings when they arrive: convert them, add an expected card for each to test-fixtures/expected-cards.json (made up, as now), run `--stage audio --audio-model both --effort low --repeat 2`, and confirm the audio-ear model.
2. Task 10: the deploy task, each deploy its own STOP:
   - Functions: checkMetaConnection gets its sign-in check live; processNote with the daily limit and maxInstances 5.
     - Decide processNote's memory and concurrency first. Each note holds about 30 MB in memory (the base64 upload, the decoded WAV and the Spark ear's base64 copy). A 2nd-gen function defaults to 256 MiB and up to 80 requests at once per instance, so a busy instance could run out of memory. Options: concurrency 10 at 256 MiB, or 512 MiB.
   - The Firestore rules (users and cards).
   - Hosting (the live site still shows the Vite starter page). Run `npm run build` first.
3. Then a real end-to-end test on phones, against the live project with real Meta calls:
   - Android Chrome and iPhone Safari. iPhone Safari has never been tested: there's no Safari on Windows. Check that it records (audio/mp4), decodes, plays back, sends, shows the stages and saves; check the microphone permission steps; check that holding the button doesn't open a long-press menu.
   - Made-up notes only. A note that asks about treatment, one that mentions a notifiable condition, and a two-group note.
   - On a real Android phone and an iPhone: tapping anywhere on the symptom-group box opens the phone's own list, and the chosen label shows in full.
   - Add to the home screen on both: the icon and the name "Lemoha" look right (the maskable icon on Android, apple-touch-icon on iPhone).
   - Watch the processNote logs for timings, and the daily counter in Firestore (noteUsage).
4. Nthabiseng, in the consoles (by hand; no code): the name people see outside the app.
   - Firebase console → the cog next to "Project overview" → Project settings → General → "Public-facing name" → the pencil → "Lemoha" → Save. Firebase's help page says it fills %APP_NAME% in the sign-in emails (password reset); setup guides say Google sign-in uses it as the app name too.
   - Firebase console → Authentication → Templates → Password reset: check the sender name and the subject; change any "Fola" to "Lemoha".
   - Google Cloud console (same project) → Google Auth Platform → Branding → "App name": check it says Lemoha, and change it if it says Fola. Google shows this name on its account chooser only after the app's branding is verified; until then the chooser shows the domain, vot-health-za.firebaseapp.com (see step 5).
   - Don't rename the Firebase project itself (display name "Fola").
5. After the Task 10 deploy, its own STOP: Connect lemoha.co.za to Firebase Hosting (DNS records), then decide whether to move the sign-in authDomain to it, so Google's account chooser stops showing vot-health-za.firebaseapp.com.
6. Later, with the privacy notice: a "Delete my profile" button (the rules already allow it). Day 4 decides how signals read cards (now owner-only).
7. Day 8 (Tue 3 Nov): Make the repo public, then check it from a logged-out browser.

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
- 27 Oct — Hints off by default. Language bias is dropped. Keywords get re-tested with place-name notes. Why: in Task 2, hints increased repeated words (a doubled word in 2 of 7 calls without hints, 5 of 7 with keywords, 7 of 7 with keywords plus language).
- 27 Oct — Transcription retries once on a dropped connection, a timeout, or HTTP 429/500/502/503/504, and never on other 4xx: those are usually temporary, while other 4xx mean the request itself is wrong.
- 27 Oct — Two ears. Every voice note goes to Muse Voice Transcribe AND to Muse Spark (audio input), in parallel. Muse Spark 1.3 (text) then builds the card from both transcripts. Where they disagree on a card fact, that field is marked unsure and the card asks the clinician. Why: Task 3 showed the two routes fail in different ways. Voice Transcribe keeps every sentence, but spells Sesotho by sound and mishears it in mixed notes (a Sesotho phrase came back as a similar-sounding English word; a Sesotho request was dropped). Muse Spark audio understands mixed speech, but on all-Sesotho speech it either gave up (1.3) or dropped phrases and invented a sentence (1.2).
- 27 Oct — The audio-ear model (muse-spark-1.2 or muse-spark-1.3, never "-contributor") is chosen by Task 4's Stage 2 scores, and kept as a single setting (SPARK_AUDIO_MODEL in functions/constants.js).
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
- 27 Oct — Unsure fields start empty; the AI's guess isn't filled in (Nthabiseng approved). Why: "unsure means ask", and a pre-filled guess tends to get confirmed without a look. Unsure Exposure and Observations get an explicit "None" answer.
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
- 28 Oct — Domain lemoha.co.za bought by Nthabiseng. Connecting it to Hosting, and maybe moving the sign-in authDomain to it, comes after the Task 10 deploy, as its own STOP.
- 28 Oct — index.html's title and the manifest hold the product name themselves (static files can't read product.js), guarded by test/unit/brand.test.js; the manifest is on the colour allow-list for its two #F6F7FB values (approved).
- 28 Oct — The wordmark also replaces the plain-text name on the loading, profile error and first-time profile screens, at the sign-in size (approved).
- 28 Oct — The extraction prompt keeps "Fola" for now: changing a prompt changes what the model does, so it changes with a re-score (see Open decisions).
- 28 Oct — Long dropdown labels: the chosen label is shown as wrapping text with the real select laid invisibly over it (DESIGN.md, "Long option labels"). Why: a closed select can't wrap, and the phone's own list is the most familiar picker. Only the symptom group needs it today.

## Open decisions (ask Nthabiseng; don't decide in code)
- Change 'Fola' to 'Lemoha' in the extraction prompt during the next scoring run, and re-score in that same run.
- Licence for the public repo.
- How simulation data is kept apart from real data (Day 3).
- Audio-ear model: the final choice comes after scoring the 10 recordings (now muse-spark-1.2).
- Should a [?] in one transcript count as a disagreement when the other transcript is clear? It adds questions (five on one card in Task 4). Decide after the 10 recordings are scored. (The other three Task 4 questions were closed in Task 5; see "Decisions and why".)

## File map
- CLAUDE.md — rules every Claude Code session follows.
- AGENTS.md — the same rules for any other coding agent (Codex reads it automatically). Keep the two files in step.
- HANDOVER.md — current state of the build (this file).
- docs/PROJECT_CONTEXT.md — the brief and the decisions.
- docs/DESIGN.md — the Shweshwe design direction: colours, type, spacing, components, motion, copy and accessibility rules. Every screen follows it.
- README.md — public project summary.
- index.html — the page shell Vite builds from: the title "Lemoha" (kept equal to PRODUCT_NAME by a test; main.jsx also sets it from product.js), the favicon, iPhone icon and manifest links, and theme-color.
- vite.config.js — Vite settings (React plugin only).
- package.json, package-lock.json — web app libraries and npm scripts.
- .oxlintrc.json — linter rules.
- .firebaserc — links this folder to the Firebase project vot-health-za.
- firebase.json — Firebase settings: Firestore (africa-south1, rules, indexes), Functions folder, Hosting from dist/, emulator ports.
- firestore.rules — Firestore security rules: users/{uid} for its owner only; cards/{cardId} created by the reporter (matching their profile), read and deleted by the owner only, never changed; everything else (including noteUsage) deny-all. Not deployed.
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
- src/config/cardOptions.js — the case card lists (stored value and label) and the text limits; mirrors functions/lib/cardSchema.js.
- src/config/hotlines.js — the fixed advice text and the NICD and Poisons Information Centre numbers, with their sources.
- src/lib/firebase.js — Firebase web config; Auth, Firestore and Functions (africa-south1); on localhost, the emulators under demo-fola.
- src/lib/api.js — callFunction(name, data) and streamFunction(name, data, onProgress): call a callable function with a 310 s timeout; streamFunction also passes on progress messages.
- src/lib/recorder.js — the microphone and MediaRecorder, with the 90 s limit and plain error kinds.
- src/lib/wav.js — decode and resample a recording to 24 kHz mono, the WAV encoder, base64, and the waveform's bar heights.
- src/lib/cardDraft.js — a card while it's being checked (unsure fields empty), what still needs answering, and the exact document that's saved.
- src/lib/cards.js — saveCards: one cards/{cardId} document per card, in one batch.
- src/lib/authErrors.js — plain-English messages for sign-in errors.
- src/lib/places.js — the town and area names, read from functions/data/places.json.
- src/lib/profile.js — watchProfile and saveProfile for users/{uid}.
- src/lib/useSession.js — the hook that says who's signed in and whether their profile is set up.
- src/components/AppLayout.jsx — header (with the wordmark) and bottom navigation around the signed-in screens.
- src/components/Wordmark.jsx — the wordmark: the lowercase name with the ring as its "o", one image to screen readers.
- src/components/RecordButton.jsx — the hold-or-tap record button.
- src/components/CaseCardForm.jsx — one case card panel, with unsure fields highlighted and their questions; the symptom group shows as wrapping text over an invisible select.
- src/components/NoteNotices.jsx — the transcript and the fixed notices under the cards (single source, advice and hotlines, NMC reminder).
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
- test/rules/users.rules.test.js — Firestore rules tests for users/{uid} (run with npm run test:rules).
- test/rules/cards.rules.test.js — Firestore rules tests for cards/{cardId} and the closed noteUsage counter.
- test-fixtures/practice-results/ — the 5 made-up results practice mode returns (from Stage 1 run score-006; one hand-edited, as its "edits" field says).
- functions/index.js — Cloud Functions: checkMetaConnection and processNote (not deployed).
- functions/constants.js — shared constants and settings (Meta API base URL, models, extraction effort, audio limits, the 30 s wait between ears, the daily note limit, practice-mode stage time).
- functions/lib/noteLimit.js — the daily note limit: the SAST day and the counter transaction on noteUsage/{uid}.
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
- Email: choose Create account, then any made-up address (for example nurse.test@example.com) and any password of at least 6 characters. No email is ever sent.
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
- `npm test` — runs the 31 web unit tests (sign-in error messages, the WAV encoder and waveform, card lists, card drafts and the saved document, the design tokens: colours match DESIGN.md, contrast, no colours or fonts outside the tokens and brand files; and the brand: manifest, icons, title, the wordmark's ring).
- `npm --prefix functions test` — runs the 61 Functions unit tests (WAV header, retries, code guards, two ears, Spark and extraction requests, sign-in checks, practice mode, the daily limit), all with fakes and no network calls.
- `npm run test:rules` — runs the 88 Firestore rules tests (users and cards), one file after the other. It starts its own temporary Firestore emulator under demo-fola and stops it afterwards (about 40 s; needs Java). Stop `npm run emulators` first, because both use port 8080. The "Timed out" line at the very end is harmless (see Known issues).
- If a terminal says it can't find Java, it was opened before Java was installed: close and reopen it (or VS Code).
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
- Google's account chooser shows "vot-health-za.firebaseapp.com" (the sign-in authDomain), not the app name, until the app's branding is verified by Google or the authDomain moves to lemoha.co.za (Next steps 4 and 5).
- The wordmark's ring lands within about 1 px of the letters' baseline, a little above or below depending on the size, because of pixel rounding. Checked by eye in the 4x crops of Task 9.
- The symptom-group box's tap-to-open has only been checked in headless Edge (taps land on the select); the phones' own lists are in the Task 10 phone test.
- The case card's arrival motion plays again when a removed card is brought back with Undo.
- Source Serif 4 is loaded at its default optical size (14), to keep the files small; the clinician's words are set at 20 px.
- Starting the emulators from a terminal opened before Java was installed fails with "Could not spawn java -version" (in that window, `$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")` reloads the saved path so Java is found); stopping `npm run emulators` from a tool can leave its Java and Node processes holding ports 8080, 9099 and 5001 until they're ended.
- src/lib/firebase.js has the Firebase web config written in, including its apiKey, and it is already in the repo history, which becomes public on Day 8. Firebase web keys identify the project rather than grant access (security rules do that). Day 7: restrict the Firebase web API key to the app's domains.
- Nothing from Tasks 6 to 9 is deployed. The live site still shows the Vite starter page, and the live Firestore still has the deny-all rules, so saving a profile or a card would fail until the rules are deployed.
- iPhone Safari has never been tested (no Safari on Windows). Edge forced to record Safari's format (audio/mp4) worked, which is the closest check available here. The deploy task's phone test covers it.
- processNote's memory and concurrency are still the defaults (256 MiB, up to 80 requests per instance) and each note uses about 30 MB; decide in the deploy task (see Next steps).
- firestore.rules also keeps its own copy of the card lists (symptom groups, age groups, compared with usual, onset, exposure types, areas). Changing src/config/cardOptions.js, functions/lib/cardSchema.js or functions/data/places.json means changing firestore.rules too; the unit and rules tests fail until they match.
- The browser check and the break-the-rule check are local scripts, not part of the repo (they need a local test recording and Edge). Re-running them means rewriting them; HANDOVER lists what they checked.
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
- The deployed checkMetaConnection can still be called by anyone (it only lists models). The code has required sign-in since Task 6, and the check goes live with the next Functions deploy.
- npm audit reports "high" issues in @grpc/grpc-js via the firebase SDK (Node-only code path), listed again under @firebase/rules-unit-testing because it depends on firebase. Don't run "npm audit fix --force", because it would downgrade firebase.
- Local Node is v24 but Functions run nodejs22. It's only a warning.
- The Firebase CLI sometimes prints its results, then exits with "Timed out". Harmless.
- Run gcloud from PowerShell, not Git Bash; under Git Bash it can't find Python.

## Recent changes (newest first; keep the last 10)
- 2026-10-28 — Task 9: renamed to Lemoha (working name Fola until 28 Oct); the ring logo: Wordmark component (header, sign-in, set-up, loading and error screens), brand SVGs, favicon, app icons and the web app manifest; DESIGN.md Logo section, "Long option labels" and the voice-note-row case; the symptom-group dropdown shows its label in full; brand test and a tighter colour allow-list (31 web unit tests). Checked in Edge at 360 and 390 px and at 125% text (475 of 475). lemoha.co.za recorded. Nothing deployed; deploy is now Task 10.
- 2026-10-28 — Task 8: the Shweshwe design system. docs/DESIGN.md (with six approved amendments), design tokens in src/styles/tokens.css, self-hosted Hanken Grotesk and Source Serif 4 (Fontsource, latin and latin-ext, pinned), every screen restyled with no change to behaviour, data or rules; voice note row with a real-loudness waveform; privacy lines; three copy changes; rule 13 in CLAUDE.md and AGENTS.md; design-token and contrast tests (27 web unit tests). Checked in Edge at 360 and 390 px, with reduced motion and at 125% text. Nothing deployed; deploy moves to Task 9.
- 2026-10-27 — Docs: the repo is private until Day 8 (Tue 3 Nov), then made public, and is treated as public now; Day 8 step added to make it public and check it from a logged-out browser; Tasks 6 and 7 marked done.
- 2026-10-27 — Task 7: the Report screen end to end (hold-or-tap recording, 24 kHz WAV in the browser, playback, streamed progress stages, the card screen with unsure fields empty and highlighted, fixed advice/NMC/single-source/not-a-report notices, saving to cards/{cardId}); cards rules with 60 emulator tests and a break-the-rule check; processNote's daily limit (40 per SAST day), maxInstances 5 and emulator-only practice mode with 5 made-up results; official hotline numbers checked. Nothing deployed.
- 2026-10-27 — Task 6: sign-in (Google, email and password), a one-time profile at users/{uid}, the mobile layout with all five routes (placeholders except Profile), the emulators under demo-fola, src/lib/api.js, Firestore rules for users/{uid} with 28 emulator tests (not deployed), and a sign-in check in checkMetaConnection (not deployed). The Vite starter files are deleted; Java 21 is installed.
- 2026-10-27 — Extraction prompt: "The day patients came in is not the onset."; Stage 1 now 100% with no confident-wrong values.
- 2026-10-27 — Task 5: corrected three expected answers, tightened the extraction prompt, added the confident-wrong count and --rescore, added AGENTS.md (CLAUDE.md in step), recorded the Startup track, effort and audio-ear decisions; Stage 1 re-scored and re-run.
- 2026-10-27 — Two-ears case card extraction: places list, Spark audio ear, extraction with structured output and code guards, processNote (replaces transcribeNote; not deployed), shared retry code, scoring runner and fixtures; Stage 1 and Stage 2 scored.
- 2026-10-27 — Recorded the Day 0–1 decisions and facts; transcription now retries once on temporary failures; test runner gained run selection, numbered results and Muse Spark audio runs; ran the Sesotho experiment (runs 003–004).
- 2026-10-27 — Confirmed the Muse Voice Transcribe file endpoint; added functions/lib/transcribe.js, the transcribeNote callable (not deployed), WAV header unit tests, and the audio conversion and transcription test scripts.
- 2026-10-27 — Added HANDOVER.md, docs/PROJECT_CONTEXT.md and CLAUDE.md; checked .gitignore.
