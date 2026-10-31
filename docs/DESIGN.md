# Design: the Shweshwe direction

The product is Lemoha (working name Fola until 28 Oct 2026). Chosen on 27 Oct 2026. Every screen follows this file. If a case isn't covered, follow the principles below and flag it in your plan.

## The idea

Lemoha is built for South African clinicians, so its look comes from here. The indigo of shweshwe cloth carries the identity. The cloth's printed pattern appears in one place only: it marks areas under a signal on the map, and the level badge that names them. Everything else stays calm, plain and easy to read on a cheap phone in bright light.

Two voices:
- The clinician's own words are set in a serif, Source Serif 4. They are a person speaking.
- Everything Lemoha says or structures is set in Hanken Grotesk.

Boldness is spent in one place: the indigo map. The rest of the app is quiet.

## Colour tokens

| Token | Value | Use |
|---|---|---|
| --color-indigo | #1C2A63 | Brand. Primary buttons, screen titles, selected states, the map's ground |
| --color-indigo-pressed | #14204F | Pressed primary button |
| --color-indigo-map | #283A80 | Quiet areas on the map |
| --color-indigo-map-line | #5466AE | Borders between quiet map areas |
| --color-indigo-soft | #8E99C7 | Waveform bars. Decorative only, never text |
| --color-indigo-divider | #9AA4CF | Dividers inside segmented controls |
| --color-indigo-disabled | #C9CEE3 | Disabled button background, sheet grabber, the "usual" squares in charts |
| --color-wash | #E7EAF6 | Question blocks, information boxes |
| --color-line | #DCE0EE | Card borders, dividers |
| --color-ground | #F6F7FB | Page background |
| --color-surface | #FFFFFF | Cards, sheets |
| --color-white | #FFFFFF | Text, icons and the focus ring on indigo; the print |
| --color-ink | #1A2040 | Body text |
| --color-ink-muted | #535A78 | Secondary text on ground or surface |
| --color-ink-muted-on-wash | #464C69 | Secondary text on wash |
| --color-ink-disabled | #3D4466 | Text on a disabled button |
| --color-map-label-muted | #C3CBEA | Labels of comparison areas on the map |
| --color-level-watch | #E8B53A | Watch level only |
| --color-level-signal | #E0652B | Signal level only |
| --color-level-alert | #B7202E | Alert level only |
| --color-focus | #1C2A63 | Focus ring on light surfaces. Use #FFFFFF on indigo |

Light theme only for the hackathon. Keep every colour in tokens so a dark theme can be added later.

### Level colours are reserved
Watch ochre, Signal orange and Alert crimson mean a level and nothing else. Never use them for errors, warnings about the app, the record button, decoration or links.

A level is never shown by colour alone. It always has its word (Watch, Signal, Alert) and its pattern or shape:
- Watch: a dashed ochre outline
- Signal: orange with the sparse print
- Alert: crimson with the dense print

Text never sits directly on Signal orange or Watch ochre (it fails contrast). Labels on those areas go in an indigo chip. The word "Alert" may be set in --color-level-alert on white; the words "Signal" and "Watch" are set in ink, next to their swatch.

### Contrast pairs that must pass (4.5:1 or more)
- ink on ground, ink on surface
- ink-muted on ground, ink-muted on surface
- ink-muted-on-wash on wash
- indigo on surface, indigo on wash
- #FFFFFF on indigo, #FFFFFF on indigo-map
- map-label-muted on indigo-map
- level-alert on surface
- ink-disabled on indigo-disabled

## Type

| Token | Value |
|---|---|
| --font-ui | 'Hanken Grotesk Variable', 'Hanken Grotesk', system-ui, sans-serif |
| --font-voice | 'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif |

| Role | Size / line height | Weight | Font |
|---|---|---|---|
| Screen title | 30 / 36, letter-spacing -0.015em | 700 | ui, colour indigo |
| Section or signal title | 21 / 27 | 700 | ui, colour indigo |
| Big number | 32 / 36, tabular figures | 800 | ui |
| Field value | 19 / 24 | 700 | ui |
| Clinician's words | 20 / 28 | 400 | voice |
| Question | 17 / 22 | 700 | ui, colour indigo |
| Body | 16 / 22 | 400 | ui |
| Button | 16 to 17 | 700 | ui |
| Label, secondary, hint | 14 / 20 | 400 to 600 | ui |

