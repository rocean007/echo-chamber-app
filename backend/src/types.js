// ============================================================
// CANONICAL TYPES — must match frontend src/store/gameStore.ts
// ============================================================

const ECHO_STONES    = /** @type {const} */ (['Growth', 'Decay', 'Light', 'Shadow']);
const AGENT_FACTIONS = /** @type {const} */ (['neutral', 'player1', 'player2']);
const GAME_PHASES    = /** @type {const} */ (['lobby', 'matchmaking', 'playing', 'gameover']);
const BIOME_TYPES    = /** @type {const} */ (['mushroom_forest', 'crystal_desert', 'magma_plains', 'ash_tundra']);

/**
 * Agent names pool — mirroring the kind of names the client generates
 * so memory strings feel consistent across server-side seeded agents.
 */
const AGENT_NAMES = [
  'Velith', 'Sorn', 'Caela', 'Drix', 'Moru', 'Phael',
  'Tyss',  'Wren', 'Orak', 'Lyss', 'Baine', 'Ceth',
  'Davan', 'Eryn', 'Fael', 'Gost', 'Hira', 'Ilex',
];

const PERSONALITIES = [
  'curious and cautious',
  'fierce and territorial',
  'serene and philosophical',
  'chaotic and unpredictable',
  'loyal and protective',
  'ambitious and calculating',
  'gentle and empathetic',
  'ancient and cryptic',
];

module.exports = {
  ECHO_STONES,
  AGENT_FACTIONS,
  GAME_PHASES,
  BIOME_TYPES,
  AGENT_NAMES,
  PERSONALITIES,
};
