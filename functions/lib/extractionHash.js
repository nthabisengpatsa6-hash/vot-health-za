const {createHash} = require("node:crypto");
const {SYSTEM_PROMPT} = require("./extractCard");
const {PROMPT} = require("./sparkAudio");
const {REPLY_SCHEMA} = require("./cardSchema");
const {NOTE_KEYWORDS} = require("./notePipeline");
const settings = require("../constants");

function extractionHash({prompt = SYSTEM_PROMPT, schema = REPLY_SCHEMA,
  keywords = NOTE_KEYWORDS, audioPrompt = PROMPT,
  audioModel = settings.SPARK_AUDIO_MODEL, audioEffort = settings.SPARK_AUDIO_EFFORT,
  uncertainWords = settings.UNCERTAIN_WORDS} = {}) {
  return createHash("sha256").update(JSON.stringify({version: 2,
    prompt, schema, keywords, audioPrompt, transcribeModel: settings.TRANSCRIBE_MODEL, audioModel, audioEffort,
    extractModel: settings.EXTRACT_MODEL, extractEffort: settings.EXTRACT_EFFORT,
    extractCap: 8000, audioCap: 4000, uncertainWords,
    markerMapping: "two-anchors-each-side-unique-v1", provider: settings.EXTRACTION_PROVIDER,
  })).digest("hex").slice(0, 16);
}
exports.extractionHash = extractionHash;
