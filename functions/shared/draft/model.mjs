import {DRAFT_SETTINGS} from "./settings.mjs";
import {validateDraft} from "./validate.mjs";

const fields = ["subject","summary","source","checks"];
const paragraphs = fields.slice(1);

// The provider supplies parts; the application owns their paragraph boundary.
// The public editor and callable result keep the existing subject/body shape.
export function validateModelDraft(raw, input, town) {
  let value;
  try {value = typeof raw === "string" ? JSON.parse(raw) : raw;} catch {return validateDraft(raw,input,town);}
  const failures = [];
  const fail = (rule, matches, field) => {if (matches.length) failures.push({rule,...(field ? {field} : {}),matches});};
  const object = value && typeof value === "object" && !Array.isArray(value);
  fail("schema",object ? [...Object.keys(value).filter((key) => !fields.includes(key)),...fields.filter((key) => !Object.hasOwn(value,key) || typeof value[key] !== "string" || !value[key].trim())] : [JSON.stringify(value) ?? String(value)]);
  for (const field of fields) if (typeof value?.[field] === "string") {
    const part = value[field];
    if (part.length > DRAFT_SETTINGS[`${field}Max`]) fail("length",[part],field);
    if (paragraphs.includes(field) && part.trim()) {
      if (!/[.!?]$/.test(part.trim())) fail("incomplete",[part],field);
      if (/\r?\n[ \t]*\r?\n|\r[ \t]*\r/.test(part.trim())) fail("paragraph",[part],field);
    }
  }
  const body = paragraphs.map((field) => typeof value?.[field] === "string" ? value[field].trim() : "").join("\n\n");
  if (body.length > DRAFT_SETTINGS.bodyMax) fail("length",[body],"body");
  const checked = validateDraft({subject:typeof value?.subject === "string" ? value.subject : "",body},input,town);
  // Shape, lengths and sentence endings were checked per part above. Reuse
  // every content guard on the assembled draft without duplicating failures.
  if (!checked.ok) failures.push(...checked.failures.filter(({rule}) => !["schema","length","incomplete"].includes(rule)));
  return failures.length ? {ok:false,reason:failures[0].rule,failures} : {ok:true,draft:checked.draft};
}
