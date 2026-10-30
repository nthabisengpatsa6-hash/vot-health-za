// Converts test voice notes into the WAV format Muse Voice Transcribe accepts
// (mono, 16-bit PCM), at both 16 kHz and 24 kHz so the two can be compared.
// Local test tool only: it needs ffmpeg installed system-wide, which is
// deliberately not a project dependency.
//
// Usage: node scripts/convert-audio.mjs

import { convertAudio } from "./lib/audioConversion.mjs";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkWav } from "../functions/lib/transcribe.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const rawDir = join(root, "test-audio", "raw");
const wavDir = join(root, "test-audio", "wav");
const INPUT_TYPES = new Set([".m4a", ".opus", ".ogg", ".mp3", ".wav"]);
const RATES = [16000, 24000];

function convert(input, output, rate) {
  return convertAudio(input, output, rate);
}

let files;
try {
  files = readdirSync(rawDir).filter((name) => INPUT_TYPES.has(extname(name).toLowerCase()));
} catch {
  console.error("There's no test-audio/raw/ folder. Create it and add recordings first.");
  process.exit(1);
}
if (files.length === 0) {
  console.error("No recordings found in test-audio/raw/ (m4a, opus, ogg, mp3 or wav).");
  process.exit(1);
}

mkdirSync(wavDir, { recursive: true });
let failed = 0;
for (const name of files) {
  const stem = basename(name, extname(name));
  for (const rate of RATES) {
    const outName = `${stem}-${rate / 1000}k.wav`;
    // Earlier conversions are kept as they are, so only new recordings are done.
    if (existsSync(join(wavDir, outName))) {
      console.log(`${name} -> wav/${outName} (already converted, skipped)`);
      continue;
    }
    try {
      convert(join(rawDir, name), join(wavDir, outName), rate);
      // Run our own header check so a bad conversion shows up here, not at the API.
      const { durationMs } = checkWav(readFileSync(join(wavDir, outName)));
      console.log(`${name} -> wav/${outName} (${(durationMs / 1000).toFixed(1)} s)`);
    } catch (err) {
      failed += 1;
      console.error(`${name} -> wav/${outName}: ${err.message}`);
    }
  }
}
process.exitCode = failed > 0 ? 1 : 0;
