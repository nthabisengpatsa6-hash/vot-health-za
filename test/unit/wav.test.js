import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { bytesToBase64, encodeWav, WAV_SAMPLE_RATE, wavePeaks } from "../../src/lib/wav.js";

// The server's own WAV check, so these tests prove the browser's WAV is one
// processNote accepts.
const require = createRequire(import.meta.url);
const { checkWav } = require("../../functions/lib/transcribe.js");

// A 440 Hz tone, as the samples OfflineAudioContext would hand over.
function tone(seconds, sampleRate = WAV_SAMPLE_RATE, level = 0.5) {
  const samples = new Float32Array(Math.round(seconds * sampleRate));
  for (let i = 0; i < samples.length; i += 1) samples[i] = level * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  return samples;
}

const view = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const ascii = (bytes, start, end) => String.fromCharCode(...bytes.subarray(start, end));

test("the header says 24 kHz, mono, 16-bit PCM", () => {
  const bytes = encodeWav(tone(1));
  const header = view(bytes);
  assert.equal(ascii(bytes, 0, 4), "RIFF");
  assert.equal(header.getUint32(4, true), bytes.length - 8);
  assert.equal(ascii(bytes, 8, 12), "WAVE");
  assert.equal(ascii(bytes, 12, 16), "fmt ");
  assert.equal(header.getUint32(16, true), 16);
  assert.equal(header.getUint16(20, true), 1, "PCM");
  assert.equal(header.getUint16(22, true), 1, "mono");
  assert.equal(header.getUint32(24, true), 24000);
  assert.equal(header.getUint32(28, true), 48000, "bytes per second");
  assert.equal(header.getUint16(32, true), 2, "bytes per frame");
  assert.equal(header.getUint16(34, true), 16, "bits per sample");
  assert.equal(ascii(bytes, 36, 40), "data");
  assert.equal(header.getUint32(40, true), 24000 * 2);
  assert.equal(bytes.length, 44 + 24000 * 2);
});

test("samples become 16-bit values, and louder ones are clipped", () => {
  const bytes = encodeWav(Float32Array.from([0, 1, -1, 0.5, -0.5, 1.5, -1.5, Number.NaN]));
  const header = view(bytes);
  const values = Array.from({ length: 8 }, (_, i) => header.getInt16(44 + i * 2, true));
  assert.deepEqual(values, [0, 32767, -32768, 16383, -16384, 32767, -32768, 0]);
});

test("the server's WAV check accepts it, with the right length", () => {
  const { sampleRate, durationMs } = checkWav(Buffer.from(encodeWav(tone(2.5))));
  assert.equal(sampleRate, 24000);
  assert.equal(durationMs, 2500);
});

test("a full 90-second note is inside the server's 6 MB and 120 s limits", () => {
  const bytes = encodeWav(tone(90));
  assert.ok(bytes.length < 6 * 1024 * 1024, `${bytes.length} bytes`);
  assert.equal(checkWav(Buffer.from(bytes)).durationMs, 90_000);
  // processNote refuses base64 over ceil(6 MB / 3) * 4 characters.
  assert.ok(bytesToBase64(bytes).length <= Math.ceil((6 * 1024 * 1024) / 3) * 4);
});

test("base64 matches Node's, including for recordings bigger than one slice", () => {
  for (const bytes of [new Uint8Array(0), Uint8Array.from([1, 2, 3, 250]), encodeWav(tone(3))]) {
    assert.equal(bytesToBase64(bytes), Buffer.from(bytes).toString("base64"));
  }
});

test("the waveform follows the recording's loudness, scaled so the loudest bar is 1", () => {
  // One quiet second, then one loud second.
  const samples = new Float32Array([...tone(1, WAV_SAMPLE_RATE, 0.1), ...tone(1, WAV_SAMPLE_RATE, 0.8)]);
  const peaks = wavePeaks(samples, 8);
  assert.equal(peaks.length, 8);
  assert.ok(Math.max(...peaks) === 1);
  for (const quiet of peaks.slice(0, 4)) assert.ok(Math.abs(quiet - 0.125) < 0.01, `${quiet}`);
  for (const loud of peaks.slice(4)) assert.ok(Math.abs(loud - 1) < 0.01, `${loud}`);
});

test("silence, an empty recording and a very short one give bars without dividing by zero", () => {
  assert.deepEqual(wavePeaks(new Float32Array(1000), 4), [0, 0, 0, 0]);
  assert.deepEqual(wavePeaks(new Float32Array(0), 3), [0, 0, 0]);
  const short = wavePeaks(Float32Array.from([0.5, -0.5]), 4);
  assert.equal(short.length, 4);
  assert.ok(short.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
});
