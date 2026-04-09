/**
 * Central configuration — validated at boot (fail fast in production).
 */
require('dotenv').config();

const Joi = require('joi');

function parseOriginList() {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : ['http://localhost:5173'];
}

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3001),
  HOST: Joi.string().default('0.0.0.0'),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent').default(
    process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ),
  TRUST_PROXY: Joi.string().valid('true', 'false').default('false'),

  AGENT_COUNT: Joi.number().integer().min(1).max(64).default(12),
  BOT_DELAY_MS: Joi.number().integer().min(0).max(60_000).default(1500),
  MATCHMAKING_DELAY_MS: Joi.number().integer().min(0).max(120_000).default(3000),
  LEADERBOARD_SIZE: Joi.number().integer().min(10).max(10_000).default(100),

  API_RATE_LIMIT_MAX: Joi.number().integer().min(10).max(100_000).default(120),
  MAX_WS_CONN_PER_IP: Joi.number().integer().min(1).max(1000).default(24),
  MAX_WS_PAYLOAD_BYTES: Joi.number().integer().min(1024).max(512 * 1024).default(8192),
  MAX_WS_MSG_PER_IP_PER_SEC: Joi.number().integer().min(5).max(2000).default(48),
  MAX_WS_INVALID_PER_MIN: Joi.number().integer().min(5).max(1000).default(40),
  CAST_RATE_WINDOW_MS: Joi.number().integer().min(1000).max(120_000).default(15_000),
  MAX_CAST_PER_WINDOW: Joi.number().integer().min(5).max(200).default(24),
  MSG_RATE_LIMIT: Joi.number().integer().min(1).max(200).default(10),
  HEARTBEAT_INTERVAL: Joi.number().integer().min(5000).max(300_000).default(30_000),
  HEARTBEAT_TIMEOUT: Joi.number().integer().min(10_000).max(600_000).default(60_000),
}).unknown(true);

const { error, value: parsed } = envSchema.validate(process.env, {
  stripUnknown: true,
  abortEarly: false,
  convert: true,
});

if (error) {
  console.error('[config] Invalid environment:', error.message);
  process.exit(1);
}

const corsOrigins = parseOriginList();

const trustProxy = parsed.TRUST_PROXY === 'true';

if (parsed.NODE_ENV === 'production') {
  for (const o of corsOrigins) {
    if (/localhost|127\.0\.0\.1/.test(o)) {
      console.warn('[config] WARNING: CORS origin is localhost in production — set CORS_ORIGINS to your public HTTPS URL.');
      break;
    }
  }
  if (!trustProxy) {
    console.warn('[config] WARNING: TRUST_PROXY is false in production — enable behind a reverse proxy with X-Forwarded-For.');
  }
}

/** Expand allowed WebSocket Origin set (mirror + localhost pairing per origin). */
function buildWsOriginAllowlist(origins) {
  const set = new Set();
  for (const s of origins) {
    set.add(s);
    try {
      const u = new URL(s);
      const port = u.port || (u.protocol === 'https:' ? '443' : '80');
      if (u.hostname === 'localhost') set.add(`${u.protocol}//127.0.0.1:${port}`);
      if (u.hostname === '127.0.0.1') set.add(`${u.protocol}//localhost:${port}`);
    } catch (_) { /* ignore bad URL */ }
  }
  return set;
}

const { TRUST_PROXY: _trashTrust, ...parsedRest } = parsed;
const config = {
  ...parsedRest,
  trustProxy,
  corsOrigins,
  allowedWsOrigins: buildWsOriginAllowlist(corsOrigins),
};

/** Inject limits into process.env for modules that still read env (security, matchManager constants). */
function syncLegacyEnv() {
  const map = {
    AGENT_COUNT: config.AGENT_COUNT,
    BOT_DELAY_MS: config.BOT_DELAY_MS,
    MATCHMAKING_DELAY_MS: config.MATCHMAKING_DELAY_MS,
    LEADERBOARD_SIZE: config.LEADERBOARD_SIZE,
    API_RATE_LIMIT_MAX: config.API_RATE_LIMIT_MAX,
    MAX_WS_CONN_PER_IP: config.MAX_WS_CONN_PER_IP,
    MAX_WS_PAYLOAD_BYTES: config.MAX_WS_PAYLOAD_BYTES,
    MAX_WS_MSG_PER_IP_PER_SEC: config.MAX_WS_MSG_PER_IP_PER_SEC,
    MAX_WS_INVALID_PER_MIN: config.MAX_WS_INVALID_PER_MIN,
    CAST_RATE_WINDOW_MS: config.CAST_RATE_WINDOW_MS,
    MAX_CAST_PER_WINDOW: config.MAX_CAST_PER_WINDOW,
    MSG_RATE_LIMIT: config.MSG_RATE_LIMIT,
    HEARTBEAT_INTERVAL: config.HEARTBEAT_INTERVAL,
    HEARTBEAT_TIMEOUT: config.HEARTBEAT_TIMEOUT,
    TRUST_PROXY: config.trustProxy ? 'true' : 'false',
  };
  for (const [k, v] of Object.entries(map)) {
    process.env[k] = String(v);
  }
}

syncLegacyEnv();

module.exports = config;
