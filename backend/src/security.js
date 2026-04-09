// ============================================================
// SECURITY PRIMITIVES — defense-in-depth for WS + HTTP edge
// ============================================================
// UNHACKABLE: Central place for IP trust, flood caps, and payload
// bounds so rotating IPs / oversized frames cannot trivially DoS the
// Node process or starve match state (mitigates connection flooding,
// slowloris-style WS spam, and cheap JSON bombs).
// Remaining risk: terabit volumetric DDoS still needs upstream (Cloudflare, etc.).
// ============================================================
const net = require('net');

const MAX_WS_PER_IP = parseInt(process.env.MAX_WS_CONN_PER_IP || '24', 10);
const MAX_WS_PAYLOAD_BYTES = parseInt(process.env.MAX_WS_PAYLOAD_BYTES || '8192', 10);
/** Aggregate WS messages/sec per IP across all sockets (anti IP-rotation parallelism). */
const MAX_MSG_PER_IP_PER_SEC = parseInt(process.env.MAX_WS_MSG_PER_IP_PER_SEC || '48', 10);
/** After this many malformed/invalid frames per minute, drop the socket. */
const MAX_INVALID_PER_MIN = parseInt(process.env.MAX_WS_INVALID_PER_MIN || '40', 10);
/** Max CAST_ECHO per match per rolling window (anti scripted guess-spraying). */
const CAST_WINDOW_MS = parseInt(process.env.CAST_RATE_WINDOW_MS || '15000', 10);
const MAX_CAST_PER_WINDOW = parseInt(process.env.MAX_CAST_PER_WINDOW || '24', 10);

const _wsConnByIp = new Map();
const _ipMsgBuckets = new Map();
const _invalidByIp = new Map();

/**
 * UNHACKABLE: Only honor X-Forwarded-For when TRUST_PROXY=true (verified reverse proxy).
 * Prevents client-spoofed “client IP” bypassing limits in naive deployments.
 */
function trustedClientIp(req) {
  if (process.env.TRUST_PROXY === 'true') {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0 && xff.length < 200) {
      const first = xff.split(',')[0].trim();
      if (net.isIP(first)) return first;
    }
  }
  return req.socket.remoteAddress || 'unknown';
}

function canAcceptWs(ip) {
  return (_wsConnByIp.get(ip) || 0) < MAX_WS_PER_IP;
}

function noteWsOpen(ip) {
  _wsConnByIp.set(ip, (_wsConnByIp.get(ip) || 0) + 1);
}

function noteWsClose(ip) {
  const n = (_wsConnByIp.get(ip) || 1) - 1;
  if (n <= 0) _wsConnByIp.delete(ip);
  else _wsConnByIp.set(ip, n);
}

/**
 * UNHACKABLE: Cross-connection IP throttle — limits parallel bot swarms rotating few payloads.
 */
function ipMessageRateOk(ip) {
  const now = Date.now();
  let b = _ipMsgBuckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { n: 0, resetAt: now + 1000 };
    _ipMsgBuckets.set(ip, b);
  }
  b.n += 1;
  return b.n <= MAX_MSG_PER_IP_PER_SEC;
}

/**
 * Track invalid frames per socket + per IP; terminate on abuse.
 */
function recordInvalidAndShouldDrop(meta, ip) {
  const now = Date.now();
  if (!meta.invalidBudget) meta.invalidBudget = { n: 0, resetAt: now + 60_000 };
  if (now > meta.invalidBudget.resetAt) {
    meta.invalidBudget = { n: 0, resetAt: now + 60_000 };
  }
  meta.invalidBudget.n += 1;
  if (meta.invalidBudget.n > MAX_INVALID_PER_MIN) return true;

  let g = _invalidByIp.get(ip);
  if (!g || now > g.resetAt) g = { n: 0, resetAt: now + 60_000 };
  g.n += 1;
  _invalidByIp.set(ip, g);
  return g.n > MAX_INVALID_PER_MIN * 3;
}

/**
 * UNHACKABLE: Per-match echo cap — scripted brute force on stone sequences becomes linearly costly.
 */
function castEchoRateOk(match) {
  const now = Date.now();
  if (!match._castRate) match._castRate = { windowStart: now, n: 0 };
  const w = match._castRate;
  if (now - w.windowStart > CAST_WINDOW_MS) {
    w.windowStart = now;
    w.n = 0;
  }
  w.n += 1;
  return w.n <= MAX_CAST_PER_WINDOW;
}

module.exports = {
  trustedClientIp,
  canAcceptWs,
  noteWsOpen,
  noteWsClose,
  ipMessageRateOk,
  MAX_WS_PAYLOAD_BYTES,
  recordInvalidAndShouldDrop,
  castEchoRateOk,
};
