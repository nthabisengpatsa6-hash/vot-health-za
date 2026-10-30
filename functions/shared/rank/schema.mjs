import {RANK_SETTINGS} from "./settings.mjs";

export const RANK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sources"],
  properties: {
    sources: {
      type: "array", maxItems: RANK_SETTINGS.maxRankedSources,
      items: {
        type: "object", additionalProperties: false,
        required: ["sourceId", "rank", "confidence", "supporting", "contradicting", "reason"],
        properties: {
          sourceId: {type: "string"},
          rank: {type: "integer", minimum: 1, maximum: RANK_SETTINGS.maxRankedSources},
          confidence: {type: "string", enum: ["low", "medium", "high"]},
          supporting: {type: "array", items: {type: "string"}},
          contradicting: {type: "array", items: {type: "string"}},
          reason: {type: "string", maxLength: RANK_SETTINGS.reasonMaxLength},
        },
      },
    },
  },
};
