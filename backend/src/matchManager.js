// ============================================================
// MATCH MANAGER — WebSocket handler + message router
// ============================================================
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { createMatch, castEcho } = require('./gameEngine');
const { recordWin, getLeaderboard } = require('./leaderboard');
const { logger } = require('./logger');
const {
  ipMessageRateOk,
  MAX_WS_PAYLOAD_BYTES,
  recordInvalidAndShouldDrop,
  castEchoRateOk,
} = require('./security');

const MATCHMAKING_DELAY_MS = parseInt(process.env.MATCHMAKING_DELAY_MS || '3000', 10);
const MSG_RATE_LIMIT        = 10;   // msgs/s per connection
const HEARTBEAT_INTERVAL    = 30_000;
const HEARTBEAT_TIMEOUT     = 60_000;

// ── in-memory stores ─────────────────────────────────────────

/** Map<connectionId, ConnectionMeta> */
const connections = new Map();

/**
 * @typedef {{
 *   connectionId: string,
 *   ws: WebSocket,
 *   walletAddress: string|null,
 *   matchId: string|null,
 *   isAlive: boolean,
 *   lastSeen: number,
 *   msgCount: number,
 *   msgResetAt: number,
 *   matchmakingPending: boolean,
 * }} ConnectionMeta
 */

/** Map<matchId, MatchState> */
const matches = new Map();

// ── Joi schemas ───────────────────────────────────────────────

const echoStones  = ['Growth', 'Decay', 'Light', 'Shadow'];
const gamePhases  = ['lobby', 'matchmaking', 'playing', 'gameover'];

const joiOpts = { stripUnknown: true, abortEarly: false };

/** Mock + hex-style wallet strings only — no control chars / prototype keys */
const walletAddress = Joi.string()
  .trim()
  .min(1)
  .max(128)
  .pattern(/^[a-fA-F0-9xX]+$/)
  .required();

const schemas = {
  CONNECT_WALLET: Joi.object({
    type: Joi.string().valid('CONNECT_WALLET').required(),
    walletAddress,
  }).unknown(false),
  DISCONNECT_WALLET: Joi.object({
    type: Joi.string().valid('DISCONNECT_WALLET').required(),
  }).unknown(false),
  START_MATCHMAKING: Joi.object({
    type: Joi.string().valid('START_MATCHMAKING').required(),
  }).unknown(false),
  SELECT_AGENT: Joi.object({
    type: Joi.string().valid('SELECT_AGENT').required(),
    agentId: Joi.string().max(80).allow(null).default(null),
  }).unknown(false),
  ADD_ECHO_STONE: Joi.object({
    type: Joi.string().valid('ADD_ECHO_STONE').required(),
    stone: Joi.string().valid(...echoStones).required(),
  }).unknown(false),
  CLEAR_ECHO_SEQUENCE: Joi.object({
    type: Joi.string().valid('CLEAR_ECHO_SEQUENCE').required(),
  }).unknown(false),
  CAST_ECHO: Joi.object({
    type: Joi.string().valid('CAST_ECHO').required(),
  }).unknown(false),
  SET_PHASE: Joi.object({
    type: Joi.string().valid('SET_PHASE').required(),
    phase: Joi.string().valid(...gamePhases).required(),
  }).unknown(false),
  RESET_LAST_RESULT: Joi.object({
    type: Joi.string().valid('RESET_LAST_RESULT').required(),
  }).unknown(false),
  GET_LEADERBOARD: Joi.object({
    type: Joi.string().valid('GET_LEADERBOARD').required(),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }).unknown(false),
  PING: Joi.object({
    type: Joi.string().valid('PING').required(),
  }).unknown(false),
};

// ── send helpers ──────────────────────────────────────────────

function send(ws, obj) {
  try {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  } catch (e) {
    logger.warn({ err: e.message }, 'ws send failed');
  }
}

function sendError(ws, message) {
  send(ws, { type: 'ERROR', message });
}

/** Snapshot of match state safe to send to the client (strips runtime handles). */
function matchSnapshot(match) {
  // UNHACKABLE: Never leak rate-limit counters / timers to clients (info disclosure + easier tuning attacks).
  const { botTimer, _castRate, ...safe } = match;
  return safe;
}

// ── rate limiter ──────────────────────────────────────────────

function isRateLimited(meta) {
  const now = Date.now();
  if (now > meta.msgResetAt) { meta.msgCount = 0; meta.msgResetAt = now + 1000; }
  return ++meta.msgCount > MSG_RATE_LIMIT;
}

// ── matchmaking ───────────────────────────────────────────────

