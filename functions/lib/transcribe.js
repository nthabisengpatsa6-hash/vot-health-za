const {
  META_API_BASE_URL,
  TRANSCRIBE_MODEL,
  MAX_AUDIO_SECONDS,
} = require("../constants");

const ALLOWED_SAMPLE_RATES = [16000, 24000];
const PCM_FORMAT = 1;

// One retry covers the dropped connections and slow spells seen in testing.
// 60 s per attempt sits above the slowest successful call (51 s).
const ATTEMPT_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
// Rate limiting and server-side failures are usually temporary; any other
// 4xx means the request itself is wrong, so retrying can't help.
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

// Thrown when the recording itself is wrong, so callers can tell the user to
// fix the audio rather than retry.
class AudioFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = "AudioFormatError";
  }
}

// Checks a WAV is what Muse Voice Transcribe accepts before we spend an API
// call on it. Returns the sample rate and length in milliseconds.
function checkWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 ||
      buffer.toString("ascii", 0, 4) !== "RIFF" ||
      buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new AudioFormatError(
        "This isn't a WAV file. Convert the recording to WAV first.",
    );
  }

  let format = null;
  let dataBytes = 0;
  let offset = 12;
  // A WAV is a list of chunks, and ffmpeg and others add extra ones (such as
  // LIST metadata) before the audio, so walk them instead of assuming a
  // fixed 44-byte header.
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      if (size < 16 || body + 16 > buffer.length) {
        throw new AudioFormatError("The WAV file's header is damaged.");
      }
      format = {
        audioFormat: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      // Some recorders never fill in the size, so trust the bytes we have.
      dataBytes = Math.min(size, buffer.length - body);
      break;
    }
    // Chunks are padded to an even length.
    offset = body + size + (size % 2);
  }

  if (!format) {
    throw new AudioFormatError(
        "The WAV file has no format section, so it can't be read.",
    );
  }
  if (format.audioFormat !== PCM_FORMAT) {
    throw new AudioFormatError(
        "The recording must be plain PCM audio; this one is compressed " +
        "or floating-point.",
    );
  }
  if (format.channels !== 1) {
    throw new AudioFormatError(
        "The recording must be mono (1 channel); this one has " +
        `${format.channels} channels.`,
    );
  }
  if (format.bitsPerSample !== 16) {
    throw new AudioFormatError(
        "The recording must be 16-bit; this one is " +
        `${format.bitsPerSample}-bit.`,
    );
  }
  if (!ALLOWED_SAMPLE_RATES.includes(format.sampleRate)) {
    throw new AudioFormatError(
        "The recording must be 16000 or 24000 Hz; this one is " +
        `${format.sampleRate} Hz.`,
    );
  }
  if (dataBytes === 0) {
    throw new AudioFormatError("The WAV file has no audio in it.");
  }

  const durationMs = Math.round(dataBytes / (format.sampleRate * 2) * 1000);
  if (durationMs > MAX_AUDIO_SECONDS * 1000) {
    throw new AudioFormatError(
        `The recording is ${(durationMs / 1000).toFixed(1)} seconds long; ` +
        `the limit is ${MAX_AUDIO_SECONDS} seconds.`,
    );
  }
  return {sampleRate: format.sampleRate, durationMs};
}

// Meta's errors carry a short client-safe message; keep only that.
async function readErrorMessage(response) {
  const text = await response.text();
  try {
    const body = JSON.parse(text);
    const message = (body.error && body.error.message) || body.message;
    if (message) return String(message).slice(0, 200);
  } catch {
    // Not JSON, so fall back to the raw text.
  }
  return text.slice(0, 200) || "no details";
}

// Tags an error with what went wrong ("network", "timeout", "http" or
// "bad-reply"), so the retry decision and the logs don't parse messages.
function failure(kind, message, status) {
  const err = new Error(message);
  err.kind = kind;
  if (status) err.status = status;
  return err;
}

