# Lemoha

Lemoha (Sesotho for "to notice"; codename vot-health-za; working name Fola until 28 Oct 2026) is a health project for South Africa, being built for the Meta Global AI Developer Hackathon. It is a React + Vite web app on Firebase (Hosting, Firestore and Cloud Functions in africa-south1) that uses the Meta Model API.

Built during the Meta Global AI Developer Hackathon. Building started 26 October 2026; all code in this repository was written during the hackathon.

## Data

No patient data is ever stored. The demo uses made-up data only.

## Models and notification drafting

Voice notes use Muse Voice Transcribe and Muse Spark 1.2 on the Meta Model API, followed by Muse Spark 1.3 for case cards. Possible-source ranking also uses hosted Muse Spark 1.3.

Task 19 adds Muse Spark Open (`meta-models/muse-spark-open-1026`) through Baseten for the signed-in replay's drafted notification. This implementation is local until the separately approved trial, secret setup and deploys finish. The public `/demo` runs without Firebase or inference calls and shows the standard draft. Both replays open Signal detail from the area's Open signal button. Headline counts are the frozen engine's own winning-window numbers; the chart shows 14 days. Every notification is editable, and Copy includes a fixed NMC reminder. Mark as sent is explicitly a simulation: nothing is saved or sent.

The drafting callable accepts replay selectors and optional source IDs/confidence words only, reconstructs seed 1 on the server, and sends structured counts and fixed source evidence to Baseten. No audio, card free text, reporter fields or real cards reach it. It allows 20 attempts/account and 200/app per SAST day; no configured key means the standard draft without a call. The output is locally validated, with one 20-second attempt and a 3,000-token completion cap. Existing live-note processing retains 40/account and adds 200/app per SAST day.

The maintainer runs `npm.cmd run draft:trial` in an interactive PowerShell terminal. It asks for a key in a hidden prompt, shows the plan/estimated cost and asks y/n. It makes at most three calls; seed 1 currently supplies two cases (first Alert on day 17 and the event on day 19), with no Signal-only day. Records are saved under `docs/provenance/open-weights/`; recorded attempts are not automatically repeated. Never paste a key into chat or a file. Clear clipboard history with Win+V afterwards. Judges' complete emulator setup instructions remain Monday's separate task; the standard draft requires no Baseten key.

## Fonts

Hanken Grotesk and Source Serif 4, both under the SIL Open Font License 1.1, self-hosted with Fontsource (built from the Google Fonts releases). The licences, with each font's copyright line, are in public/fonts/hanken-grotesk/OFL.txt and public/fonts/source-serif-4/OFL.txt, and are served with the app.

## Run it locally

1. Install Node 22, Java 21 or newer, and Git. Windows PowerShell users should type `npm.cmd` wherever these steps say `npm` if `npm` is blocked by the execution policy.
2. Copy this repository's HTTPS clone URL from GitHub's Code button. Run `git clone <repository-url> vot-health-za`, replacing `<repository-url>` with that URL, then `cd vot-health-za`.
3. Install both dependency sets: `npm ci`, then `npm --prefix functions ci`. The Firebase CLI is pinned locally; no global CLI or Firebase login is needed.
4. Copy `functions/.secret.local.example` to `functions/.secret.local` (PowerShell: `Copy-Item functions/.secret.local.example functions/.secret.local`; macOS/Linux: `cp functions/.secret.local.example functions/.secret.local`). Skip the copy if the destination already exists. Add your own Meta Model API key after `META_API_KEY=`. Baseten is optional: leave `BASETEN_API_KEY=` empty for the standard notification draft. This local secret file is ignored by Git and must never be committed. With no Meta key, cards are clearly labelled practice results and do not come from your recording. With an empty or missing key, a warning that a secret could not be found in Secret Manager is expected under the demo project.
5. Run `npm run judge` (Windows PowerShell: `npm.cmd run judge`). It checks prerequisites, creates the empty secret file if missing without overwriting an existing one, and starts Auth, Firestore, Functions, and the web app under `demo-fola`. It refuses credential/project environment variables that could select real Google resources. This setup supports only the same computer; no phone or LAN access. Ctrl+C stops everything; local accounts and data are temporary.
6. Open `http://127.0.0.1:5173`. Create a local account using a made-up email address in the Auth emulator; no real email is sent. Set your role, facility type, and area.
7. Allow microphone access, then record a made-up note, send it, and review the card. Model calls use your own key and may cost a few cents. The terminal running the launcher shows the content-free `note_timing` line after each note; a real successful note names its three Meta models there. Open the signed-in Replay and a signal to try source ranking and notification drafting. Without Baseten, the draft says “Standard draft.”
