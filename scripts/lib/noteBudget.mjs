import {appendRecord, readLines} from "./noteArtifacts.mjs";

export class SpendingPause extends Error {
  constructor(message = "Spending review required.") { super(message); this.kind = "spending-pause"; }
}
export class NoteBudget {
  constructor(path, {limit = 12, append = appendRecord, read = readLines} = {}) {
    this.path = path; this.append = append; this.rows = read(path);
    this.total = this.rows.reduce((sum, row) => sum + (row.usd || 0), 0);
    this.limit = this.rows.filter((row) => row.newLimit).at(-1)?.newLimit || limit;
    this.unknown = this.rows.some((row) => row.unknownCost);
  }
  check() { if (this.unknown || this.total > this.limit) throw new SpendingPause(); }
  continueAfterReview() {
    if (this.unknown) throw new SpendingPause("Missing usage requires review; automatic continuation is refused.");
    this.limit = this.total + 12;
    this.append(this.path, {date:new Date().toISOString(), newLimit:this.limit, reviewed:true}, {privateRecord:true});
  }
  meter(body, {provider, model, callId, audio = false, durationSeconds = null, status = 200}) {
    let usd = 0, unknownCost = false;
    let inputTokens = null, outputTokens = null, billedSeconds = null;
    if (audio) {
      if (status >= 200 && status < 300) {
        const seconds = Number.isFinite(body?.audioDurationMs) ? body.audioDurationMs / 1000 : durationSeconds;
        if (Number.isFinite(seconds) && seconds >= 0) { billedSeconds = Math.floor(seconds); usd = billedSeconds * 0.18 / 3600; }
        else unknownCost = true;
      }
    } else if (Number.isSafeInteger(body?.usage?.prompt_tokens) && body.usage.prompt_tokens >= 0 &&
      Number.isSafeInteger(body?.usage?.completion_tokens) && body.usage.completion_tokens >= 0) {
      inputTokens = body.usage.prompt_tokens; outputTokens = body.usage.completion_tokens;
      usd = (inputTokens * 1.25 + outputTokens * 4.25) / 1e6;
    } else if (status >= 200 && status < 300) unknownCost = true;
    const row = {date:new Date().toISOString(), callId, provider, model, status, inputTokens, outputTokens, billedSeconds, usd, unknownCost};
    this.append(this.path, row, {privateRecord:true});
    this.rows.push(row); this.total += usd; this.unknown ||= unknownCost;
  }
}

// Read a clone for accounting, including responses whose content later fails
// parsing. Never retain or print HTTP bodies or headers in the ledger.
export function meteredFetch(fetchImpl, budget, context) {
  return async (url, init) => {
    budget.check();
    const response = await fetchImpl(url, init);
    let body; try { body = await response.clone().json(); } catch {}
    budget.meter(body, {...context, status:response.status});
    return response;
  };
}
