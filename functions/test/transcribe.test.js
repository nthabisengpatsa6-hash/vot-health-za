const test = require("node:test");
const assert = require("node:assert/strict");
const {AudioFormatError, checkWav} = require("../lib/transcribe");

// Builds a WAV in memory so the header check can be tested without real
// recordings. Silence is enough: only the header is checked.
function makeWav({
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
  audioFormat = 1,
  seconds = 1,
  extraChunk = false,
} = {}) {
  const bytesPerSample = bitsPerSample / 8;
  const dataBytes =
      Math.round(sampleRate * seconds) * channels * bytesPerSample;

  const fmt = Buffer.alloc(24);
  fmt.write("fmt ", 0, "ascii");
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(audioFormat, 8);
  fmt.writeUInt16LE(channels, 10);
  fmt.writeUInt32LE(sampleRate, 12);
  fmt.writeUInt32LE(sampleRate * channels * bytesPerSample, 16);
  fmt.writeUInt16LE(channels * bytesPerSample, 20);
  fmt.writeUInt16LE(bitsPerSample, 22);

  const chunks = [fmt];
  if (extraChunk) {
    // An odd-sized LIST chunk plus its pad byte, like ffmpeg's metadata.
    const list = Buffer.alloc(8 + 5 + 1);
    list.write("LIST", 0, "ascii");
    list.writeUInt32LE(5, 4);
    chunks.push(list);
  }
  const dataHeader = Buffer.alloc(8);
  dataHeader.write("data", 0, "ascii");
  dataHeader.writeUInt32LE(dataBytes, 4);
  chunks.push(dataHeader, Buffer.alloc(dataBytes));

  const body = Buffer.concat(chunks);
  const riff = Buffer.alloc(12);
  riff.write("RIFF", 0, "ascii");
  riff.writeUInt32LE(4 + body.length, 4);
  riff.write("WAVE", 8, "ascii");
  return Buffer.concat([riff, body]);
}

function rejects(buffer, message) {
  assert.throws(() => checkWav(buffer), (err) => {
    assert.ok(err instanceof AudioFormatError);
    assert.match(err.message, message);
    return true;
  });
}

test("accepts a 16 kHz mono 16-bit WAV and works out its length", () => {
  assert.deepEqual(
      checkWav(makeWav({sampleRate: 16000, seconds: 2})),
      {sampleRate: 16000, durationMs: 2000},
  );
});

test("accepts a 24 kHz mono 16-bit WAV", () => {
  assert.deepEqual(
      checkWav(makeWav({sampleRate: 24000, seconds: 3})),
      {sampleRate: 24000, durationMs: 3000},
  );
});

test("skips extra chunks such as ffmpeg's metadata", () => {
  assert.deepEqual(
      checkWav(makeWav({seconds: 1.5, extraChunk: true})),
      {sampleRate: 24000, durationMs: 1500},
  );
});

test("accepts a recording of exactly 120 seconds", () => {
  const {durationMs} = checkWav(makeWav({sampleRate: 16000, seconds: 120}));
  assert.equal(durationMs, 120000);
});

test("rejects a file that isn't a WAV", () => {
  rejects(Buffer.from("ID3 this is really an mp3 file"), /isn't a WAV/);
});

test("rejects something that isn't a buffer", () => {
  rejects("RIFF....WAVE", /isn't a WAV/);
});

test("rejects stereo", () => {
  rejects(makeWav({channels: 2}), /mono .* this one has 2 channels/);
});

test("rejects sample rates other than 16 or 24 kHz", () => {
  rejects(makeWav({sampleRate: 44100}), /this one is 44100 Hz/);
});

test("rejects 8-bit audio", () => {
  rejects(makeWav({bitsPerSample: 8}), /16-bit; this one is 8-bit/);
});

test("rejects floating-point audio", () => {
  rejects(makeWav({audioFormat: 3, bitsPerSample: 32}), /plain PCM/);
});

test("rejects recordings longer than 120 seconds", () => {
  rejects(
      makeWav({sampleRate: 16000, seconds: 121}),
      /121\.0 seconds long; the limit is 120 seconds/,
  );
});

test("rejects a WAV with no audio", () => {
  rejects(makeWav({seconds: 0}), /no audio/);
});

test("rejects a cut-off file", () => {
  rejects(makeWav().subarray(0, 30), /damaged/);
});
