// Builds a WAV in memory so tests don't need real recordings. Silence is
// enough: only the header matters to the code under test.
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

exports.makeWav = makeWav;