function shouldRetry(err) {
  return err.kind === "network" || err.kind === "timeout" ||
      (err.kind === "http" && RETRYABLE_STATUSES.includes(err.status));
}

// FormData is built fresh for each attempt rather than reused after a
// failed upload.
function buildForm(requestJson, wavBuffer) {
  const form = new FormData();
  form.append("request", new Blob([requestJson], {type: "application/json"}));
  form.append(
      "audio",
      new Blob([wavBuffer], {type: "audio/wav"}),
      "note.wav",
  );
  return form;
}

// One request to the file endpoint. The timer covers reading the reply too,
// because a stalled body is as stuck as a stalled connection.
async function attemptTranscription(fetchImpl, form, apiKey, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetchImpl(`${META_API_BASE_URL}/asr/transcribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw failure(
          "http",
          `Meta API returned status ${response.status}: ` +
          await readErrorMessage(response),
          response.status,
      );
    }
    return await response.json();
  } catch (err) {
    if (err.kind) throw err;
    if (timedOut) {
      throw failure(
          "timeout",
          `the attempt took longer than ${timeoutMs / 1000} seconds`,
      );
    }
    if (err instanceof SyntaxError) {
      throw failure("bad-reply", "Meta API sent a reply that isn't JSON");
    }
    // fetch's own message is just "fetch failed"; the cause says why.
    const cause = err.cause ? `: ${err.cause.code || err.cause.message}` : "";
    throw failure("network", `the connection failed (${err.message}${cause})`);
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sends one WAV voice note to Muse Voice Transcribe and returns the text,
// retrying once on a dropped connection, a timeout or a temporary HTTP error.
// Deliberately logs nothing: the key, audio and transcript must never reach
// a log. `fetch`, `attemptTimeoutMs` and `retryDelayMs` exist for tests.
async function transcribeWav(wavBuffer, {
  apiKey,
  keywords = [],
  languageBias = [],
  fetch: fetchImpl = globalThis.fetch,
  attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
  retryDelayMs = RETRY_DELAY_MS,
} = {}) {
  if (!apiKey) {
    throw new Error("No Meta API key was provided.");
  }
  const wav = checkWav(wavBuffer);

  const request = {
    mode: "PUSH_TO_TALK",
    model: TRANSCRIBE_MODEL,
    audioEncoding: "WAV",
  };
  // The server silently ignores fields it doesn't recognise, so send hints
  // only when there are some; an empty list would look like a working hint.
  if (keywords.length > 0) request.keywords = keywords;
  if (languageBias.length > 0) request.languageBias = languageBias;
  const requestJson = JSON.stringify(request);

  const started = performance.now();
  const attemptMs = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const attemptStarted = performance.now();
    try {
      const body = await attemptTranscription(
          fetchImpl,
          buildForm(requestJson, wavBuffer),
          apiKey,
          attemptTimeoutMs,
      );
      attemptMs.push(Math.round(performance.now() - attemptStarted));
      return {
        transcript: typeof body.transcript === "string" ? body.transcript : "",
        durationMs: body.audioDurationMs ?? wav.durationMs,
        turns: Array.isArray(body.turns) ? body.turns : [],
        latencyMs: Math.round(performance.now() - started),
        attempts: attempt,
        attemptMs,
      };
    } catch (err) {
      attemptMs.push(Math.round(performance.now() - attemptStarted));
      if (attempt === MAX_ATTEMPTS || !shouldRetry(err)) {
        if (attempt > 1) {
          err.message =
              `Transcription failed after ${attempt} attempts: ${err.message}.`;
        }
        err.attempts = attempt;
        err.attemptMs = attemptMs;
        throw err;
      }
      await sleep(retryDelayMs);
    }
  }
}

exports.AudioFormatError = AudioFormatError;
exports.checkWav = checkWav;
exports.transcribeWav = transcribeWav;
