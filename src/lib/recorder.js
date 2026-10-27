// The microphone and MediaRecorder. The recording is held in memory only.

export const MAX_SECONDS = 90;

// What went wrong with the microphone, as a kind the screen turns into
// plain words: "blocked", "no-microphone", "busy", "unsupported" or "failed".
export class MicrophoneError extends Error {
  constructor(kind) {
    super(`microphone: ${kind}`);
    this.name = "MicrophoneError";
    this.kind = kind;
  }
}

const ERROR_KINDS = {
  NotAllowedError: "blocked",
  SecurityError: "blocked",
  PermissionDeniedError: "blocked",
  NotFoundError: "no-microphone",
  DevicesNotFoundError: "no-microphone",
  OverconstrainedError: "no-microphone",
  NotReadableError: "busy",
  TrackStartError: "busy",
};

export function canRecord() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

// Asks for the microphone and starts recording. Returns { stop, cancel }:
// stop() resolves with the recording as a Blob; cancel() throws it away.
// Either one releases the microphone, so the phone's recording indicator
// goes off.
export async function startRecording() {
  if (!canRecord()) throw new MicrophoneError("unsupported");
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    throw new MicrophoneError(ERROR_KINDS[err && err.name] || "failed");
  }

  // No format is chosen: each browser records in its own default (webm/Opus
  // on Android Chrome, mp4/AAC on iPhone Safari), which it can always decode
  // again. Choosing one can pick a format the browser lists but can't decode.
  let recorder;
  try {
    recorder = new MediaRecorder(stream);
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new MicrophoneError("unsupported");
  }
  let chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  const finished = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const type = recorder.mimeType || (chunks[0] && chunks[0].type) || "";
      resolve(new Blob(chunks, { type }));
      chunks = [];
    };
    recorder.onerror = (event) => reject(event.error || new Error("The recording failed."));
  });
  const release = () => stream.getTracks().forEach((track) => track.stop());
  recorder.start();

  return {
    async stop() {
      if (recorder.state !== "inactive") recorder.stop();
      try {
        return await finished;
      } finally {
        release();
      }
    },
    cancel() {
      finished.catch(() => {});
      if (recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
}
