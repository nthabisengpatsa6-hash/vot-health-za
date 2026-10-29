# Project context: Lemoha (codename vot-health-za)

> The product is Lemoha, Sesotho for "to notice" (working name Fola until 28 Oct 2026). Domain: lemoha.co.za, bought and connected to Firebase Hosting on 28 Oct 2026; www.lemoha.co.za redirects (301) to lemoha.co.za.
> This file changes only when a decision changes. Day-to-day state lives in HANDOVER.md.
> This repo is private until Day 8 (Tue 3 Nov), then made public. Treat it as public now: the full history becomes visible. Never put keys, passwords, tokens or personal data here.
> Last decision change: 29 Oct 2026.

## 1. The hackathon

**Event.** Meta Global AI Developer Hackathon, run with Cerebral Valley. Virtual, $1M in prizes. Theme: **Build for Your World**.

**Who.** Built solo by Nthabiseng Patsa for Vault of Time (Pty) Ltd, a South African product studio. Track: **Startup**, confirmed 27 Oct: organisers said solo founders qualify if they're incorporated in their home country, and Vault of Time (Pty) Ltd is incorporated in South Africa.

**Time zone.** Everything in this repo uses SAST (UTC+2). The organisers use US Eastern Time. US clocks go back on Sun 1 Nov, so Eastern Time is 6 hours behind SAST until 31 Oct and 7 hours behind from 1 Nov.

**Key dates (SAST)**

| When | What |
|---|---|
| Mon 26 Oct | Kickoff. Building started after kickoff; only work from then on counts. |
| Tue 27 Oct 18:00 | Agents 101 |
| Wed 28 Oct 18:00 | Agents 102 |
| Fri 30 Oct 18:00 | Fireworks session on Muse open models |
| Weekdays | Text office hours in #office-hours: 16:00–17:00 until 30 Oct; 17:00–18:00 from 2 Nov |
| Tue 3 Nov | Last full day for organiser help |
| **Wed 4 Nov, evening** | **We submit.** Hard deadline: Wed 4 Nov 9:00 PM ET = **Thu 5 Nov 04:00 SAST**. Late submissions are not considered. |
| 5–8 Nov | Judging |
| Mon 9 Nov 19:00 | Closing ceremony: top 5 per track, live finals |
| 16 Nov | Community vote winner announced |

**Rules that shape the code**
- Private until Day 8 (Tue 3 Nov), then made public. Treat it as public now: the full history becomes visible. Teams of up to 4; this is a solo build.
- Must use Meta's models.
- New work only. The demo may show only what was built during the hackathon, with new work clearly identified, or the project is disqualified. Don't copy code from any other project, including Nthabiseng's earlier products.
- No code, data or assets we don't have the rights to. Check a dependency's licence before adding it (MIT, Apache-2.0, BSD and ISC are fine; OFL-1.1, for fonts only).
- Coding tools such as Claude Code are allowed.

**Banned project types ("anti-projects").** AI that gives medical advice; basic RAG; simple image analysers; simple AI education chatbots; job screeners; nutrition coaches; personality analysers; sports coaches; anything political or involving war. Lemoha must never drift toward medical advice or politics; hard rules 6 and 9 exist for this.

**Submission** (one representative, on the Cerebral Valley platform): the public repo, a 3-minute demo video, the live product, and everyone who worked on it listed. The video, the code and the live product are all judged.

**Judging**
1. Pass/fail: fits the theme and uses Meta's models.
2. Four weighted criteria: **Impact** 30%; **Use of Meta AI tooling** 25% (creative, beyond a basic integration); **Demo** 25%; **Technical depth and execution** 20%. Source: the official participant guide, confirmed 29 Oct 2026. Judges score the video, the code and the live product.
3. The top 5 per track are judged live.

**Prizes.** Startup track: $250K / $150K / $75K / $50K / $25K for 1st to 5th. Bonus prizes we're aiming at: Best Build on Meta Open Weight Models ($10K; Muse Glimmer or Muse Spark Open on our own hardware or partner inference), Best Agentic Use-Case ($5K), Most Viral ($20K; X engagement until the end of 8 Nov), Community Vote ($10K). Not targeted: Best Creative Build ($5K; Muse Image or Muse Wonder). Whether bonus prizes stack with track prizes is unknown.

