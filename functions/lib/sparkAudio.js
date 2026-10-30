const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {SPARK_AUDIO_MODEL, SPARK_AUDIO_EFFORT} = require("../constants");
const {
  assertStandardModel,
  readChatReply,
  requestWithRetry,
} = require("./metaRequest");
const {checkWav} = require("./transcribe");

// Kept in its own file so the wording can be tuned without touching code.
const PROMPT = readFileSync(
    join(__dirname, "..", "prompts", "spark-audio.md"),
    "utf8",
).trim();

// STOP 3 selected minimal after the scored 1.2 audio comparison. Reasoning
// tokens count toward the limit, so 4000 leaves room for a full transcript.
const REASONING_EFFORT = SPARK_AUDIO_EFFORT;
const MAX_COMPLETION_TOKENS = 4000;

// The second "ear": Muse Spark hears the audio directly. It understands mixed
// Sesotho and English better than Voice Transcribe but may drop or invent
// phrases, which is why the card step compares the two. Logs nothing.
async function transcribeWithSpark(wavBuffer, {
  apiKey,
  model = SPARK_AUDIO_MODEL,
  fetch,
  attemptTimeoutMs,
  retryDelayMs,
  signal,
  effort = REASONING_EFFORT,
  prompt = PROMPT,
} = {}) {
  if (!apiKey) {
    throw new Error("No Meta API key was provided.");
  }
  assertStandardModel(model);
  checkWav(wavBuffer);

  const body = JSON.stringify({
    model,
    reasoning_effort: effort,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    messages: [{
      role: "user",
      content: [
        {type: "text", text: prompt},
        {
          type: "input_audio",
          input_audio: {data: wavBuffer.toString("base64"), format: "wav"},
        },
      ],
    }],
  });
  const {value, ...timing} = await requestWithRetry({
    label: "Muse Spark transcription",
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
    signal,
  });
  return {
    transcript: value.text.trim(),
    model,
    finishReason: value.finishReason,
    usage: value.usage,
    ...timing,
  };
}

exports.transcribeWithSpark = transcribeWithSpark;
exports.PROMPT = PROMPT;
