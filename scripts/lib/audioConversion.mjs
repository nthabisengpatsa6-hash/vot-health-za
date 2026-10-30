import {spawnSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {dirname} from "node:path";
import {performance} from "node:perf_hooks";
import {createRequire} from "node:module";
const {checkWav} = createRequire(import.meta.url)("../../functions/lib/transcribe.js");

export function convertAudio(input, output, rate = 24000) {
  const start = performance.now();
  const cached = existsSync(output);
  const sourceHash = createHash("sha256").update(readFileSync(input)).digest("hex");
  const provenance = output + ".source.json";
  if (cached) {
    let saved;
    try {saved = JSON.parse(readFileSync(provenance, "utf8"));} catch {}
    if (!saved || saved.sourceHash !== sourceHash || saved.rate !== rate) throw new Error("Cached conversion needs review: source identity is missing or changed. No audio was overwritten.");
  }
  if (!cached) {
    mkdirSync(dirname(output), {recursive:true});
    const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-i", input,
      "-vn", "-ac", "1", "-ar", String(rate), "-sample_fmt", "s16", "-map_metadata", "-1", output], {windowsHide:true, encoding:"utf8"});
    if (result.error || result.status !== 0) throw new Error("Audio conversion failed; check ffmpeg and the local input.");
  }
  const wav = readFileSync(output), info = checkWav(wav);
  if (info.sampleRate !== rate) throw new Error("Cached audio has the wrong sample rate.");
  if (!cached) writeFileSync(provenance, JSON.stringify({sourceHash, rate}) + "\n");
  return {wav, ...info, conversionMs:Math.round(performance.now() - start), conversionCached:cached};
}
