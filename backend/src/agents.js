// ============================================================
// AGENT FACTORY — deterministic, seeded, matches client types
// ============================================================
const { v4: uuidv4 } = require('uuid');
const { ECHO_STONES, BIOME_TYPES, AGENT_NAMES, PERSONALITIES } = require('./types');
const { createRng, randInt, randPick, shuffle } = require('./rng');

/**
 * Build `count` agents deterministically from `seed`.
 * Matches the shape used in gameStore.ts:
 *   id, name, position [x,y,z], faction, desire, personality,
 *   memory, biome, converted, pulsePhase
 *
 * Positions: agents placed on a ring in XZ-plane (Y=0), radius ~5.
 * Client 3D code animates Y independently.
 *
 * @param {number} seed
 * @param {number} count
 * @returns {import('./types').Agent[]}
 */
function generateAgents(seed, count = 12) {
  const rng    = createRng(seed);
  const names  = shuffle(rng, [...AGENT_NAMES]).slice(0, count);
  const agents = [];

  for (let i = 0; i < count; i++) {
    // Evenly space on a ring of radius 5 with slight jitter
    const angle    = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const radius   = 4.5 + rng() * 1.5;
    const x        = parseFloat((Math.cos(angle) * radius).toFixed(4));
    const z        = parseFloat((Math.sin(angle) * radius).toFixed(4));

    // desire: length 1–3, stones drawn with replacement (matches client gameStore)
    const desireLen = 1 + randInt(rng, 3);
    const desire = Array.from({ length: desireLen }, () =>
      ECHO_STONES[randInt(rng, ECHO_STONES.length)],
    );

    agents.push({
      id:          uuidv4(),
      name:        names[i] || `Agent_${i}`,
      position:    [x, 0, z],
      faction:     'neutral',
      desire,
      personality: randPick(rng, PERSONALITIES),
      memory:      [],
      biome:       randPick(rng, BIOME_TYPES),
      converted:   false,
      pulsePhase:  parseFloat((rng() * Math.PI * 2).toFixed(6)),
    });
  }

  return agents;
}

module.exports = { generateAgents };
