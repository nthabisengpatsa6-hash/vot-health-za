import {BANNED_WORDS, BANNED_PREFIXES} from "../rank/settings.mjs";
import {exposureLayers} from "../layers.mjs";
import {DRAFT_SETTINGS} from "./settings.mjs";

const words = [...BANNED_WORDS,"pandemic","medication","antibiotic","dose"];
const prefixes = [...BANNED_PREFIXES,"diagnos","treat","untreat","prescri","outbreak","epidemic","pandemic"];
const numberWords = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,million:1000000};
const numbers = (text) => [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map(([value]) => Number(value));
export function validateDraft(raw, input, town) {
  const failures = [];
  const fail = (rule, matches) => {if (matches.length) failures.push({rule,matches});};
  let value, malformed = false;
  try { value = typeof raw === "string" ? JSON.parse(raw) : raw; } catch {malformed = true;fail("json",[raw]);}
  const object = value && typeof value === "object" && !Array.isArray(value);
  if (!malformed) {
    const invalid = object ? [...Object.keys(value).filter((key) => !["subject","body"].includes(key)), ...["subject","body"].filter((key) => !Object.hasOwn(value,key) || typeof value[key] !== "string" || !value[key].trim())] : [JSON.stringify(value) ?? String(value)];
    fail("schema",invalid);
  }
  fail("length",["subject","body"].filter((key) => typeof value?.[key] === "string" && value[key].length > DRAFT_SETTINGS[`${key}Max`]).map((key) => value[key]));
  const originalFields = malformed ? [raw] : [value?.subject,value?.body].filter((part) => typeof part === "string");
  const original = originalFields.join("\n");
  // Keep NFKC guards, but report the exact original spelling even when a
  // compatibility character expands (for example full-width or styled text).
  let text = "";
  const spans = [];
  for (const {segment,index} of new Intl.Segmenter("en",{granularity:"grapheme"}).segment(original)) {
    const normalized = segment.normalize("NFKC");
    for (let i=0;i<normalized.length;i++) spans.push({start:index,end:index+segment.length});
    text += normalized;
  }
  const exact = (match) => original.slice(spans[match.index]?.start ?? 0,spans[match.index+match[0].length-1]?.end ?? original.length);
  const phrases = [...text.matchAll(/\b(?:water treatment works|treatment works|treatment records)\b/gi)].filter((match) => /^(?:water treatment works|treatment works|treatment records)$/i.test(exact(match)));
  const banned = [...text.matchAll(/[a-z]+/gi)].filter((match) => {
    const word = match[0].toLowerCase();
    if (word === "treatment" && phrases.some((phrase) => match.index >= phrase.index && match.index+word.length <= phrase.index+phrase[0].length)) return false;
    return words.some((banned) => word === banned.toLowerCase()) || prefixes.some((prefix) => word.startsWith(prefix));
  });
  fail("banned",banned.map(exact));
  const severity = [];
  let offset = 0;
  // Scan fields separately so a title ending "severe case" cannot borrow
  // "cards" from the start of the body to hide the wrong unit.
  for (const field of originalFields) {
    const normalized = field.normalize("NFKC");
    for (const match of normalized.matchAll(/\bsevere\s+cases?\b(?!\s+cards?\b)/gi)) {match.index += offset;severity.push(exact(match));}
    offset += normalized.length+1;
  }
  fail("severity-unit",severity);
  const contacts = [/@|(?:https?:\/\/|www\.)|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b|\+?\d[\d ()-]{6,}\d|\b(?:sim[-_:]|[a-z]+[_:][a-z0-9_-]+)|\b[a-f0-9]{16,}\b/gi,
    /\b[a-z]+[-_]\d{2,}\b|\b[\da-f]{8}-[\da-f-]{12,}\b|\b\d+(?:\.\d+)?e[+-]?\d+\b/gi];
  fail("contact-or-id",contacts.flatMap((pattern) => [...text.matchAll(pattern)].map(exact)));
  const allowed = new Set(numbers(JSON.stringify(input)));
  const numericText = text.replace(/^\s*(\d+)[.)]\s/gm, (match, marker) => Number(marker) >= 1 && Number(marker) <= input.sources.length ? " ".repeat(match.length) : match);
  const invalidNumbers = [...numericText.matchAll(/-?\d+(?:\.\d+)?/g)].filter((match) => !allowed.has(Number(match[0]))).map(exact);
  // Parse contiguous English number words as one number, not unrelated tokens.
  const sequences = [...numericText.matchAll(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)(?:(?:[ -]+(?:and[ -]+)?)(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million))*\b/gi)];
  for (const sequence of sequences) {
    if (/^one$/i.test(sequence[0])) continue;
    let total=0, group=0;
    for (const word of sequence[0].toLowerCase().split(/[ -]+/).filter((word) => word !== "and")) {const n=numberWords[word]; if (n === 100) group=(group || 1)*n; else if (n >= 1000) {total+=(group || 1)*n;group=0;} else group+=n;}
    if (!allowed.has(total+group)) invalidNumbers.push(exact(sequence));
  }
  fail("number",invalidNumbers);
  const evidence = input.sources.flatMap(({supports = [],against = []}) => [...supports,...against]).join("\n").toLowerCase();
  const allowedNames = new Set([...input.areas,...town.areas.filter(({name}) => evidence.includes(name.toLowerCase())).map(({name}) => name),...input.sources.map((source) => source.name)].map((name) => name.toLowerCase()));
  const invalidNames = [];
  for (const name of [...town.areas.map((area) => area.name),...exposureLayers(town).map((source) => source.name)]) if (!allowedNames.has(name.toLowerCase())) {
    for (const match of text.matchAll(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"))) invalidNames.push(exact(match));
  }
  fail("name",invalidNames);
  if (typeof value?.body === "string" && value.body.trim() && !/[.!?]$/.test(value.body.trim())) fail("incomplete",[value.body]);
  if (failures.length) return {ok:false,reason:failures[0].rule,failures};
  return {ok:true, draft:{subject:value.subject.trim(),body:value.body.trim()}};
}
