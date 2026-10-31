import {test} from "node:test";
import assert from "node:assert/strict";
import {planDraftTrial} from "../../scripts/lib/draftTrial.mjs";
import {buildDraftInput,validateDraftRequest,draftRankingFor} from "../../functions/shared/draft/input.mjs";
import {validateDraft} from "../../functions/shared/draft/validate.mjs";
import {standardDraft,notificationText,DRAFT_FOOTER,fallbackLabel} from "../../functions/shared/draft/standard.mjs";
import {SYMPTOM_LABELS} from "../../functions/shared/draft/copy.mjs";
import {SYMPTOM_GROUPS} from "../../src/config/cardOptions.js";
import {usualCasesText} from "../../functions/shared/draft/counts.mjs";
import town from "../../functions/data/places.json" with {type:"json"};

const input=planDraftTrial()[0].input;
const good={subject:"A signal to review",body:`Please review ${input.sources[0].name}. ${input.cases} cases in ${input.windowDays} days, ${input.usualCases}.`};
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
test("model input omits either or both zero observation flags while retaining positive counts", () => {
  const signal={sources:[],areas:["Thaga Park"],level:"alert",symptomGroup:"diarrhoea_vomiting",timeWindow:{days:3},observed:{cases:5,cards:2},expected:{cases:1},independentReporters:2};
  for (const [flags,expected] of [[{moreSevere:0,notResponding:0},{}],[{moreSevere:2,notResponding:0},{moreSevere:2}],[{moreSevere:0,notResponding:3},{notResponding:3}],[{moreSevere:2,notResponding:3},{moreSevere:2,notResponding:3}]]) {
    const built=buildDraftInput({...signal,flags},{day:17,town});
    assert.deepEqual(built.observations,expected);
    assert.doesNotMatch(standardDraft(built).body,/0 cards|undefined/);
  }
  assert.deepEqual(planDraftTrial().map(({input})=>input.observations),[{moreSevere:1},{moreSevere:4}]);
});
test("standard draft joins the last two areas with and", () => {
  for (const [areas,expected] of [[["Thaga Park"],"Thaga Park"],[["Thaga Park","Leeba View"],"Thaga Park and Leeba View"],[["Thaga Park","Leeba View","Nonyana Flats"],"Thaga Park, Leeba View and Nonyana Flats"]]) {
    assert.ok(standardDraft({...input,areas}).body.includes(`covers ${expected}.`));
  }
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
test("model input gives the same whole-case usual wording as the standard draft", () => {
  assert.deepEqual(planDraftTrial().map(({input})=>input.usualCases),["about 7 cases usually","about 6 cases usually"]);
  assert.equal(validateDraft(JSON.stringify(good),input,town).ok,true);
  assert.equal(validateDraft({...good,body:"6.93 cases usually"},input,town).reason,"number");
  assert.equal(usualCasesText(1.1),"about 1 case usually");
});
test("rounded zero usual is fewer than 1 case in model input and standard draft", () => {
  for (const cases of [0,0.01,0.49]) {
    const signal={sources:[],areas:["Thaga Park"],level:"watch",symptomGroup:"diarrhoea_vomiting",timeWindow:{days:3},observed:{cases:3,cards:2},expected:{cases},independentReporters:1,flags:{moreSevere:0,notResponding:0}};
    const rounded=buildDraftInput(signal,{day:17,town});
    assert.equal(rounded.usualCases,"fewer than 1 case usually");
    assert.match(standardDraft(rounded).body,/fewer than 1 case usually/);
    assert.doesNotMatch(standardDraft(rounded).body,/about 0|0 cards describe/);
    assert.equal(validateDraft({...good,body:rounded.usualCases},rounded,town).ok,true);
  }
});
test("standard drafts use correct level articles, nonzero observations, ranking and first-source checks", () => {
  for (const [level,opening] of [["alert","An Alert signal"],["signal","A Signal"],["watch","A Watch"]]) {
    const ranked={...input,level,observations:{moreSevere:0,notResponding:2},sources:[{...input.sources[0],confidence:"medium"},{name:"School C",confidence:"low",checks:"Ask School C about water points."}]};
    const draft=standardDraft(ranked);
    assert.ok(draft.body.startsWith(opening));
    assert.match(draft.body,/2 cards describe patients not improving as usual\./);
    assert.doesNotMatch(draft.body,/sicker than usual|0 cards|This does not confirm a cause\./);
    assert.ok(draft.body.includes(`1. ${ranked.sources[0].name} (medium confidence)\n2. School C (low confidence)`));
    assert.ok(draft.body.endsWith(`Possible checks for environmental health:\n${ranked.sources[0].checks}`));
    assert.ok(draft.subject.length<=100 && draft.body.length<=1200);
  }
});
test("JSON shape, empty strings, types and both caps fail safely", () => {
  for(const raw of ["bad",null,[],{},Object.create(good), {...good,extra:1},{...good,subject:" "},{...good,body:4},{...good,subject:"a".repeat(101)},{...good,body:"a".repeat(1201)}]) assert.equal(validateDraft(raw,input,town).ok,false);
});
test("banned words, advice prefixes and political words fail", () => {
  for(const word of ["outbreak","outbreaks","epidemic","pandemic","diagnosing","treated","prescription","medication","antibiotics","dose","mayor","blame"]) assert.equal(validateDraft({...good,body:word},input,town).reason,"banned",word);
});
test("only the three exact environmental treatment phrases pass, case-insensitively", () => {
  for (const body of ["water treatment works","treatment works","WATER TREATMENT WORKS","Treatment Works","treatment records","TREATMENT RECORDS"]) assert.equal(validateDraft({...good,body},input,town).ok,true,body);
  for (const body of ["treatment","treat","treated","untreated patients","treatment record","treatment recordsx","treatment plans","treatment-records","treatment  records","treatment-works","treatment  works","treatment\nworks","treatment workss","pretreatment treatment","ｔｒｅａｔｍｅｎｔ works"]) assert.equal(validateDraft({...good,body},input,town).reason,"banned",body);
  assert.deepEqual(validateDraft({...good,body:"water treatment works; treated and untreated patients"},input,town).failures,[{rule:"banned",matches:["treated","untreated"]}]);
  assert.deepEqual(validateDraft({...good,body:"Check treatment records, never treat patients."},input,town).failures,[{rule:"banned",matches:["treat"]}]);
});
test("validation reports every failed rule and every exact match, including original Unicode spelling", () => {
  const restricted={...input,areas:["Thaga Park"],evidenceAreas:["Thaga Park"],sources:[{name:"Works A"}]};
  const result=validateDraft({subject:"Outbreak",body:"ＴＲＥＡＴＥＤ patients: 999, 888 and Nine Hundred. Review Works B and works b; mail@example.invalid",extra:true},restricted,town);
  assert.equal(result.reason,"schema");
  assert.deepEqual(result.failures.map(({rule})=>rule),["schema","banned","contact-or-id","number","name"]);
  assert.deepEqual(result.failures.find(({rule})=>rule==="banned").matches,["Outbreak","ＴＲＥＡＴＥＤ"]);
  assert.deepEqual(result.failures.find(({rule})=>rule==="number").matches,["999","888","Nine Hundred"]);
  assert.deepEqual(result.failures.find(({rule})=>rule==="name").matches,["Works B","works b"]);
  assert.deepEqual(result.failures.find(({rule})=>rule==="contact-or-id").matches,["@","example.invalid"]);
  const tooLong=validateDraft({...good,subject:"Outbreak".repeat(13),body:"999 cases"},input,town);
  assert.deepEqual(tooLong.failures.map(({rule})=>rule),["length","banned","number"]);
  assert.equal(tooLong.failures[1].matches.length,1);
  const malformed=validateDraft('Outbreak 999 {',input,town);
  assert.deepEqual(malformed.failures.map(({rule})=>rule),["json","banned","number"]);
});
test("all numbers must be allowed, including written and signed numbers; list markers are bounded", () => {
  for(const body of ["999 cases","nine hundred and ninety-nine cases","-999 cases","1e9 cases"]) assert.equal(validateDraft({...good,body},input,town).ok,false,body);
  assert.equal(validateDraft({...good,body:"three days"},input,town).ok,true);
  assert.equal(validateDraft({...good,body:"1. Review the evidence."},input,town).ok,true);
  assert.equal(validateDraft({...good,body:"99. Review the evidence."},input,town).ok,false);
});
test("standalone one is exempt, while digit 1, compound numbers and other number words stay checked", () => {
  const day19=planDraftTrial()[1].input;
  for (const body of ["One possible source is Works A.","one possible source","ONE possibility"]) assert.equal(validateDraft({...good,body},day19,town).ok,true,body);
  for (const body of ["1 possible source","twenty-one cases","one hundred cases","two cases"]) assert.equal(validateDraft({...good,body},day19,town).reason,"number",body);
  assert.equal(validateDraft({...good,body:"1 case card"},input,town).ok,true);
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
