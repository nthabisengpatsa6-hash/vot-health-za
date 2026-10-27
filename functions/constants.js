exports.META_API_BASE_URL = "https://api.meta.ai/v1";
exports.TRANSCRIBE_MODEL = "muse-voice-transcribe-1.0";

// Voice notes are short. These caps keep one upload well inside a callable
// function's memory and time budget: 120 s of 24 kHz mono 16-bit is ~5.8 MB.
exports.MAX_AUDIO_SECONDS = 120;
exports.MAX_AUDIO_BYTES = 6 * 1024 * 1024;

// The "two ears". The audio-ear model is one setting so Task 4's scores can
// pick 1.2 or 1.3. Standard-mode IDs only: "-contributor" models let Meta
// train on what we send.
exports.SPARK_AUDIO_MODEL = "muse-spark-1.2";
exports.EXTRACT_MODEL = "muse-spark-1.3";
exports.EXTRACT_EFFORT = "low";
// Once one ear has a transcript, how long to wait for the other. In Task 3
// the slower route finished within 26 s of the faster one, except on a
// retried call.
exports.EARS_GRACE_MS = 30000;
