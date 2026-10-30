const {CARD_FIELDS, cleanReply} = require("./cardSchema");
const words = (text) => String(text || "").normalize("NFC").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const contains = (value, span) => {
  const a = words(value), b = words(span);
  return b.length > 0 && a.some((_, i) => b.every((word, n) => a[i + n] === word));
};

// Standalone markers require exactly two anchors on either side and exactly
// one matching anchor pair in the other transcript. No semantic guesses.
function markedSpans(transcripts) {
  const spans = [];
  for (const [index, text] of transcripts.entries()) {
    for (const match of String(text).matchAll(/\[\?\]/g)) {
      const before = String(text).slice(0, match.index);
      const attached = before.match(/([\p{L}\p{N}]+)$/u);
      if (attached) { spans.push(attached[1]); continue; }
      const left = words(before).slice(-2);
      const right = words(String(text).slice(match.index + 3)).slice(0, 2);
      const found = [];
      if (left.length === 2 && right.length === 2) {
        const other = words(transcripts[1 - index]);
        for (let a = 0; a < other.length - 3; a++) {
          if (other[a] !== left[0] || other[a + 1] !== left[1]) continue;
          for (let b = a + 3; b < other.length - 1; b++) {
            if (other[b] === right[0] && other[b + 1] === right[1]) {
              found.push(other.slice(a + 2, b).join(" "));
            }
          }
        }
      }
      spans.push(found.length === 1 ? found[0] : null);
    }
  }
  return spans;
}

function applyUncertainWords(reply, transcripts) {
  const result = structuredClone(reply);
  const spans = markedSpans(transcripts);
  const mapped = new Set();
  for (const card of result.cards || []) {
    const values = {...card, area: card.area, exposure: card.exposure?.words,
      caseCount: `${card.caseCount ?? ""} ${numberWords[card.caseCount] || ""}`};
    for (const field of CARD_FIELDS.filter((name) => name !== "observations")) {
      if (typeof values[field] !== "string") continue;
      for (const [i, span] of spans.entries()) {
        if (span && contains(values[field], span)) {
          mapped.add(i);
          card.unsureFields = [...new Set([...(card.unsureFields || []), field])];
        }
      }
    }
  }
  return {reply: cleanReply(result, {transcripts}), markers: {
    found: spans.length, mapped: mapped.size, unmapped: spans.length - mapped.size,
  }};
}

module.exports = {applyUncertainWords, markedSpans};
