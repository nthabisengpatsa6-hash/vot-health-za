// How surprising a count of cases is. Cards arrive one by one, but each
// carries several cases, so cases come in clumps and a plain Poisson test
// on cases fires too often. This works out the exact chance instead:
//   - the number of cards in the window is negative binomial: the area's
//     usual card rate, learnt from `baselineCards` cards in its history,
//     allowing for how little history that is (a gamma-Poisson mix with a
//     flat prior, so r = baselineCards + 1);
//   - each card carries a number of cases drawn from `sizes`, the town's
//     own mix of cases per card in the same history (sizes[n] is the share
//     of cards with n cases).
// Panjer's recursion gives the distribution of the total. Only + - * / are
// used, so every browser and Node give exactly the same numbers.

// The chances of exactly 0, 1, ... `upTo` cases if the true rate is
// `multiplier` times the usual one. `windowShare` is the window's length
// divided by the baseline's, both counted in weekday-equivalents.
function caseChances(upTo, {
  baselineCards,
  windowShare,
  sizes,
  multiplier = 1,
}) {
  const share = windowShare * multiplier;
  const q = share / (1 + share);
  const p = 1 - q;
  const r = baselineCards + 1;
  let none = 1;
  for (let step = 0; step < r; step += 1) none *= p;
  const chances = [none];
  const largest = sizes.length - 1;
  for (let total = 1; total <= upTo; total += 1) {
    let sum = 0;
    const top = total < largest ? total : largest;
    for (let size = 1; size <= top; size += 1) {
      if (sizes[size] > 0) {
        sum += (q + ((r - 1) * q * size) / total) *
          sizes[size] * chances[total - size];
      }
    }
    chances.push(sum);
  }
  return chances;
}

const sum = (values) => values.reduce((total, value) => total + value, 0);

// The chance of at least `cases` cases.
export function chanceOfAtLeast(cases, usualRate) {
  if (cases <= 0) return 1;
  const tail = 1 - sum(caseChances(cases - 1, usualRate));
  return tail > 0 ? tail : 0;
}

// The chance of at most `cases` cases.
export function chanceOfAtMost(cases, usualRate) {
  const below = sum(caseChances(cases, usualRate));
  return below < 1 ? below : 1;
}
