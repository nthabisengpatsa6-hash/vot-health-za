import { useRef, useState } from "react";
import { MicIcon } from "./Icons";

// A press shorter than this is a tap; longer is a hold.
const HOLD_MS = 400;
// A click this soon after a press is the same press, already handled.
const SAME_PRESS_MS = 1000;

// One large button for both ways of recording: hold it while speaking and
// let go to stop, or tap once to start and again to stop, because holding is
// awkward for some people. Keyboard and screen-reader activation arrive as a
// plain click and work like a tap.
export default function RecordButton({ recording, busy, onStart, onStop }) {
  const press = useRef(null);
  const lastPressEnd = useRef(0);
  const [holding, setHolding] = useState(false);

  function handlePointerDown(event) {
    if (event.button !== 0 || busy) return;
    event.preventDefault();
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
    press.current = { at: performance.now(), wasRecording: recording };
    if (!recording) {
      setHolding(true);
      onStart();
    }
  }

  function handlePointerEnd() {
    const current = press.current;
    if (!current) return;
    press.current = null;
    lastPressEnd.current = performance.now();
    setHolding(false);
    if (current.wasRecording) {
      onStop();
      return;
    }
    // Letting go stops a hold only if recording had really started: a
    // permission prompt takes the finger off the button, and that press
    // becomes a tap.
    if (recording && performance.now() - current.at >= HOLD_MS) onStop();
  }

  function handleClick() {
    if (busy || performance.now() - lastPressEnd.current < SAME_PRESS_MS) return;
    if (recording) onStop();
    else onStart();
  }

  let label = "Hold to record";
  if (busy) label = "Starting…";
  else if (recording) label = holding ? "Let go to stop" : "Tap to stop";

  // The circle and its label are one button, so the label stays its name.
  return (
    <button type="button" className={`record-button${recording ? " is-recording" : ""}`} onPointerDown={handlePointerDown} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onClick={handleClick} onContextMenu={(event) => event.preventDefault()}>
      <span className="record-circle">
        <MicIcon />
      </span>
      <span className="record-label">{label}</span>
    </button>
  );
}
