import {createRequire} from "node:module";
import {BASETEN_MODEL} from "./notePlans.mjs";
import {assertTuningSeeds} from "./rankPlans.mjs";
import {assertNoSecrets} from "./noteArtifacts.mjs";
const require = createRequire(import.meta.url);
const {callRanker} = require("../../functions/lib/callRanker.js");
export const BASE_URL = "https://inference.baseten.co/v1";

export function finalAnswer(message) {
  let text = Array.isArray(message?.content) ? message.content.filter((part) => part.type === "text").map((part) => part.text || "").join("") : message?.content;
  if (typeof text !== "string") return null;
  text = text.replace(/<(?:think|analysis)>[\s\S]*?<\/(?:think|analysis)>/gi, "");
  if (/<(?:think|analysis)>/i.test(text)) return null;
  const final = text.match(/<final>([\s\S]*?)<\/final>/i);
  return (final ? final[1] : text).trim();
}
export function usageOnly(usage) {
  if (!usage) return null;
  return {prompt_tokens:usage.prompt_tokens, completion_tokens:usage.completion_tokens,
    ...(usage.completion_tokens_details?.reasoning_tokens !== undefined ? {completion_tokens_details:{reasoning_tokens:usage.completion_tokens_details.reasoning_tokens}} : {})};
}

export function assertBasetenInput(body, source, seed) {
  if (!["fixture", "ranking", "probe"].includes(source)) throw new Error("Only authored text or simulation may reach Baseten.");
  if (source === "ranking" || seed !== undefined) assertTuningSeeds([seed]);
  if (body.messages?.some((message) => typeof message.content !== "string") || /"(?:input_audio|audio_url|file_id)"/.test(JSON.stringify(body))) throw new Error("Baseten audio is forbidden.");
}

export async function productionRankingBody(input) {
  let body;
  // Use the actual production request builder with an offline transport.
  // Its provider guard and implementation remain untouched.
  await callRanker(input, {apiKey:"offline-builder-placeholder", log:()=>{}, fetch:async (_url, init) => {
    body = JSON.parse(init.body);
    return Response.json({choices:[{message:{content:'{"sources":[]}'}, finish_reason:"stop"}], usage:{prompt_tokens:0, completion_tokens:0}});
  }});
  if (!body) throw new Error("Ranking builder failed.");
  return body;
}

export async function callBaseten(body, {apiKey, source, seed, fetch:fetchImpl = globalThis.fetch,
  timeoutMs = 60000, retryDelayMs = 1000} = {}) {
  const payload = {...body, model:BASETEN_MODEL, reasoning_effort:"low"};
  if (payload.max_completion_tokens) { payload.max_tokens = payload.max_completion_tokens; delete payload.max_completion_tokens; }
  assertBasetenInput(payload, source, seed);
  const started = performance.now(), attemptMs = [];
  let last;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController(), at = performance.now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${BASE_URL}/chat/completions`, {method:"POST", signal:controller.signal,
        headers:{Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json"}, body:JSON.stringify(payload)});
      if (!response.ok) throw Object.assign(new Error("Provider HTTP failure."), {kind:"http", status:response.status});
      const envelope = await response.json();
      const text = finalAnswer(envelope.choices?.[0]?.message);
      assertNoSecrets(text, [apiKey]);
      attemptMs.push(Math.round(performance.now() - at));
      if (envelope.choices?.[0]?.finish_reason !== "stop" || typeof text !== "string") throw Object.assign(new Error("Incomplete reply."), {kind:"bad-reply"});
      return {text, usage:usageOnly(envelope.usage), attempts:attempt, attemptMs, latencyMs:Math.round(performance.now() - started), failures:[]};
    } catch (error) {
      if (attemptMs.length < attempt) attemptMs.push(Math.round(performance.now() - at));
      const kind = error.kind || (controller.signal.aborted ? "timeout" : "network");
      last = Object.assign(new Error("Baseten request failed safely."), {kind, status:error.status, attempts:attempt, attemptMs});
      if (attempt === 2 || !(["network", "timeout"].includes(kind) || kind === "http" && (error.status === 429 || error.status >= 500))) throw last;
    } finally { clearTimeout(timer); }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  throw last;
}

export function basetenTransport(options) {
  return async ({buildInit}) => {
    const result = await callBaseten(JSON.parse(buildInit().body), options);
    const {text, usage, ...timing} = result;
    return {value:{text, usage}, ...timing};
  };
}
