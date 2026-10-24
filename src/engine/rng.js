// src/engine/rng.js
//
// Seeded randomness. Every random draw in the game comes from here; nothing
// else may call Math.random. A run has one seed, and each subsystem (brief
// generation, funnel noise, events, policy review) draws from its own named
// stream derived from that seed. Streams are independent, so changing one
// decision in a counterfactual replay only shifts the draws that depend on it.

/** FNV-1a 32-bit hash of a string. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good-enough PRNG returning floats in [0, 1). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wraps a raw generator with the distribution helpers the engine uses. */
export function createRng(seed) {
  const next = mulberry32(typeof seed === 'number' ? seed : hashString(String(seed)));
  const rng = {
    next,
    uniform(a, b) {
      return a + (b - a) * next();
    },
    /** Integer in [a, b], inclusive. */
    int(a, b) {
      return a + Math.floor(next() * (b - a + 1));
    },
    chance(p) {
      return next() < p;
    },
    /** Triangular distribution on (low, mode, high). */
    triangular(low, mode, high) {
      if (high <= low) return low;
      const u = next();
      const c = (mode - low) / (high - low);
      if (u < c) return low + Math.sqrt(u * (high - low) * (mode - low));
      return high - Math.sqrt((1 - u) * (high - low) * (high - mode));
    },
    /** Standard normal via Box-Muller. */
    normal(mean = 0, sd = 1) {
      let u = next();
      while (u === 0) u = next();
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    /** Multiplicative noise with median 1: exp(N(0, sd)). */
    lognormalMult(sd) {
      return sd > 0 ? Math.exp(rng.normal(0, sd)) : 1;
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** Picks from items using parallel weights (need not sum to 1). */
    weighted(items, weights) {
      const total = weights.reduce((s, w) => s + w, 0);
      let u = next() * total;
      for (let i = 0; i < items.length; i++) {
        u -= weights[i];
        if (u < 0) return items[i];
      }
      return items[items.length - 1];
    },
    /** Fisher-Yates shuffle returning a new array. */
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** Rounds x to an integer, rounding up with probability frac(x). Keeps the mean. */
    stochasticRound(x) {
      if (!(x > 0)) return 0;
      const f = Math.floor(x);
      return f + (next() < x - f ? 1 : 0);
    },
  };
  return rng;
}

/**
 * A named stream: an independent generator derived from the run seed and
 * a list of keys, e.g. stream(seed, 'funnel', week, adSetIndex).
 */
export function stream(runSeed, ...keys) {
  return createRng(hashString(`${runSeed}|${keys.join('|')}`));
}

/** A fresh random seed for a new run. Uses crypto when available. */
export function newSeed() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    return c.getRandomValues(new Uint32Array(1))[0];
  }
  return hashString(String(Date.now()) + String(performance.now()));
}
