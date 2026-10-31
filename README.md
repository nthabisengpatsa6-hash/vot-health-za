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
