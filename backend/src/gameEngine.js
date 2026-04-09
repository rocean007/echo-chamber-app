// ============================================================
// GAME ENGINE — authoritative match logic
// Must mirror gameStore.ts castEcho() rules exactly.
// ============================================================
const { v4: uuidv4 } = require('uuid');
const { generateAgents } = require('./agents');

const AGENT_COUNT  = parseInt(process.env.AGENT_COUNT  || '12',   10);
const BOT_DELAY_MS = parseInt(process.env.BOT_DELAY_MS || '1500', 10);

// ── dominance calculator ──────────────────────────────────────

/**
 * Recompute dominance from the current agent list.
 * Returns { player1, player2, neutral } as integers 0–100.
 * totalAgents always >= 1 (guarded).
 */
function computeDominance(agents) {
  const total = Math.max(agents.length, 1);
  let p1 = 0, p2 = 0, neutral = 0;
  for (const a of agents) {
    if (a.faction === 'player1')  p1++;
    else if (a.faction === 'player2') p2++;
    else neutral++;
  }
  return {
    player1: Math.round((p1      / total) * 100),
    player2: Math.round((p2      / total) * 100),
    neutral: Math.round((neutral / total) * 100),
  };
}

// ── match factory ─────────────────────────────────────────────

/**
 * Create a fresh match state for a single player (+ bot opponent).
 * @param {string} walletAddress
 * @returns {MatchState}
 */
function createMatch(walletAddress) {
  const matchId    = uuidv4();
  const worldSeed  = Math.floor(Math.random() * 2 ** 31);
  const agents     = generateAgents(worldSeed, AGENT_COUNT);
  const dominance  = computeDominance(agents);

  return {
    matchId,
    worldSeed,          // send to client so generateWorld(seed) aligns terrain
    walletAddress,
    phase:              'playing',
    agents,
    score:              { player1: 0, player2: 0 },
    worldState: {
      biomes:           ['mushroom_forest', 'crystal_desert', 'magma_plains', 'ash_tundra'],
      structureCount:   0,
      dominance,
    },
    turnCount:          0,
    selectedAgentId:    null,
    echoSequence:       [],
    lastEchoResult:     null,
    botTimer:           null,   // handle for pending bot move — cleared on match end
    startedAt:          Date.now(),
  };
}

// ── bot move ──────────────────────────────────────────────────

/**
 * After a successful player echo, schedule the bot to convert
 * a random neutral agent to player2 after BOT_DELAY_MS.
 * Returns { cancel } so the caller can abort on match end.
 *
 * NOTE: The reference client does NOT run a gameover check after the
 * bot move — we mirror that behaviour here intentionally, and flag it
 * as a known inconsistency (see README).
 *
 * @param {MatchState} match
 * @param {function(MatchState):void} onUpdate  callback to push state to client
 */
function scheduleBotMove(match, onUpdate) {
  if (match.botTimer) clearTimeout(match.botTimer);

  match.botTimer = setTimeout(() => {
    match.botTimer = null;
    const neutrals = match.agents.filter(a => a.faction === 'neutral');
    if (neutrals.length === 0) return;

    // pick random neutral (server-side random — not seeded, intentionally unpredictable)
    const target  = neutrals[Math.floor(Math.random() * neutrals.length)];
    target.faction = 'player2';
    match.score.player2 += 1;
    match.worldState.dominance = computeDominance(match.agents);
    // NOTE: deliberately no gameover check here (mirrors reference client)
    onUpdate(match);
  }, BOT_DELAY_MS);

  return { cancel: () => clearTimeout(match.botTimer) };
}

// ── castEcho (authoritative) ──────────────────────────────────

/**
 * Execute castEcho with the server as source of truth.
 * Mutates `match` in place. Returns { success, match, phase }.
 *
 * Rules mirror gameStore.ts lines 162–208 exactly:
 *  - Match iff desire.length === seq.length AND index-wise equality
 *  - Success: faction→player1, append memory, score++, structureCount++,
 *             recompute dominance, clear seq+selection, lastEchoResult→success,
 *             turnCount++, phase→gameover if dominance.player1 > 50
 *  - Fail:   append rejection memory, clear seq, lastEchoResult→fail,
 *             turnCount++, selection stays
 *
 * @param {MatchState} match
 * @param {string} agentId
 * @param {string[]} echoSequence   array of EchoStone strings (max 3)
 * @param {function(MatchState):void} onBotUpdate
 * @returns {{ success: boolean, error?: string }}
 */
function castEcho(match, agentId, echoSequence, onBotUpdate) {
  if (match.phase !== 'playing') {
    return { success: false, error: 'Match is not in playing phase' };
  }

  const agent = match.agents.find(a => a.id === agentId);
  if (!agent) return { success: false, error: 'Agent not found' };

  const seq     = echoSequence || [];
  const desire  = agent.desire;
  const matched =
    desire.length === seq.length &&
    desire.every((stone, i) => stone === seq[i]);

  if (matched) {
    // ── SUCCESS path ─────────────────────────────────────────
    agent.faction   = 'player1';
    agent.converted = true;   // keep for type compatibility
    agent.memory.push(`Converted by Echo: ${seq.join('+')}`);

    match.score.player1 += 1;
    match.worldState.structureCount += 1;
    match.worldState.dominance = computeDominance(match.agents);

    match.echoSequence    = [];
    match.selectedAgentId = null;
    match.lastEchoResult  = 'success';
    match.turnCount      += 1;

    if (match.worldState.dominance.player1 > 50) {
      match.phase = 'gameover';
    } else {
      // Schedule bot response (only when game still going)
      scheduleBotMove(match, onBotUpdate);
    }

    return { success: true };
  } else {
    // ── FAIL path ────────────────────────────────────────────
    agent.memory.push(`Rejected Echo: ${seq.join('+')}`);
    match.echoSequence   = [];
    match.lastEchoResult = 'fail';
    match.turnCount     += 1;
    // selectedAgentId intentionally NOT cleared (mirrors client)

    return { success: false };
  }
}

module.exports = { createMatch, castEcho, computeDominance, scheduleBotMove };
