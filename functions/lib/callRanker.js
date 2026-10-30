const {createHash} = require("node:crypto");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {writeRankTiming} = require("./rankTiming");

const SYSTEM_PROMPT = readFileSync(join(__dirname, "..", "prompts", "rank-sources.md"), "utf8").replace(/\r\n/g, "\n").trim();
const PROMPT_HASH = createHash("sha256").update(SYSTEM_PROMPT).digest("hex").slice(0, 16);

// Separate from extraction's client: only invalid JSON earns a retry here.
// Never retain or rethrow a fetch error, HTTP body, headers or request object.
async function callRanker(input, options = {}) {
  const {RANK_SETTINGS, PROVIDERS} = await import("../shared/rank/settings.mjs");
  const {RANK_SCHEMA} = await import("../shared/rank/schema.mjs");
  const {assertRankInput} = await import("../shared/rank/input.mjs");
  assertRankInput(input);
  const {apiKey, effort = RANK_SETTINGS.effort, provider = RANK_SETTINGS.provider,
    model = RANK_SETTINGS.model, fetch: fetchImpl = globalThis.fetch,
    timeoutMs = RANK_SETTINGS.timeoutMs, log = writeRankTiming} = options;
  if (provider !== "meta") throw new Error("Only the Meta provider is enabled in Task 15a.");
  if (model !== PROVIDERS.meta.model || model.includes("contributor")) throw new Error("The configured Standard-mode ranking model is required.");
  if (!["low", "medium"].includes(effort)) throw new Error("Ranking effort must be low or medium.");
  if (typeof apiKey !== "string" || !apiKey) throw new Error("A key must be supplied by the interactive caller.");
  const started = performance.now();
  const rawAttempts = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let usageMissing = false;
  let attempts = 0;
  let outcome = "invalid_json";
  let raw = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    attempts++;
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, timeoutMs);
      });
      const request = (async () => {
        const response = await fetchImpl(`${PROVIDERS.meta.baseUrl}/chat/completions`, {
          method: "POST", signal: controller.signal,
          headers: {Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json"},
          body: JSON.stringify({model, reasoning_effort: effort, temperature: RANK_SETTINGS.temperature,
            max_completion_tokens: RANK_SETTINGS.maxCompletionTokens, store: false,
            response_format: {type: "json_schema", json_schema: {name: "source_ranking", strict: true, schema: RANK_SCHEMA}},
            messages: [{role: "system", content: SYSTEM_PROMPT}, {role: "user", content: JSON.stringify(input)}]}),
        });
        if (!response.ok) return {httpError: true};
        const bodyText = await response.text();
        try { return {body: JSON.parse(bodyText)}; } catch { return {invalidEnvelope: true}; }
      })();
      const reply = await Promise.race([request, timeout]);
      if (reply.httpError) { usageMissing = true; outcome = "http_error"; break; }
      const body = reply.body;
      const usage = body?.usage;
      if (Number.isFinite(usage?.prompt_tokens) && Number.isFinite(usage?.completion_tokens)) {
        inputTokens += usage.prompt_tokens; outputTokens += usage.completion_tokens;
      } else { usageMissing = true; }
      const choice = body?.choices?.[0];
      const text = typeof choice?.message?.content === "string" ? choice.message.content : "";
      // This catches accidental credential echoes before any persistence or logging.
      if (text.includes(apiKey)) { outcome = "unsafe_reply"; break; }
      rawAttempts.push(text);
      try { raw = JSON.parse(text); } catch { raw = null; outcome = "invalid_json"; continue; }
      if (choice.finish_reason !== "stop") { raw = null; outcome = "incomplete_reply"; break; }
      outcome = "ok";
      break;
    } catch {
      usageMissing = true;
      outcome = controller.signal.aborted ? "timeout" : "network_error";
      break;
    } finally { clearTimeout(timer); }
  }
  const timing = {model, effort, promptHash: PROMPT_HASH,
    inputTokens: usageMissing ? null : inputTokens, outputTokens: usageMissing ? null : outputTokens,
    ms: Math.round(performance.now() - started), attempts, outcome};
  log(timing);
  return {...timing, tokens: {input: timing.inputTokens, output: timing.outputTokens},
    rawOutput: rawAttempts.at(-1) ?? null, rawAttempts, raw,
    unavailable: outcome !== "ok"};
}

exports.callRanker = callRanker;
exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
exports.PROMPT_HASH = PROMPT_HASH;
