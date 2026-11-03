# Lemoha

**Notice sooner.**

Lemoha (Sesotho for "to notice"): clinicians' quick voice notes become early signals of illness clusters, so environmental health practitioners know where to look sooner.

Built for the Meta Global AI Developer Hackathon (26 October to 4 November 2026), Startup track, by Nthabiseng Patsa, Vault of Time (Pty) Ltd, South Africa. All code in this repository was written during the hackathon; the first commit is 4815aef, 27 October 2026 at 08:50 SAST. Existing before: Meta's Muse models, Firebase, open-source libraries and two open-licensed fonts ([Fonts](#fonts)). The working name was Fola until 28 October 2026, so early commits and the local emulator project (demo-fola) still say Fola; the repository codename is vot-health-za.

- Public replay, no sign-in needed: https://lemoha.co.za/demo
- Held-out scorecard: https://lemoha.co.za/demo/scorecard
- Live app: https://lemoha.co.za (for health professionals; sign-in needed; voice notes use this project's Meta credits, capped at 200 a day across the app)
- 3-minute video: https://youtu.be/_XWh7WJulVw
- Run it on your own computer with your own Meta key: [Run it locally](#run-it-locally)

> Simulation and made-up data only. Lemoha raises signals; it does not diagnose, give medical advice or replace notifiable medical condition (NMC) reporting.

## How each Meta model is used

Four Meta models do five jobs. Plain statistics, not a model, decide Watch, Signal and Alert: the models never do the counting.

| Model | Model ID | Job | Called from | What's hard about it |
| --- | --- | --- | --- | --- |
| Muse Voice Transcribe | `muse-voice-transcribe-1.0` | First ear: transcribes the voice note | `processNote` | Clinicians mix Sesotho and English mid-sentence; 53 keywords (the town's 8 place names and 45 local words), kept after scoring real recordings |
| Muse Spark 1.2 (audio, minimal effort) | `muse-spark-1.2` | Second ear: hears the same audio in parallel | `processNote` | Catches what the transcript mishears |
| Muse Spark 1.3 (low effort) | `muse-spark-1.3` | Builds the case card | `processNote` | Turns two imperfect hearings into a card with no patient names; restores local words heard by sound (in testing, "fat cook" became vetkoek in every run); asks the clinician when unsure |
| Muse Spark 1.3 (low effort) | `muse-spark-1.3` | Ranks possible common sources | `rankSources` | Ranks only from the evidence the statistics found; output guards; tested on held-out simulation seeds |
| Muse Spark Open on Baseten (low effort) | `meta-models/muse-spark-open-1026` | Drafts the notification | `draftNotification` | A person edits and sends it; strict local validator; a safe standard draft if the model is slow or unavailable |

On 10 recordings of made-up scenarios, 3 runs each, the shipped card setup made 1 confidently wrong field, against 4 for the setup live before it.

## Run it locally

1. Install Node 22 or newer, Java 21 or newer, and Git. Windows PowerShell users should type `npm.cmd` wherever these steps say `npm` if `npm` is blocked by the execution policy.
2. Copy this repository's HTTPS clone URL from GitHub's Code button. Run `git clone <repository-url> vot-health-za`, replacing `<repository-url>` with that URL, then `cd vot-health-za`.
3. Install both dependency sets: `npm ci`, then `npm --prefix functions ci`. The Firebase CLI is pinned locally; no global CLI or Firebase login is needed.
4. Copy `functions/.secret.local.example` to `functions/.secret.local` (PowerShell: `Copy-Item functions/.secret.local.example functions/.secret.local`; macOS/Linux: `cp functions/.secret.local.example functions/.secret.local`). Skip the copy if the destination already exists. Add your own Meta Model API key after `META_API_KEY=`. Baseten is optional: leave `BASETEN_API_KEY=` empty for the standard notification draft. This local secret file is ignored by Git and must never be committed. With no Meta key, cards are clearly labelled practice results and do not come from your recording. With an empty or missing key, a warning that a secret could not be found in Secret Manager is expected under the demo project.
5. Run `npm run judge` (Windows PowerShell: `npm.cmd run judge`). It checks prerequisites, creates the empty secret file if missing without overwriting an existing one, and starts Auth, Firestore, Functions, and the web app under `demo-fola`. It refuses credential/project environment variables that could select real Google resources. This setup supports only the same computer; no phone or LAN access. Ctrl+C stops everything; local accounts and data are temporary.
6. Open `http://127.0.0.1:5173`. Create a local account using a made-up email address in the Auth emulator; no real email is sent. Set your role, facility type, and area.
7. Allow microphone access, then record a made-up note, send it, and review the card. Model calls use your own key and may cost a few cents. The terminal running the launcher shows the content-free `note_timing` line after each note; a real successful note names its three Meta models there. Open the signed-in Replay and a signal to try source ranking and notification drafting. Without Baseten, the draft says “Standard draft.”

If the page says 'Still connecting' after a restart, your browser still has a sign-in from an earlier run. Open `http://127.0.0.1:5173` in a private window, or clear the site data for `127.0.0.1:5173`, and sign up again.

## How it was tested

**The statistics and ranking on unseen data.** The statistics and the ranking prompt were tuned on ten simulation seeds. Ten more seeds stayed locked until the tuned files were frozen and their hashes recorded, then ran once. Each seed has a run with a planted cluster at water works A and a quiet run with none.

Tested on 10 held-out simulation runs: every run reached Alert (median day 16.5). Muse Spark ranked works A first at the first Alert in 7 of 10, and in all 10 on day 19. No false Signals or Alerts; 7 false Watch signal-days across 20 runs.

| Measure | Tuning (10 seeds) | Held-out (10 seeds) |
| --- | ---: | ---: |
| First Watch, median day (range) | 15 (14–18) | 15 (15–16) |
| First Signal, median day (range) | 16 (15–18) | 16.5 (15–18) |
| First Alert, median day (range) | 16 (15–18) | 16.5 (15–18) |
| False Watch signal-days (planted / quiet / total) | 10 / 10 / 20 | 3 / 4 / 7 |
| False Signals / Alerts | 0 / 0 | 0 / 0 |
| Works A ranked first at the first Alert | 7 of 10 | 7 of 10 |

A signal-day is one signal on one day; "on day 19" means the ranking in force that day. In the 3 held-out runs where works A was not first at the first Alert (two put the shop first, one the school), Muse Spark gave the leader "medium" confidence and works A "low". Across all 19 held-out rankings, all 8 "high" top picks named works A.

**The voice pipeline on real speech.** Ten people each read one made-up scenario aloud. Each recording ran 3 times, and every card field was scored as correct, unnecessary question, question that caught an error, missed, or confidently wrong. The shipped setup made 1 confidently wrong field in 30 runs.

**Code.** 581 automated tests (348 web app, 139 Cloud Functions, 94 Firestore security rules), plus lint, a build, and two privacy scans: one for transcript text in tracked files, one for keys and private fields in the saved trial records. Run them with `npm test`, `npm --prefix functions test` and `npm run test:rules` (needs Java).

## Checking which models ran

**Log lines.** Every note, ranking and draft writes one log line with the models used and the time taken, and no content: no audio, transcript or card text.

- `note_timing` (processNote): `asrModel`, `audioEarModel` and `extractModel`, with the time for each step (`asrMs`, `audioEarMs`, `extractMs`) and in total (`noteMs`).
- `rank_timing` (rankSources): `model`, `effort`, `promptHash`, `inputTokens`, `outputTokens`, `ms`, `attempts` and `outcome`.
- `draft_timing` (draftNotification): `model`, `provider`, `promptHash`, whether the model's draft or the standard draft was used (`outcome`: `model`, or `fallback:` with a reason), `ms` and token counts.

On 31 October 2026 the live logs showed content-free `note_timing` and `draft_timing` lines naming their models, with the draft `promptHash` below. The video shows a `note_timing` and a `draft_timing` entry next to the feature that produced them. Running locally, the launcher terminal shows the `note_timing` line after each note.

**Fingerprints of what was tested.** The shipped prompts and statistics are hashed, so you can check that the code you run is the code we scored:

| What | Hash |
| --- | --- |
| Case card extraction (prompt A2, keywords, models and efforts) | `d6bf8dd00961399c` |
| Signal thresholds and ranking settings, frozen 30 October | `abc36af17d67a689` |
| Ranking prompt | `01622c7f95af2326` |
| Draft prompt (`promptHash`) | `8aaa44150ff6fabe516e651de33ead9c56f4bbb598c858413671ef1149e0ed16` |

The Functions tests fail if the extraction or signal hash changes, and every `rank_timing` and `draft_timing` line carries its prompt hash.

**Trial records.** Content-free scorecards from the voice-note scoring, including the Muse Spark Open card and ranking comparison, are in `docs/provenance/scoring/`. The held-out scorecard and its ranking records are in `docs/provenance/held-out/` and `docs/provenance/rankings/held-out/`. Records of the five Muse Spark Open draft trials (r1 to r5) are in `docs/provenance/open-weights/`; its README explains each.

## What didn't work, and what isn't built

- **Muse Spark 1.3 as the second ear.** Rejected after scoring: with the same prompt, keywords and minimal effort, it asked far more unnecessary questions (35, against 12 for Muse Spark 1.2), varied most between runs and was 2.5 seconds slower. The audio ear stays on Muse Spark 1.2 at minimal effort.
- **Muse Spark Open for the case card.** On 8 authored test inputs it had no JSON or schema failures and every scored card field right, but it split 3 inputs into extra cards. On 6 simulated rankings it matched the hosted model's top source in 3. So it drafts notifications, where a person edits the result, and the card and ranking stay on Muse Spark 1.3.
- **One confidently wrong field remains.** In 1 of 3 runs on one recording, a case count spoken in Sesotho came out wrong.
- **Speed.** In local scoring, a note took a median of about 18 seconds from recording to card, measured before the final card-prompt change (its card step ran about 2 seconds slower in a later run). One deployed note from a cold start took about 25 seconds. Faster cards are still to do.
- **Signals on real reports.** Signals are computed in the replay. In the signed-in app, real reports are saved but not yet checked for signals, and the Near me screen says so.
- **No separate name check in free text.** Muse Spark strips names and the clinician checks every card before saving; there is no extra code check yet for names typed or spoken into a card's free-text fields.

## Rules Lemoha keeps

1. **No patient identifiers.** Clinicians are asked to leave names out; any name spoken is stripped, and the clinician checks every card before saving. The recording is never stored and the transcript is not saved. Cards hold counts and age groups only.
2. **Made-up data only** during the hackathon. The demo town, Kganya, is fictional.
3. **Signals, never outbreaks.** Three levels: Watch, Signal, Alert.
4. **Evidence for every signal,** down to the cards behind it.
5. **Unsure means ask.** If the model is unsure of a field, the card asks the clinician.
6. **No medical advice.** When a note asks about treatment, fixed text (never model text) points to the NICD hotline for health professionals (0800 212 552) and the Poisons Information Centre helpline (0861 555 777).
7. **A person sends every notification.** Lemoha drafts; it never sends anything itself.
8. **It does not replace NMC reporting.** Notifiable medical conditions are still reported through the official system.
9. **Non-political.** No officials named, no blame.

## Safeguards

- **Keys stay on the server.** The Meta and Baseten keys are Firebase secrets used only inside Cloud Functions; the browser never sees them. This repository contains no secret keys; the Firebase web config in `src/lib/firebase.js` is public by design (it names the project, and security rules control access).
- **Daily limits** (per South African day): 40 notes per account and 200 across the app, counted before any Meta call; 20 rankings and 20 drafts per account, and 200 of each across the app.
- **Content-free logs.** Timing logs record models, outcomes and timings only; error logs record error codes with user IDs redacted. Neither records audio, transcripts or card content.
- **Checked outputs.** Code checks every card, ranking and draft before it is shown: off-list values in a card's required fields, and unknown areas, become questions; ranking output passes guards; and drafts pass a strict validator with a fixed footer.
- **Least data to the open model.** Muse Spark Open receives only a simulated signal rebuilt on the server: its level, areas, counts and fixed-wording source evidence. It never receives audio, card free text or reporter fields.
- **Fallbacks.** If Muse Spark Open is slow (20-second timeout) or unavailable, a standard draft appears instead.
- **Tested security rules.** Firestore rules are covered by automated tests run against the local emulator.

## Why this matters

Between 7 and 18 October 2026, 408 cases of gastrointestinal illness were reported in Bronkhorstspruit, Zithobeni, Dark City, Rethabiseng and Sokhulumi in Tshwane, most in children under four. New cases peaked at 72 on 13 October, and patients were treated at the hospital and local clinics. Officials linked the illness to water from the Bronkhorstspruit Water Treatment Works, whose water was not chlorinated from 24 September to 14 October. By 26 October the count had risen to 833. No deaths were reported.

The pattern is the one Lemoha looks for: one source, several neighbouring areas, and cases arriving at more than one place of care. Lemoha's demo town is fictional and its illness cluster is simulated; the timing is modelled on these events, not a claim about them.

Sources: [joint government statement, 19 Oct 2026](https://www.gov.za/news/media-statements/joint-media-statement-ministries-health-water-and-sanitation-gauteng); [BusinessDay, 20 Oct 2026](https://www.businessday.co.za/news/2026-10-20-hundreds-of-children-fall-ill-after-tshwane-fails-to-chlorinate-water/); [EWN, 21 Oct 2026](https://www.ewn.co.za/bronkhorstspruit-residents-warned-not-to-consume-tap-water-as-tshwane-races-to-restore-supply/); [SAnews, 26 Oct 2026](https://www.sanews.gov.za/south-africa/gastrointestinal-illness-cases-rise-833).

## Licence

Copyright (C) 2026 Vault of Time (Pty) Ltd. Licensed under the GNU Affero General Public License, version 3 only (AGPL-3.0-only); see [LICENSE](LICENSE). The fonts keep their own licences; see [Fonts](#fonts).

## Fonts

Hanken Grotesk and Source Serif 4, both under the SIL Open Font License 1.1, self-hosted with Fontsource (built from the Google Fonts releases). The licences, with each font's copyright line, are in public/fonts/hanken-grotesk/OFL.txt and public/fonts/source-serif-4/OFL.txt, and are served with the app.
