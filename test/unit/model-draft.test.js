import {test} from "node:test";
import assert from "node:assert/strict";
import {validateModelDraft} from "../../functions/shared/draft/model.mjs";
import {planDraftTrial} from "../../scripts/lib/draftTrial.mjs";
import {notificationText} from "../../functions/shared/draft/standard.mjs";
import town from "../../functions/data/places.json" with {type:"json"};

const input=planDraftTrial()[0].input;
const good={subject:"Alert signal: review",summary:input.severitySentence,source:"Please review Works A.",checks:"Check treatment records."};

test("model fields become exactly three paragraphs in the existing subject/body contract",()=>{
  const raw={...good,summary:`  ${good.summary}  `,source:`\n${good.source}\n`,checks:` ${good.checks} `};
  const checked=validateModelDraft(JSON.stringify(raw),input,town);
  assert.deepEqual(checked,{ok:true,draft:{subject:good.subject,body:[good.summary,good.source,good.checks].join("\n\n")}});
  assert.equal(checked.draft.body.split("\n\n").length,3);
  assert.ok(notificationText(checked.draft).includes(checked.draft.body));
});
test("four exact nonempty string fields are required; old body replies, extra fields and inherited fields fail",()=>{
  for (const raw of [null,[],{},Object.create(good),{subject:good.subject,body:"Old reply."},{...good,extra:true},{...good,source:" "},{...good,checks:4}]) assert.equal(validateModelDraft(raw,input,town).reason,"schema");
  assert.equal(validateModelDraft("not JSON",input,town).reason,"json");
});
test("each local field cap is enforced without truncation and the assembled body retains its cap",()=>{
  const limits={subject:100,summary:300,source:350,checks:250};
  const maximum=Object.fromEntries(Object.entries(limits).map(([field,cap])=>[field,"r".repeat(cap-(field==="subject"?0:1))+(field==="subject"?"":".")]));
  const checked=validateModelDraft(maximum,input,town);
  assert.equal(checked.ok,true);assert.equal(checked.draft.body.length,904);assert.equal(checked.draft.subject.length,100);
  for (const [field,cap] of Object.entries(limits)) {
    const raw={...good,[field]:"r".repeat(cap)+"."};
    const failure=validateModelDraft(raw,input,town);
    assert.equal(failure.reason,"length");assert.ok(failure.failures.some((item)=>item.field===field && item.matches[0]===raw[field]));
  }
  const huge={...good,summary:"r".repeat(600)+".",source:"r".repeat(600)+".",checks:"r".repeat(600)+"."};
  assert.ok(validateModelDraft(huge,input,town).failures.some(({rule,field})=>rule==="length"&&field==="body"));
});
test("each content field needs a sentence ending; the subject needs none",()=>{
  for (const field of ["summary","source","checks"]) {
    for (const punctuation of [".","!","?"]) assert.equal(validateModelDraft({...good,[field]:`Review evidence${punctuation}`},input,town).ok,true);
    const result=validateModelDraft({...good,[field]:"Please do"},input,town);
    assert.deepEqual(result.failures,[{rule:"incomplete",field,matches:["Please do"]}]);
  }
});
test("embedded blank-line paragraph breaks in any content field are refused",()=>{
  for (const field of ["summary","source","checks"]) for (const separator of ["\n\n","\r\n\r\n","\n \t\n"]) {
    const text=`Review evidence.${separator}Check records.`;
    assert.deepEqual(validateModelDraft({...good,[field]:text},input,town).failures,[{rule:"paragraph",field,matches:[text]}]);
  }
});
test("all content guards apply to model fields and keep every failure with exact matches",()=>{
  const checked=validateModelDraft({...good,summary:"Outbreak: 999 severe cases.",source:"Please do"},input,town);
  assert.deepEqual(checked.failures,[{rule:"incomplete",field:"source",matches:["Please do"]},{rule:"banned",matches:["Outbreak"]},{rule:"severity-unit",matches:["severe cases"]},{rule:"number",matches:["999"]}]);
  for (const [field,text,reason] of [["subject","Severe case","severity-unit"],["summary","Review Works B.","name"],["source","Visit example.invalid.","contact-or-id"],["checks","Treat patients.","banned"]]) assert.ok(validateModelDraft({...good,[field]:text},input,town).failures.some(({rule})=>rule===reason));
});
