import {test} from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {loadComponent} from "../helpers/render-component.mjs";
import {standardDraft,DRAFT_FOOTER} from "../../functions/shared/draft/standard.mjs";
import {planDraftTrial} from "../../scripts/lib/draftTrial.mjs";
import {dailySignalChart} from "../../functions/shared/signalDetail.mjs";
import {createRun} from "../../functions/shared/sim/engine.mjs";
import {computeSignals} from "../../functions/shared/signals.mjs";
import {usualCasesText} from "../../functions/shared/draft/counts.mjs";
import {dayEnd,dayOfDate} from "../../functions/shared/sastDay.mjs";
import town from "../../functions/data/places.json" with {type:"json"};
const {DraftEditor}=await loadComponent("../../src/components/DraftedNotification.jsx");
const {default:SignalDetail}=await loadComponent("../../src/components/SignalDetail.jsx");
const draft=standardDraft(planDraftTrial()[0].input),noop=()=>{};
const render=(props={})=>renderToStaticMarkup(createElement(DraftEditor,{draft,label:"Standard draft.",onEdit:noop,onCopy:noop,onSent:noop,...props}));
test("notification has editable subject/body, a generic recipient and code footer",()=>{
  const html=render();assert.match(html,/<input[^>]*maxLength="100"/);assert.match(html,/<textarea[^>]*maxLength="1200"/);
  assert.match(html,/To: District environmental health/);assert.match(html,/>Copy</);assert.match(html,/>Mark as sent</);
  assert.ok(html.includes(DRAFT_FOOTER.replaceAll("'","&#x27;")));assert.doesNotMatch(html,/font-voice|voice-quote|mailto:|reporter/);
});
test("public mode has the standard attribution and no live button; loading and caps disable live drafting",()=>{
  const publicHtml=render({label:"Standard draft. Sign in to draft with Muse Spark Open."});
  assert.match(publicHtml,/Sign in to draft/);assert.doesNotMatch(publicHtml,/>Draft with Muse Spark Open</);
  assert.match(render({onDraft:noop,loading:true}),/disabled=""/);
  assert.match(render({onDraft:noop,loading:true}),/waveform/);
  assert.match(render({onDraft:noop,capped:true}),/disabled=""/);
});
test("model attribution, edits, copy feedback and sent simulation state remain explicit",()=>{
  const html=render({label:"Drafted by Muse Spark Open on Baseten just now, in 1.2 s.",edited:true,sent:true,notice:"Copied."});
  assert.match(html,/in 1.2 s/);assert.match(html,/Edited by you/);assert.match(html,/Copied\./);
  assert.match(html,/Marked as sent. This is a simulation, so nothing was saved or sent./);
});
test("detail shows only engine counts, merged-window metadata and the approved plain Usual line",()=>{
  const run=createRun({seed:1}),day=17,cards=run.cardsUpTo(day),asOf=dayEnd(dayOfDate(run.startDate)+day);
  const signal=computeSignals({cards,asOf,town}).signals.find((s)=>s.level==="alert");
  const chart=dailySignalChart({cards,asOf,signal,town});
  const html=renderToStaticMarkup(createElement(SignalDetail,{signal,replay:{cardsUpTo:()=>cards,dateOf:()=>"2027-02-18"},runId:"seeded",day,area:signal.areas[0],town,chart,onBack:noop}));
  assert.ok(html.includes(`${signal.observed.cases} cases in ${signal.timeWindow.days} days`));
  assert.ok(html.includes(usualCasesText(signal.expected.cases)));
  assert.ok(!html.includes(`usual about ${signal.expected.cases}`));
  assert.match(html,/Usual comes from this area&#x27;s 8 weeks of reports ending 2 weeks before today\./);
  assert.doesNotMatch(html,/baseline-card|reporterUid|reporterRole|reporterFacilityType|reporterArea|probabil|chance/);
  assert.match(html,/Daily cases/);assert.match(html,/class="voice-quote"/);assert.match(html,/Sign in to draft with Muse Spark Open/);
});
test("Signal detail says fewer than 1 case usually when the displayed usual rounds to zero",()=>{
  const run=createRun({seed:1}),day=17,cards=run.cardsUpTo(day),asOf=dayEnd(dayOfDate(run.startDate)+day);
  const signal=computeSignals({cards,asOf,town}).signals.find((s)=>s.level==="alert");
  const chart=dailySignalChart({cards,asOf,signal,town});
  const html=renderToStaticMarkup(createElement(SignalDetail,{signal:{...signal,expected:{...signal.expected,cases:0.49}},replay:{cardsUpTo:()=>cards,dateOf:()=>"2027-02-18"},runId:"seeded",day,area:signal.areas[0],town,chart,onBack:noop}));
  assert.match(html,/fewer than 1 case usually/);assert.doesNotMatch(html,/about 0 cases/);
});
