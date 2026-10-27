const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {META_API_BASE_URL, MAX_AUDIO_BYTES} = require("./constants");
const {
  AudioFormatError,
  checkWav,
  transcribeWav,
} = require("./lib/transcribe");
const {transcribeWithSpark} = require("./lib/sparkAudio");
const {extractCard} = require("./lib/extractCard");
const {listenWithTwoEars} = require("./lib/twoEars");
const {PLACE_KEYWORDS} = require("./lib/cardSchema");

setGlobalOptions({maxInstances: 10});

const metaApiKey = defineSecret("META_API_KEY");

// Confirms the Meta API key works by listing the models it can access.
// Returns only the model IDs; the key and request headers are never
// returned or logged.
exports.checkMetaConnection = onCall(
    {region: "africa-south1", secrets: [metaApiKey]},
    async () => {
      let response;
      try {
        response = await fetch(`${META_API_BASE_URL}/models`, {
          headers: {Authorization: `Bearer ${metaApiKey.value()}`},
        });
      } catch (err) {
        logger.error("Could not reach the Meta API", {message: err.message});
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
// held in memory twice.
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
    checkWav(wav);
  } catch (err) {
    if (err instanceof AudioFormatError) {
      throw new HttpsError("invalid-argument", err.message);
    }
    throw err;
  }
  return wav;
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

// Turns one push-to-talk voice note (a 24 kHz WAV, base64-encoded by the
// browser) into draft case cards. Two "ears" transcribe it in parallel and
// Muse Spark 1.3 builds the cards from both transcripts. Audio and raw
// transcripts live only in memory for this call; logs carry timings and
// attempts only.
exports.processNote = onCall(
    // Each ear and the card step allow two 60 s attempts, and the ears run
    // side by side, so 300 s covers both stages plus decoding. The browser's
    // callable timeout must be at least this.
    {region: "africa-south1", secrets: [metaApiKey], timeoutSeconds: 300},
    async (request) => {
      // Every function that calls a model requires sign-in, so nobody who
      // merely finds the endpoint can spend the API credits.
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please sign in to send a voice note.",
        );
      }
      const wav = decodeAudio(request.data);
      const apiKey = metaApiKey.value();
      const started = performance.now();

      let heard;
      try {
        heard = await listenWithTwoEars({
          // Place names are what Voice Transcribe would otherwise mishear
          // (decision, 27 Oct). No language hint.
          voice: (signal) => transcribeWav(wav, {
            apiKey,
            keywords: PLACE_KEYWORDS,
            signal,
          }),
          spark: (signal) => transcribeWithSpark(wav, {apiKey, signal}),
        });
      } catch (err) {
        const ears = err.ears || {};
        logger.error("Both transcriptions failed", {
          voice: earLog(ears.voice),
          spark: earLog(ears.spark),
        });
        throw new HttpsError(
            "unavailable",
            "The voice note couldn't be transcribed. Please try again.",
        );
      }

      const {voice, spark} = heard.ears;
      let extraction;
      try {
        extraction = await extractCard({
          transcriptA: voice.ok ? voice.value.transcript : null,
          transcriptB: spark.ok ? spark.value.transcript : null,
        }, {apiKey});
      } catch (err) {
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

      logger.info("Processed a voice note", {
        totalMs: Math.round(performance.now() - started),
        singleSource: heard.singleSource,
        voice: earLog(voice),
        spark: earLog(spark),
        extraction: {
          ms: extraction.latencyMs,
          attempts: extraction.attempts,
        },
      });
      return {...extraction.reply, singleSource: heard.singleSource};
    },
);
