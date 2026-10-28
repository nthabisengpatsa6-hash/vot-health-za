import { useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "./Icons";
import Waveform from "./Waveform";

// The recorded note: a play button, its waveform and its length. It plays the
// in-memory WAV that will be sent, with no download option. Without a url
// (the audio has been dropped once the cards arrived) it's a still summary
// with no play button.
export default function VoiceNoteRow({ url, peaks, duration }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const element = audio.current;
    if (element.paused) element.play().catch(() => setPlaying(false));
    else element.pause();
  }

  return (
    <div className="voice-note">
      {url && (
        <>
          <button type="button" className="play-button" aria-label={playing ? "Pause" : "Play your note"} onClick={toggle}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
          <audio ref={audio} src={url} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
        </>
      )}
      <Waveform peaks={peaks} />
      <span className="voice-duration">{duration}</span>
    </div>
  );
}
