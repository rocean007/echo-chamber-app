// ============================================================
// LEADERBOARD — in-memory, sorted by wins desc
// Matches LeaderboardEntry shape: rank, address, wins, echoes, agents
// ============================================================
const express  = require('express');
const Joi      = require('joi');
const { logger } = require('./logger');

const router   = express.Router();
const MAX_SIZE = parseInt(process.env.LEADERBOARD_SIZE || '100', 10);

/** @type {Array<{address,wins,echoes,agents}>} */
let entries = [];

// ── internal helpers ─────────────────────────────────────────

function upsert(address) {
  let e = entries.find(x => x.address === address);
  if (!e) {
    e = { address, wins: 0, echoes: 0, agents: 0 };
    entries.push(e);
  }
  return e;
}

function sortAndRank() {
  entries.sort((a, b) => b.wins - a.wins || b.echoes - a.echoes);
  if (entries.length > MAX_SIZE) entries = entries.slice(0, MAX_SIZE);
}

function withRanks(arr) {
  return arr.map((e, i) => ({ rank: i + 1, ...e }));
}

// ── public API ────────────────────────────────────────────────

/**
 * Called when a match ends with a winner.
 * @param {string} address
 * @param {number} echoesThisMatch  total successful echoes this match
 * @param {number} agentsConverted  total agents converted
 */
function recordWin(address, echoesThisMatch = 0, agentsConverted = 0) {
  const e = upsert(address);
  e.wins   += 1;
  e.echoes += echoesThisMatch;
  e.agents += agentsConverted;
  sortAndRank();
  logger.info({ address, wins: e.wins, echoes: e.echoes }, 'leaderboard win recorded');
}

/**
 * Record a completed (non-winning) match — echoes and agents still counted.
 */
function recordMatch(address, echoesThisMatch = 0, agentsConverted = 0) {
  const e = upsert(address);
  e.echoes += echoesThisMatch;
  e.agents += agentsConverted;
  sortAndRank();
}

function getLeaderboard(limit = 50) {
  return withRanks(entries.slice(0, Math.min(limit, MAX_SIZE)));
}

function getPlayerEntry(address) {
  const idx = entries.findIndex(e => e.address === address);
  if (idx === -1) return null;
  return { rank: idx + 1, ...entries[idx] };
}

// ── REST routes ───────────────────────────────────────────────

const limitSchema = Joi.object({ limit: Joi.number().integer().min(1).max(100).default(50) });

router.get('/', (req, res) => {
  const { error, value } = limitSchema.validate(req.query);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ leaderboard: getLeaderboard(value.limit) });
});

// Keep address format aligned with WS validation (EVM-style).
const addressParam = Joi.string().trim().lowercase().pattern(/^0x[a-f0-9]{40}$/).required();

router.get('/:address', (req, res) => {
  const { error, value } = addressParam.validate(req.params.address);
  if (error) return res.status(400).json({ error: 'Invalid address parameter' });
  const entry = getPlayerEntry(value);
  if (!entry) return res.status(404).json({ error: 'Player not found' });
  res.json(entry);
});

router.post('/seed', (req, res) => {
  if (process.env.NODE_ENV !== 'development')
    return res.status(403).json({ error: 'Dev only' });
  entries = [];
  for (let i = 0; i < 10; i++) {
    entries.push({
      address: `0x${Math.random().toString(16).slice(2, 12).padEnd(10, '0')}`,
      wins:    Math.floor(Math.random() * 30),
      echoes:  Math.floor(Math.random() * 120),
      agents:  Math.floor(Math.random() * 80),
    });
  }
  sortAndRank();
  res.json({ message: 'Seeded 10 entries', leaderboard: getLeaderboard() });
});

module.exports = { router, recordWin, recordMatch, getLeaderboard, getPlayerEntry };
