const express = require('express');
const path = require('path');
const { getStats } = require('../matchManager');

const router = express.Router();
const START = Date.now();

let pkgVersion = 'unknown';
try {
  /* eslint-disable import/no-dynamic-require, global-require */
  pkgVersion = require(path.join(__dirname, '..', '..', 'package.json')).version;
} catch (_) { /* ignore */ }

router.get('/', (_req, res) => {
  const { playersOnline, activeMatches } = getStats();
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - START) / 1000),
    playersOnline,
    activeMatches,
    version: pkgVersion,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
