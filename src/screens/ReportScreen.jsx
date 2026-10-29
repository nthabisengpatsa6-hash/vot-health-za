import { useEffect, useRef, useState } from "react";
import CaseCardForm from "../components/CaseCardForm";
import { LockIcon } from "../components/Icons";
import Message from "../components/Message";
import NoteNotices from "../components/NoteNotices";
import RecordButton from "../components/RecordButton";
import VoiceNoteRow from "../components/VoiceNoteRow";
import Waveform from "../components/Waveform";
import { PRODUCT_NAME } from "../config/product";
import { streamFunction } from "../lib/api";
import { answersNeeded, cardFieldId, draftFromCard, firstToFix, handleSaveTap, saveButtonAction } from "../lib/cardDraft";
import { saveCards } from "../lib/cards";
import { MAX_SECONDS, MicrophoneError, startRecording } from "../lib/recorder";
import { SHOW_TIMING, formatTiming } from "../lib/timing";
import { bytesToBase64, encodeWav, recordingToSamples, wavePeaks } from "../lib/wav";

// The privacy line under the main action. It promises only what the app
// does: the model can miss a name, so the clinician is asked to leave names
// out and to check before saving.
const PRIVACY_RECORDING = `Leave out patients' names. ${PRODUCT_NAME} doesn't keep the recording.`;
const PRIVACY_SAVING = `Check there are no names, then save. ${PRODUCT_NAME} doesn't keep the recording.`;

const MIN_SECONDS = 1;
const WARN_SECONDS = MAX_SECONDS - 10;
const SLOW_SAVE_MS = 10_000;
// A quick second tap on "Answer N more to save" would land on whatever the
// jump moved under the finger, perhaps an answer. For this long after a
// jump, an invisible cover takes taps.
const TAP_SHIELD_MS = 500;

const MIC_HELP = {
  blocked: {
    text: `${PRODUCT_NAME} isn't allowed to use the microphone.`,
    steps: [
      "Android (Chrome): tap the icon to the left of the web address, then Permissions, and turn on Microphone.",
      "iPhone (Safari): tap aA in the address bar, then Website Settings, and set Microphone to Allow.",
      "Then tap Try again.",
    ],
  },
  "no-microphone": { text: "No microphone was found. Check that one is connected, then try again." },
  busy: { text: "Another app is using the microphone. Close it, then try again." },
  unsupported: { text: "This browser can't record audio. Use Chrome on Android or Safari on iPhone." },
  failed: { text: "The microphone couldn't start. Please try again." },
  "too-short": { text: "That was too short. Hold the button, or tap it, and speak for a few seconds." },
  unreadable: { text: "The recording couldn't be read on this phone. Please record it again." },
};

// The order a note goes through. "Listening" is the recording itself; the
// other two come from processNote, so they say what the server is doing.
const STAGES = [
  { id: "listening", label: "Listening…" },
  { id: "reading", label: "Reading your note…" },
  { id: "building", label: "Building the card…" },
];

// The first control in a field block that can take an answer. The case
// count's − and + buttons are skipped, so focus lands on its number box.
const FIRST_CONTROL = "select:not(:disabled), textarea:not(:disabled), input:not(:disabled), button:not(.stepper-button):not(:disabled)";

