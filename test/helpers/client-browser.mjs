import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rolldown } from "rolldown";

export async function replayBrowser() {
  const bundle = await rolldown({
    input: fileURLToPath(new URL("./replay-client.jsx", import.meta.url)), platform: "browser",
    transform: { jsx: { runtime: "automatic" }, define: { "process.env.NODE_ENV": '"development"' } },
    plugins: [{ name: "offline-services", resolveId(source) {
      if (/\/(rankApi|draftApi)(\.js)?$/.test(source)) return "\0offline-services";
      if (/^@?firebase(\/|$)/.test(source)) throw Error("The client fixture must not import Firebase");
    }, load(id) { if (id === "\0offline-services") return "export const rankSources = (...args) => window.__serviceCall(...args); export const draftNotification = (...args) => window.__serviceCall(...args);"; } }],
  });
  let code;
  try { code = (await bundle.generate({ format: "iife", name: "ReplayTest", codeSplitting: false })).output[0].code; }
  finally { await bundle.close(); }
  mkdirSync(".scratch", { recursive: true });
  const profile = mkdtempSync(".scratch/task20-client-");
  const port = 19320 + Math.floor(Math.random() * 200);
  const child = spawn(join(process.env["ProgramFiles(x86)"], "Microsoft/Edge/Application/msedge.exe"), [
    "--headless=new", "--disable-gpu", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*",
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost", `--remote-debugging-port=${port}`, `--user-data-dir=${fileURLToPath(new URL(`../../${profile}/`, import.meta.url))}`, "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  let targets, launchError;
  child.on("error", (error) => { launchError = error; });
  for (let i = 0; i < 100; i++) {
    if (launchError) throw launchError;
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  if (!targets) { child.kill(); throw Error("The local test browser could not start"); }
  const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let serial = 0;
  const pending = new Map(), external = [];
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(Error(message.error.message)); else request.resolve(message.result);
      }
    }
    if (message.method === "Fetch.requestPaused") {
      external.push(message.params.request.url);
      send("Fetch.failRequest", { requestId: message.params.requestId, errorReason: "BlockedByClient" }).catch(() => {});
    }
  };
  function send(method, params = {}) {
    return new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => { pending.delete(id); reject(Error(`Browser command timed out: ${method}`)); }, 15000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); });
  }
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  try {
    // The fixture is injected in memory. All browser HTTP requests are blocked.
    await send("Fetch.enable", { patterns: [{ urlPattern: "http://*" }, { urlPattern: "https://*" }] });
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
    await evaluate(code);
    return { evaluate, external, async close() { try { await send("Browser.close"); } finally { ws.close(); child.kill(); } } };
  } catch (error) { ws.close(); child.kill(); throw error; }
}
