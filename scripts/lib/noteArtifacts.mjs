import {createHash} from "node:crypto";
import {appendFileSync, existsSync, mkdirSync, readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {execFileSync} from "node:child_process";

export const hashOf = (value) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
export const KEY_LIKE = /\b(?:sk-[a-z0-9_-]{16,}|AIza[a-z0-9_-]{20,}|Bearer\s+\S+)|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/i;
export function assertNoSecrets(value, keys = []) {
  const text = JSON.stringify(value) ?? "";
  if (KEY_LIKE.test(text) || /["']authorization["']\s*:/i.test(text) || keys.some((key) => key && text.includes(key))) throw Object.assign(new Error("Unsafe record refused."), {kind:"unsafe-reply"});
}
export function assertPublic(value, keys = []) {
  assertNoSecrets(value, keys);
  const visit = (item) => {
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (/reporter|ground.?truth/i.test(key)) throw new Error("Private field refused.");
      if (key === "seed" && (!Number.isInteger(child) || child < 1 || child > 10)) throw new Error("Held-out seed refused.");
      if (typeof child === "string" && /^\s*[[{]/.test(child)) {
        let decoded; try { decoded = JSON.parse(child); } catch {}
        if (decoded) visit(decoded);
      }
      visit(child);
    }
  };
  visit(value);
}
export function gitState(root) {
  return {gitCommit:execFileSync("git", ["rev-parse", "HEAD"], {cwd:root, encoding:"utf8"}).trim(),
    dirty:Boolean(execFileSync("git", ["--no-optional-locks", "status", "--porcelain"], {cwd:root, encoding:"utf8"}).trim())};
}
export function readLines(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {try { return JSON.parse(line); } catch { throw new Error("An interrupted record needs review; no saved call will be repeated automatically."); }});
}
export function appendRecord(path, record, {keys = [], privateRecord = false} = {}) {
  if (privateRecord) assertNoSecrets(record, keys); else assertPublic(record, keys);
  mkdirSync(dirname(path), {recursive:true});
  appendFileSync(path, JSON.stringify(record) + "\n");
}
export const paths = (root) => ({
  private:join(root, "test-audio", "results", "notes-calls.jsonl"),
  ledger:join(root, "test-audio", "results", "notes-ledger.jsonl"),
  fixtures:join(root, "docs", "provenance", "scoring", "fixture-results.jsonl"),
  baseten:join(root, "docs", "provenance", "open-weights", "fixture-results.jsonl"),
  rankings:join(root, "docs", "provenance", "open-weights", "ranking-results.jsonl"),
  log:join(root, "docs", "provenance", "open-weights", "run-log.jsonl"),
});
export function safeFailure(error) {
  const allowed = ["http", "network", "timeout", "bad-reply", "cancelled", "spending-pause", "grace-timeout", "unsafe-reply", "schema"];
  return {kind:allowed.includes(error?.kind) ? error.kind : "error",
    status:Number.isInteger(error?.status) ? error.status : null,
    parameter:["reasoning_effort", "keywords", "model"].includes(error?.parameter) ? error.parameter : null,
    attempts:Number.isInteger(error?.attempts) ? error.attempts : 0};
}
