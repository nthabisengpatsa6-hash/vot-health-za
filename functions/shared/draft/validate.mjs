import {BANNED_WORDS, BANNED_PREFIXES} from "../rank/settings.mjs";
import {exposureLayers} from "../layers.mjs";
import {DRAFT_SETTINGS} from "./settings.mjs";

const words = [...BANNED_WORDS,"pandemic","medication","antibiotic","dose"];
const prefixes = [...BANNED_PREFIXES,"diagnos","treat","prescri","outbreak","epidemic","pandemic"];
const numberWords = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,million:1000000};
const numbers = (text) => [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map(([value]) => Number(value));
export function validateDraft(raw, input, town) {
  let value;
  try { value = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return {ok:false, reason:"json"}; }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 2 || !["subject","body"].every((key) => Object.hasOwn(value,key) && typeof value[key] === "string" && value[key].trim())) return {ok:false,reason:"schema"};
  if (value.subject.length > DRAFT_SETTINGS.subjectMax || value.body.length > DRAFT_SETTINGS.bodyMax) return {ok:false,reason:"length"};
  const text = `${value.subject}\n${value.body}`.normalize("NFKC"), lower = text.toLowerCase();
  const tokens = lower.match(/[a-z]+/g) || [];
  if (tokens.some((word) => words.some((banned) => word === banned.toLowerCase()) || prefixes.some((prefix) => word.startsWith(prefix)))) return {ok:false,reason:"banned"};
  if (/@|(?:https?:\/\/|www\.)|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b|\+?\d[\d ()-]{6,}\d|\b(?:sim[-_:]|[a-z]+[_:][a-z0-9_-]+)|\b[a-f0-9]{16,}\b/i.test(text)) return {ok:false,reason:"contact-or-id"};
  if (/\b[a-z]+[-_]\d{2,}\b|\b[\da-f]{8}-[\da-f-]{12,}\b|\b\d+(?:\.\d+)?e[+-]?\d+\b/i.test(text)) return {ok:false,reason:"contact-or-id"};
  const allowed = new Set(numbers(JSON.stringify(input)));
  let numericText = text.replace(/^\s*(\d+)[.)]\s/gm, (match, marker) => Number(marker) >= 1 && Number(marker) <= input.sources.length ? "" : match);
  if (numbers(numericText).some((number) => !allowed.has(number))) return {ok:false,reason:"number"};
  // Parse contiguous English number words as one number, not unrelated tokens.
  const sequences = numericText.toLowerCase().match(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)(?:(?:[ -]+(?:and[ -]+)?)(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million))*\b/g) || [];
  for (const sequence of sequences) {
    let total=0, group=0;
    for (const word of sequence.split(/[ -]+/).filter((word) => word !== "and")) {const n=numberWords[word]; if (n === 100) group=(group || 1)*n; else if (n >= 1000) {total+=(group || 1)*n;group=0;} else group+=n;}
    if (!allowed.has(total+group)) return {ok:false,reason:"number"};
  }
  const allowedNames = new Set([...input.areas,...input.evidenceAreas,...input.sources.map((source) => source.name)].map((name) => name.toLowerCase()));
  for (const name of [...town.areas.map((area) => area.name),...exposureLayers(town).map((source) => source.name)]) if (lower.includes(name.toLowerCase()) && !allowedNames.has(name.toLowerCase())) return {ok:false,reason:"name"};
  return {ok:true, draft:{subject:value.subject.trim(),body:value.body.trim()}};
}