- 14 px is the smallest text anywhere.
- Counts, times and durations use tabular figures.
- Sentence case everywhere. No ALL CAPS labels, no letter-spaced eyebrow labels.
- The clinician's words use curly quotes with a hanging opening quote (text-indent: -0.42em), so the text lines up with everything else and the quote mark sits in the margin. First used for the transcript under "What we heard" on card review, which is read-only text (it's never saved).
- Text is left-aligned. Centre only one-line confirmations and the privacy line.

## Spacing, radius, elevation

- Spacing steps: 4, 8, 12, 16, 20, 24, 32. Screen side gutter: 20 px.
- Radius follows hierarchy, not one value for everything:
  - 22: top corners of bottom sheets
  - 16: cards and question blocks
  - 12: buttons and segmented controls
  - 8: the simulation pill, small tags
  - 6: label chips on the map
  - 2: squares in charts
- Elevation: only the bottom sheet has a shadow: 0 -6px 24px rgba(28, 42, 99, 0.18). Cards are white with a 1 px --color-line border, or sit on wash. Never a border and a shadow together.
- Tap targets: at least 44 px. Main actions are 50 to 54 px tall.

## Components

- **Primary button:** indigo background, white text, radius 12, 54 px tall (50 inside sheets). Pressed: indigo-pressed.
- **Secondary button:** white background, 1.5 px indigo border, indigo text.
- **Disabled button:** indigo-disabled background, ink-disabled text. Its label says what's missing, for example "Answer 1 more to save". On card review, tapping it goes to the first unanswered question.
- **Segmented control** (one answer out of 2 to 4): a white container with a 1.5 px indigo border and radius 12; 1 px indigo-divider lines between options; the selected option is filled indigo with white text and a check icon, and has aria-pressed="true". Give the longest option more width rather than letting it wrap. Options that don't fit in one row at 360 px wide stack one under another, in the same style.
- **Inputs and dropdowns:** white, 1.5 px ink-muted border, radius 12, 50 px tall.
- **Long option labels:** A dropdown whose labels can be long shows the chosen label as full text that wraps, with the real dropdown laid invisibly over it. Tapping still opens the phone's own list.
- **Question block** (an unsure field): wash background, radius 16, the question in Question style, an optional hint in ink-muted-on-wash, then a segmented control.
- **Case card fields:** a white card with a 1 px line border and radius 16. One column, in reading order: each field has its label (14, ink-muted) above its own control (a dropdown, a segmented control, chips, tick boxes or a text box), so every value can be changed where it stands. An unsure field is a question block in its place.
- **Voice note row:** a 44 px indigo circle play button, waveform bars (3 px wide, 3 px apart, indigo-soft), duration in 14 px tabular figures.
  - Once the recording is gone (card review), the row shows a still waveform and the duration, with no play button.
- **Privacy line**, under the main action on the Report flow: a lock icon, then one of these, 14 px, ink-muted, centred:
  - under the record button (also while recording) and under Send: "Leave out patients' names. {PRODUCT_NAME} doesn't keep the recording."
  - under the save button on card review: "Check there are no names, then save. {PRODUCT_NAME} doesn't keep the recording."
- **Simulation pill:** indigo background, white text 14/20 weight 600, radius 8. Shown on every screen in simulation mode. Practice mode uses the same pill style.
- **Level badge:** a 40 px square, radius 10, in the level colour with its print (Watch: indigo with the dashed ochre border), beside the level word and "Raised today, 09:40" in 14 px ink-muted.
- **Information and error messages:** a wash block with an icon, ink text that says what happened and what to do, and an action button if there is one. Never red: red means Alert.
- **Record button:** an 88 px indigo circle with a white microphone icon. While recording, a 3 px indigo ring pulses around it. The timer sits above it in 32/36 tabular figures.
- **Bottom navigation:** surface background, 1 px line on top, icon plus a 14 px label for each item. Active: indigo, weight 700. Inactive: ink-muted.
- **Icons:** inline stroke SVG, stroke 2 to 2.2, round caps. Never emoji. If the repo already has an icon set, keep using it.

## Logo

Lemoha means "to notice" in Sesotho. The mark is a dot circled by hand: something a clinician noticed. The same ring is the "o" in the wordmark.

- One colour only: indigo on light backgrounds, white on indigo. Never a level colour, never a gradient, never an effect.
- Never add a red dot or badge to the mark: on a phone it reads as an unread notification.
- The wordmark is lowercase "lemoha" in Hanken Grotesk 700, letter-spacing -0.025em, with the "o" replaced by the ring. Never set the name in another typeface.
- At 32 px and below, use the small mark (the ring closes). Smallest size: 16 px.
- Clear space around the mark or wordmark: at least half the mark's height.
- Don't stretch, rotate, outline or recolour it, and don't put it on a busy background.
- Files: the brand folders listed in HANDOVER.md.

