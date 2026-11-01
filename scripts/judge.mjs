import { spawn, spawnSync } from "node:child_process";
import { constants, copyFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const SECRET_ERROR = "could not read functions/.secret.local";
export const JUDGE_URL = "http://127.0.0.1:5173";

export function environmentProblem(env) {
  if (env.GOOGLE_APPLICATION_CREDENTIALS !== undefined) return "Unset GOOGLE_APPLICATION_CREDENTIALS: judge mode must use local demo resources.";
  for (const name of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT", "FIREBASE_PROJECT"]) {
    if (env[name] !== undefined && !env[name].startsWith("demo-")) return `Unset ${name}: judge mode requires a demo- project.`;
  }
  return null;
}

// Return presence only. Parser failures never carry file text or values.
export function keyStatus(text) {
  const found = { META_API_KEY: false, BASETEN_API_KEY: false }, seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^\s*(META_API_KEY|BASETEN_API_KEY)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || seen.has(match[1])) throw Error(SECRET_ERROR);
    seen.add(match[1]);
    let value = match[2];
    if (/^["']/.test(value)) {
      const quoted = /^(?:"([^"\r\n]*)"|'([^'\r\n]*)')\s*(?:#.*)?$/.exec(value);
      if (!quoted) throw Error(SECRET_ERROR);
      value = quoted[1] ?? quoted[2];
    } else {
      value = value.replace(/#.*$/, "").trim();
      if (/[\s"']/.test(value)) throw Error(SECRET_ERROR);
    }
    found[match[1]] = Boolean(value.trim());
  }
  return [found.META_API_KEY ? "Meta key: found" : "Meta key: missing (practice cards only)",
    found.BASETEN_API_KEY ? "Baseten key: found" : "Baseten key: missing (standard draft only)"];
}

export function prepareSecrets({ copy = copyFileSync, read = readFileSync } = {}) {
  try {
    try { copy(join(ROOT, "functions/.secret.local.example"), join(ROOT, "functions/.secret.local"), constants.COPYFILE_EXCL); }
    catch (error) { if (error.code !== "EEXIST") throw Error(SECRET_ERROR); }
    return keyStatus(read(join(ROOT, "functions/.secret.local"), "utf8"));
  } catch { throw Error(SECRET_ERROR); }
}

export function prerequisiteLines(version, java) {
  const major = Number(/^v?(\d+)/.exec(version)?.[1]);
  if (!major) throw Error("Node is required. Install Node 22.");
  const javaVersion = /version\s+"(\d+[\w.+-]*)"/.exec(java);
  if (!javaVersion || Number(javaVersion[1].split(".")[0]) < 21) throw Error("Java 21 or newer is required.");
  return [`Node: ${version}`, `Java: ${javaVersion[1]}`, ...(major === 22 ? [] : ["Warning: Node 22 is recommended; Functions use Node 22."])];
}

export function emulatorArguments(execPath = process.execPath) {
  // emulators:exec runs the web worker after readiness, and owns emulator cleanup.
  const worker = `"${execPath}" "${join(ROOT, "scripts/judge.mjs")}" --web`;
  return [join(ROOT, "node_modules/firebase-tools/lib/bin/firebase.js"), "emulators:exec", "--only", "auth,firestore,functions", "--project", "demo-fola", worker];
}

export function supervise({ spawnChild = spawn, signals = process, platform = process.platform } = {}) {
  return new Promise((resolve) => {
    const child = spawnChild(process.execPath, emulatorArguments(), { cwd: ROOT, stdio: "inherit", windowsHide: true });
    const interrupt = () => { if (platform !== "win32") child.kill("SIGINT"); };
    const terminate = () => child.kill("SIGTERM");
    signals.on("SIGINT", interrupt);
    signals.on("SIGTERM", terminate);
    const finish = (code) => {
      signals.removeListener("SIGINT", interrupt);
      signals.removeListener("SIGTERM", terminate);
      resolve(code ?? 1);
    };
    child.once("error", () => finish(1));
    child.once("exit", (code, signal) => finish(signal === "SIGINT" ? 0 : code));
  });
}

export async function webWorker() {
  const { createServer } = await import("vite");
  const server = await createServer({ root: ROOT, envFile: false, server: { host: "127.0.0.1", port: 5173, strictPort: true } });
  const stop = async () => { await server.close(); process.exitCode = 0; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  await server.listen();
  console.log(`Open ${JUDGE_URL}`);
}

export async function main() {
  const problem = environmentProblem(process.env);
  if (problem) { console.error(problem); return 1; }
  if (process.argv.includes("--web")) { await webWorker(); return 0; }
  const java = spawnSync("java", ["-version"], { encoding: "utf8", windowsHide: true });
  let versions;
  try { versions = prerequisiteLines(process.version, java.error ? "" : `${java.stderr}${java.stdout}`); }
  catch (error) { console.error(error.message); return 1; }
  versions.forEach((line) => console.log(line));
  try { prepareSecrets().forEach((line) => console.log(line)); }
  catch { console.error(SECRET_ERROR); return 1; }
  return supervise();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => { process.exitCode = code; }).catch(() => { console.error("Judge launcher could not start."); process.exitCode = 1; });
}
