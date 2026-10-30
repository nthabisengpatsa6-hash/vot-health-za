// Behaviour settings are frozen only after the tuning results are reviewed.
export const RANK_SETTINGS = Object.freeze({
  provider: "meta",
  model: "muse-spark-1.3",
  effort: "low",
  temperature: 0,
  maxCompletionTokens: 8000,
  timeoutMs: 60000,
  maxSources: 8,
  maxCards: 40,
  maxRankedSources: 4,
  reasonMaxLength: 160,
});

export const PROVIDERS = Object.freeze({
  meta: Object.freeze({baseUrl: "https://api.meta.ai/v1", model: "muse-spark-1.3"}),
  baseten: Object.freeze({baseUrl: "https://inference.baseten.co/v1", model: "meta-models/muse-spark-open-1026"}),
});

export const BANNED_WORDS = Object.freeze([
  "outbreak", "epidemic", "antibiotic", "antibiotics", "medication", "medications",
  "dose", "doses", "dosage", "blame", "fault", "guilty", "mayor", "minister",
  "councillor", "councilor", "MEC",
]);
export const BANNED_PREFIXES = Object.freeze(["diagnos", "prescri", "negligen", "culpab"]);

// Public Standard-mode pricing checked 30 Oct 2026; no cached-input discount assumed.
// https://dev.meta.ai/docs/pricing-rate-limits
export const META_PRICES = Object.freeze({inputPerMillion: 1.25, outputPerMillion: 4.25, checked: "2026-10-30"});
