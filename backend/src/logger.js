const pino = require('pino');
const config = require('./config');

const isDev = config.NODE_ENV !== 'production';

const logger = pino({
  level: config.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { env: config.NODE_ENV },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
    censor: '[redacted]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
});

function httpLogger() {
  const pinoHttp = require('pino-http');
  return pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/api/health' || req.url === '/api/health/',
    },
    customLogLevel(_req, res, err) {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          headers: req.headers,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        };
      },
    },
  });
}

module.exports = { logger, httpLogger };