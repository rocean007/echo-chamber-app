/**
 * Structured JSON logs (pino) — production default; pretty in dev if pino-pretty installed.
 */
const pino = require('pino');
const config = require('./config');

const transport =
  config.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      }
    : undefined;

const logger = pino(
  {
    level: config.LOG_LEVEL,
    base: { env: config.NODE_ENV },
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
  transport ? { transport } : undefined,
);

/**
 * Express request logging (latency + status; no body)
 */
function httpLogger() {
  const pinoHttp = require('pino-http');
  return pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/api/health' || req.url === '/api/health/',
    },
    customLogLevel: function (_req, res, err) {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}

module.exports = { logger, httpLogger };
