# History

The dated record of how Lemoha was built, kept out of HANDOVER.md so that file stays the current state. Entries keep the name used at the time (the working name was Fola until 28 Oct 2026). Times are SAST. No keys, passwords or personal data in this file.

## Build log

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
- Muse Voice Transcribe file endpoint confirmed working (format in HANDOVER.md, Confirmed API formats).
- functions/lib/transcribe.js: checkWav (WAV header check with plain-English errors) and transcribeWav (one note in, transcript and timings out; logs nothing).
- Callable function transcribeNote (africa-south1, META_API_KEY, sign-in required, 120 s / 6 MB cap, logs timings only). Never deployed; replaced by processNote in Task 4.
- 13 unit tests for the WAV header check (npm --prefix functions test), no network calls.
- scripts/convert-audio.mjs (phone recordings to 16 and 24 kHz WAVs) and scripts/transcribe-test.mjs (three-way hint test).
- 2 test voice notes recorded (clear English; fast Sesotho–English mix with background noise), converted, and transcribed in two full runs.
- Model IDs recorded and the Muse Spark model chosen (see "Decisions and why" in HANDOVER.md).
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
- src/components/Wordmark.jsx: lowercase name with the ring as its "o" (letters from PRODUCT_NAME, split at the first "o"), Hanken Grotesk 700, letter-spacing -0.025em, ring box 0.61em with a 0.0625em drop and 1 px either side (0.72em and 0.083em until the follow-up below); colour "indigo" (default) or "white". Screen readers get one image named "Lemoha". Used in the header (24 px) and, at 40 px, on sign-in, the first-time profile, the loading screen and the profile error screen. The sign-in line under it moved from 8 to 16 px for clear space. Sizes are tokens in rem, so they follow the phone's text size.
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

### Day 2 work — Task 9 follow-up: the wordmark's "o" (done Wed 28 Oct; nothing deployed)
- The ring was too big: in the 4x header crop it was 58 px tall and wide, against 48–49 px for "e", "m" and "a", and its top sat about 20% above the x-height. Only `.wordmark-o` in src/index.css changed: the box from 0.72em to 0.61em, the drop from 0.083em to 0.0625em. The 1 px either side, the ring drawing, Wordmark.jsx and wordmark-o.svg are unchanged.
- The tests it had to pass at 24, 30, 40 and 50 px, at 4x: the ring's top within 1 px of the tops of "e" and "a", its bottom within 1 px of their bottoms, and its width within 15% of a real "o" in Hanken Grotesk 700 at the same size.
- How the numbers were found: headless Edge started as a real 4x screen (`--force-device-scale-factor=4`), the wordmark's own markup on white, a pixel counted as ink when at least half indigo, letters split at empty columns, the baseline at the bottom of "l". Boxes 0.595–0.625em (steps of 0.005) and drops 0.05–0.075em (steps of 0.0025) were each tried with the wordmark moved down by 0, ⅛ … ⅞ of a pixel; 8 of 77 pairs passed everywhere. 0.61em / 0.0625em is in the middle of the drops that pass at 0.61em (0.06 and 0.065 pass too).
- Measure with a real 4x screen, not DevTools device emulation. Under emulation the ring and the letters are snapped to whole CSS pixels separately, so the ring jumps 4 px (at 4x) against the letters depending on where the wordmark lands on the page; on a real 4x screen it moves by at most 1 px.
- Results from the edited file, at 4x (top = px above the baseline, bottom = px below it; widths in px):

  | Size | e top/bottom | m top/bottom | a top/bottom | ring top/bottom | e width | real "o" width | ring width |
  |---|---|---|---|---|---|---|---|
  | 24 | 49 / 0 | 49 / −1 | 49 / 0 | 50 / 0 | 44 | 48 | 49 (+2.1%) |
  | 30 | 61 / 0 | 61 / −1 | 61 / 0 | 62 / 0 | 55 | 59 | 62 (+5.1%) |
  | 40 | 82 / 0 | 82 / −2 | 82 / 0 | 83 / −1 | 74 | 79 | 83 (+5.1%) |
  | 50 | 103 / 0 | 103 / −2 | 103 / 0 | 102 / 1 | 93 | 99 | 103 (+4.0%) |

  At twelve page positions per size, the ring's top and bottom stayed within 1 px of both "e" and "a".
