import {readFileSync,existsSync,mkdirSync,appendFileSync} from "node:fs";
import {fileURLToPath,pathToFileURL} from "node:url";
import {readHiddenKey,confirmRun} from "./lib/hiddenInput.mjs";
import {planDraftTrial,runDraftTrial} from "./lib/draftTrial.mjs";
import {callBasetenDraft} from "../functions/lib/basetenClient.mjs";

export async function main() {
  const path=new URL("../docs/provenance/open-weights/draft-trial-2026-10-31-r2.jsonl",import.meta.url);
  const existing=existsSync(path) ? readFileSync(path,"utf8").split(/\r?\n/).filter(Boolean).map((line)=>JSON.parse(line)) : [];
  const plans=planDraftTrial(), pending=plans.filter((plan)=>!existing.some((row)=>row.inputHash===plan.inputHash));
  console.log("Muse Spark Open on Baseten. Simulated seed-1 input only; one attempt per case, timeout 20 s, max_tokens 3000. No key file or environment variable is read.");
  console.log("Revision 2: original trial preserved; final model text and all validation failures will be recorded in draft-trial-2026-10-31-r2.jsonl.");
  for (const plan of plans) console.log(`${plan.role}: day ${plan.day}, ${plan.level}${pending.includes(plan) ? "" : ", already recorded"}`);
  if (!plans.some((plan)=>plan.role==="signal-only")) console.log("No Signal-only day exists in seed 1; that third call is absent.");
  console.log(`Remaining calls: ${pending.length}. Forecast USD ${(pending.length*0.019285).toFixed(6)}, using 5228 input tokens and the full 3000 output-token cap per call. Input usage and failed-request billing can differ.`);
  if (!pending.length) {console.log("No calls needed. Clear clipboard history with Win+V.");return;}
  let apiKey="";
  try {
    apiKey=await readHiddenKey(undefined,undefined,{label:"Baseten"});
    if (!await confirmRun(pending.length)) return;
    mkdirSync(fileURLToPath(new URL(".",path)),{recursive:true});
    await runDraftTrial({plans,existing,call:(input)=>callBasetenDraft(input,{apiKey}),append:(record)=>appendFileSync(path,JSON.stringify(record)+"\n")});
  } finally {apiKey="";console.log("Clear clipboard history with Win+V. This hackathon key cannot be rotated; do not paste it into chat.");}
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(()=>{console.error("Trial stopped safely. Review saved attempt metadata before rerunning. Clear clipboard history with Win+V.");process.exitCode=1;});
