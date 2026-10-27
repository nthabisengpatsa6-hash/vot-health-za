const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {META_API_BASE_URL} = require("./constants");

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