- Checked in headless Edge (real 4x screen) against the emulators in practice mode, on sign-in and the Report header, at 360 × 740 and at 360 × 740 with 125% text: no sideways scrolling, every tap target at least 44 px, smallest text 14 px (17.5 px at 125%), only Hanken Grotesk drawn. The wordmark in place (header 24 and 30 px, sign-in 40 and 50 px): ring within 1 px of "e" and "a". Clear space under the large wordmark: 19.5 px against 12.2 px needed at 40 px, 20.6 px against 15.3 px at 50 px.
- `npm test` 31 of 31, `npm run lint` clean, `npm run build` fine (only the known chunk-size warning).
- Review crops (outside the repo): wordmark-4x-after.png (header, 24 px) and wordmark-40-4x-after.png (sign-in, 40 px).

### Day 2 work — Task 10, part 1: no stored transcript, step timings, function settings (done Wed 28 Oct; nothing deployed)
- Saved cards have 17 fields; transcriptClean is gone (decided 28 Oct: shown during review, never stored). The 17: reporterUid, reporterRole, reporterFacilityType, reporterArea, symptomGroup, unusualDescription, symptomsInWords, caseCount, comparedWithUsual, ageGroup, area, onset, exposure {types, words}, observations {moreSevere, notResponding, unusualSymptoms, shortOfSupplies, suppliesNote}, notifiableConditionMentioned, source, createdAt.
  - src/lib/cardDraft.js (toCardDoc) and src/lib/cards.js (saveCards) no longer take or write the transcript.
  - firestore.rules: transcriptClean is off both field lists and its 5000 cap is gone. hasOnly was already there, so a card that carries transcriptClean is denied like any unknown field.
  - processNote and functions/prompts/ are unchanged: the model still writes the cleaned transcript, and the review screen still shows it.
