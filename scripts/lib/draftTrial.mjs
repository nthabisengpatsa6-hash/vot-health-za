import {createHash} from "node:crypto";
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {computeSignals} from "../../functions/shared/signals.mjs";
import {dayEnd,dayOfDate} from "../../functions/shared/sastDay.mjs";
import {matchSignal} from "../../functions/shared/rank/match.mjs";
import {buildDraftInput} from "../../functions/shared/draft/input.mjs";
import {standardDraft,DRAFT_FOOTER} from "../../functions/shared/draft/standard.mjs";
import {validateDraft} from "../../functions/shared/draft/validate.mjs";
import {DRAFT_SETTINGS,DRAFT_PRICES} from "../../functions/shared/draft/settings.mjs";
import town from "../../functions/data/places.json" with {type:"json"};

export const draftInputHash = (input) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
export function planDraftTrial() {
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
  return selected.map(({role,day,signal})=>{const input=buildDraftInput(signal,{day,town});return {role,day,level:signal.level,input,inputHash:draftInputHash(input)};});
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
    const identity={kind:"draft",input:plan.input,inputHash:plan.inputHash,role:plan.role,day:plan.day,level:plan.level,model:DRAFT_SETTINGS.model,provider:DRAFT_SETTINGS.provider};
    append({...identity,outcome:"pending"});
    let reply;try {reply=await call(plan.input);} catch {reply={reason:"unavailable",ms:0};}
    const checked=reply.reason ? null : validateDraft(reply.text,plan.input,town);
    const reason=reply.reason || (checked?.ok ? null : "invalid");
    const draft=reason ? standardDraft(plan.input) : checked.draft;
    const tokens=Object.fromEntries(["inputTokens","outputTokens","reasoningTokens"].map((key)=>[key,reply[key] ?? null]));
    const validationReason=reason === "invalid" ? checked?.reason ?? null : null;
    const record={...identity,date:new Date().toISOString(),outcome:reason ? "fallback" : "model",reason,validationReason,ms:reply.ms,...tokens,usd:draftCost(tokens),draft,footer:DRAFT_FOOTER};
    append(record);rows.push(record);
    print(`Day ${plan.day} | ${plan.level} | ${reason ? `fallback:${reason}${validationReason ? `:${validationReason}` : ""}` : "model"} | ${reply.ms} ms | input ${tokens.inputTokens ?? "unknown"}, output ${tokens.outputTokens ?? "unknown"}, reasoning ${tokens.reasoningTokens ?? "unknown"} | USD ${record.usd ?? "unknown"}`);
    print(`${draft.subject}\n\n${draft.body}\n\n${DRAFT_FOOTER}`);
    if (record.usd===null) {print("Usage is unknown. Review provider billing before any further trial; no more calls made.");break;}
  }
  return rows;
}
