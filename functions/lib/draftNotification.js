const {HttpsError} = require("firebase-functions/https");
const town = require("../data/places.json");
const {FUNCTION_REGION} = require("../shared/runtime.mjs");
const limit = require("./draftLimit");
const {writeDraftTiming} = require("./draftTiming");
const OPTIONS = Object.freeze({region:FUNCTION_REGION,memory:"512MiB",timeoutSeconds:60,minInstances:0,maxInstances:3});

async function rebuildSignal({day,symptomGroup,area}) {
  const {createRun} = await import("../shared/sim/engine.mjs");
  const {computeSignals} = await import("../shared/signals.mjs");
  const {dayEnd,dayOfDate} = await import("../shared/sastDay.mjs");
  const run = createRun({seed:1,scenario:"water"});
  return computeSignals({cards:run.cardsUpTo(day),asOf:dayEnd(dayOfDate(run.startDate)+day),town}).signals.find((signal) => ["signal","alert"].includes(signal.level) && signal.symptomGroup === symptomGroup && signal.areas.includes(area));
}

function createDraftHandler({apiKey = () => "", reserve = (...args) => limit.reserveDraft(...args), call, write = writeDraftTiming, now = () => new Date()} = {}) {
  return async (request) => {
    const started = performance.now();
    const {DRAFT_SETTINGS} = await import("../shared/draft/settings.mjs");
    const timing = {model:DRAFT_SETTINGS.model,provider:DRAFT_SETTINGS.provider,outcome:"fallback:bad-request"};
    try {
      if (!request.auth) {timing.outcome="fallback:signed-out";throw new HttpsError("unauthenticated","Please sign in to draft a notification.");}
      const {validateDraftRequest,buildDraftInput} = await import("../shared/draft/input.mjs");
      let data;
      try {data=validateDraftRequest(request.data,town);} catch {throw new HttpsError("invalid-argument","Choose a replay day, symptom group, area and eligible ranked sources.");}
      const signal = await rebuildSignal(data);
      if (!signal) throw new HttpsError("failed-precondition","There is no Signal or Alert to draft for this day and area.");
      let input;
      try {input=buildDraftInput(signal,{...data,town});} catch {throw new HttpsError("invalid-argument","Choose only this signal's candidate sources.");}
      const {standardDraft,DRAFT_FOOTER} = await import("../shared/draft/standard.mjs");
      const fallback = (reason) => {timing.outcome=`fallback:${reason}`;return {outcome:"fallback",reason,draft:standardDraft(input),footer:DRAFT_FOOTER,model:DRAFT_SETTINGS.model,ms:Math.round(performance.now()-started)};};
      let key; try {key=apiKey();} catch {return fallback("no-key");}
      if (typeof key !== "string" || !key.trim()) return fallback("no-key");
      let usage;try {usage=await reserve(request.auth.uid,{now:now()});} catch {return fallback("counter-failed");}
      if (!usage.allowed) return fallback(usage.reason);
      const provider = call || (await import("./basetenClient.mjs")).callBasetenDraft;
      let reply;try {reply=await provider(input,{apiKey:key});} catch {return fallback("unavailable");}
      for (const name of ["inputTokens","outputTokens","reasoningTokens"]) timing[name]=reply[name] ?? null;
      if (reply.reason) return fallback(reply.reason);
      const {validateDraft} = await import("../shared/draft/validate.mjs");
      const checked = validateDraft(reply.text,input,town);
      if (!checked.ok) return {...fallback("invalid"),validationReason:checked.reason};
      timing.outcome="model";
      return {outcome:"model",draft:checked.draft,footer:DRAFT_FOOTER,model:DRAFT_SETTINGS.model,ms:reply.ms};
    } finally {timing.ms=Math.round(performance.now()-started);write(timing);}
  };
}
module.exports = {OPTIONS,createDraftHandler,rebuildSignal};
