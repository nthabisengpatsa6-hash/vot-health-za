const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {META_API_BASE_URL, MAX_AUDIO_BYTES} = require("./constants");
const {AudioFormatError, transcribeWav} = require("./lib/transcribe");

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

// Turns one push-to-talk voice note (a WAV, base64-encoded by the browser)
// into text. The audio lives only in memory for this call and is never
// stored; logs carry timings only, never audio or transcript.
exports.transcribeNote = onCall(
    {region: "africa-south1", secrets: [metaApiKey], timeoutSeconds: 90},
    async (request) => {
      // Every function that calls a model requires sign-in, so nobody who
      // merely finds the endpoint can spend the API credits.
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please sign in to send a voice note.",
        );
      }

      const audioBase64 = request.data && request.data.audioBase64;
      if (typeof audioBase64 !== "string" || audioBase64.length === 0) {
        throw new HttpsError("invalid-argument", "No audio was sent.");
      }
      const tooLarge = "The recording is larger than " +
          `${MAX_AUDIO_BYTES / 1024 / 1024} MB.`;
      // Checking the text length first avoids decoding an oversized upload.
      if (audioBase64.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4) {
        throw new HttpsError("invalid-argument", tooLarge);
      }
      const wav = Buffer.from(audioBase64, "base64");
      if (wav.length > MAX_AUDIO_BYTES) {
        throw new HttpsError("invalid-argument", tooLarge);
      }

      let result;
      try {
        result = await transcribeWav(wav, {apiKey: metaApiKey.value()});
      } catch (err) {
        if (err instanceof AudioFormatError) {
          throw new HttpsError("invalid-argument", err.message);
        }
        // Only the status: Meta's error text could echo request details.
        logger.error("Transcription failed", {status: err.status || null});
        throw new HttpsError(
            "internal",
            "Transcription failed. Please try again.",
        );
      }

      logger.info("Transcribed a voice note", {
        durationMs: result.durationMs,
        latencyMs: result.latencyMs,
      });
      return {transcript: result.transcript, durationMs: result.durationMs};
    },
);
