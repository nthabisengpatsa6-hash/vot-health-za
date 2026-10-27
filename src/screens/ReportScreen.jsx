import { useEffect, useRef, useState } from "react";
import CaseCardForm from "../components/CaseCardForm";
import NoteNotices from "../components/NoteNotices";
import RecordButton from "../components/RecordButton";
import { PRODUCT_NAME } from "../config/product";
import { streamFunction } from "../lib/api";
import { draftFromCard, fieldsToFix } from "../lib/cardDraft";
import { saveCards } from "../lib/cards";
import { MAX_SECONDS, MicrophoneError, startRecording } from "../lib/recorder";
import { bytesToBase64, encodeWav, recordingToSamples } from "../lib/wav";

const MIN_SECONDS = 1;
const WARN_SECONDS = MAX_SECONDS - 10;
const SLOW_SAVE_MS = 10_000;

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
  const [transcript, setTranscript] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [slowSave, setSlowSave] = useState(false);

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
        setReview({ url: audioUrl.current, seconds: result.seconds });
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
    let reply;
    try {
      reply = await streamFunction("processNote", { audioBase64: bytesToBase64(wav.current) }, (message) => {
        if (message && message.stage === "building" && live.current) setStage("building");
      });
    } catch (err) {
      if (!live.current) return;
      setSendError(sendProblem(err));
      setPhase("send-error");
      return;
    }
    if (!live.current) return;
    dropAudio();
    setReview(null);
    setNote(reply);
    setDrafts(reply.cards.map(draftFromCard));
    setTranscript(reply.transcriptClean || "");
    setSaveError(null);
    setPhase("cards");
  }

  function startOver() {
    dropAudio();
    setReview(null);
    setNote(null);
    setDrafts([]);
    setTranscript("");
    setMicProblem(null);
    setSendError(null);
    setSaveError(null);
    setPhase("ready");
  }

  async function confirm() {
    setSaveError(null);
    setPhase("saving");
    const slowTimer = setTimeout(() => setSlowSave(true), SLOW_SAVE_MS);
    try {
      await saveCards({ drafts: drafts.filter((draft) => !draft.removed), note, transcript, profile, uid: user.uid });
      if (!live.current) return;
      setNote(null);
      setDrafts([]);
      setTranscript("");
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

  if (phase === "sending") return <SendingView stage={stage} />;

  if (phase === "send-error") {
    return (
      <section className="screen">
        <h1>Report</h1>
        <p className="message message-error" role="alert">{sendError.text}</p>
        {sendError.kind === "retry" && <button type="button" className="button button-primary" onClick={send}>Try again</button>}
        <button type="button" className="button button-secondary stacked" onClick={startOver}>{sendError.kind === "limit" ? "OK" : "Record again"}</button>
      </section>
    );
  }

  if (phase === "saved") {
    return (
      <section className="screen">
        <h1>Report</h1>
        <p className="message message-ok" role="status">Saved. Thank you.</p>
        <button type="button" className="button button-primary" onClick={startOver}>Record another</button>
      </section>
    );
  }

  if (phase === "cards" || phase === "saving") {
    const saving = phase === "saving";
    const active = drafts.filter((draft) => !draft.removed);
    const needed = active.reduce((sum, draft) => sum + fieldsToFix(draft).length, 0);
    let status = "Everything is answered.";
    if (active.length === 0) status = "Every card has been removed. Undo one, or record again.";
    else if (needed > 0) status = `${needed} more ${needed === 1 ? "answer" : "answers"} needed before you can save.`;

    return (
      <section className="screen">
        <h1>Check your report</h1>
        {note.practice && <p className="message message-practice">Practice result: made up, not from your recording.</p>}
        {!note.isReport && (
          <div className="panel">
            <p>This didn't sound like a report. Record again?</p>
            <button type="button" className="button button-primary" onClick={startOver}>Record again</button>
          </div>
        )}
        {note.isReport && (
          <fieldset className="plain-fieldset" disabled={saving}>
            {drafts.map((draft, index) => (
              <CaseCardForm key={index} draft={draft} number={index + 1} total={drafts.length} onChange={(next) => setDrafts((all) => all.map((item, i) => (i === index ? next : item)))} />
            ))}
          </fieldset>
        )}
        <NoteNotices note={note} transcript={transcript} onTranscriptChange={setTranscript} readOnly={!note.isReport || saving} />
        {note.isReport && (
          <div className="confirm-area">
            {saveError && <p className="message message-error" role="alert">{saveError}</p>}
            <p className="note" role="status">{saving && slowSave ? "Still saving. Waiting for a connection…" : status}</p>
            <button type="button" className="button button-primary" disabled={saving || active.length === 0 || needed > 0} onClick={confirm}>{saving ? "Saving…" : "Confirm and save"}</button>
            <button type="button" className="button button-secondary stacked" disabled={saving} onClick={startOver}>Record again</button>
          </div>
        )}
      </section>
    );
  }

  if (phase === "review") {
    return (
      <section className="screen">
        <h1>Report</h1>
        <p className="lead">Your note: {formatTime(Math.round(review.seconds))}. Play it back if you like, then send it.</p>
        <audio className="playback" controls controlsList="nodownload" src={review.url} />
        <button type="button" className="button button-primary" onClick={send}>Send</button>
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
      <div className="recorder">
        <RecordButton recording={isRecording} busy={phase === "starting" || phase === "preparing"} onStart={start} onStop={stop} />
        <p className="record-hint">{isRecording ? "Listening…" : "Hold while you speak, or tap to start and tap again to stop."}</p>
        <p className="timer" role="timer" aria-live="off">{formatTime(isRecording ? elapsed : 0)} / {formatTime(MAX_SECONDS)}</p>
        {isRecording && elapsed >= WARN_SECONDS && <p className="message message-check" role="status">{Math.max(0, Math.ceil(MAX_SECONDS - elapsed))} seconds left</p>}
        {phase === "preparing" && <p role="status">Preparing your note…</p>}
      </div>
      {help && (
        <div className="message message-error" role="alert">
          <p>{help.text}</p>
          {help.steps && <ul className="help-steps">{help.steps.map((step) => <li key={step}>{step}</li>)}</ul>}
        </div>
      )}
      {help && micProblem !== "too-short" && micProblem !== "unreadable" && <button type="button" className="button button-secondary" onClick={start}>Try again</button>}
    </section>
  );
}

function SendingView({ stage }) {
  const current = STAGES.findIndex((item) => item.id === stage);
  return (
    <section className="screen">
      <h1>Report</h1>
      <ol className="stages" aria-live="polite">
        {STAGES.map((item, index) => {
          let state = "is-waiting";
          if (index < current) state = "is-done";
          else if (index === current) state = "is-current";
          return <li key={item.id} className={state} aria-current={index === current ? "step" : undefined}>{item.label}</li>;
        })}
      </ol>
      <p className="note">This usually takes under a minute. Please keep this screen open.</p>
    </section>
  );
}