- The transcript on card review is read-only (approved): "What we heard" now shows the words as text in Source Serif 4, in curly quotes with the hanging opening quote (the first use of --hanging-quote), with "Not saved. Fix anything wrong in the card above." under it (only when the note is a report, since a non-report has no card). The text box, its "Transcript (you can edit it)" label and the edit state in ReportScreen are gone, and so is TEXT_LIMITS.transcriptClean. With no transcript text at all, the transcript notice and "What we heard" aren't shown. DESIGN.md's hanging-quote line names this first use.
- Wording follow-up (approved, its own commit): the notice above "What we heard" is now "Check the card against what you said. Lemoha can miss or mishear words, especially in languages other than English." (was "Check the transcript. … Remove any names before confirming."; names can only be removed from the card's own fields now, and the privacy line under the save button asks for that check). It shows only for a report, since a non-report has no card to check. The line under the transcript says "the card above" with one card and "the cards above" with two or more.
- processNote settings (approved): memory 1 GiB, concurrency 8, timeoutSeconds 300, maxInstances 5, minInstances 0. Worst case is about 243 s: each ear 2 × 60 s + 1 s, side by side, then the card step 2 × 60 s + 1 s. Each note holds about 30 MB (40 MB at the 120 s cap); running out of memory would fail every note on the instance.
- Step timings (functions/lib/noteTiming.js): every processNote call, success or failure, writes one log entry with the Firebase logger, message "note_timing", holding only noteMs, audioBytes, audioSeconds, asrMs, audioEarMs, extractMs, asrRetries, audioEarRetries, extractRetries, coldStart, cardCount, outcome, asrModel, audioEarModel, extractModel. The entry is built by copying only those keys. A step that never ran logs null; an ear cut off by the 30 s wait logs when we stopped waiting, with retries null.
  - Outcome codes: ok, practice, signed_out, bad_audio, limit, counter_failed, asr_failed or asr_timeout (both ears), extract_failed or extract_timeout (the card step), error (anything unexpected). A note killed by the 300 s function timeout can't write its line; Cloud Run's request log shows the 504.
  - "Processed a voice note" is replaced by note_timing. The two failure lines stay (failure kinds and HTTP statuses), and a note built from one ear logs a warning, "One transcription failed", with the same ear details.
- processNote's reply gains noteMs (the server time), practice mode included; nothing else in the reply changes. Its first streamed message is now {stage: "received"}, sent as soon as the handler starts, which is only once the whole request has arrived (approved). It carries nothing else, and the screen ignores it.
- The app's timing line (src/lib/timing.js): only when the page was opened with ?timing=1 (read once at load, because the redirect from / to /report drops the query). Upload is from Send until "received" arrives; total until the cards arrive; server is noteMs. While processing: "Upload 2.1 s" under the wait line; on card review, under the note's waveform: "Upload 2.1 s, server 18.4 s, total 21.0 s"; after a failed send: upload and total. 14 px, ink-muted, tabular figures. Nothing is sent anywhere.
  - Upload time includes preparing the request (base64, the sign-in token) and, on a cold start, the instance starting. In the local emulators the first note after a code reload showed "Upload 26 s" for this reason; the log's coldStart says when it happened.
- Tests: web 33 (new test/unit/timing.test.js; cards.test.js checks the 17 fields), Functions 68 (new functions/test/note-timing.test.js: the entry holds only the allowed keys whatever the timing holds; plain values only; a fake transcript, uid and file name never appear; one entry per call for ok, signed out, bad audio, limit, lost counter, both ears failed and a failed card step; the reply's noteMs equals the logged one; coldStart true on the first call only; "received" then "building" streamed), rules 89 (new: a card with transcriptClean is denied; the card the app itself builds is accepted; the 5000-character transcript test is gone).
- Checked in headless Edge against the emulators in practice mode at 360 × 740 (26 of 26): with ?timing=1 the line shows the upload while processing, 14 px under the wait line, without changing the stage shown, then the full line on card review; the transcript is plain text in Source Serif 4 at 20 px, text-indent -8.4 px, the quote mark in the margin and the first letter in line with the summary (within 1 px); "Not saved…" under reports only; no "edit it" wording anywhere; the saved card in the emulator has exactly the 17 fields; reloaded without ?timing=1, no line on any of the other four results (including the two-card and not-a-report ones); no sideways scrolling; no console errors.
- `npm run lint` clean, `npm run build` fine (only the known chunk-size warning).

### Day 2 work — Task 10 Part C: the deploys and the first live notes (done Wed 28 Oct)
- Deployed, each with its own STOP:
  - C1, 11:28 SAST: Functions from 770bda8 + f58beb4. processNote created and checkMetaConnection updated, both africa-south1. Both refuse a signed-out call (401 UNAUTHENTICATED); checkMetaConnection lists 9 models for a signed-in made-up account.
  - C2, 11:47 SAST: firestore.rules (users and cards; everything else, noteUsage included, deny-all), after `npm run test:rules` 89 of 89. The CLI's "An unexpected error has occurred" afterwards was its own "Timed out" (the release returned 200). Signed-out reads get 403 PERMISSION_DENIED. No query needs an index.
  - C3, 12:01 SAST: Hosting from f58beb4 (14 files). Every live file matches dist/ byte for byte; the title is "Lemoha"; headless Edge shows the sign-in screen with the wordmark, no "Local test mode" strip and no console errors. Cache-Control is max-age=3600 on everything (Known issues).
  - C1b, 14:38 SAST (93a5082) and C1c, 15:45 SAST (919bb7e): Functions redeployed. Every function setting was the same before and after (compared with `firebase functions:list --json`: region, memory, CPU, timeout, concurrency, min and max instances, secret, service account, ingress), and both functions still refuse a signed-out call.
- lemoha.co.za was already connected to Hosting (found at C3): https://lemoha.co.za serves the app over HTTPS, and https://www.lemoha.co.za returns 301 to it. DNS: lemoha.co.za A 199.36.158.100; www CNAME vot-health-za.web.app. Neither function sets `cors`, so onCall's default allows any origin; a preflight from https://lemoha.co.za gets 204.
- The first live notes failed at the daily counter (outcome counter_failed, noteMs 3), and the reason wasn't logged.
  - 93a5082, error logging: "Daily note counter failed" and "Could not reach the Meta API" passed their reason as `message`, which the Firebase logger overwrites. Both now log errorName, errorCode (or the cause's code, where fetch keeps it), reason and where, built by functions/lib/errorLog.js. reason is the error's message with the caller's UID, everything after "documents/" in a full Firestore name, and users/, cards/ and noteUsage/ paths replaced by "[redacted]"; other slash-separated text (text/html, links) stays; at most 500 characters. where is the first stack line in our own code, as file and line relative to functions/. It's only for errors whose message can't contain note content. 7 tests, through the real logger: the reason survives and the UID doesn't.
  - Nthabiseng found that the default compute service account, which processNote runs as, had only "Cloud Build Service Account" (no Firestore access), and added "Cloud Datastore User" before C1b. FIREBASE_CONFIG and GCLOUD_PROJECT were set correctly on the live revision.
  - The new log line then showed the real cause: errorCode app/no-app ("The default Firebase app does not exist…") at lib/noteLimit.js:25. For a signed-in caller, firebase-functions verifies the ID token through its own named Admin app, "__FIREBASE_FUNCTIONS_SDK__", before our code runs, so noteLimit's "no app yet?" check skipped initializeApp(). The emulator skips token verification and signed-out calls never verify, so no local test caught it.
  - 919bb7e, the fix: a search of functions/ for getApps, getApp, initializeApp, getFirestore and getAuth found only noteLimit.js. functions/lib/admin.js is now the only place that makes the default app: it looks for "[DEFAULT]" by name and makes it if missing; defaultDb() is its Firestore, and noteLimit uses it. 2 tests set up the SDK's named app first; with the old check put back for a moment, the counter test failed with app/no-app.
- Live attempts from the computer (headless Edge driven by a local script, test account 2, the made-up recording mixed-amanzimtoti, about 20 s):
  - 12:12 and 15:15 SAST reached processNote and hit the counter bug.
  - 14:41 and 15:47 (with one Try again) never reached it: headless Edge on this computer's Wi-Fi couldn't open a connection to the functions server (net::ERR_CONNECTION_TIMED_OUT after about 21 s, which is when Windows gives up on an unanswered connection), on both the CORS preflight and the POST. Plain connections from the same computer worked (83 ms), so it isn't a Lemoha fault. This computer's upload was also very slow (1.25 MB took 10–59 s).
  - A read-only check found no client-side time limit near 21 s: processNote's streamed call has only the app's 310 s abort (src/lib/api.js:27-28), and the SDK's 70 s default covers only non-streamed calls. One send per tap, one fetch, no automatic retries; after a failure the recording stays in memory and Try again resends it.
- The live test moved to Nthabiseng's phone (mobile data, her own account, https://lemoha.co.za/?timing=1). Two notes, both outcome ok with one card each, so the counter fix and the Firestore role work live. processNote's log has no error or warning lines for them (both ears answered). From the note_timing lines (the ears run side by side, so the transcription stage is the slower ear):

  | | Note 1 (handler 16:05:47 SAST) | Note 2 (handler 16:08:25 SAST) |
  |---|---|---|
  | Phone's timing line | Upload 6.5 s, server 15.5 s, total 22.0 s | Upload 11.0 s, server 19.0 s, total 30 s |
  | outcome, coldStart | ok, true (new instance 16:05:42) | ok, false |
  | audioSeconds, audioBytes | 16.5, 792044 | 15.3, 734444 |
  | asrMs (Voice Transcribe) | 7525 | 5546 |
  | audioEarMs (Spark audio) | 4486 | 6626 |
  | extractMs (card step) | 6955 | 12104 |
  | retries (asr, audio ear, extract) | 0, 0, 0 | 0, 0, 0 |
  | cardCount | 1 | 1 |
  | noteMs | 15489 | 19039 |
  | Models | muse-voice-transcribe-1.0, muse-spark-1.2, muse-spark-1.3 | the same |

  - Longest step: note 1, transcription (Voice Transcribe 7.5 s), just ahead of the card step (7.0 s); note 2, the card step (12.1 s, nearly twice the slower ear's 6.6 s). The two stages add up to all but about 1 s and 0.3 s of the server time.
  - Note 1's upload includes the cold start (the instance started about 5.6 s before the handler ran). Note 2's upload, with no cold start, was about 10 s for roughly 1 MB on mobile data. Upload + server = total on both, within 0.1 s.
  - On the phone, the Observations box blocked saving without looking like a question, so a box was ticked just to save; that card holds a false severity flag (Next steps 3).
- Delete ("approved delete", for test accounts 1 and 2 only): test account 2's profile, users/[its UID], deleted at 16:39 SAST with `firebase firestore:delete` on that one path (--force only for the confirmation prompt; no --recursive). Checked as test account 2 afterwards: profile 404 NOT_FOUND, 0 cards. Neither test account had any other document (no noteUsage, no cards). The local test browser folder that held test account 2's sign-in is deleted. Nthabiseng deletes the two sign-in accounts herself in the Firebase console (Authentication → Users): test account 1 (C1 check) and test account 2 (live test), both made-up @example.com addresses. Both were deleted, in Firestore and sign-in, by 29 Oct.
- Functions tests: 77 (new: 7 error-log, 2 admin); lint clean. gcloud's sign-in had expired, so the checks used the Firebase CLI (Known issues).

### Day 3 — Task 11: optional observations, sign-in domain, cache headers, font licences (done Thu 29 Oct; deployed)
- Read-only investigation first:
  - Observations reached unsureFields only through the model's own list: "observations" was one of the fields the model may mark unsure, and the guard kept any listed field. The "required nulls are unsure" guard never added it, and null ticks were already false. In score-001 to score-006 no card (0 of 154) did it, so the 28 Oct phone note was the first. Its count went into "Answer N more to save", and `disabled={… needed > 0}` in ReportScreen blocked the save.
  - First commit: 4815aef, 27 Oct 2026 08:50:31 SAST (14 h 50 min after the kickoff at 18:00 SAST on 26 Oct).
  - Full-history scan of all 19 commits (every ref, commit messages and author addresses; counts only, no values printed): two test-account UIDs and two made-up @example.com test addresses in b133819's HANDOVER.md, which stay in the history; other made-up @example.com addresses in tests and an earlier HANDOVER; the Co-Authored-By trailer's no-reply address in every commit message; GitHub noreply author addresses; the public Firebase web key in 4815aef; one address inside the npm registry's deprecation notice for glob in functions/package-lock.json. No secrets, no personal folder paths. One 8-word phrase is shared by the made-up fixture n04 and the transcript of the mixed-amanzimtoti recording (both fever-and-rash notes).
  - Fonts: no licence or copyright file was in the repo. Fontsource's npm LICENSE files had a garbled Hanken Grotesk copyright line and "Google Inc." for Source Serif 4, whose font files themselves say "© 2014 - 2021 Adobe Systems Incorporated … with Reserved Font Name 'Source'". Fontsource's metadata names Google Fonts (github.com/google/fonts) as the source of both.
- HANDOVER split (5ddc416): the dated record moved here; HANDOVER went from 121,002 to 63,272 bytes; neither file holds an email address or a UID.
- Observations (aeb9073, then fbf4969):
  - processNote's guard drops "observations" from unsureFields and its question; if the model was unsure, every box starts unticked. The model's request (prompt and reply schema) has the same SHA-256 before and after (67731e78…).
  - Card review: "Anything else you noticed?" (Sicker than usual; Not getting better with usual treatment), then "Supplies" (Running short of anything?, with "What is running short?" only while ticked). unusualSymptoms is hidden and always saved as false (draftFromCard and toCardDoc). An unticked supplies note saves as null (firestore.rules refuses "").
  - "Answer N more to save" looks disabled but isn't HTML-disabled: a tap or Enter jumps (behavior "auto", instant) to the first unanswered question in screen order and focuses its first control (the number box for the case count); the save itself refuses while any answer is missing. DESIGN.md's disabled-button line says so.
  - The browser check found three problems, all fixed: a double tap's second tap landed on an age-group option that the jump had moved under the finger (now a 500 ms invisible cover that cancels the press, so focus stays put); a jump less than a second after the card arrived left the question 6 px under the header, because its parts were still rising (now an 8 px scroll margin on card fields); and the new Supplies line pushed the card past the 12 parts that had an arrival delay (now 14). Then (fbf4969) the cover goes up before the jump, so its own timer removes it whatever the scroll or focus does.
- Sign-in through lemoha.co.za (806947b): authDomain "lemoha.co.za"; the emulators don't use it (the fake Google popup still opens the Auth emulator).
- Cache headers (90b5626): no-cache for everything, then `public, max-age=31536000, immutable` for /assets/; test/unit/hosting.test.js. The local Hosting emulator on Windows applies no header rules (glob-slasher turns "/" into "\"); superstatic's own matching, run with forward slashes, gave the intended single value for each of the 18 paths.
- Font licences (f10c199): Google Fonts' OFL.txt for each family in public/fonts/, byte for byte (Nthabiseng chose Google Fonts' copy over Adobe's: the files are subsets, which the OFL treats as Modified Versions, and Adobe's copy reserves "Source").
- Docs: PROJECT_CONTEXT's domain, sign-in and Observations lines (a3cba4c); HANDOVER working rules and the iPhone test account on the delete list (42d526f); rule 3 in CLAUDE.md and AGENTS.md now covers any git reset, rebase, amend or force operation (388c790). A PowerShell 5.1 quoting slip had put the observations files into the sign-in commit; it was fixed with `git reset --soft` (unpushed, nothing lost), which Nthabiseng accepted once and then made a STOP.
- Tests: web 42, Functions 79, rules 89; lint clean (0 findings, 70 files).
- Checked in headless Edge at 360 × 740 (touch, 2x) against the emulators in practice mode, on the built app: 60 of 60.
  - The fake Google sign-in opens the Auth emulator (127.0.0.1:9099), not lemoha.co.za, and signs in.
  - Card review: the new labels, none of the old ones, 3 unticked boxes, no supplies note box until ticked (and gone again when unticked), Observations never a question block.
  - A touch tap, the Enter key and a double tap on "Answer 2 more to save": focus moves to the first unanswered question, which lands 8 px below the header; the scroll doesn't move after the tap; nothing is saved; no answer changes. The double tap's second tap lands on the cover, which is gone after half a second.
  - The cover: aria-hidden, no tabindex or role, ignored in Edge's accessibility tree; while it's up, Tab still moves focus and Space still answers; with both scroll forms and the focus forced to throw, it still goes up and removes itself.
  - Then the area dropdown after one answer; card 2's question after card 1 is answered; the case count's number box.
  - Text 14 px or more, only Hanken Grotesk and Source Serif 4, no sideways scrolling, tick-box rows 50–62 px. The saved card has exactly 17 fields, every observation false and suppliesNote null. No console errors (other than the forced test failure).
- Scoring: score-007, the same as score-006 (Test results).
- Deployed 29 Oct, each with its own STOP:
  - F1: `firebase deploy --only functions:processNote`, after `git status` was clean and `git diff --stat 919bb7e HEAD -- functions/` showed only cardSchema.js and its test. The CLI said "Deploy complete!", then "An unexpected error has occurred" (exit code 2). Live: processNote 1024 MB, 300 s, concurrency 8, min unset (0), max 5, africa-south1, the same service account and secret version, ACTIVE; code hash 3f41ad3d… → 851f9cbd…; a signed-out call gets 401 UNAUTHENTICATED. checkMetaConnection unchanged.
  - H1: `npm run build` from 388c790, then `firebase deploy --only hosting` (16 files). Live: https://lemoha.co.za/__/auth/handler 200; on both domains /, /report, an /assets/ JS file, an /assets/ font, the manifest, an icon and /fonts/source-serif-4/OFL.txt each carry exactly one Cache-Control value (no-cache, or the year-long immutable value on the two /assets/ files); all 16 live files are identical to dist/.

### Day 3 — Task 12: the simulation (done Thu 29 Oct; nothing deployed)
- Read-only investigation first (from f05ffb0, clean and level with origin/main):
  - The lists the simulation imports: areas, town and works in functions/data/places.json; card lists in src/config/cardOptions.js; roles and facility types in src/config/profileOptions.js.
  - The saved card is built only by toCardDoc and checked only by firestore.rules. Its source must be "voice" and createdAt the write time, so a simulated card with source "simulation" can never be saved.
  - "What we heard" is the card step's transcriptClean (the vetkoek fix, HANDOVER Next steps 1).
  - A signed-out visitor sees SignInScreen at every address (src/App.jsx:36).
  - In a throwaway Vite 8.3.5 build outside the repo, a module reached only through import() got its own chunk, and none of it was in the main file.
  - Node can't load src/lib/places.js (its JSON import has no `with { type: "json" }`).
- Town file (1bf7638): functions/data/places.json grew populations, neighbours, grid shapes, the two water works, four clinics, Kgwedi Heights Hospital, two primary schools and two spaza shops. Extraction prompt, reply schema and keywords: sha256 cddb48328a27f866 before and after. Main web file 878,481 → 880,851 bytes (269.57 → 270.27 kB compressed). A follow-up commit (625ffd0) took the product name out of the town file's note (rule 8).
- Simulation (8b0d9a5), in src/sim/:
  - seeded random streams (+ - * / only) and SAST replay days
  - background rates and the two scenarios in scenarios.js
  - background, seeded cluster and red herring, with 16 made-up reporters; cards built through toCardDoc with source "simulation"
  - createRun and cardsUpTo; ground truth for the scorecard only
- Day 0 is Mon 1 Feb 2027, with 84 days of history.
- Seed 1: 1,115 cards under "water", 1,035 under "none" (80 extra: 77 seeded-cluster cards and 3 red herring), 337 and 257 in the replay window. For seeds 1 to 10, works A's under-5 diarrhoea or vomiting cases in days 13 to 20 under "water", against its busiest 8 days in history:

  | Seed | Days 13–20 | Busiest 8 days |
  |---|---|---|
  | 1 | 95 | 20 |
  | 2 | 95 | 18 |
  | 3 | 104 | 34 |
  | 4 | 102 | 21 |
  | 5 | 114 | 26 |
  | 6 | 104 | 27 |
  | 7 | 117 | 14 |
  | 8 | 91 | 24 |
  | 9 | 98 | 20 |
  | 10 | 63 | 18 |

  Works B, and both zones under "none", stayed at or below their busiest 8 days (seed 7's works B equalled it: 14 and 14).
- Four first-draft phrases were reworded because they were exact lines (or parts of lines) of the test recordings' scripts, among them "the tap water smelled funny". The Sesotho phrases were checked by Nthabiseng.
- The guards were broken on purpose once, then restored: a clock call in the simulation, a static import of the engine in src/App.jsx, and the engine importing the ground truth each failed their own test with a plain message.
- Rules test (a4bcb80): every card of seed 1's water run (1,115) passes the card rules once source and createdAt are a live save's; source "simulation" alone, a createdAt in milliseconds alone, and an unchanged card are each refused. Setup: a profile per made-up reporter, with the rules off (the create rule checks it); the rules check nothing else. About 11 s, so the whole run is used, not a sample.
- scripts/simulate.mjs (c27d0a6).
- Tests: web 72, Functions 79, rules 93; lint clean (0 findings).

## Test results

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

### Stage 1 after Task 11's observations guard (29 Oct)
score-007, run by Nthabiseng the same way as score-006 (`--stage text --repeat 3 --effort low`, 30 calls, about $0.24): 342 of 342 checks (100%), 0 confident wrong, 1.60 questions per card (expected 1.60), 0 extra questions, no failed calls; extraction 5.2 s on average (1.5–9.6 s). No card marked observations unsure, as in score-006. The model's request didn't change, so the run measures run-to-run variation; none showed.

## Replaced decisions
Decisions that a later one replaced, with what replaced them.
- 27 Oct — Hints off by default. Language bias is dropped. Keywords get re-tested with place-name notes. Why: in Task 2, hints increased repeated words (a doubled word in 2 of 7 calls without hints, 5 of 7 with keywords, 7 of 7 with keywords plus language).
  - Replaced the same day: keywords are back on for the Voice Transcribe ear, using the place list; language bias stays off (HANDOVER.md, Decisions and why).
- 27 Oct — The audio-ear model (muse-spark-1.2 or muse-spark-1.3, never "-contributor") is chosen by Task 4's Stage 2 scores, and kept as a single setting (SPARK_AUDIO_MODEL in functions/constants.js).
  - Replaced on 27 Oct: muse-spark-1.2 for now; the final choice comes after the 10 recordings are scored.
- 28 Oct — Domain lemoha.co.za bought by Nthabiseng. Connecting it to Hosting, and maybe moving the sign-in authDomain to it, comes after the Task 10 deploy, as its own STOP.
  - Replaced on 28 Oct: the domain was already connected to Hosting when Task 10's Hosting deploy ran; Task 11 moves the sign-in authDomain to it.

## Change log (newest first)
- 2026-10-29 — Task 12: the simulation.
  - The town file (functions/data/places.json grown; the extraction prompt is unchanged).
  - A seeded background, the seeded cluster ("water"), a red herring and a replay engine (src/sim/). Cards are generated on the fly and never stored; their source is "simulation", which the rules refuse.
  - scripts/simulate.mjs.
  - Decisions D1 to D4 recorded, the Day 4 notes, and the judging weights in PROJECT_CONTEXT.
  - Tests: web 72, Functions 79, rules 93. Nothing deployed.
- 2026-10-29 — Task 11: observations optional and never asked (functions guard and card review; reworded patient flags, a separate Supplies line, unusualSymptoms always false); "Answer N more to save" jumps to the first unanswered question, with the save gated in code and a half-second tap cover; sign-in through lemoha.co.za; Hosting cache headers; font licences from Google Fonts; HANDOVER split into the current state and docs/HISTORY.md, with no emails or UIDs; rule 3 now covers git reset, rebase, amend and force. score-007 the same as score-006. Tests: web 42, Functions 79, rules 89; 60 of 60 browser checks. processNote and Hosting deployed (F1, H1), live checks passed.
- 2026-10-28 — Task 10 Part C: Functions, the Firestore rules and Hosting deployed (each its own STOP) and live at https://lemoha.co.za. Live notes found two bugs the emulator couldn't show, both fixed and redeployed: error lines lost their reason (93a5082: errorName, errorCode, reason with the UID and our document paths redacted, where) and the daily counter never made the default Admin app (919bb7e: functions/lib/admin.js). Nthabiseng added Cloud Datastore User to the compute service account. Headless Edge on the computer's Wi-Fi couldn't always reach the functions server, so the live test moved to her phone: two notes on mobile data worked (22 and 30 s in all; note_timing in the build log). Test account 2's profile deleted; the review-screen fix, speed plan and next small task recorded. Functions tests 77.
- 2026-10-28 — Task 10, part 1: saved cards no longer hold the transcript (17 fields; rules and tests updated, a card with transcriptClean is denied); the transcript on card review is read-only text in the clinician's serif with the hanging quote; processNote writes one note_timing log line per call (numbers, model IDs and an outcome code only), streams "received" first and returns noteMs; the ?timing=1 line on the Report screen; processNote at 1 GiB, concurrency 8, 300 s, max 5 instances; the phone checklist and the standard pre-push scan in HANDOVER. Tests: web 33, Functions 68, rules 89; 26 of 26 browser checks. Nothing deployed.
- 2026-10-28 — Task 9 follow-up: the wordmark's "o" shrunk from a 0.72em to a 0.61em box, with its drop from 0.083em to 0.0625em, so the ring's top and bottom are within 1 px of "e" and "a" at 4x at 24, 30, 40 and 50 px, and its width within 2–5% of a real "o". CSS only. Sign-in and the header checked at 360 × 740 and 125% text.
- 2026-10-28 — Task 9: renamed to Lemoha (working name Fola until 28 Oct); the ring logo: Wordmark component (header, sign-in, set-up, loading and error screens), brand SVGs, favicon, app icons and the web app manifest; DESIGN.md Logo section, "Long option labels" and the voice-note-row case; the symptom-group dropdown shows its label in full; brand test and a tighter colour allow-list (31 web unit tests). Checked in Edge at 360 and 390 px and at 125% text (475 of 475). lemoha.co.za recorded. Nothing deployed; deploy is now Task 10.
- 2026-10-28 — Task 8: the Shweshwe design system. docs/DESIGN.md (with six approved amendments), design tokens in src/styles/tokens.css, self-hosted Hanken Grotesk and Source Serif 4 (Fontsource, latin and latin-ext, pinned), every screen restyled with no change to behaviour, data or rules; voice note row with a real-loudness waveform; privacy lines; three copy changes; rule 13 in CLAUDE.md and AGENTS.md; design-token and contrast tests (27 web unit tests). Checked in Edge at 360 and 390 px, with reduced motion and at 125% text. Nothing deployed; deploy moves to Task 9.
- 2026-10-27 — Docs: the repo is private until Day 8 (Tue 3 Nov), then made public, and is treated as public now; Day 8 step added to make it public and check it from a logged-out browser; Tasks 6 and 7 marked done.
- 2026-10-27 — Task 7: the Report screen end to end (hold-or-tap recording, 24 kHz WAV in the browser, playback, streamed progress stages, the card screen with unsure fields empty and highlighted, fixed advice/NMC/single-source/not-a-report notices, saving to cards/{cardId}); cards rules with 60 emulator tests and a break-the-rule check; processNote's daily limit (40 per SAST day), maxInstances 5 and emulator-only practice mode with 5 made-up results; official hotline numbers checked. Nothing deployed.
- 2026-10-27 — Task 6: sign-in (Google, email and password), a one-time profile at users/{uid}, the mobile layout with all five routes (placeholders except Profile), the emulators under demo-fola, src/lib/api.js, Firestore rules for users/{uid} with 28 emulator tests (not deployed), and a sign-in check in checkMetaConnection (not deployed). The Vite starter files are deleted; Java 21 is installed.
- 2026-10-27 — Extraction prompt: "The day patients came in is not the onset."; Stage 1 now 100% with no confident-wrong values.
- 2026-10-27 — Task 5: corrected three expected answers, tightened the extraction prompt, added the confident-wrong count and --rescore, added AGENTS.md (CLAUDE.md in step), recorded the Startup track, effort and audio-ear decisions; Stage 1 re-scored and re-run.