**Meta models available.** Muse Spark series, Muse Wonder, Muse Image, Muse Voice Transcribe and SAM 3.1 through the Meta Model API; open weights Muse Glimmer and Muse Spark Open; the Muse Code coding agent.

## 2. What we're building and why

**One line.** Lemoha turns clinicians' quick voice notes into an early-warning map of illness clusters, so environmental health practitioners can find a common source (like a water treatment works) days sooner.

**The problem.** The signs of an illness cluster usually exist days before anyone joins them up. Clinicians notice unusual patients, but those observations stay in separate clinics, notebooks and WhatsApp groups.
- Bronkhorstspruit, 2026: a treatment works supplied unchlorinated water from 24 September to 14 October. Between 7 and 18 October, 408 cases of stomach illness were recorded across five areas, mostly in children under four. Residents learnt the cause about a week or more after cases began.
- Child poisonings, 2024: six children died in Naledi, Soweto, in October 2024, and toxicologists confirmed organophosphate poisoning. By September 2024, Gauteng Health had logged 207 child food-poisoning incidents and 10 deaths since February.

What was missing was not information but connection: something that sees many clinicians' reports together and asks what they share.

**Why Lemoha is different**
- The gap is officially named. A 2024 Department of Health presentation said many foodborne outbreaks were reported by the media but poorly recorded, and that event-based surveillance still needs a reporting platform.
- Official systems start later. The NMC (Notifiable Medical Conditions) system starts at diagnosis and needs registration and authorisation. The early "something's off" moment lives in WhatsApp, where about 90% of surveyed health workers already discuss work.
- The approach is proven. In Mpumalanga, hospital nurses faxing a weekly syndrome form helped contain cholera. Lemoha is that idea with voice notes instead of a fax.
- It travels. Africa CDC's event-based surveillance framework is spreading; Botswana, Namibia and Zimbabwe launched national guidelines in 2025.
- Lemoha's edge: voice notes the way clinicians already talk, mixed languages included; no names, so no facility has to approve it before a nurse starts; likely sources explained, not just cases counted; a human sends every notification.

**Users.** All health professionals; patients never use Lemoha.
- Clinic nurses, doctors, physios and pharmacists: send a voice note, confirm the case card, tap "Seeing this too". They get back "what's going around near me".
- Environmental health practitioners (HPCSA-registered): review signals, check the suggested sources, decide what to investigate. They get possible common sources, ranked, with the evidence behind each.
- District or municipal health offices: receive notifications a human chose to send, as a short, evidence-backed summary.

Sign-in is email or Google; role and facility type are set once.

## 3. Hard rules

These hold in every build, demo, doc and prompt.
1. **No patient identifiers, ever.** Names spoken in a voice note are stripped before anything is saved. Audio is never stored and is dropped once transcribed. Cards hold counts and age groups only.
2. **Made-up data only** during the hackathon. Content sent on Meta's free API credits may be used for product improvement. People who record test voice notes are told their audio goes to Meta's API. Test audio is never committed (test-audio/ is gitignored).
3. **Signals, never outbreaks.** Three levels: Watch, Signal, Alert. The word "outbreak" never appears in the UI. In code, the event planted in the simulation is called the "seeded cluster".
4. **Every signal shows its evidence,** and every fact links back to the card it came from.
5. **Unsure means ask.** If the AI isn't sure about a field, the card asks the clinician instead of guessing.
6. **No medical advice.** Lemoha never suggests a diagnosis or treatment. Treatment questions point to official hotlines (NICD, Poisons Information Centre).
7. **A human sends every notification.** Lemoha never alerts the public.
8. **Not a replacement for the law.** Clinicians still notify notifiable medical conditions through the NMC system, and Lemoha reminds them to.
9. **Non-political.** No officials named, no blame. The demo is modelled on real events, not a claim about them.

## 4. The core loop

