const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {
  EXTRACT_MODEL,
  META_API_BASE_URL,
  MAX_AUDIO_BYTES,
  PRACTICE_STAGE_MS,
  SPARK_AUDIO_MODEL,
  TRANSCRIBE_MODEL,
} = require("./constants");
const {
  AudioFormatError,
  checkWav,
} = require("./lib/transcribe");
const {listenNote, buildNoteCards} = require("./lib/notePipeline");
const {nextPracticeResult, practiceModeOn} = require("./lib/practice");
const {errorDetails} = require("./lib/errorLog");
// Used as module objects so the tests can stand in for Firestore and the log.
const noteLimit = require("./lib/noteLimit");
const noteTiming = require("./lib/noteTiming");
const {FUNCTION_REGION} = require("./shared/runtime.mjs");

setGlobalOptions({maxInstances: 10});

const metaApiKey = defineSecret("META_API_KEY");
const basetenApiKey = defineSecret("BASETEN_API_KEY");
const {createDraftHandler, OPTIONS: draftOptions} = require("./lib/draftNotification");
exports.draftNotification = onCall(
    {...draftOptions, secrets: [basetenApiKey]},
    createDraftHandler({apiKey: () => basetenApiKey.value()}),
);

const {createRankHandler, OPTIONS: rankOptions} = require("./lib/rankSources");
exports.rankSources = onCall(
    {...rankOptions, secrets: [metaApiKey]},
    createRankHandler({apiKey: () => metaApiKey.value()}),
);

// Confirms the Meta API key works by listing the models it can access.
// Returns only the model IDs; the key and request headers are never
// returned or logged.
exports.checkMetaConnection = onCall(
    {region: "africa-south1", secrets: [metaApiKey]},
    async (request) => {
      // Like every function that uses the key: signed-in callers only.
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please sign in to check the Meta connection.",
        );
      }
      let response;
      try {
        response = await fetch(`${META_API_BASE_URL}/models`, {
          headers: {Authorization: `Bearer ${metaApiKey.value()}`},
        });
      } catch (err) {
        logger.error(
            "Could not reach the Meta API",
            errorDetails(err, {uid: request.auth.uid}),
        );
        throw new HttpsError("unavailable", "Could not reach the Meta API.");
      }

      if (!response.ok) {
        logger.error("Meta API returned an error", {status: response.status});
        throw new HttpsError(
            "internal",
            `Meta API returned status ${response.status}.`,
        );
      }

      const body = await response.json();
      if (!Array.isArray(body.data)) {
        logger.error("Unexpected Meta API response shape", {
          keys: Object.keys(body),
        });
        throw new HttpsError("internal", "Unexpected Meta API response.");
      }

      return body.data.map((model) => model.id);
    },
);

// Decodes the browser's base64 WAV and checks it before any model call.
// The size is checked before decoding too, so an oversized upload is never
// held in memory twice. Returns the WAV and its length.
function decodeAudio(data) {
  const audioBase64 = data && data.audioBase64;
  if (typeof audioBase64 !== "string" || audioBase64.length === 0) {
    throw new HttpsError("invalid-argument", "No audio was sent.");
  }
  const tooLarge = "The recording is larger than " +
      `${MAX_AUDIO_BYTES / 1024 / 1024} MB.`;
  if (audioBase64.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4) {
    throw new HttpsError("invalid-argument", tooLarge);
  }
  const wav = Buffer.from(audioBase64, "base64");
  if (wav.length > MAX_AUDIO_BYTES) {
    throw new HttpsError("invalid-argument", tooLarge);
  }
  try {
    const {durationMs} = checkWav(wav);
    return {wav, durationMs};
  } catch (err) {
    if (err instanceof AudioFormatError) {
      throw new HttpsError("invalid-argument", err.message);
    }
    throw err;
  }
}

// What one ear did, for the logs: timing, attempts and why it failed, never
// what it heard. Meta's error text is left out because it could echo
// request details.
function earLog(result) {
  if (!result) return null;
  const detail = (result.ok ? result.value : result.error) || {};
  return {
    ok: result.ok,
    ms: result.ms,
    attempts: detail.attempts || null,
    kind: result.ok ? null : detail.kind || "error",
    status: result.ok ? null : detail.status || null,
  };
}

// Counts the note against the caller's daily limit before anything is spent
// on it. If the counter can't be reached, the note is refused rather than
// let through uncounted.
async function takeDailyPlace(uid, timing) {
  let usage;
  try {
    usage = await noteLimit.reserveNote(uid);
  } catch (err) {
    timing.outcome = "counter_failed";
    logger.error("Daily note counter failed", errorDetails(err, {uid}));
    throw new HttpsError(
        "unavailable",
        "The voice note couldn't be sent. Please try again.",
    );
  }
  if (!usage.allowed) {
    timing.outcome = "limit";
    if (usage.reason === "app-note-limit") {
      const {PRODUCT_NAME} = await import("./shared/product.mjs");
      throw new HttpsError("resource-exhausted",
          `${PRODUCT_NAME} has reached today's limit for live notes. Try again after midnight, or explore the replay.`,
          {reason: "app-note-limit"});
    }
    throw new HttpsError(
        "resource-exhausted",
        "Daily limit reached. Try again tomorrow.",
    );
  }
}

