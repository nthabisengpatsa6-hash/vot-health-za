import {DRAFT_SETTINGS} from "../shared/draft/settings.mjs";
import {draftRequestBody} from "./draftRequest.mjs";
export {DRAFT_PROMPT} from "./draftRequest.mjs";

export function finalDraftContent(message) {
  let text = Array.isArray(message?.content) ? message.content.filter((part) => part.type === "text").map((part) => part.text || "").join("") : message?.content;
  if (typeof text !== "string") return null;
  text = text.replace(/<(?:think|analysis)>[\s\S]*?<\/(?:think|analysis)>/gi, "");
  if (/<(?:think|analysis)>/i.test(text)) return null;
  const final = text.match(/<final>([\s\S]*?)<\/final>/i);
  return (final ? final[1] : text).trim();
}

export async function callBasetenDraft(input, {apiKey, fetch:fetchImpl = globalThis.fetch, timeoutMs = DRAFT_SETTINGS.timeoutMs, model = DRAFT_SETTINGS.model, baseUrl = DRAFT_SETTINGS.baseUrl} = {}) {
  if (model !== "meta-models/muse-spark-open-1026" || baseUrl !== "https://inference.baseten.co/v1") throw new Error("draft-provider-guard");
  if (typeof apiKey !== "string" || !apiKey.trim()) return {reason:"no-key",ms:0,inputTokens:null,outputTokens:null,reasoningTokens:null};
  const started = performance.now(), controller = new AbortController();
  let timer, tokens = {inputTokens:null,outputTokens:null,reasoningTokens:null};
  try {
    const timeout = new Promise((_, reject) => {timer = setTimeout(() => {controller.abort();reject(new Error("timeout"));}, timeoutMs);});
    const request = (async () => {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {method:"POST",signal:controller.signal,headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(draftRequestBody(input))});
      if (!response.ok) return {reason:"unavailable"};
      const envelope = await response.json(), usage = envelope.usage;
      for (const [key, value] of Object.entries({inputTokens:usage?.prompt_tokens,outputTokens:usage?.completion_tokens,reasoningTokens:usage?.completion_tokens_details?.reasoning_tokens})) if (Number.isSafeInteger(value) && value >= 0) tokens[key] = value;
      if (tokens.reasoningTokens !== null && tokens.outputTokens !== null && tokens.reasoningTokens > tokens.outputTokens) tokens = {inputTokens:null,outputTokens:null,reasoningTokens:null};
      const choice = envelope.choices?.[0], text = finalDraftContent(choice?.message);
      if (choice?.finish_reason !== "stop" || text === null || text.includes(apiKey)) return {reason:"invalid"};
      return {text};
    })();
    return {...await Promise.race([request,timeout]),...tokens,ms:Math.round(performance.now()-started)};
  } catch { return {reason:controller.signal.aborted ? "timeout" : "unavailable",...tokens,ms:Math.round(performance.now()-started)}; }
  finally {clearTimeout(timer);}
}
