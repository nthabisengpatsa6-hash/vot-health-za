const {test}=require("node:test"),assert=require("node:assert/strict");
const {createDraftHandler}=require("../lib/draftNotification");
const {draftTimingEntry}=require("../lib/draftTiming");

test("different-day requests and timing logs have the same fixed prompt hash, without evidence",async()=>{
  const {callBasetenDraft}=await import("../lib/basetenClient.mjs");
  const {draftPromptHash,DRAFT_PROMPT_HASH}=await import("../lib/draftRequest.mjs");
  const requests=[],logs=[];
  const handler=createDraftHandler({apiKey:()=>"offline-placeholder",reserve:async()=>({allowed:true}),
    call:(input,{apiKey})=>callBasetenDraft(input,{apiKey,fetch:async(_url,init)=>{
      requests.push(JSON.parse(init.body));
      return Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify({subject:"Alert signal: review",body:"Please review the linked evidence."})}}],usage:{prompt_tokens:10,completion_tokens:20}});
    }}),write:(entry)=>logs.push(draftTimingEntry(entry))});
  for (const day of [17,19]) assert.equal((await handler({auth:{uid:"draft-test"},data:{day,symptomGroup:"diarrhoea_vomiting",area:"Leeba View"}})).outcome,"model");
  assert.notEqual(requests[0].messages.at(-1).content,requests[1].messages.at(-1).content);
  assert.deepEqual(requests.map(draftPromptHash),[DRAFT_PROMPT_HASH,DRAFT_PROMPT_HASH]);
  assert.deepEqual(logs.map(({promptHash})=>promptHash),[DRAFT_PROMPT_HASH,DRAFT_PROMPT_HASH]);
  assert.match(DRAFT_PROMPT_HASH,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(logs),/subject|body|cases|observations|uid|Please review/);
});

test("every instruction line and each approved fixed setting changes the prompt hash",async()=>{
  const {draftRequestBody,draftPromptHash,DRAFT_PROMPT_HASH}=await import("../lib/draftRequest.mjs");
  const request=draftRequestBody({day:17,cases:52}),lines=request.messages[0].content.split("\n");
  for (let index=0;index<lines.length;index++) {
    const changed=structuredClone(request),instructions=[...lines];
    instructions[index]+=" Use shorter sentences.";
    changed.messages[0].content=instructions.join("\n");
    assert.notEqual(draftPromptHash(changed),DRAFT_PROMPT_HASH,`instruction line ${index+1}`);
  }
  for (const mutate of [(r)=>{r.model="different-model";},(r)=>{r.max_tokens++;},(r)=>{r.reasoning_effort="high";},
    (r)=>{r.response_format.json_schema.schema.properties.body.maxLength--;},(r)=>{r.response_format.json_schema.strict=false;},
    (r)=>{r.messages.splice(1,0,{role:"developer",content:"Use plain requests."});}]) {
    const changed=structuredClone(request);mutate(changed);
    assert.notEqual(draftPromptHash(changed),DRAFT_PROMPT_HASH);
  }
  const changedEvidence=structuredClone(request);changedEvidence.messages.at(-1).content=JSON.stringify({day:19,cases:86});
  assert.equal(draftPromptHash(changedEvidence),DRAFT_PROMPT_HASH);
});

test("the five requested drafting instructions are sent verbatim with the canonical product name",async()=>{
  const {DRAFT_PROMPT}=await import("../lib/draftRequest.mjs");
  const {PRODUCT_NAME}=await import("../shared/product.mjs");
  const lines=DRAFT_PROMPT.split("\n");
  for (const line of ["Case cards are written by clinicians. Call them case cards or clinicians' reports, never anything else.",
    "Keep every number with its unit exactly as given: cases, case cards, places of care. A case card is not a case.",
    `Write it as a request to the district environmental health office: what clinicians' reports show and where ${PRODUCT_NAME} suggests looking first. Never say that anyone is already reviewing or investigating.`,
    "Start the subject with the level, for example 'Alert signal:'.","Use 3 to 5 short paragraphs separated by blank lines."]) assert.ok(lines.includes(line),line);
});

test("fallback and signed-out timing records retain the configured fixed prompt hash without content",async()=>{
  const {DRAFT_PROMPT_HASH}=await import("../lib/draftRequest.mjs");
  const logs=[],handler=createDraftHandler({apiKey:()=>"",write:(entry)=>logs.push(draftTimingEntry(entry))});
  assert.equal((await handler({auth:{uid:"draft-test"},data:{day:17,symptomGroup:"diarrhoea_vomiting",area:"Leeba View"}})).reason,"no-key");
  await assert.rejects(handler({auth:null,data:{}}),{code:"unauthenticated"});
  assert.ok(logs.every((entry)=>entry.promptHash===DRAFT_PROMPT_HASH));
  assert.doesNotMatch(JSON.stringify(logs),/subject|body|cases|observations|uid/);
});
