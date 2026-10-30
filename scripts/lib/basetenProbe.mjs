import {createRequire} from "node:module";
import {BASE_URL, finalAnswer, usageOnly} from "./basetenScoring.mjs";
import {PROBE_BODY} from "./noteRevision.mjs";
import {assertNoSecrets} from "./noteArtifacts.mjs";
const {redact} = createRequire(import.meta.url)("../../functions/lib/metaRequest.js");
const sensitive = /authorization|cookie|api.?key|token|secret|password/i;
const reasoning = /^(?:reasoning|reasoning_content|analysis|chain_of_thought)$/i;
export function safeProbeDiagnostics(response, body, apiKey) {
  const clean = (value) => {
    if (typeof value === "string") return redact(finalAnswer({content:value}) ?? "[reasoning omitted]", apiKey)
      .replace(/(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*[^\s,;}]+/gi, "[redacted]")
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email redacted]")
      .replace(/[A-Z]:[\\/]Users[\\/][^\s"']+/gi, "[path redacted]");
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !reasoning.test(key)).map(([key, item]) =>
      sensitive.test(key) ? ["redacted-field", "[redacted]"] : [key, clean(item)]));
    return value;
  };
  let decoded; try {decoded = JSON.parse(body);} catch {}
  const headers = {};
  for (const [name, value] of response.headers) if (/^(?:x-request-id|request-id|x-correlation-id|traceparent|cf-ray|date|server|content-type|retry-after|(?:x-)?ratelimit-[a-z-]+)$/i.test(name)) headers[name] = clean(value);
  return {method:"POST", url:`${BASE_URL}/chat/completions`, status:response.status, headers,
    body:typeof decoded === "object" && decoded !== null ? JSON.stringify(clean(decoded)) : clean(body)};
}
export async function probeBasetenExample({apiKey, fetch:fetchImpl = globalThis.fetch, timeoutMs = 60000} = {}) {
  const controller = new AbortController(), started = performance.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${BASE_URL}/chat/completions`, {method:"POST", signal:controller.signal,
      headers:{Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json"}, body:JSON.stringify(PROBE_BODY)});
    const body = await response.text();
    if (!response.ok) throw Object.assign(new Error("Baseten example probe failed."), {kind:"http", status:response.status, attempts:1,
      diagnostics:safeProbeDiagnostics(response, body, apiKey)});
    let envelope; try {envelope = JSON.parse(body);} catch {throw Object.assign(new Error("Invalid probe envelope."), {kind:"bad-reply", attempts:1, diagnostics:safeProbeDiagnostics(response, body, apiKey)});}
    // Select final answer and usage only. Never persist reasoning content.
    const final = finalAnswer(envelope.choices?.[0]?.message);
    if (typeof final !== "string" || envelope.choices?.[0]?.finish_reason !== "stop") throw Object.assign(new Error("Incomplete probe final answer."), {kind:"bad-reply", attempts:1, diagnostics:safeProbeDiagnostics(response, body, apiKey)});
    try {assertNoSecrets(final, [apiKey]);} catch {throw Object.assign(new Error("Unsafe probe final answer."), {kind:"unsafe-reply", attempts:1, diagnostics:safeProbeDiagnostics(response, body, apiKey)});}
    return {accepted:true, finalAnswer:final, usage:usageOnly(envelope.usage),
      attempts:1, latencyMs:Math.round(performance.now() - started)};
  } catch (error) {
    if (error.kind) throw error;
    throw Object.assign(new Error("Baseten example probe failed safely."), {kind:controller.signal.aborted ? "timeout" : "network", attempts:1,
      diagnostics:{method:"POST", url:`${BASE_URL}/chat/completions`, status:null, headers:{}, body:"No HTTP response received."}});
  } finally {clearTimeout(timer);}
}
