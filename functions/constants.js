exports.META_API_BASE_URL = "https://api.meta.ai/v1";
exports.TRANSCRIBE_MODEL = "muse-voice-transcribe-1.0";

// Voice notes are short. These caps keep one upload well inside a callable
// function's memory and time budget: 120 s of 24 kHz mono 16-bit is ~5.8 MB.
exports.MAX_AUDIO_SECONDS = 120;
exports.MAX_AUDIO_BYTES = 6 * 1024 * 1024;
