const {test}=require("node:test"),assert=require("node:assert/strict");
const {createDraftHandler,OPTIONS}=require("../lib/draftNotification");
const {draftTimingEntry}=require("../lib/draftTiming");
const request={auth:{uid:"draft-test"},data:{day:17,symptomGroup:"diarrhoea_vomiting",area:"Leeba View"}};
test("draft callable options use the shared region and approved resource caps",async()=>{
  const {FUNCTION_REGION}=await import("../shared/runtime.mjs");
  assert.deepEqual(OPTIONS,{region:FUNCTION_REGION,memory:"512MiB",timeoutSeconds:60,minInstances:0,maxInstances:3});
});
test("signed out, bad requests, absent signals and non-candidates are refused before calls",async()=>{
  const handler=createDraftHandler({apiKey:()=>{throw Error("not reached");},write:()=>{}});
  await assert.rejects(handler({...request,auth:null}),{code:"unauthenticated"});
  await assert.rejects(handler({...request,data:{...request.data,text:"free"}}),{code:"invalid-argument"});
  await assert.rejects(handler({...request,data:{...request.data,day:0}}),{code:"failed-precondition"});
  await assert.rejects(handler({...request,data:{...request.data,ranking:[{sourceId:"water:B",confidence:"low"}]}}),{code:"invalid-argument"});
});
test("missing key falls back with no reservation or provider call",async()=>{
  let calls=0;const log=[];
  const result=await createDraftHandler({apiKey:()=>"",reserve:()=>{calls++;},call:()=>{calls++;},write:(entry)=>log.push(entry)})(request);
  assert.equal(result.reason,"no-key");assert.equal(calls,0);assert.equal(log[0].outcome,"fallback:no-key");
});
test("caps and counter failure return an honest standard draft without a provider call",async()=>{
  for(const reason of ["app-cap","account-cap","counter-failed"]) {
    let called=0;
    const result=await createDraftHandler({apiKey:()=>"offline-placeholder",reserve:async()=>{if(reason==="counter-failed")throw Error("private details");return {allowed:false,reason};},call:()=>{called++;},write:()=>{}})(request);
    assert.equal(result.reason,reason);assert.equal(called,0);assert.ok(result.draft.body);
  }
});
test("successful drafts are validated and receive only the code-owned footer; logs contain no content",async()=>{
  const {DRAFT_FOOTER}=await import("../shared/draft/standard.mjs");
  let reserved=false,log;
  const result=await createDraftHandler({apiKey:()=>"offline-placeholder",reserve:async()=>{reserved=true;return {allowed:true};},call:async(input)=>{assert.equal(reserved,true);assert.ok(input.cases);return {text:JSON.stringify({subject:"Signal to review",body:"Please review the linked evidence."}),ms:123,inputTokens:10,outputTokens:20,reasoningTokens:8};},write:(entry)=>{log=draftTimingEntry(entry);}})(request);
  assert.equal(result.outcome,"model");assert.equal(result.footer,DRAFT_FOOTER);assert.equal(result.ms,123);
  assert.deepEqual(Object.keys(log),["model","provider","promptHash","outcome","ms","inputTokens","outputTokens","reasoningTokens"]);
  assert.equal(log.promptHash,(await import("../lib/draftRequest.mjs")).DRAFT_PROMPT_HASH);
  assert.equal(log.model,"meta-models/muse-spark-open-1026");assert.equal(log.inputTokens,10);
  assert.doesNotMatch(JSON.stringify(log),/subject|body|uid|Signal to review/);
});
test("timeouts, malformed JSON and unsafe replies fall back without showing rejected content",async()=>{
  for(const reply of [{reason:"timeout",ms:20},{text:"bad",ms:1},{text:JSON.stringify({subject:"Outbreak",body:"bad"}),ms:1}]) {
    const result=await createDraftHandler({apiKey:()=>"offline-placeholder",reserve:async()=>({allowed:true}),call:async()=>reply,write:()=>{}})(request);
    assert.equal(result.outcome,"fallback");assert.ok(!JSON.stringify(result.draft).includes("Outbreak"));
  }
});
test("new Baseten client uses only the final content and the exact guarded request",async()=>{
  const {callBasetenDraft,DRAFT_PROMPT}=await import("../lib/basetenClient.mjs");
  assert.ok(DRAFT_PROMPT.includes("Use only the numbers given, exactly as written. Never calculate new numbers."));
  assert.ok(DRAFT_PROMPT.includes("Call each source by the name given."));
  let count=0;
  const result=await callBasetenDraft({cases:4},{apiKey:"offline-placeholder",fetch:async(url,init)=>{
    count++;assert.equal(url,"https://inference.baseten.co/v1/chat/completions");
    const body=JSON.parse(init.body);assert.equal(body.max_tokens,3000);assert.equal(body.max_completion_tokens,undefined);assert.equal(body.response_format.type,"json_schema");assert.equal(body.model,"meta-models/muse-spark-open-1026");
    assert.equal(body.messages[0].content,DRAFT_PROMPT);
    return Response.json({choices:[{finish_reason:"stop",message:{reasoning_content:"hidden reasoning",content:'<think>hidden</think><final>{"subject":"Signal","body":"Review evidence."}</final>'}}],usage:{prompt_tokens:10,completion_tokens:20,completion_tokens_details:{reasoning_tokens:12}}});
  }});
  assert.equal(count,1);assert.equal(result.outputTokens,20);assert.equal(result.reasoningTokens,12);assert.equal(result.text,'{"subject":"Signal","body":"Review evidence."}');assert.ok(!JSON.stringify(result).includes("hidden"));
  for(const options of [{model:"wrong"},{baseUrl:"https://example.invalid"}]) await assert.rejects(callBasetenDraft({}, {...options,apiKey:"offline-placeholder",fetch:()=>{throw Error("not reached");}}),/provider-guard/);
});
test("new Baseten client never retries timeout, HTTP errors or incomplete content",async()=>{
  const {callBasetenDraft}=await import("../lib/basetenClient.mjs");
  let calls=0;
  const timeout=await callBasetenDraft({}, {apiKey:"offline-placeholder",timeoutMs:5,fetch:async()=>{calls++;return new Promise(()=>{});}});
  assert.equal(timeout.reason,"timeout");assert.equal(calls,1);
  const failed=await callBasetenDraft({}, {apiKey:"offline-placeholder",fetch:async()=>{calls++;return new Response("unread",{status:429});}});
  assert.equal(failed.reason,"unavailable");assert.equal(calls,2);
  const incomplete=await callBasetenDraft({}, {apiKey:"offline-placeholder",fetch:async()=>Response.json({choices:[{finish_reason:"length",message:{content:"partial"}}]})});
  assert.equal(incomplete.reason,"incomplete");assert.equal(incomplete.finishReason,"length");assert.equal(incomplete.text,undefined);
  const echo=await callBasetenDraft({}, {apiKey:"offline-placeholder",fetch:async()=>Response.json({choices:[{finish_reason:"stop",message:{content:"offline-placeholder"}}]})});
  assert.equal(echo.reason,"invalid");assert.equal(echo.text,undefined);
});
test("provider cutoff rejects the entire response even with a complete body and an unpunctuated subject",async()=>{
  const {callBasetenDraft}=await import("../lib/basetenClient.mjs");
  const reply=await callBasetenDraft({}, {apiKey:"offline-placeholder",fetch:async()=>Response.json({choices:[{finish_reason:"length",message:{content:JSON.stringify({subject:"Alert signal: review",body:"Please review the evidence."})}}],usage:{prompt_tokens:10,completion_tokens:20}})});
  assert.equal(reply.reason,"incomplete");assert.equal(reply.finishReason,"length");assert.equal(reply.text,undefined);
  const result=await createDraftHandler({apiKey:()=>"offline-placeholder",reserve:async()=>({allowed:true}),call:async()=>reply,write:()=>{}})(request);
  assert.equal(result.outcome,"fallback");assert.equal(result.reason,"incomplete");
});
test("provider and callable preserve three paragraphs, while an unfinished body uses the standard draft",async()=>{
  const {callBasetenDraft}=await import("../lib/basetenClient.mjs");
  const complete="Reports show more cases.\n\nPlease review Works A.\n\nCheck treatment records.";
  for (const body of [complete,"Check chlorine readings and"]) {
    const handler=createDraftHandler({apiKey:()=>"offline-placeholder",reserve:async()=>({allowed:true}),write:()=>{},
      call:(input,{apiKey})=>callBasetenDraft(input,{apiKey,fetch:async()=>Response.json({choices:[{finish_reason:"stop",message:{content:`<think>hidden</think><final>${JSON.stringify({subject:"Alert signal: review",body})}</final>`}}]})})});
    const result=await handler(request);
    if (body===complete) {assert.equal(result.outcome,"model");assert.equal(result.draft.body,complete);assert.equal(result.draft.subject,"Alert signal: review");}
    else {assert.equal(result.outcome,"fallback");assert.equal(result.reason,"invalid");assert.equal(result.validationReason,"incomplete");assert.ok(result.draft.body.includes("\n\n"));}
  }
});
