// Turns a browser recording into what processNote accepts: a 24 kHz, mono,
// 16-bit PCM WAV (Muse Voice Transcribe's native rate). Everything stays in
// memory; nothing is written to the device.

export const WAV_SAMPLE_RATE = 24000;
const HEADER_BYTES = 44;

// A WAV file from mono samples between -1 and 1. Louder samples are clipped,
// because 16-bit audio can't hold them.
export function encodeWav(samples, sampleRate = WAV_SAMPLE_RATE) {
  const dataBytes = samples.length * 2;
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  const ascii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes per second
  view.setUint16(32, 2, true); // bytes per sample frame
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] || 0));
    view.setInt16(HEADER_BYTES + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return bytes;
}

// Base64 in slices: one String.fromCharCode call over a 4 MB recording would
// overflow the call stack.
export function bytesToBase64(bytes) {
  const SLICE = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += SLICE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + SLICE));
  }
  return btoa(binary);
}

// Older Safari only has the callback form of decodeAudioData and the
// prefixed AudioContext.
function decodeAudio(arrayBuffer) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  return new Promise((resolve, reject) => {
    context.decodeAudioData(arrayBuffer, resolve, reject);
  }).finally(() => {
    // Browsers allow only a few open audio contexts.
    if (context.close) context.close().catch(() => {});
  });
}

// Decodes whatever the browser recorded (webm/Opus on Android Chrome,
// mp4/AAC on iPhone Safari), then lets OfflineAudioContext resample it to
// 24 kHz and mix it down to mono. The 3-argument constructor is the form
// older Safari accepts. Returns the samples and the length in seconds.
export async function recordingToSamples(blob) {
  const decoded = await decodeAudio(await blob.arrayBuffer());
  const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const frames = Math.max(1, Math.ceil(decoded.duration * WAV_SAMPLE_RATE));
  const offline = new OfflineContextClass(1, frames, WAV_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return { samples: rendered.getChannelData(0), seconds: decoded.duration };
}