// Tells the app which stage the note has reached, so its progress messages
// are true. A lost progress message must never fail the note. run() in the
// unit tests passes no response.
function sendStage(response, stage) {
  if (!response) return;
  response.sendChunk({stage}).catch(() => {});
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Local emulators only: a prepared, made-up result instead of the Meta calls,
// with each stage held long enough to see.
async function practiceNote(response) {
  await pause(PRACTICE_STAGE_MS);
  sendStage(response, "building");
  await pause(PRACTICE_STAGE_MS);
  return nextPracticeResult();
}

// An ear whose last attempt ran out of time.
function timedOut(result) {
  return Boolean(result && !result.ok && result.error &&
      result.error.kind === "timeout");
}

// One note, from the sign-in check to the cards, filling in `timing` as it
// goes. Each refusal or failure sets the note's outcome code before it
// throws.
async function handleNote(request, response, timing) {
  // Every function that calls a model requires sign-in, so nobody who
  // merely finds the endpoint can spend the API credits.
  if (!request.auth) {
    timing.outcome = "signed_out";
    throw new HttpsError(
        "unauthenticated",
        "Please sign in to send a voice note.",
    );
  }
  // The handler runs only once the whole request has arrived, so this first
  // message tells the app when the upload finished (its ?timing=1 line). It
  // carries nothing else, and the screen ignores it.
  sendStage(response, "received");

  let audio;
  try {
    audio = decodeAudio(request.data);
  } catch (err) {
    timing.outcome = err instanceof HttpsError ? "bad_audio" : "error";
    throw err;
  }
  const {wav} = audio;
  timing.audioBytes = wav.length;
  timing.audioSeconds = Math.round(audio.durationMs / 100) / 10;

  await takeDailyPlace(request.auth.uid, timing);
  if (practiceModeOn()) return practiceNote(response);

  const apiKey = metaApiKey.value();
  timing.asrModel = TRANSCRIBE_MODEL;
  timing.audioEarModel = SPARK_AUDIO_MODEL;
  let heard;
  try {
    heard = await listenNote(wav, {apiKey});
  } catch (err) {
    const ears = err.ears || {};
    noteTiming.recordEars(timing, ears);
    timing.outcome = timedOut(ears.voice) && timedOut(ears.spark) ?
        "asr_timeout" : "asr_failed";
    logger.error("Both transcriptions failed", {
      voice: earLog(ears.voice),
      spark: earLog(ears.spark),
    });
    throw new HttpsError(
        "unavailable",
        "The voice note couldn't be transcribed. Please try again.",
    );
  }
  noteTiming.recordEars(timing, heard.ears);

  sendStage(response, "building");
  const {voice, spark} = heard.ears;
  // The card is still built, from the other ear; this says why one failed.
  if (heard.singleSource) {
    logger.warn("One transcription failed", {
      voice: earLog(voice),
      spark: earLog(spark),
    });
  }
  timing.extractModel = EXTRACT_MODEL;
  const extractStarted = performance.now();
  let extraction;
  try {
    extraction = await buildNoteCards(heard, {apiKey});
  } catch (err) {
    timing.extractMs = noteTiming.msSince(extractStarted);
    timing.extractRetries = noteTiming.retriesFrom(err.attempts);
    timing.outcome = err.kind === "timeout" ?
        "extract_timeout" : "extract_failed";
    logger.error("Card extraction failed", {
      voice: earLog(voice),
      spark: earLog(spark),
      extraction: {
        kind: err.kind || "error",
        status: err.status || null,
        attempts: err.attempts || null,
        attemptMs: err.attemptMs || null,
      },
    });
    throw new HttpsError(
        "internal",
        "The case card couldn't be built. Please try again.",
    );
  }
  timing.extractMs = noteTiming.msSince(extractStarted);
  timing.extractRetries = noteTiming.retriesFrom(extraction.attempts);
  // Two empty transcripts make no model call.
  if (extraction.attempts === 0) timing.extractModel = null;
  return {...extraction.reply, singleSource: heard.singleSource};
}

// Turns one push-to-talk voice note (a 24 kHz WAV, base64-encoded by the
// browser) into draft case cards. Two "ears" transcribe it in parallel and
// Muse Spark 1.3 builds the cards from both transcripts. Audio and raw
// transcripts live only in memory for this call; logs carry timings,
// attempts and failure kinds only, with one "note_timing" line per call.
exports.processNote = onCall(
    // Each ear and the card step allow two 60 s attempts with a 1 s pause,
    // and the ears run side by side, so the worst case is about 243 s and
    // 300 s covers it. The browser's callable timeout must be at least this.
    // Each note holds about 30 MB (40 MB at the 120 s cap). Running out of
    // memory fails every note on the instance, so 1 GiB keeps 8 at once well
    // clear of it. At most 5 instances, as a cap on spending alongside the
    // daily limit, and none kept warm.
    {
      region: FUNCTION_REGION,
      secrets: [metaApiKey],
      timeoutSeconds: 300,
      memory: "1GiB",
      concurrency: 8,
      maxInstances: 5,
      minInstances: 0,
    },
    async (request, response) => {
      const timing = noteTiming.startNoteTiming();
      try {
        const reply = await handleNote(request, response, timing);
        timing.outcome = reply.practice ? "practice" : "ok";
        timing.cardCount = reply.cards.length;
        timing.noteMs = noteTiming.msSince(timing.started);
        // The server's time, for the app's ?timing=1 line.
        return {...reply, noteMs: timing.noteMs};
      } catch (err) {
        if (!timing.outcome) timing.outcome = "error";
        throw err;
      } finally {
        if (timing.noteMs === undefined) {
          timing.noteMs = noteTiming.msSince(timing.started);
        }
        noteTiming.write(noteTiming.noteTimingEntry(timing));
      }
    },
);
