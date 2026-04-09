// ============================================================
// SEEDED DETERMINISTIC RNG — mulberry32 algorithm
// Pass seed to generateWorld(seed) on the client so terrain aligns.
// ============================================================

/**
 * Create a seeded pseudo-random number generator (mulberry32).
 * Returns a function () => number in [0, 1).
 * @param {number} seed
 */
function createRng(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick a random integer in [0, max).
 */
function randInt(rng, max) {
  return Math.floor(rng() * max);
}

/**
 * Pick a random element from an array.
 */
function randPick(rng, arr) {
  return arr[randInt(rng, arr.length)];
}

/**
 * Shuffle array in-place (Fisher-Yates) using seeded rng.
 */
function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = { createRng, randInt, randPick, shuffle };