## The map (Day 4)

The map is the one bold surface: a piece of indigo cloth.
- Ground: indigo. Quiet areas: indigo-map, with 1.5 px indigo-map-line borders.
- Labels: white 14 px weight 600 on quiet areas; map-label-muted for comparison areas; inside an indigo chip (radius 6, white 14 px weight 700) on any level area.
- Watch: the area stays indigo-map, with a 3 px dashed ochre outline drawn just inside its edge (dash 8, gap 5).
- Signal: orange fill with the sparse print on top.
- Alert: crimson fill with the dense print on top.
- A supply zone: a dotted white outline (2.5 px, dash 0.5 gap 7, round caps, 85% opacity) around its areas, with a white tag (radius 8, indigo text) naming it.
- Areas are plain shapes, never a real street map.

Added in Task 14 (29 Oct), for cases the first version didn't cover:
- A level area's chip holds its name, with its level word on the line below.
- Where the map can be used (the replay), each area's name is a real button, and a tap anywhere on its shape works too. Where it can't (Near me), the map is one picture with a spoken description.
- The area whose sheet is open has a 3 px solid white outline.
- Your area (Near me): the same 3 px solid white outline, and a white tag (radius 8, indigo 14 px weight 700) saying "Your area" under its name.
- No supply zones and no muted comparison labels until possible sources are on screen (Signal detail): drawn earlier, they'd point at the answer.
- Lines and dashes are drawn in screen pixels, and the prints stay 12 and 16 px whatever the map's size.
- Under the map, a list of every area with its level badge (or "Nothing unusual"), highest level first, for screen readers and small screens. Each row opens the same sheet.

The area sheet:
- A bottom sheet that doesn't block the page: the map, Play and the day slider keep working, and its numbers follow the day shown. It appears without sliding (it isn't one of the motion moments), at most 55% of the screen's height.
- Opening it moves focus to its heading. Close or Esc closes it and returns focus to where it was opened.
- In it: the area's name (section title) and its level badge, with "Since day 17, Thu 18 Feb 2027" as the badge's line. Then, for each signal the area is part of: the symptom group (field value), counts against usual ("52 cases in 3 days; usually about 7"), the cards and places of care, and why it has its level ("Alert: reported from 4 places of care, clearly more than twice the usual number, and a possible common source."). Never a chance, never a source by name. With no level: "Nothing unusual was found in Thaga Park on Thu 18 Feb 2027."

The replay's controls:
- The run switch is the segmented control.
- Play and Pause is a primary button with its icon, beside the day number (field value) and the date (14 px, ink-muted).
- The day slider: a 6 px indigo-disabled track and a 24 px indigo thumb, 44 px tall to touch, with the focus ring. No filled part, which would need a gradient.

Added in Task 15b (30 Oct):
- Inside the "Possible sources" panel, at Signal or Alert only, the sheet names sources. The app's own wording may use source words such as water, works and chlorine there. The rest of the replay's wording keeps the existing restriction. No supply-zone outlines or other map changes in this task.
- The panel uses the existing sheet, plain dividers and text confidence words. Expandable evidence lists the backing cards' exposure words in Source Serif 4 and their onset. Saved evidence always belongs to the day its ranking was made.

The prints, as SVG patterns:

```svg
<pattern id="print-dense" width="12" height="12" patternUnits="userSpaceOnUse">
  <polygon points="6,2 9.5,6 6,10 2.5,6" fill="#FFFFFF" fill-opacity="0.5"/>
  <circle cx="6" cy="6" r="1" fill="#B7202E"/>
  <circle cx="0" cy="0" r="1.1" fill="#FFFFFF" fill-opacity="0.5"/>
  <circle cx="12" cy="0" r="1.1" fill="#FFFFFF" fill-opacity="0.5"/>
  <circle cx="0" cy="12" r="1.1" fill="#FFFFFF" fill-opacity="0.5"/>
  <circle cx="12" cy="12" r="1.1" fill="#FFFFFF" fill-opacity="0.5"/>
</pattern>
<pattern id="print-sparse" width="16" height="16" patternUnits="userSpaceOnUse">
  <circle cx="8" cy="8" r="1.5" fill="#FFFFFF" fill-opacity="0.55"/>
  <circle cx="0" cy="0" r="0.9" fill="#FFFFFF" fill-opacity="0.4"/>
  <circle cx="16" cy="0" r="0.9" fill="#FFFFFF" fill-opacity="0.4"/>
  <circle cx="0" cy="16" r="0.9" fill="#FFFFFF" fill-opacity="0.4"/>
  <circle cx="16" cy="16" r="0.9" fill="#FFFFFF" fill-opacity="0.4"/>
</pattern>
```

