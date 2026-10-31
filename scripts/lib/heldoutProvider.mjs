import {RANK_SETTINGS, PROVIDERS} from "../../functions/shared/rank/settings.mjs";
import {RANK_SCHEMA} from "../../functions/shared/rank/schema.mjs";
import {assertRankInput} from "../../functions/shared/rank/input.mjs";
import {SYSTEM_PROMPT, RANK_HASH} from "./heldoutGuards.mjs";

export const PRICES = Object.freeze({inputPerMillion:1.25, outputPerMillion:4.25, checked:"2026-10-31", source:"https://dev.meta.ai/docs/pricing-rate-limits"});
export const SPENDING_LIMIT = 2;
export function requestBody(input) {
  assertRankInput(input);
  return {model:RANK_SETTINGS.model, reasoning_effort:RANK_SETTINGS.effort, temperature:RANK_SETTINGS.temperature,
    max_completion_tokens:RANK_SETTINGS.maxCompletionTokens, store:false,
    response_format:{type:"json_schema", json_schema:{name:"source_ranking", strict:true, schema:RANK_SCHEMA}},
    messages:[{role:"system", content:SYSTEM_PROMPT}, {role:"user", content:JSON.stringify(input)}]};
}
export const estimatedInput = (input) => Math.ceil(Buffer.byteLength(SYSTEM_PROMPT + JSON.stringify(input), "utf8") / 4) + 64;
export const tokenCost = (input, output) => (input * PRICES.inputPerMillion + output * PRICES.outputPerMillion) / 1e6;
export const cappedCost = (input) => tokenCost(estimatedInput(input), RANK_SETTINGS.maxCompletionTokens);
export function chargedCost(input, usage) {
  return usage.reduce((sum, row) => sum + (Number.isFinite(row.input) && row.input >= 0 && Number.isFinite(row.output) && row.output >= 0 ? tokenCost(row.input, row.output) : cappedCost(input)), 0);
}

// Task 18's approved adapter: the production ranker remains byte-for-byte frozen.
// Only transport failures earn one retry. Never retain a provider error object/body/header.
export async function heldOutProvider(input, {apiKey, fetch:fetchImpl = globalThis.fetch,
  timeoutMs = RANK_SETTINGS.timeoutMs, wait = (ms) => new Promise((resolve) => setTimeout(resolve,ms))} = {}) {
  const body = requestBody(input);
  if (typeof apiKey !== "string" || !apiKey) throw new Error("Interactive key required.");
  const started = performance.now();
  const usage = [];
  let raw = null, rawOutput = null, outcome = "network_error";
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController(); let timer; let retry = false;
    try {
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => {controller.abort(); reject(new Error("timeout"));}, timeoutMs); });
      const exchange = (async () => {
        const response = await fetchImpl(`${PROVIDERS.meta.baseUrl}/chat/completions`, {method:"POST", signal:controller.signal,
          headers:{Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json"}, body:JSON.stringify(body)});
        if (!response.ok) return {status:response.status};
        return {body:await response.text()};
      })();
      const reply = await Promise.race([exchange, timeout]);
      if (reply.status !== undefined) {
        outcome = "http_error"; usage.push({input:null, output:null});
        retry = reply.status === 429 || (reply.status >= 500 && reply.status <= 599);
      } else {
        let envelope;
        try { envelope = JSON.parse(reply.body); } catch { outcome = "invalid_json"; usage.push({input:null, output:null}); break; }
        const tokens = envelope?.usage;
        usage.push({input:Number.isFinite(tokens?.prompt_tokens) && tokens.prompt_tokens >= 0 ? tokens.prompt_tokens : null,
          output:Number.isFinite(tokens?.completion_tokens) && tokens.completion_tokens >= 0 ? tokens.completion_tokens : null});
        const choice = envelope?.choices?.[0];
        const text = choice?.message?.content;
        if (typeof text !== "string") { outcome = "invalid_json"; break; }
        if (text.includes(apiKey)) { outcome = "unsafe_reply"; break; }
        rawOutput = text;
        try { raw = JSON.parse(text); } catch { outcome = "invalid_json"; break; }
        if (choice.finish_reason !== "stop") { raw = null; outcome = "incomplete_reply"; break; }
        outcome = "ok"; break;
      }
    } catch {
      usage.push({input:null, output:null}); outcome = controller.signal.aborted ? "timeout" : "network_error"; retry = true;
    } finally { clearTimeout(timer); }
    if (!retry || attempt === 1) break;
    await wait(1000);
  }
  const known = usage.every((row) => row.input !== null && row.output !== null);
  return {raw, rawOutput, outcome, unavailable:outcome !== "ok", attempts:usage.length, usage,
    tokens:{input:known ? usage.reduce((sum,row) => sum+row.input,0) : null, output:known ? usage.reduce((sum,row) => sum+row.output,0) : null},
    accountedCost:chargedCost(input,usage), costIncludesEstimate:!known,
    ms:Math.round(performance.now()-started), model:RANK_SETTINGS.model, effort:RANK_SETTINGS.effort, promptHash:RANK_HASH};
}