function startMatchmaking(meta) {
  meta.matchmakingPending = true;
  send(meta.ws, { type: 'PHASE_CHANGED', phase: 'matchmaking' });
  logger.info({ wallet: meta.walletAddress }, 'matchmaking started');

  setTimeout(() => {
    meta.matchmakingPending = false;
    // Re-check connection still active
    if (!connections.has(meta.connectionId)) return;

    const match = createMatch(meta.walletAddress);
    matches.set(match.matchId, match);
    meta.matchId = match.matchId;

    logger.info({ matchId: match.matchId, wallet: meta.walletAddress, seed: match.worldSeed }, 'match created');

    send(meta.ws, {
      type:      'MATCH_STARTED',
      matchId:   match.matchId,
      worldSeed: match.worldSeed,   // client passes to generateWorld(seed)
      state:     matchSnapshot(match),
    });
  }, MATCHMAKING_DELAY_MS);
}

// ── bot update push ───────────────────────────────────────────

function pushBotUpdate(match) {
  // Find connection for this match
  for (const [, meta] of connections) {
    if (meta.matchId === match.matchId) {
      send(meta.ws, { type: 'STATE_UPDATE', state: matchSnapshot(match) });
      return;
    }
  }
}

// ── message handlers ──────────────────────────────────────────

function handleMessage(meta, msg) {
  const { ws } = meta;

  switch (msg.type) {

    case 'PING':
      send(ws, { type: 'PONG' });
      break;

    // ── wallet ───────────────────────────────────────────────
    case 'CONNECT_WALLET':
      meta.walletAddress = msg.walletAddress;
      logger.info({ wallet: msg.walletAddress }, 'wallet connected');
      send(ws, { type: 'WALLET_CONNECTED', walletAddress: msg.walletAddress });
      break;

    case 'DISCONNECT_WALLET':
      cleanupMatch(meta);
      meta.walletAddress = null;
      send(ws, { type: 'WALLET_DISCONNECTED' });
      send(ws, { type: 'PHASE_CHANGED', phase: 'lobby' });
      break;

    // ── matchmaking ──────────────────────────────────────────
    case 'START_MATCHMAKING': {
      if (!meta.walletAddress) { sendError(ws, 'Connect wallet first'); return; }
      if (meta.matchmakingPending) { sendError(ws, 'Already searching'); return; }
      if (meta.matchId) {
        const cur = matches.get(meta.matchId);
        if (cur && cur.phase !== 'gameover') {
          sendError(ws, 'Already in a match');
          return;
        }
        cleanupMatch(meta);
      }
      startMatchmaking(meta);
      break;
    }

    // ── in-match actions ─────────────────────────────────────
    case 'SELECT_AGENT': {
      const match = getMatch(meta, ws);
      if (!match) return;
      match.selectedAgentId = msg.agentId;
      match.echoSequence    = [];      // mirror client: clear on select
      match.lastEchoResult  = null;
      send(ws, { type: 'STATE_UPDATE', state: matchSnapshot(match) });
      break;
    }

    case 'ADD_ECHO_STONE': {
      const match = getMatch(meta, ws);
      if (!match) return;
      if (match.echoSequence.length >= 3) {
        sendError(ws, 'Echo sequence full (max 3)');
        return;
      }
      match.echoSequence.push(msg.stone);
      send(ws, { type: 'STATE_UPDATE', state: matchSnapshot(match) });
      break;
    }

    case 'CLEAR_ECHO_SEQUENCE': {
      const match = getMatch(meta, ws);
      if (!match) return;
      match.echoSequence = [];
      send(ws, { type: 'STATE_UPDATE', state: matchSnapshot(match) });
      break;
    }

    case 'CAST_ECHO': {
      const match = getMatch(meta, ws);
      if (!match) return;

      if (!match.selectedAgentId) {
        sendError(ws, 'No agent selected');
        return;
      }

      // UNHACKABLE: Bounds automated echo brute-forcing per match (sequential stone guessing).
      if (!castEchoRateOk(match)) {
        sendError(ws, 'Cast rate exceeded — slow down');
        return;
      }

      const result = castEcho(
        match,
        match.selectedAgentId,
        match.echoSequence,
        pushBotUpdate,
      );

      send(ws, {
        type:    'ECHO_RESULT',
        success: result.success,
        error:   result.error || null,
        state:   matchSnapshot(match),
      });

      // If game over, record stats
      if (match.phase === 'gameover' && meta.walletAddress) {
        // Authoritative end: dominance.player1 > 50 (only path to gameover today)
        const agentsConverted = match.agents.filter(a => a.faction === 'player1').length;
        recordWin(meta.walletAddress, match.score.player1, agentsConverted);
        logger.info({ matchId: match.matchId, p1: match.score.player1, p2: match.score.player2 }, 'match over');
      }
      break;
    }

    case 'SET_PHASE': {
      // Client uses this to return to lobby after gameover
      const match = getMatch(meta, ws, /* optional */ true);
      if (msg.phase === 'lobby') {
        cleanupMatch(meta);
        send(ws, { type: 'PHASE_CHANGED', phase: 'lobby' });
      } else {
        sendError(ws, 'SET_PHASE: only lobby transitions allowed from client');
      }
      break;
    }

    case 'RESET_LAST_RESULT': {
      const match = getMatch(meta, ws);
      if (!match) return;
      match.lastEchoResult = null;
      send(ws, { type: 'STATE_UPDATE', state: matchSnapshot(match) });
      break;
    }

    case 'GET_LEADERBOARD':
      send(ws, { type: 'LEADERBOARD', leaderboard: getLeaderboard(msg.limit || 50) });
      break;

    default:
      sendError(ws, `Unknown message type: ${msg.type}`);
  }
}

