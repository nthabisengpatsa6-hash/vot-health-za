import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {assertPublic, KEY_LIKE} from "./lib/noteArtifacts.mjs";

export function inspectProvenance(text, type) {
  if (KEY_LIKE.test(text) || /authorization\s*["']?\s*[:=]/i.test(text)) throw new Error("Unsafe provenance.");
  if (type === "json") assertPublic(JSON.parse(text));
  else if (type === "jsonl") text.split(/\r?\n/).filter(Boolean).forEach((line) => assertPublic(JSON.parse(line)));
  else if (/\breporter(?:Uid|Role|FacilityType|Area)\b|\bseed[-\s:]*(?:1[1-9]|20)\b/i.test(text)) throw new Error("Unsafe provenance.");
}
export function scanProvenance(root) {
  let count = 0;
  const walk = (path) => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, {withFileTypes:true})) {
      const file = join(path, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Provenance symbolic link refused.");
      if (entry.isDirectory()) walk(file);
      else {
        inspectProvenance(readFileSync(file, "utf8"), entry.name.split(".").at(-1)); count++;
      }
    }
  };
  walk(join(root, "docs", "provenance"));
  const seedOne = join(root, "src", "sim", "saved-rankings", "seed-1.json");
  if (existsSync(seedOne)) {inspectProvenance(readFileSync(seedOne, "utf8"), "json"); count++;}
  return count;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(`Provenance scan: ${scanProvenance(fileURLToPath(new URL("../", import.meta.url)))} files checked.`); }
  catch {console.error("Provenance scan failed safely."); process.exitCode = 1;}
}
