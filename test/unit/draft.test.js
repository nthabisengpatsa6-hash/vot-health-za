import {test} from "node:test";
import assert from "node:assert/strict";
import {planDraftTrial} from "../../scripts/lib/draftTrial.mjs";
import {buildDraftInput,validateDraftRequest,draftRankingFor} from "../../functions/shared/draft/input.mjs";
import {validateDraft} from "../../functions/shared/draft/validate.mjs";
import {standardDraft,notificationText,DRAFT_FOOTER,fallbackLabel} from "../../functions/shared/draft/standard.mjs";
import {SYMPTOM_LABELS} from "../../functions/shared/draft/copy.mjs";
import {SYMPTOM_GROUPS} from "../../src/config/cardOptions.js";
import town from "../../functions/data/places.json" with {type:"json"};

const input=planDraftTrial()[0].input;
const good={subject:"A signal to review",body:`Please review ${input.sources[0].name}. ${input.cases} cases in ${input.windowDays} days, usual about ${input.usualCases}.`};
test("draft input contains only structured allow-listed values and fixed wording", () => {
  const text=JSON.stringify(input);
  assert.doesNotMatch(text,/reporter|chance|probability|seed|groundTruth|cardIds|sourceId|symptomsInWords|suppliesNote|exposure.*words/);
  assert.deepEqual(Object.keys(input),["day","level","symptomGroup","areas","evidenceAreas","windowDays","windows","cases","usualCases","cards","placesOfCare","observations","sources"]);
  assert.deepEqual(SYMPTOM_LABELS,Object.fromEntries(SYMPTOM_GROUPS.map(({value,label})=>[value,label])));
  const fake={sources:[{candidate:true,layer:"water:A",name:"Works A",kind:"water",supporting:[],contradicting:[]}],areas:["Thaga Park"],symptomGroup:"diarrhoea_vomiting",timeWindow:{days:3},observed:{cases:5,cards:2},expected:{cases:1},independentReporters:2,flags:{moreSevere:0,notResponding:0}};
  assert.throws(()=>buildDraftInput(fake,{day:17,town,ranking:[{sourceId:"water:B",confidence:"high"}]}),/not-candidate/);
  assert.equal(buildDraftInput(fake,{day:17,town}).sources[0].confidence,undefined);
  assert.equal(buildDraftInput(fake,{day:17,town,ranking:[{sourceId:"water:A",confidence:"low"}]}).sources[0].confidence,"low");
});
test("request validation refuses free text, extra fields, invalid values and duplicate ranks", () => {
  const valid={day:17,symptomGroup:"diarrhoea_vomiting",area:"Thaga Park"};
  assert.equal(validateDraftRequest(valid,town),valid);
  for(const value of [null,[],{}, {...valid,text:"extra"},{...valid,day:29},{...valid,day:1.5},{...valid,area:"Unknown"},{...valid,symptomGroup:"unknown"},{...valid,ranking:null},{...valid,ranking:[{sourceId:"water:A",confidence:"certain"}]},{...valid,ranking:[{sourceId:"water:A",confidence:"low",text:"extra"}]},{...valid,ranking:Array(5).fill({sourceId:"water:A",confidence:"low"})},{...valid,ranking:Array(2).fill({sourceId:"water:A",confidence:"low"})}]) assert.throws(()=>validateDraftRequest(value,town));
});
test("standard drafts fit the caps, use the actual window and get their footer only from code", () => {
  for(const plan of planDraftTrial()) {
    const draft=standardDraft(plan.input);
    assert.ok(draft.subject.length<=100 && draft.body.length<=1200);
    assert.ok(draft.body.includes(`${plan.input.windowDays} days`));
    assert.ok(!draft.body.includes(DRAFT_FOOTER));
    const edited={subject:"Human subject",body:"Human body"};
    assert.equal(notificationText(edited),`Human subject\n\nHuman body\n\n${DRAFT_FOOTER}`);
  }
});
test("valid JSON and permitted decimals pass", () => {assert.equal(validateDraft(JSON.stringify(good),input,town).ok,true);});
test("JSON shape, empty strings, types and both caps fail safely", () => {
  for(const raw of ["bad",null,[],{}, {...good,extra:1},{...good,subject:" "},{...good,body:4},{...good,subject:"a".repeat(101)},{...good,body:"a".repeat(1201)}]) assert.equal(validateDraft(raw,input,town).ok,false);
});
test("banned words, advice prefixes and political words fail", () => {
  for(const word of ["outbreak","outbreaks","epidemic","pandemic","diagnosing","treated","prescription","medication","antibiotics","dose","mayor","blame"]) assert.equal(validateDraft({...good,body:word},input,town).reason,"banned",word);
});
test("all numbers must be allowed, including written and signed numbers; list markers are bounded", () => {
  for(const body of ["999 cases","nine hundred and ninety-nine cases","-999 cases","1e9 cases"]) assert.equal(validateDraft({...good,body},input,town).ok,false,body);
  assert.equal(validateDraft({...good,body:"three days"},input,town).ok,true);
  assert.equal(validateDraft({...good,body:"1. Review the evidence."},input,town).ok,true);
  assert.equal(validateDraft({...good,body:"99. Review the evidence."},input,town).ok,false);
});
test("town names must be present in the input; contact and identifier patterns fail", () => {
  const restricted={...input,areas:["Thaga Park"],evidenceAreas:["Thaga Park"],sources:[{name:"Works A"}]};
  assert.equal(validateDraft({...good,body:"Review Works B."},restricted,town).reason,"name");
  assert.equal(validateDraft({...good,body:"Review Lebone Gardens."},restricted,town).reason,"name");
  for(const body of ["https://example.invalid","example.invalid","mail@example.invalid","@team","+27 11 555 0101","sim-2027-01-01-01","ABC-12345","aaaaaaaaaaaaaaaaaaaaaaaa"]) assert.equal(validateDraft({...good,body},input,town).ok,false,body);
});
test("old-day rankings are omitted and every fallback label tells the truth", () => {
  const signal={sources:[{candidate:true,layer:"water:A"}]};
  assert.equal(draftRankingFor(signal,{day:16,ranking:{sources:[{sourceId:"water:A",confidence:"high"}]}},17),undefined);
  assert.deepEqual(draftRankingFor(signal,{day:17,ranking:{sources:[{sourceId:"water:B",confidence:"low"},{sourceId:"water:A",confidence:"high"}]}},17),[{sourceId:"water:A",confidence:"high"}]);
  for(const reason of ["no-key","account-cap","app-cap","counter-failed","timeout","invalid","unavailable"]) assert.match(fallbackLabel(reason),/^Standard draft\. /);
});
