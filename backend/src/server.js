const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { logger, httpLogger } = require('./logger');
const { handleConnection, startHeartbeat } = require('./matchManager');
const { router: leaderboardRouter } = require('./leaderboard');
const healthRouter = require('./routes/health');
const { router: authRouter } = require('./routes/auth');
const {
  trustedClientIp,
  canAcceptWs,
  noteWsOpen,
  noteWsClose,
} = require('./security');

if (config.trustProxy) {
  logger.info('Express trust proxy enabled (1 hop)');
}

const app = express();
app.disable('x-powered-by');

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

app.use(httpLogger());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: config.NODE_ENV === 'production'
    ? { maxAge: 15552000, includeSubDomains: true, preload: false }
    : false,
}));

app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
}));

app.use(express.json({
  limit: '8kb',
  reviver: (key, value) => {
    if (key === '__proto__' || key === 'constructor') return undefined;
    return value;
  },
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
  keyGenerator: (req) => (typeof req.ip === 'string' && req.ip ? req.ip : req.socket.remoteAddress || 'unk'),
  validate: { trustProxy: config.trustProxy },
});
app.use('/api', apiLimiter);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  logger.error({ err }, 'express error');
  const body = { error: 'Internal server error' };
  if (config.NODE_ENV !== 'production' && err?.message) {
    body.detail = err.message;
  }
  res.status(err.status || 500).json(body);
});

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/',
  maxPayload: config.MAX_WS_PAYLOAD_BYTES,
});

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (origin && !config.allowedWsOrigins.has(origin)) {
    logger.warn({ origin }, 'ws rejected: origin');
    ws.close(1008, 'Origin not allowed');
    return;
  }
  if (!origin && config.NODE_ENV === 'production') {
    ws.close(1008, 'Missing Origin');
    return;
  }

  const ip = trustedClientIp(req);

  if (!canAcceptWs(ip)) {
    logger.warn({ ip }, 'ws rejected: connection cap');
    ws.close(1008, 'Too many connections');
    return;
  }
  noteWsOpen(ip);
  ws.once('close', () => noteWsClose(ip));

  logger.info({ ip }, 'ws connected');
  handleConnection(ws, req, ip);
});

const heartbeat = startHeartbeat(wss);

server.listen(config.PORT, config.HOST, () => {
  logger.info({
    port: config.PORT,
    host: config.HOST,
    env: config.NODE_ENV,
    corsOrigins: config.corsOrigins,
  }, 'echo-chamber api listening');
});

function shutdown(sig) {
  logger.info({ sig }, 'shutdown started');
  clearInterval(heartbeat);
  wss.clients.forEach((client) => client.close(1001, 'Server shutting down'));
  server.close(() => {
    logger.info('http server closed');
    wss.close(() => {
      logger.flush?.();
      process.exit(0);
    });
  });
  setTimeout(() => {
    process.stderr.write('shutdown timeout — forcing exit\n');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  try {
    logger.fatal({ err }, 'uncaughtException');
  } catch {
    process.stderr.write(JSON.stringify({ msg: 'uncaughtException', err: err.message }) + '\n');
  }
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  try {
    logger.error({ reason }, 'unhandledRejection');
  } catch {
    process.stderr.write(JSON.stringify({ msg: 'unhandledRejection', reason: String(reason) }) + '\n');
  }
});