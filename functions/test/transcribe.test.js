const test = require("node:test");
const assert = require("node:assert/strict");
const {AudioFormatError, checkWav} = require("../lib/transcribe");
const {makeWav} = require("./make-wav");

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
