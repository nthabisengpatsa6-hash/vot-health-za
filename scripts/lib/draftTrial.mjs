import {createHash} from "node:crypto";
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {computeSignals} from "../../functions/shared/signals.mjs";
import {dayEnd,dayOfDate} from "../../functions/shared/sastDay.mjs";
import {matchSignal} from "../../functions/shared/rank/match.mjs";
import {buildDraftInput} from "../../functions/shared/draft/input.mjs";
import {standardDraft,DRAFT_FOOTER} from "../../functions/shared/draft/standard.mjs";
import {validateDraft} from "../../functions/shared/draft/validate.mjs";
import {DRAFT_SETTINGS,DRAFT_PRICES} from "../../functions/shared/draft/settings.mjs";
import {DRAFT_PROMPT_HASH} from "../../functions/lib/draftRequest.mjs";
import {CHECKS,FACTS,SYMPTOM_LABELS} from "../../functions/shared/draft/copy.mjs";
import {usualCasesText} from "../../functions/shared/draft/counts.mjs";
import town from "../../functions/data/places.json" with {type:"json"};

export const draftInputHash = (input) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
function draftTrialSignals() {
  const run=createRun({seed:1,scenario:"water"}), days=[];
  for (let day=0;day<=run.lastDay;day++) days.push({day,signals:computeSignals({cards:run.cardsUpTo(day),asOf:dayEnd(dayOfDate(run.startDate)+day),town}).signals});
  const first=days.find((row)=>row.signals.some((signal)=>signal.level==="alert"));
  if (!first) return [];
  const firstSignal=first.signals.find((signal)=>signal.level==="alert");
  const selected=[{role:"first-alert",day:first.day,signal:firstSignal}];
  const current=matchSignal(days[19].signals,firstSignal);
  if (current && ["signal","alert"].includes(current.level)) selected.push({role:"day-19",day:19,signal:current});
  const signalDay=days.find((row)=>row.signals.some((signal)=>signal.level==="signal"));
  if (signalDay) selected.push({role:"signal-only",day:signalDay.day,signal:signalDay.signals.find((signal)=>signal.level==="signal")});
  return selected;
}
export function planDraftTrial() {
  return draftTrialSignals().map(({role,day,signal})=>{const input=buildDraftInput(signal,{day,town});return {role,day,level:signal.level,input,inputHash:draftInputHash(input)};});
}
// Rebuild the full pre-r4 evidence independently of saved outputs. These
// historical shapes retain all facts, window metadata and comparison names.
// These hashes verify history only; runDraftTrial accepts current plans only.
export function legacyDraftTrialInputs(revision = 1) {
  if (![1,2,3].includes(revision)) throw new Error("Unknown historical draft revision.");
  return draftTrialSignals().map(({day,signal}) => {
    const areas = new Set(signal.areas);
    const sources = signal.sources.filter((source) => source.candidate).slice(0,4).map((source) => {
      const facts = (entries) => entries.map((fact) => {
        if (fact.area) areas.add(fact.area);
        return FACTS[fact.kind]?.({area:fact.area,name:source.name,count:fact.cards ?? fact.cardIds?.length ?? 0,type:fact.type || "shared exposure clues"});
      }).filter(Boolean);
      return {name:source.name,supports:facts(source.supporting),against:facts(source.contradicting),checks:CHECKS[source.kind](source.name)};
    });
    const flags = {moreSevere:signal.flags.moreSevere,notResponding:signal.flags.notResponding};
    return {day,level:signal.level,symptomGroup:SYMPTOM_LABELS[signal.symptomGroup],areas:[...signal.areas],evidenceAreas:[...areas],windowDays:signal.timeWindow.days,windows:[3,7],
      cases:signal.observed.cases,usualCases:revision === 1 ? signal.expected.cases : usualCasesText(signal.expected.cases),cards:signal.observed.cards,placesOfCare:signal.independentReporters,
      observations:revision < 3 ? flags : Object.fromEntries(Object.entries(flags).filter(([,count]) => count > 0)),sources};
  });
}
export function draftCost(tokens) {
  return Number.isSafeInteger(tokens.inputTokens) && Number.isSafeInteger(tokens.outputTokens) ? (tokens.inputTokens*DRAFT_PRICES.inputPerMillion+tokens.outputTokens*DRAFT_PRICES.outputPerMillion)/1e6 : null;
}
export async function runDraftTrial({plans=planDraftTrial(), existing=[], call, append, print=console.log}) {
  if (plans.length>3) throw new Error("At most three trial calls are allowed.");
  const known=new Set(planDraftTrial().map((plan)=>plan.inputHash));
  if (plans.some((plan)=>!known.has(plan.inputHash) || draftInputHash(plan.input)!==plan.inputHash)) throw new Error("Only the fixed simulated trial inputs are allowed.");
  const rows=[];
  for (const plan of plans) {
    if (existing.some((row)=>row.inputHash===plan.inputHash)) {print(`Day ${plan.day}: attempt already recorded; no repeat.`);continue;}
    const identity={kind:"draft",input:plan.input,inputHash:plan.inputHash,role:plan.role,day:plan.day,level:plan.level,model:DRAFT_SETTINGS.model,provider:DRAFT_SETTINGS.provider,promptHash:DRAFT_PROMPT_HASH};
    append({...identity,outcome:"pending",finishReason:null});
    let reply;try {reply=await call(plan.input);} catch {reply={reason:"unavailable",ms:0};}
    const checked=reply.reason ? null : validateDraft(reply.text,plan.input,town);
    const reason=reply.reason || (checked?.ok ? null : "invalid");
    const draft=reason ? standardDraft(plan.input) : checked.draft;
    const tokens=Object.fromEntries(["inputTokens","outputTokens","reasoningTokens"].map((key)=>[key,reply[key] ?? null]));
    const validationReason=reason === "invalid" ? checked?.reason ?? null : null;
    // The client has removed reasoning and refused credential echoes before
    // returning final text. Provider failures have no retainable model text.
    const modelFinalText=checked ? reply.text : null;
    let modelDraft=null;
    try {const value=JSON.parse(modelFinalText);if (typeof value?.subject === "string" && typeof value?.body === "string") modelDraft={subject:value.subject,body:value.body};} catch { /* Invalid JSON is retained as final text only. */ }
    const finishReason=reply.finishReason ?? null;
    const validationFailures=checked ? checked.failures ?? [] : reason === "incomplete" ? [{rule:"incomplete",matches:finishReason ? [finishReason] : []}] : null;
    const record={...identity,date:new Date().toISOString(),outcome:reason ? "fallback" : "model",reason,validationReason,validationFailures,modelFinalText,modelDraft,finishReason,ms:reply.ms,...tokens,usd:draftCost(tokens),draft,footer:DRAFT_FOOTER};
    append(record);rows.push(record);
    print(`Day ${plan.day} | ${plan.level} | ${reason ? `fallback:${reason}${validationReason ? `:${validationReason}` : ""}` : "model"} | ${reply.ms} ms | input ${tokens.inputTokens ?? "unknown"}, output ${tokens.outputTokens ?? "unknown"}, reasoning ${tokens.reasoningTokens ?? "unknown"} | USD ${record.usd ?? "unknown"}`);
    if (modelFinalText !== null) {print(`Model final text (simulated evidence):\n${modelFinalText}`);print(`Validation failures: ${JSON.stringify(validationFailures)}`);}
    print(`Provider finish reason: ${finishReason ?? "not available"}`);
    print(`${draft.subject}\n\n${draft.body}\n\n${DRAFT_FOOTER}`);
    if (record.usd===null) {print("Usage is unknown. Review provider billing before any further trial; no more calls made.");break;}
  }
  return rows;
}