The print appears nowhere else: not on backgrounds, headers, buttons or empty states.

## The daily chart (Signal detail, Day 6)

One square per case, stacked by day, the way outbreak curves are drawn by hand.
- 10 px squares, 2 px apart, radius 2.
- Cases up to the usual level: indigo-disabled. Cases above it: the signal's level colour.
- A dashed ink-muted line marks the usual level, labelled "Usual".
- 14 days. Labels under it: the first day, the middle day, and "Today".
- If any day passes about 10 cases, switch to one square per 5 cases and say so in the chart's label.

## Signal detail and drafted notification (31 Oct)

Task 19 (31 Oct): Signal detail opens from Open signal in the replay's area sheet. It pauses replay playback and shows the selected day's level, symptom group and areas, the frozen engine's winning-window counts, the daily chart, observations, the card timeline, Possible sources, then Drafted notification. Other merged windows show only the level/areas/window metadata the engine retains. The usual-count explanation is plain text, not a link to historical cards. Each measured count links to its cards. Daily chart squares remain 10 px with 2 px gaps, with a partial square for a remainder at the five-case scale; the usual reference follows weekday/weekend expectations. Accessible daily counts provide full-size card links. Window usual totals aggregate baseline day weights before multiplication and rounding, exactly like the engine.

The detail view is a plain reading screen with the Simulation pill, existing level badge and Back to replay. The ranking action sits immediately below its attribution. The draft's subject input follows the existing input style; its body is a multiline textarea with the same border, radius, tokens and 16/22 UI type, at least 264 px high. Machine text and the fixed footer use Hanken Grotesk. Human edits remain while rankings load or change. Drafting reuses the existing processing waveform and reduced-motion behavior. Names of possible sources are permitted within the drafted notification as well as Possible sources; no new map outlines, print uses or animations are introduced. Copy and Mark as sent use secondary buttons; feedback uses plain status text or the existing wash message.

## Motion

Motion only happens at three moments, plus small state changes:
1. **Processing a voice note:** the waveform bars rise and fall gently in sequence. No spinner. One honest line of text with the expected wait: "This usually takes under a minute. Please keep this screen open."
2. **The card arriving:** the card's parts appear in reading order, each fading in and moving up 6 px, 180 ms each, 60 ms apart.
3. **The map changing level** (Day 4 and 5): the area's colour changes over 300 ms and its print fades in.

Task 15b (30 Oct): live source ranking reuses the processing waveform while waiting for the callable. It introduces no new animation, and the same reduced-motion rule applies.

Small state changes (a selected option, a pressed button) take 120 ms. Nothing else animates: no entrance animations on screens, no hover effects on cards.

With prefers-reduced-motion: nothing moves. Things appear in their final state.

## Copy

- Sentence case, plain verbs.
- A button says what happens: "Save card", "Seeing this too", "Open signal". The same action keeps the same name throughout.
- Errors say what happened and what to do next, in Lemoha's voice. They don't apologise and they're never vague.
- "Signal", never "outbreak". No medical advice: only the fixed text that points to official hotlines.
- No invented placeholder text in shipped screens.

## Accessibility floor

- Text contrast at least 4.5:1 (the pairs above are tested).
- Tap targets at least 44 px.
- Real buttons and links, never clickable divs. Icon-only buttons have an aria-label.
- A visible focus ring on everything that can take focus: 3 px, offset 2 px, --color-focus.
- Levels never rely on colour alone.
- prefers-reduced-motion is respected.

## Never

- Any typeface other than Hanken Grotesk and Source Serif 4. No Inter, Roboto or system default as the visible font.
- Gradients of any kind: backgrounds, text or buttons.
- Glass or blur effects.
- Emoji, as icons or as decoration.
- Shadows on cards. Only the bottom sheet has one.
- Cards with a coloured left border.
- ALL CAPS labels, letter-spaced eyebrow labels, "A · B · C" strings joined with middle dots, arrows added to button text.
- Level colours for anything that isn't a level.
- The print anywhere except level areas on the map and the level badge.
- Text directly on Signal orange or Watch ochre.
- Text smaller than 14 px.
- A spinner while a voice note is processed.
- Default component-library looks.