// ── helpers ───────────────────────────────────────────────────

function getMatch(meta, ws, optional = false) {
  if (!meta.matchId) {
    if (!optional) sendError(ws, 'No active match');
    return null;
  }
  const match = matches.get(meta.matchId);
  if (!match) {
    if (!optional) sendError(ws, 'Match not found');
    return null;
  }
  return match;
}

function cleanupMatch(meta) {
  if (!meta.matchId) return;
  const match = matches.get(meta.matchId);
  if (match && match.botTimer) clearTimeout(match.botTimer);
  matches.delete(meta.matchId);
  meta.matchId = null;
}

// ── connection lifecycle ──────────────────────────────────────

function handleConnection(ws, _req, clientIp) {
  const connectionId = uuidv4();
  const meta = {
    connectionId,
    ws,
    clientIp,
    walletAddress: null,
    matchId: null,
    matchmakingPending: false,
    isAlive: true,
    lastSeen: Date.now(),
    msgCount: 0,
    msgResetAt: Date.now() + 1000,
  };
  connections.set(connectionId, meta);
  logger.info({ connectionId, ip: clientIp }, 'ws session started');

  // Send initial lobby phase
  send(ws, { type: 'PHASE_CHANGED', phase: 'lobby' });

  ws.on('pong', () => {
    const m = connections.get(connectionId);
    if (m) { m.isAlive = true; m.lastSeen = Date.now(); }
  });

  ws.on('message', (raw) => {
    try {
      const m = connections.get(connectionId);
      if (!m) return;

      if (isRateLimited(m)) {
        sendError(ws, 'Rate limit exceeded');
        return;
      }

      // UNHACKABLE: Reject huge frames before JSON.parse — prevents memory exhaustion / JSON bomb DoS.
      const byteLen = Buffer.isBuffer(raw) ? raw.length : Buffer.byteLength(String(raw));
      if (byteLen > MAX_WS_PAYLOAD_BYTES) {
        if (recordInvalidAndShouldDrop(m, clientIp)) ws.close(1009, 'Payload too large');
        else sendError(ws, 'Message too large');
        return;
      }

      // UNHACKABLE: IP-aggregated throttle — many parallel sockets from one /24 still capped.
      if (!ipMessageRateOk(clientIp)) {
        sendError(ws, 'Global rate limit');
        return;
      }

      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        if (recordInvalidAndShouldDrop(m, clientIp)) ws.close(1008, 'Invalid frames');
        else sendError(ws, 'Invalid JSON');
        return;
      }

      const schema = schemas[msg.type];
      if (!schema) {
        if (recordInvalidAndShouldDrop(m, clientIp)) ws.close(1008, 'Unknown type');
        else sendError(ws, `Unknown type: ${msg.type}`);
        return;
      }

      const { error, value } = schema.validate(msg, joiOpts);
      if (error) {
        if (recordInvalidAndShouldDrop(m, clientIp)) ws.close(1008, 'Validation');
        else sendError(ws, error.message);
        return;
      }

      handleMessage(m, value);
    } catch (err) {
      logger.error({ err, connectionId }, 'ws message error');
      sendError(ws, 'Internal server error');
    }
  });

  ws.on('close', () => {
    logger.info({ connectionId }, 'ws closed');
    const m = connections.get(connectionId);
    if (m) cleanupMatch(m);
    connections.delete(connectionId);
  });

  ws.on('error', (err) => {
    logger.warn({ connectionId, err: err.message }, 'ws error');
    const m = connections.get(connectionId);
    if (m) cleanupMatch(m);
    connections.delete(connectionId);
  });
}

// ── heartbeat ─────────────────────────────────────────────────

function startHeartbeat(wss) {
  return setInterval(() => {
    wss.clients.forEach((ws) => {
      // find meta
      let meta = null;
      for (const [, m] of connections) {
        if (m.ws === ws) { meta = m; break; }
      }
      if (!meta) { ws.terminate(); return; }
      if (!meta.isAlive || Date.now() - meta.lastSeen > HEARTBEAT_TIMEOUT) {
        logger.warn({ connectionId: meta.connectionId }, 'heartbeat dropped');
        cleanupMatch(meta);
        connections.delete(meta.connectionId);
        ws.terminate();
        return;
      }
      meta.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);
}

function getStats() {
  return {
    playersOnline: connections.size,
    activeMatches: matches.size,
  };
}

module.exports = { handleConnection, startHeartbeat, getStats };
