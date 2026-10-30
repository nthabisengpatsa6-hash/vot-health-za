const {transcribeWav} = require("./transcribe");
const {transcribeWithSpark} = require("./sparkAudio");
const {extractCard} = require("./extractCard");
const {listenWithTwoEars} = require("./twoEars");
const {PLACE_KEYWORDS} = require("./cardSchema");
const {priority} = require("../data/local-terms.json");
const {UNCERTAIN_WORDS} = require("../constants");
const {applyUncertainWords} = require("./uncertainWords");

const NOTE_KEYWORDS = [...PLACE_KEYWORDS, ...priority];

function listenNote(wav, {apiKey, keywords = NOTE_KEYWORDS, audio = {},
  voice, spark, ...options} = {}) {
  return listenWithTwoEars({
    voice: voice || ((signal) => transcribeWav(wav, {...options, apiKey, keywords, signal})),
    spark: spark || ((signal) => transcribeWithSpark(wav, {...options, ...audio, apiKey, signal})),
  });
}

async function buildNoteCards(heard, options = {}) {
  const {voice, spark} = heard.ears;
  const transcripts = {
    transcriptA: voice.ok ? voice.value.transcript : null,
    transcriptB: spark.ok ? spark.value.transcript : null,
  };
  const {uncertainWords = UNCERTAIN_WORDS, ...extractOptions} = options;
  const result = await extractCard(transcripts, extractOptions);
  if (uncertainWords) result.reply = applyUncertainWords(result.reply,
      Object.values(transcripts).filter(Boolean)).reply;
  return result;
}

module.exports = {listenNote, buildNoteCards, NOTE_KEYWORDS};
