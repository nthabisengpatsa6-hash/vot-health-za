const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {EXTRACT_EFFORT, EXTRACT_MODEL} = require("../constants");
const {PRODUCT_NAME} = require("../shared/product.mjs");
const {terms: LOCAL_TERMS} = require("../data/local-terms.json");
const {
  assertStandardModel,
  failure,
  readChatReply,
  requestWithRetry,
} = require("./metaRequest");
const {
  AGE_GROUPS,
  AREA_NAMES,
  REPLY_SCHEMA,
  SYMPTOM_GROUPS,
  TOWN,
  cleanReply,
} = require("./cardSchema");

const EFFORTS = ["minimal", "low", "medium", "high"];
// Reasoning tokens count toward this limit, and a cut-off card is a failure,
// so leave plenty of room even at "medium".
const MAX_COMPLETION_TOKENS = 8000;

const listLines = (entries) =>
  entries.map(([key, meaning]) => `  - ${key}: ${meaning}`).join("\n");

// The prompt lives in its own file so it can be tuned without touching code.
// The lists are filled in from cardSchema so each exists in one place; a
// placeholder left unfilled means the template and the code disagree.
function buildSystemPrompt(template = readFileSync(
      join(__dirname, "..", "prompts", "extract-card.md"),
      "utf8",
  )) {
  const values = {
    PRODUCT_NAME,
    LOCAL_TERMS: JSON.stringify(LOCAL_TERMS),
    TOWN,
    AREAS: AREA_NAMES.map((name) => `- ${name}`).join("\n"),
    SYMPTOM_GROUPS: listLines(Object.entries(SYMPTOM_GROUPS)),
    AGE_GROUPS: listLines(Object.entries(AGE_GROUPS)),
  };
  const prompt = template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
    if (!Object.hasOwn(values, key)) {
      throw new Error(`The extraction prompt has an unknown ${placeholder}.`);
    }
    return values[key];
  });
  return prompt.trim();
}

const SYSTEM_PROMPT = buildSystemPrompt();

function userMessage(transcriptA, transcriptB) {
  const block = (label, text) => `${label}:\n<<<\n${text}\n>>>`;
  if (transcriptA && transcriptB) {
    return [
      block("Transcript A (Muse Voice Transcribe)", transcriptA),
      block("Transcript B (Muse Spark audio)", transcriptB),
    ].join("\n\n");
  }
  const [label, text] = transcriptA ?
      ["Transcript A (Muse Voice Transcribe)", transcriptA] :
      ["Transcript B (Muse Spark audio)", transcriptB];
  return "Only one transcript is available, because the other " +
      `transcription failed.\n\n${block(label, text)}`;
}

// Turns one or two transcripts of the same note into draft case cards with
// Muse Spark 1.3 (text), then runs every code guard over the reply. Logs
// nothing: transcripts and cards must never reach a log.
async function extractCard({transcriptA = null, transcriptB = null}, {
  apiKey,
  effort = EXTRACT_EFFORT,
  model = EXTRACT_MODEL,
  fetch,
  attemptTimeoutMs,
  retryDelayMs,
  prompt = SYSTEM_PROMPT,
  schema = REPLY_SCHEMA,
  request = requestWithRetry,
  validateRaw,
  includeRaw = false,
} = {}) {
  if (!apiKey) {
    throw new Error("No Meta API key was provided.");
  }
  assertStandardModel(model);
  if (!EFFORTS.includes(effort)) {
    throw new Error(`Reasoning effort must be one of: ${EFFORTS.join(", ")}.`);
  }
  const a = typeof transcriptA === "string" ? transcriptA.trim() : "";
  const b = typeof transcriptB === "string" ? transcriptB.trim() : "";
  // Silence, or a note both ears heard as nothing, isn't worth a model call.
  if (!a && !b) {
    return {
      reply: {
        isReport: false,
        cards: [],
        notifiableConditionMentioned: null,
        adviceRequested: false,
        transcriptClean: "",
        disagreements: [],
      },
      latencyMs: 0,
      attempts: 0,
      attemptMs: [],
      failures: [],
      usage: null,
    };
  }

  const body = JSON.stringify({
    model,
    reasoning_effort: effort,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    response_format: {
      type: "json_schema",
      json_schema: {name: "case_cards", strict: true, schema},
    },
    messages: [
      {role: "system", content: prompt},
      {role: "user", content: userMessage(a, b)},
    ],
  });
  const {value, ...timing} = await request({
    label: "Card extraction",
    path: "/chat/completions",
    buildInit: () => ({
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    }),
    readReply: readChatReply,
    fetch,
    attemptTimeoutMs,
    retryDelayMs,
  });

  try {
    let raw;
    try {
      raw = JSON.parse(value.text);
    } catch {
      throw failure("bad-reply", "the card reply isn't valid JSON");
    }
    if (validateRaw) validateRaw(raw, schema);
    const reply = cleanReply(raw, {transcripts: [a, b].filter(Boolean)});
    return {reply, ...(includeRaw ? {raw} : {}), usage: value.usage, ...timing};
  } catch (err) {
    Object.assign(err, timing);
    err.usage = value.usage;
    if (includeRaw) err.rawOutput = value.text;
    throw err;
  }
}

exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
exports.buildSystemPrompt = buildSystemPrompt;
exports.userMessage = userMessage;
exports.extractCard = extractCard;
