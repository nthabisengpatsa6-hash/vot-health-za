import {createHash} from "node:crypto";
import {DRAFT_SETTINGS} from "../shared/draft/settings.mjs";
import {DRAFT_SCHEMA} from "../shared/draft/schema.mjs";
import {PRODUCT_NAME} from "../shared/product.mjs";

export const DRAFT_PROMPT = `Write a short environmental health notification from the supplied structured evidence only. Return JSON with exactly subject (at most 100 characters) and body (at most 1200 characters). Use plain words and signal language. Say what was seen, over the stated windowDays, and where to look first. Sources are possibilities, never confirmed causes. Supports and Against must remain honest. Give environmental checks only; no diagnosis, medical advice, blame or officials. Do not use words starting diagnos, treat, untreat or prescri, or outbreak, epidemic, pandemic, medication, antibiotic or dose. Only the exact phrases "water treatment works", "treatment works" and "treatment records" may contain treatment. Use digits for numbers; use only numbers and town area/source names present in the input. Use the supplied usualCases wording. No links, contact details, identifiers, signatures or footer. Do not include reasoning in the final answer.
Use only the numbers given, exactly as written. Never calculate new numbers.
Call each source by the name given.
Case cards are written by clinicians. Call them case cards or clinicians' reports, never anything else.
Keep every number with its unit exactly as given: cases, case cards, places of care. A case card is not a case.
Write it as a request to the district environmental health office: what clinicians' reports show and where ${PRODUCT_NAME} suggests looking first. Never say that anyone is already reviewing or investigating.
Start the subject with the level, for example 'Alert signal:'.
Use 3 to 5 short paragraphs separated by blank lines.`;

export function draftRequestBody(input) {
  return {model:DRAFT_SETTINGS.model,reasoning_effort:"low",temperature:0,max_tokens:DRAFT_SETTINGS.maxTokens,
    response_format:{type:"json_schema",json_schema:{name:"notification_draft",strict:true,schema:structuredClone(DRAFT_SCHEMA)}},
    messages:[{role:"system",content:DRAFT_PROMPT},{role:"user",content:JSON.stringify(input)}]};
}

export function draftPromptHash(request) {
  // Evidence is the user message. Hash only the approved fixed definition,
  // retaining message order and the complete schema/structured-output settings.
  const fixed = {messages:request.messages.filter(({role}) => ["system","developer"].includes(role)),
    response_format:request.response_format,model:request.model,max_tokens:request.max_tokens,reasoning_effort:request.reasoning_effort};
  return createHash("sha256").update(JSON.stringify(fixed),"utf8").digest("hex");
}
export const DRAFT_PROMPT_HASH = draftPromptHash(draftRequestBody({}));
