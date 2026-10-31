import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join, relative, sep} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {assertPublic, KEY_LIKE} from "./lib/noteArtifacts.mjs";
import {heldOutPath, assertHeldOutArtifact} from "./lib/heldoutArtifacts.mjs";

export function inspectProvenance(text, type, file = "") {
  if (KEY_LIKE.test(text) || /authorization\s*["']?\s*[:=]/i.test(text)) throw new Error("Unsafe provenance.");
  const allowed = heldOutPath(file) || file === "src/sim/held-out/scorecard-screen.json";
  const inspect = allowed ? assertHeldOutArtifact : assertPublic;
  if (type === "json") inspect(JSON.parse(text));
  else if (type === "jsonl") text.split(/\r?\n/).filter(Boolean).forEach((line) => inspect(JSON.parse(line)));
  else if (/\breporter(?:Uid|Role|FacilityType|Area)\b/i.test(text) || (!allowed && /\bseeds?[-\s:]*(?:1[1-9]|20)\b/i.test(text))) throw new Error("Unsafe provenance.");
}
export function scanProvenance(root) {
  let count = 0;
  const walk = (path, jsonOnly = false) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, {withFileTypes:true})) {
      const file = join(path, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Provenance symbolic link refused.");
      if (entry.isDirectory()) walk(file,jsonOnly);
      else if (jsonOnly && !entry.name.endsWith(".json")) continue;
      else {
        inspectProvenance(readFileSync(file, "utf8"), entry.name.split(".").at(-1), relative(root,file).split(sep).join("/")); count++;
      }
    }
  };
  walk(join(root, "docs", "provenance"));
  walk(join(root,"src","sim"),true);
  return count;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(`Provenance scan: ${scanProvenance(fileURLToPath(new URL("../", import.meta.url)))} files checked.`); }
  catch {console.error("Provenance scan failed safely."); process.exitCode = 1;}
}
