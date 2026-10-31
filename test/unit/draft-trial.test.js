import {test} from "node:test";
import assert from "node:assert/strict";
import {planDraftTrial,runDraftTrial,draftCost} from "../../scripts/lib/draftTrial.mjs";
import {authoredInputCatalog,verifiedAuthoredRecord} from "../../scripts/lib/authoredInputs.mjs";
const plans=planDraftTrial();
test("seed-1 trial selects the first Alert and day 19, with the absent Signal-only case explicit",()=>{
  assert.deepEqual(plans.map(({role,day,level})=>({role,day,level})),[{role:"first-alert",day:17,level:"alert"},{role:"day-19",day:19,level:"alert"}]);
});
test("trial persists attempts before calls and never repeats a recorded attempt",async()=>{
  const saved=[],output=[];let calls=0;
  const call=async()=>{calls++;assert.equal(saved.at(-1).outcome,"pending");return {text:JSON.stringify({subject:"Signal to review",body:"Review the linked evidence."}),ms:4,inputTokens:10,outputTokens:20,reasoningTokens:12};};
  const results=await runDraftTrial({plans,call,append:(row)=>saved.push(row),print:(line)=>output.push(line)});
  assert.equal(calls,2);assert.equal(results.length,2);assert.equal(saved.length,4);
  assert.equal(results[0].usd,(10*1.25+20*4.25)/1e6);
  await runDraftTrial({plans,existing:saved,call,append:()=>assert.fail("no writes on resume"),print:()=>{}});
  assert.equal(calls,2);
  const catalog=authoredInputCatalog();
  for(const row of saved)assert.equal(verifiedAuthoredRecord(row,catalog),true);
  assert.equal(verifiedAuthoredRecord({...saved[1],input:{...saved[1].input,cases:999999}},catalog),false);
  assert.equal(verifiedAuthoredRecord({...saved[1],kind:"recording"},catalog),false);
});
test("trial stops after unknown billing, and rejects more than three or forged inputs",async()=>{
  let calls=0;
  await runDraftTrial({plans,call:async()=>{calls++;return {reason:"timeout",ms:20};},append:()=>{},print:()=>{}});
  assert.equal(calls,1);assert.equal(draftCost({inputTokens:1}),null);
  const rejected=await runDraftTrial({plans:[plans[0]],call:async()=>({text:JSON.stringify({subject:"Outbreak",body:"rejected text"}),ms:1,inputTokens:10,outputTokens:20}),append:()=>{},print:()=>{}});
  assert.equal(rejected[0].validationReason,"banned");
  assert.ok(!rejected[0].draft.subject.includes("Outbreak"));
  await assert.rejects(runDraftTrial({plans:[...plans,...plans]}),/three/);
  await assert.rejects(runDraftTrial({plans:[{...plans[0],input:{cases:999}}]}),/fixed simulated/);
});
