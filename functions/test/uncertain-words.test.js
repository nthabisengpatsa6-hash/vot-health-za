const test = require("node:test");
const assert = require("node:assert/strict");
const {applyUncertainWords, markedSpans} = require("../lib/uncertainWords");
const {cleanReply} = require("../lib/cardSchema");
const card = () => ({isReport:true, cards:[{symptomGroup:"diarrhoea_vomiting", symptomsInWords:"vomiting", caseCount:3,
  comparedWithUsual:"more", ageGroup:"adult", area:"Leeba View", onset:"today", exposure:{types:["food"], words:"vetkoek"},
  observations:{}, unsureFields:[], questions:[]}], notifiableConditionMentioned:null, adviceRequested:false, transcriptClean:"", disagreements:[]});

test("a bare marker requires two matching words on each side", () => {
  assert.deepEqual(markedSpans(["arrived from [?] with vomiting", "arrived from Leeba View with vomiting"]), ["leeba view"]);
  assert.deepEqual(markedSpans(["from [?] with vomiting", "from Leeba View with vomiting"]), [null]);
  assert.deepEqual(markedSpans(["ARRIVED, FROM [?] WITH vomiting!", "arrived from Leeba View with vomiting"]), ["leeba view"]);
});
test("repeated anchor pairs are unmapped", () => {
  assert.deepEqual(markedSpans(["arrived from [?] with vomiting", "arrived from Leeba View with vomiting; arrived from Thaga Park with vomiting"]), [null]);
});
test("mapped area becomes a question without changing optional observations", () => {
  const reply = cleanReply(card());
  const {reply:result, markers} = applyUncertainWords(reply, ["arrived from [?] with vomiting", "arrived from Leeba View with vomiting"]);
  assert.deepEqual(markers, {found:1, mapped:1, unmapped:0});
  assert.ok(result.cards[0].unsureFields.includes("area"));
  assert.ok(result.cards[0].questions.some((q) => q.field === "area"));
  assert.ok(!result.cards[0].unsureFields.includes("observations"));
  assert.equal(reply.cards[0].unsureFields.length, 0);
});
test("attached word markers map exposure and small number words", () => {
  const result = applyUncertainWords(cleanReply(card()), ["vetkoek[?] three[?]", ""]);
  assert.equal(result.markers.mapped, 2);
  assert.ok(result.reply.cards[0].unsureFields.includes("exposure"));
  assert.ok(result.reply.cards[0].unsureFields.includes("caseCount"));
});
test("unknown or unanchored markers are counted without guessing", () => {
  const result = applyUncertainWords(cleanReply(card()), ["[?] came", ""]);
  assert.deepEqual(result.markers, {found:1, mapped:0, unmapped:1});
});