// "Answer N more to save" takes the clinician to the first unanswered
// question and puts focus on its first control, so the next tap or key
// answers it. The scroll is instant ("auto", and no CSS sets smooth
// scrolling): docs/DESIGN.md allows motion only at three moments. If a
// browser refuses the scroll options, the plain scroll and the focus still
// happen.
function goToFirstAnswer(drafts) {
  const first = firstToFix(drafts);
  const block = first && document.getElementById(cardFieldId(first.index + 1, first.field));
  if (!block) return;
  for (const options of [{ block: "start", behavior: "auto" }, true]) {
    try {
      block.scrollIntoView(options);
      break;
    } catch {
      // Try the plain form next; the focus below happens either way.
    }
  }
  block.querySelector(FIRST_CONTROL)?.focus({ preventScroll: true });
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function sendProblem(err) {
  const code = String((err && err.code) || "").replace(/^functions\//, "");
  // These two messages are written by processNote for people to read.
  if (code === "resource-exhausted") return { kind: "limit", text: err.message };
  if (code === "invalid-argument") return { kind: "audio", text: err.message };
  if (code === "unauthenticated") return { kind: "audio", text: "You've been signed out. Please sign in again." };
  if (code === "deadline-exceeded") return { kind: "retry", text: "There was no answer in time. Check your connection, then try again." };
  return { kind: "retry", text: "Your note couldn't be turned into a card. Check your connection, then try again." };
}

// Record a voice note, check the draft case cards, confirm, saved. Audio is
// kept in memory only, and dropped once the note has been processed or
// thrown away.
export default function ReportScreen({ user, profile }) {
  const [phase, setPhase] = useState("ready");
  const [elapsed, setElapsed] = useState(0);
  const [micProblem, setMicProblem] = useState(null);
  const [review, setReview] = useState(null);
  const [stage, setStage] = useState("reading");
  const [sendError, setSendError] = useState(null);
  const [note, setNote] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [timing, setTiming] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [slowSave, setSlowSave] = useState(false);
  const [tapShield, setTapShield] = useState(false);

  const live = useRef(true);
  const recording = useRef(null);
  const wav = useRef(null);
  const audioUrl = useRef(null);

  function dropAudio() {
    wav.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }

  // Leaving the screen releases the microphone and drops the audio.
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      const current = recording.current;
      recording.current = null;
      if (current) {
        clearInterval(current.timer);
        if (current.handle) current.handle.cancel();
      }
      dropAudio();
    };
  }, []);

  useEffect(() => {
    if (!tapShield) return undefined;
    const timer = setTimeout(() => setTapShield(false), TAP_SHIELD_MS);
    return () => clearTimeout(timer);
  }, [tapShield]);

  async function start() {
    setMicProblem(null);
    setPhase("starting");
    const current = { handle: null, startedAt: 0, timer: null, stopWanted: false };
    recording.current = current;
    let handle;
    try {
      handle = await startRecording();
    } catch (err) {
      if (recording.current === current) recording.current = null;
      if (!live.current) return;
      setMicProblem(err instanceof MicrophoneError ? err.kind : "failed");
      setPhase("ready");
      return;
    }
    // The screen was left while the microphone was starting.
    if (recording.current !== current) {
      handle.cancel();
      return;
    }
    current.handle = handle;
    current.startedAt = Date.now();
    setElapsed(0);
    setPhase("recording");
    current.timer = setInterval(() => {
      const seconds = (Date.now() - current.startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_SECONDS) stop();
    }, 250);
    if (current.stopWanted) stop();
  }

  async function stop() {
    const current = recording.current;
    if (!current) return;
    // Asked to stop before the microphone was ready: stop as soon as it is.
    if (!current.handle) {
      current.stopWanted = true;
      return;
    }
    recording.current = null;
    clearInterval(current.timer);
    setPhase("preparing");
    const seconds = (Date.now() - current.startedAt) / 1000;
    let problem = null;
    try {
      const blob = await current.handle.stop();
      if (seconds < MIN_SECONDS) {
        problem = "too-short";
      } else {
        const result = await recordingToSamples(blob);
        const bytes = encodeWav(result.samples);
        if (!live.current) return;
        dropAudio();
        wav.current = bytes;
        audioUrl.current = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        setReview({ url: audioUrl.current, seconds: result.seconds, peaks: wavePeaks(result.samples) });
        setPhase("review");
        return;
      }
    } catch {
      problem = "unreadable";
    }
    if (!live.current) return;
    setMicProblem(problem);
    setPhase("ready");
  }

  async function send() {
    setSendError(null);
    setStage("reading");
    setPhase("sending");
    // Upload ends when processNote says it has the whole note ("received",
    // its first message), total when the cards arrive. Only ?timing=1 shows
    // them.
    const sentAt = performance.now();
    const since = () => Math.round(performance.now() - sentAt);
    let uploadMs = null;
    setTiming(null);
    let reply;
    try {
      reply = await streamFunction("processNote", { audioBase64: bytesToBase64(wav.current) }, (message) => {
        if (!message || !live.current) return;
        if (message.stage === "received" && uploadMs === null) {
          uploadMs = since();
          setTiming({ uploadMs });
        }
        if (message.stage === "building") setStage("building");
      });
    } catch (err) {
      if (!live.current) return;
      setTiming({ uploadMs, totalMs: since() });
      setSendError(sendProblem(err));
      setPhase("send-error");
      return;
    }
    if (!live.current) return;
    setTiming({ uploadMs, serverMs: reply.noteMs, totalMs: since() });
    dropAudio();
    // Card review keeps only a still picture of the note: its waveform and
    // length, with no playback link.
    setReview((current) => current && { seconds: current.seconds, peaks: current.peaks });
    setNote(reply);
    setDrafts(reply.cards.map(draftFromCard));
    setSaveError(null);
    setPhase("cards");
  }

  function startOver() {
    dropAudio();
    setReview(null);
    setNote(null);
    setDrafts([]);
    setTiming(null);
    setMicProblem(null);
    setSendError(null);
    setSaveError(null);
    setPhase("ready");
  }

  async function confirm() {
    // The save button isn't HTML-disabled while answers are missing, so the
    // save itself refuses until every kept card is complete.
    if (saveButtonAction(drafts) !== "save") return;
    setSaveError(null);
    setPhase("saving");
    const slowTimer = setTimeout(() => setSlowSave(true), SLOW_SAVE_MS);
    try {
      await saveCards({ drafts: drafts.filter((draft) => !draft.removed), note, profile, uid: user.uid });
      if (!live.current) return;
      setReview(null);
      setNote(null);
      setDrafts([]);
      setTiming(null);
      setPhase("saved");
    } catch {
      if (!live.current) return;
      setSaveError("Your cards couldn't be saved. Check your connection, then try again.");
      setPhase("cards");
    } finally {
      clearTimeout(slowTimer);
      setSlowSave(false);
    }
  }

  if (phase === "sending") return <SendingView stage={stage} timing={timing} />;

  if (phase === "send-error") {
    return (
      <section className="screen">
        <h1>Report</h1>
        <Message kind="error" role="alert">{sendError.text}</Message>
        <TimingLine timing={timing} />
        {sendError.kind === "retry" && <button type="button" className="button button-primary" onClick={send}>Try again</button>}
        <button type="button" className="button button-secondary stacked" onClick={startOver}>{sendError.kind === "limit" ? "OK" : "Record again"}</button>
      </section>
    );
  }

  if (phase === "saved") {
    return (
      <section className="screen">
        <h1>Report</h1>
        <Message kind="ok" role="status" centred>Saved. Thank you.</Message>
        <button type="button" className="button button-primary" onClick={startOver}>Record another</button>
      </section>
    );
  }

  if (phase === "cards" || phase === "saving") {
    const saving = phase === "saving";
    const active = drafts.filter((draft) => !draft.removed);
    const needed = answersNeeded(drafts);
    let status = "Everything is answered.";
    let saveLabel = "Confirm and save";
    if (active.length === 0) {
      status = "Every card has been removed. Undo one, or record again.";
      saveLabel = "No cards to save";
    } else if (needed > 0) {
      status = `${needed} more ${needed === 1 ? "answer" : "answers"} needed before you can save.`;
      saveLabel = `Answer ${needed} more to save`;
    }
    // While the button says what's missing, the same words are only
    // announced to screen readers, so they don't show twice. It looks
    // disabled but stays tappable: a tap goes to the first unanswered
    // question and never saves.
    const statusOnButton = !saving && active.length > 0 && needed > 0;
    const saveTap = () => handleSaveTap(drafts, {
      save: confirm,
      // The cover goes up first; its own timer takes it down, whatever
      // the scroll or the focus does.
      jump: () => {
        setTapShield(true);
        goToFirstAnswer(drafts);
      },
    });

    return (
      <section className="screen">
        <h1>Check your report</h1>
        {note.practice && <p className="pill">Practice result: made up, not from your recording.</p>}
        {review && <VoiceNoteRow peaks={review.peaks} duration={formatTime(Math.round(review.seconds))} />}
        <TimingLine timing={timing} />
        {!note.isReport && (
          <Message kind="info">
            <p>This didn't sound like a report. Record again?</p>
            <button type="button" className="button button-primary" onClick={startOver}>Record again</button>
          </Message>
        )}
        {note.isReport && (
          <fieldset className="plain-fieldset" disabled={saving}>
            {drafts.map((draft, index) => (
              <CaseCardForm key={index} draft={draft} number={index + 1} total={drafts.length} onChange={(next) => setDrafts((all) => all.map((item, i) => (i === index ? next : item)))} />
            ))}
          </fieldset>
        )}
        <NoteNotices note={note} />
        {note.isReport && (
          <div className="confirm-area">
            {saveError && <Message kind="error" role="alert">{saveError}</Message>}
            <p className={statusOnButton ? "visually-hidden" : "note"} role="status">{saving && slowSave ? "Still saving. Waiting for a connection…" : status}</p>
            <button type="button" className={statusOnButton ? "button button-primary is-waiting" : "button button-primary"} disabled={saving || active.length === 0} onClick={saveTap}>{saving ? "Saving…" : saveLabel}</button>
            <PrivacyLine text={PRIVACY_SAVING} />
            <button type="button" className="button button-secondary stacked" disabled={saving} onClick={startOver}>Record again</button>
          </div>
        )}
        {/* Cancelling the press keeps focus where the jump put it. */}
        {tapShield && <div className="tap-shield" aria-hidden="true" onMouseDown={(e) => e.preventDefault()} />}
      </section>
    );
  }

  if (phase === "review") {
    return (
      <section className="screen">
        <h1>Report</h1>
        <p className="lead">Your note: {formatTime(Math.round(review.seconds))}. Play it back if you like, then send it.</p>
        <VoiceNoteRow url={review.url} peaks={review.peaks} duration={formatTime(Math.round(review.seconds))} />
        <button type="button" className="button button-primary" onClick={send}>Send</button>
        <PrivacyLine text={PRIVACY_RECORDING} />
        <button type="button" className="button button-secondary stacked" onClick={startOver}>Record again</button>
      </section>
    );
  }

  const isRecording = phase === "recording";
  const help = micProblem && MIC_HELP[micProblem];
  return (
    <section className="screen">
      <h1>Report</h1>
      <p className="lead">Say what you're seeing: the symptoms, how many patients, their ages, the area and when it started. Don't say anyone's name.</p>
      <p className="record-hint">{isRecording ? "Listening…" : "Hold while you speak, or tap to start and tap again to stop."}</p>
      <div className="recorder">
        <p className="timer" role="timer" aria-live="off">{formatTime(isRecording ? elapsed : 0)}<span className="timer-limit"> / {formatTime(MAX_SECONDS)}</span></p>
        <RecordButton recording={isRecording} busy={phase === "starting" || phase === "preparing"} onStart={start} onStop={stop} />
        <PrivacyLine text={PRIVACY_RECORDING} />
      </div>
      {/* Below the button, so nothing moves under a finger that's holding it. */}
      {isRecording && elapsed >= WARN_SECONDS && <Message kind="info" role="status" centred>{Math.max(0, Math.ceil(MAX_SECONDS - elapsed))} seconds left</Message>}
      {phase === "preparing" && <p className="status-line" role="status">Preparing your note…</p>}
      {help && (
        <Message kind="error" role="alert">
          <p>{help.text}</p>
          {help.steps && <ul className="help-steps">{help.steps.map((step) => <li key={step}>{step}</li>)}</ul>}
          {micProblem !== "too-short" && micProblem !== "unreadable" && <button type="button" className="button button-secondary" onClick={start}>Try again</button>}
        </Message>
      )}
    </section>
  );
}

// Phone tests only (?timing=1): where the note's time went.
function TimingLine({ timing }) {
  const text = SHOW_TIMING && timing ? formatTiming(timing) : "";
  return text ? <p className="timing-line">{text}</p> : null;
}

function PrivacyLine({ text }) {
  return (
    <p className="privacy-line">
      <LockIcon />
      {text}
    </p>
  );
}

// No spinner: the waveform rises and falls while the note is processed. Each
// stage is real: Listening is the finished recording, Reading starts when the
// note is sent, and Building the card comes from processNote's own message.
function SendingView({ stage, timing }) {
  const current = STAGES.findIndex((item) => item.id === stage);
  return (
    <section className="screen">
      <h1>Report</h1>
      <div className="processing">
        <Waveform />
        <p className="wait-line">This usually takes under a minute. Please keep this screen open.</p>
        <TimingLine timing={timing} />
      </div>
      <ol className="stages" aria-live="polite">
        {STAGES.map((item, index) => {
          let state = "is-waiting";
          if (index < current) state = "is-done";
          else if (index === current) state = "is-current";
          return <li key={item.id} className={state} aria-current={index === current ? "step" : undefined}>{item.label}</li>;
        })}
      </ol>
    </section>
  );
}