1. A clinician records a push-to-talk voice note.
2. Two ears, in parallel: Muse Voice Transcribe (with the place list as keywords) and Muse Spark (audio input) each turn the note into a transcript; the audio is dropped.
3. Muse Spark 1.3 plus the place list builds the case card from both transcripts: fixes sound-spellings, translates, fills the fields, strips names, and flags what it's unsure of, including any card fact the two transcripts disagree on.
4. The clinician confirms the card; unsure fields must be confirmed. Nothing is saved before this.
5. Statistics cluster the confirmed cards.
6. Map overlays test exposure layers (water supply zones, school catchments, shops, events).
7. Muse Spark weighs the evidence, ranks possible common sources and explains them.
8. A signal level is set: Watch, Signal or Alert.
9. Muse Spark drafts a notification. A human reviews it and sends it.

## 5. Case card

A card describes a group of patients, never a person. Nothing is saved until the clinician confirms it.

| Field | Example | How it's filled |
|---|---|---|
| Symptom group | Diarrhoea or vomiting | Exactly one of: diarrhoea or vomiting; bloody diarrhoea; fever with rash; cough or flu-like illness; fever with a stiff neck or confusion; sudden illness after eating or drinking; red eyes or itchy skin rash; something unusual (described) |
| Symptoms in her words | Watery diarrhoea, vomiting | Kept as she said them |
| Number of cases | 4 | Extracted; asked if missing |
| Compared with usual | More than usual | One tap: more than usual / about the same / not sure |
| Age group | Under 5 | Under 5, 5–12, 13–17, Adult, 60 and older |
| Area | An area in the demo town | Matched against the local place list; asked if unsure |
| Onset | Today | Today / last 3 days / longer |
| Exposure clues | Tap water | Water, food, school, event or other, plus her words |
| Observations | Not getting better with usual treatment | Optional tick boxes, ticked only when the note says so; never asked and never in the way of saving: sicker than usual; not getting better with usual treatment; and, on a line of its own, running short of supplies (described). "Unusual symptoms" is stored but always false: the "Something unusual" symptom group covers it |
| Reporter | Nurse, clinic | Role and facility type from the account |
| Unsure fields | Area | Fields the AI flagged; the clinician must confirm them |
| Source | Voice note | The cleaned transcript is shown for checking during review and never stored. The evidence trail points to the card's own fields, which hold the clinician's words (symptoms, exposure words, what is unusual) |

Symptom groups, not diseases: diagnosing stays the clinician's job. Slow, lab-tracked diseases such as TB are deliberately excluded. If a clinician mentions a diagnosed notifiable condition, the card reminds her to notify it through the NMC system and prepares the details (P1). Medicine stock is tracked in other systems (Stock Visibility System, RxSolution), so "short of supplies" is only an observation here.

## 6. Signal logic

A hybrid: statistics find the clusters and do all the maths, map overlays test the possible sources, Muse Spark reads, weighs and explains, and a human decides. **The AI never does the counting.** These are starting rules, tuned on Day 5 against the scenario.

1. **Is it unusual?** For each symptom group and area, compare this week's cases with the expected count from the baseline.
2. **Where does it begin and end?** Group cards by symptom group, neighbouring areas and a 72-hour window.
3. **What do the affected areas share?** For each exposure layer (water supply zone, school catchment, shop, event), compare case rates per 1,000 people inside and outside it. A much higher rate inside, while comparison zones stay normal, makes a candidate source.
4. **Muse Spark weighs it.** It gets the numbers plus the cards' details (age groups, onset, exposure clues, observations) and ranks possible sources, each with supporting and contradicting evidence and a confidence word (low, medium, high).
5. **Levels.** Watch: clearly above expected. Signal: 2 or more independent reporters, or twice expected. Alert: a Signal plus a candidate source or severity flags.
6. **Suggested checks** for the environmental health practitioner, such as chlorine records and water sampling in one supply zone.

Observations change the reasoning: sudden onset plus "not responding to usual treatment" points to a possible non-infectious cause for laboratory testing. The check runs on every confirmed card and once a day.

**Limits, stated plainly.** Lemoha points to where to look; it can't see inside a plant or a shop. Linking illness to a water works needs a map of which works feeds which areas: made up for the demo, a municipal partnership in real use. Affected areas often share more than one thing, so competing explanations are always shown, and laboratories confirm.

