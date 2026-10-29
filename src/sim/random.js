// Seeded random numbers for the simulation: mulberry32, plus the few draws
// the generator needs. Only integer operations and + - * / are used, never
// Math.random or Math.exp (engines may round Math.exp differently), so the
// same seed gives exactly the same run in Node and in every browser.

const UINT32 = 4294967296;

// A 32-bit seed for one stream, from the run's seed and labels such as
// "background" and the day: FNV-1a over the text, then MurmurHash3's final
// mix, so neighbouring labels give unrelated streams.
export function streamSeed(seed, ...labels) {
  const text = [seed, ...labels].join("|");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

// Numbers from 0 (included) to 1 (not included).
export function mulberry32(seed) {
  let state = seed | 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32;
  };
}

// e to the power -x, for x of 0 or more, with + - * / only: halve x until
// it's small, sum the series, then square back up.
export function expNeg(x) {
  let small = x;
  let halvings = 0;
  while (small > 0.5) {
    small /= 2;
    halvings += 1;
  }
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 20; n += 1) {
    term *= -small / n;
    sum += term;
  }
  for (let step = 0; step < halvings; step += 1) sum *= sum;
  return sum;
}

// One stream of draws. `weighted` takes { value: weight } or [[value,
// weight]] pairs; the weights needn't add up to anything in particular.
export function createRandom(seed, ...labels) {
  const next = mulberry32(streamSeed(seed, ...labels));
  return {
    next,
    chance: (probability) => next() < probability,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    weighted(weights) {
      const pairs = Array.isArray(weights) ? weights : Object.entries(weights);
      const total = pairs.reduce((sum, [, weight]) => sum + weight, 0);
      let point = next() * total;
      for (const [value, weight] of pairs) {
        point -= weight;
        if (point < 0) return value;
      }
      return pairs[pairs.length - 1][0];
    },
    // Knuth's method: fine for the small means used here (under 30).
    poisson(mean) {
      if (!(mean > 0)) return 0;
      const limit = expNeg(mean);
      let count = 0;
      let product = next();
      while (product > limit) {
        count += 1;
        product *= next();
      }
      return count;
    },
  };
}