## 7. Screens

Five screens, mobile-first, in any phone browser, nothing to install.
1. **Report:** a hold-to-record button, then the case card with unsure fields highlighted, then Confirm.
2. **Today:** the morning briefing, so the app earns a daily visit: what's going around near me this week, open signals nearby, and (P1) areas at elevated risk, with Share to WhatsApp (P1).
3. **Near me:** a map of the clinician's area with Watch, Signal and Alert markers, and a "Seeing this too" button on each.
4. **Signal detail:** a timeline of the cards behind it, possible sources ranked with their evidence, observation flags, and the drafted notification with Copy and Mark as sent.
5. **Replay (demo mode):** Play and a date slider, a Simulation banner throughout, and the scorecard at the end.

## 8. Demo simulation

The demo is a simulation: a fictional town, a normal background of illness, and a seeded cluster timed like Bronkhorstspruit. Lemoha only ever sees cards up to the current replay day, so it has to find the cluster itself.

1. **The town:** one data file with about 7 areas (made-up names checked so they aren't real places, populations, shapes). Water works A feeds 5 areas; works B feeds 2 comparison areas. A few clinics and a hospital, two schools, a couple of shops. Drawn as plain shapes, not on a real street map, so it can't be mistaken for a real place.
2. **Normal days:** the background generator makes everyday cards across the clinics, with a fixed random seed so every replay is identical. The cards are generated on the fly and never stored (section 10).
3. **The seeded cluster:** on day 0, chlorination stops at works A, and nothing about it appears in the data. From day 13, under-5 diarrhoea climbs in works A's areas and some cards mention tap water; works B's areas stay normal.
4. **A red herring:** a couple of cards mention a school event; Lemoha must weigh it and rank it below the water works.
5. **Real voice notes at the key moments:** 4 to 6 recordings of people reading short mixed-language scripts go through the live pipeline; every other card is generated.
6. **The replay:** Play and a date slider release each day's cards and run the signal check; the map updates; simulation data is kept apart from anything real.
7. **The scorecard:** the day Lemoha raised Watch, Signal and Alert; whether works A ranked first; results across 10 replays with different random noise; and a no-cluster run in which Lemoha should stay quiet.

**3-minute video** (shows only what was built during the hackathon):

| Time | On screen |
|---|---|
| 0:00–0:20 | The problem, with the Bronkhorstspruit numbers |
| 0:20–1:00 | A nurse records a mixed-language voice note; the card appears; she confirms it |
| 1:00–1:45 | Replay: cards arrive; the map moves from Watch to Signal to Alert |
| 1:45–2:30 | Signal detail: evidence, ranked sources, the drafted notification |
| 2:30–2:50 | The scorecard, the hard rules, and which Meta models do what |
| 2:50–3:00 | What comes next |

## 9. Scope

P0 is the whole demo. Nothing in P1 starts until P0 works end to end.

**P0 — must ship**
- Voice note → case card → confirm, with name stripping and unsure-field prompts
- Local word list for the demo areas
- Statistics layer (expected counts, zone comparisons) and the Near me map
- Signal detail with evidence and ranked possible sources
- Drafted notification that a human sends
- Today screen: the morning briefing
- Simulation: the town, background generator, seeded cluster, replay and scorecard
- Live link, public repo, README, 3-minute video

**P1 — should ship**
- Risk watch: water notices, sewage spills and heavy rain raise elevated risk before the first case, including reading a photographed notice
- "Seeing this too" and the observation tick boxes
- Share to WhatsApp for briefings and signals (a link with a preview image)
- NMC nudge for diagnosed notifiable conditions, with details prepared
- Closing the loop: practitioners record what they found; reporters see what their reports led to
- Case card extraction on Muse Spark Open via Baseten
- A second scenario: a food or poisoning cluster that uses the severity and non-response flags
- Daily scheduled agent run

**Out of scope** (named as next steps in the video)
- Real WhatsApp integration
- Checking clinicians against the SANC and HPCSA registers
- Voice notes entirely in South African languages
- Public alerts, links to the NMC notification system, and real patient data
- Still being explored for everyday value: resident hazard reports (dirty water, sewage spills) and a field tool for environmental health practitioners' inspections

## 10. Architecture

| Part | Choice | Why |
|---|---|---|
| Frontend | React + Vite (JavaScript), mobile-first web app | Known stack; works in any phone browser |
| Accounts and data | Firebase Authentication + Firestore | Known; security rules tested locally with the emulator |
| AI calls | Firebase Cloud Functions | Hold the API keys so the browser never sees them (needs the Blaze plan) |
| Signal maths | Plain JavaScript in Cloud Functions | Expected counts and zone comparisons are a few lines; the AI never does the maths |
| Hosting | Firebase Hosting | Live link for the judges |
| Map | Leaflet, with plain shapes for the demo town | Free, no API key; no real streets |
| Audio | Browser recording → Cloud Function → Muse Voice Transcribe and Muse Spark ("two ears") | Audio is never stored |

**Model routing**
- Voice → transcripts ("two ears", in parallel): Muse Voice Transcribe (muse-voice-transcribe-1.0) on the Meta Model API, by file upload (POST /v1/asr/transcribe, mode PUSH_TO_TALK, place-list keywords) of a 24 kHz mono 16-bit WAV; and Muse Spark audio input on Chat Completions (muse-spark-1.2 or muse-spark-1.3, a single setting chosen by scoring). If one ear fails or is too slow, the card is built from the other and marked single-source.
- Transcripts → card, ranking sources, drafting notifications: Muse Spark on the Meta Model API. Base URL https://api.meta.ai/v1 (OpenAI-compatible Chat Completions and Responses, plus an Anthropic-style Messages endpoint), Bearer key. Model: muse-spark-1.3 (Standard mode). Never use a "-contributor" model ID: those let Meta train on our prompts and outputs.
- Open-weights route (P1): Muse Spark Open on Baseten. Base URL https://inference.baseten.co/v1 (OpenAI-compatible). Model name: meta-models/muse-spark-open-1026 (not the docs' default name). This keeps health signals on infrastructure Vault of Time controls and targets the open-weights bonus prize.
- P1: Muse Spark (vision) reads a photographed municipal notice into a dated event on the map.

**Keys.** Only Cloud Functions hold keys, as the Firebase secrets META_API_KEY and BASETEN_API_KEY. Nthabiseng sets them herself at a terminal prompt (firebase functions:secrets:set NAME). The browser never sees a key. For the emulator, local values go in functions/.secret.local, which is gitignored. Never ask for, print, log or commit a key.

**Firebase.** Display name "Fola", the working name; the project isn't renamed (project ID: see .firebaserc). Blaze plan with a budget alert. Firestore in africa-south1 (permanent) and Functions in africa-south1. Firestore rules stay deny-all until each collection gets its own rules with emulator tests. Hosting serves https://lemoha.co.za (connected 28 Oct 2026; www.lemoha.co.za redirects (301) to it) and https://vot-health-za.web.app. Sign-in uses authDomain lemoha.co.za (popup sign-in); vot-health-za.web.app still works.

**Simulation data** is generated, never stored (decided 29 Oct 2026). The town file (functions/data/places.json) plus a fixed seed make each day's made-up cards on the fly, in the browser or in Node scripts. Simulated cards are never written to Firestore and never touch the cards collection, so the replay can't read or mix with real cards; their source is "simulation", which the security rules refuse. The public replay page needs no sign-in, writes nothing, and never calls a Meta model for a signed-out visitor; recording a voice note still needs sign-in. The signal maths runs in the browser for the replay (on simulated cards) and in Cloud Functions for live signals (on real cards).

## 11. Conventions

**Workflow**
1. Planning and decisions happen in a separate planning chat.
2. Every Claude Code prompt starts with "Read HANDOVER.md and docs/PROJECT_CONTEXT.md first" and ends with "Update HANDOVER.md and commit."
3. Claude Code shows its plan and STOPS. Nthabiseng reviews it and replies "approved" or with corrections.
4. Every permanent or risky action (Firebase project IDs or locations, deletes, security rules, deploys, git push) gets its own STOP.
5. At the end of every task: update HANDOVER.md (with "Last updated" in SAST), commit, ask "Push now?", and push only on a yes.

**Code**
- JavaScript throughout (React + Vite and Cloud Functions).
- Multi-attribute JSX tags on one line.
- Code handed to Nthabiseng to paste by hand comes as whole files or append-to-the-end blocks only, never a snippet for the middle of a file.
- The product name comes only from src/config/product.js.
- Windows machine: give PowerShell commands and explain each one in plain words.
- Mobile-first layouts. Small, readable functions; comments explain why, not what.

## 12. Day plan

| Day | Date | Work |
|---|---|---|
| 0 | Mon 26 Oct | Setup: repo, Firebase project, API key. Done. |
| 1 | Tue 27 Oct | Transcription check (file upload) and model list; 10 test voice notes; case card extraction function and prompt. Agents 101 at 18:00. |
| 2 | Wed 28 Oct | Report screen end to end (record, card, confirm, saved), with name stripping. Agents 102 at 18:00. |
| 3 | Thu 29 Oct | Town file, background generator with a fixed seed, seeded cluster, replay engine. |
| 4 | Fri 30 Oct | Statistics layer and the Near me map. Fireworks session at 18:00. |
| 5 | Sat 31 Oct | Muse Spark weighing and ranking sources; levels; tune the starting rules. |
| 6 | Sun 1 Nov | Signal detail, drafted notification, Today briefing. P0 done. |
| 7 | Mon 2 Nov | P1, starting with risk watch; security rules tests. |
| 8 | Tue 3 Nov | Scorecard runs (10 replays and a no-cluster run); fresh voice tests; deploy; README. Last full day for help. |
| 9 | Wed 4 Nov | Record and edit the video; submit by the evening; post the demo on X. |

## 13. Sources

- Joint media statement on Bronkhorstspruit, 19 Oct 2026 (gov.za): https://www.gov.za/news/media-statements/joint-media-statement-ministries-health-water-and-sanitation-gauteng
- BusinessDay report on Bronkhorstspruit, 20 Oct 2026: https://www.businessday.co.za/news/2026-10-20-hundreds-of-children-fall-ill-after-tshwane-fails-to-chlorinate-water/
- Naledi deaths: report by experts, 28 Oct 2024 (Department of Health): https://health.gov.za/wp-content/uploads/2024/10/Press-Conference-on-the-Naledi-Deaths-Report-by-Experts-Monday-28-October-2024.pdf
- Gauteng Health warning on child food poisoning (Daily Maverick): https://www.dailymaverick.co.za/article/2024-09-05-gauteng-health-department-issues-urgent-warning-after-huge-spike-in-child-food-poisoning-cases.md
- Food Safety Day surveillance presentation, June 2024 (Department of Health): https://knowledgehub.health.gov.za/system/files/2024-06/Food%20Safety%20Day%20Surveillance%20presentation%2005June2024_BK.pdf
- Mobile health apps for foodborne disease outbreak management (BMC Public Health): https://repository.up.ac.za/handle/2263/86105?show=full
- Hospital-based nurses for outbreak surveillance, Mpumalanga (WHO Bulletin): https://scielosp.org/article/bwho/2001.v79n1/22-27
- Health workers' use of messaging apps in their work (SAMRC): https://www.samrc.ac.za/sites/default/files/attachments/2025-07/SAMRC%20UHC_NHI%20webinar_31Jul25_Healthworkers%20use%20of%20mobile%20apps%20in%20work.pdf
- Event-based surveillance guidelines launched in three countries (Africa CDC): https://yourbotswana.com/southern-africa-enhances-early-warning-systems-as-event-based-surveillance-guidelines-are-launched-in-three-countries/
- NMC notification SOP (Department of Health): https://knowledgehub.health.gov.za/system/files/elibdownloads/2020-07/NMC_COVID-19-Notification-SOP_7May2020.pdf
- Meta Global AI Developer Hackathon participant guide (Cerebral Valley): https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details
- Meta Model API documentation: https://dev.meta.ai/docs/
- Muse Spark models (Meta): https://dev.meta.ai/docs/models
- Muse Voice Transcribe cookbook (Meta): https://github.com/meta-models/meta-model-cookbook/tree/main/06_muse_voice/01_voice_api_fundamentals
