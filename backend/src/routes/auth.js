const express = require('express')
const crypto = require('crypto')
const Joi = require('joi')
const { ethers } = require('ethers')
const config = require('../config')
const { trustedClientIp } = require('../security')
const { logger } = require('../logger')

const router = express.Router()

const NONCE_TTL_MS = Math.max(30_000, (config.AUTH_NONCE_TTL_S || 600) * 1000)
const TOKEN_TTL_S = Math.max(30, config.AUTH_TOKEN_TTL_S || 600)

/** @type {Map<string, { address: string, ip: string, message: string, exp: number }>} */
const nonces = new Map()

function pruneNonces() {
  const now = Date.now()
  for (const [nonce, rec] of nonces) {
    if (!rec || now > rec.exp) nonces.delete(nonce)
  }
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function signToken(payload) {
  const payloadB64 = base64url(JSON.stringify(payload))
  const mac = crypto
    .createHmac('sha256', String(config.AUTH_SECRET))
    .update(payloadB64)
    .digest()
  const sigB64 = base64url(mac)
  return `${payloadB64}.${sigB64}`
}

function verifyToken(token) {
  if (typeof token !== 'string') return { ok: false, error: 'Bad token' }
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, error: 'Bad token' }
  const [payloadB64, sigB64] = parts
  const mac = crypto
    .createHmac('sha256', String(config.AUTH_SECRET))
    .update(payloadB64)
    .digest()
  const expected = base64url(mac)
  // constant-time compare
  const a = Buffer.from(sigB64)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, error: 'Bad token' }

  let payload
  try {
    payload = JSON.parse(Buffer.from(payloadB64.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8'))
  } catch {
    return { ok: false, error: 'Bad token' }
  }
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'Bad token' }
  if (typeof payload.sub !== 'string' || !/^0x[a-f0-9]{40}$/.test(payload.sub)) return { ok: false, error: 'Bad token' }
  if (typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) return { ok: false, error: 'Token expired' }
  return { ok: true, address: payload.sub }
}

function resolveSignInOrigin(req) {
  const header = typeof req.get === 'function' ? req.get('origin') : null
  if (header && config.corsOrigins.includes(header)) return header
  return (config.corsOrigins && config.corsOrigins[0]) || 'http://localhost:5173'
}

function makeMessage({ address, nonce, origin }) {
  const domain = (() => {
    try { return new URL(origin).host } catch { return 'localhost' }
  })()
  const issuedAt = new Date().toISOString()
  const chainId = Number(config.AUTH_CHAIN_ID)
  return [
    'Echo Chamber wants you to sign in with your Ethereum account:',
    address,
    '',
    'Sign-in to Echo Chamber.',
    '',
    `URI: ${origin}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

const addressSchema = Joi.string().trim().lowercase().pattern(/^0x[a-f0-9]{40}$/).required()

router.get('/nonce', (req, res) => {
  pruneNonces()
  const { error, value: address } = addressSchema.validate(req.query.address)
  if (error) return res.status(400).json({ error: 'Invalid address' })

  const ip = trustedClientIp(req)
  const origin = resolveSignInOrigin(req)
  const nonce = crypto.randomBytes(16).toString('hex')
  const message = makeMessage({ address, nonce, origin })
  nonces.set(nonce, { address, ip, message, exp: Date.now() + NONCE_TTL_MS })
  res.json({ nonce, message, ttlSeconds: Math.floor(NONCE_TTL_MS / 1000) })
})

const verifySchema = Joi.object({
  address: addressSchema,
  nonce: Joi.string().hex().min(16).max(128).required(),
  signature: Joi.string().trim().min(40).max(400).required(),
}).unknown(false)

router.post('/verify', (req, res) => {
  pruneNonces()
  const { error, value } = verifySchema.validate(req.body, { stripUnknown: true, abortEarly: false })
  if (error) return res.status(400).json({ error: 'Invalid payload' })

  const ip = trustedClientIp(req)
  const rec = nonces.get(value.nonce)
  if (!rec) return res.status(400).json({ error: 'Nonce expired' })
  if (rec.ip !== ip) return res.status(400).json({ error: 'Nonce invalid' })
  if (rec.address !== value.address) return res.status(400).json({ error: 'Nonce invalid' })

  let recovered
  try {
    recovered = ethers.verifyMessage(rec.message, value.signature)
  } catch (e) {
    return res.status(400).json({ error: 'Bad signature' })
  }
  const recAddr = String(recovered || '').toLowerCase()
  if (recAddr !== value.address) return res.status(401).json({ error: 'Signature mismatch' })

  nonces.delete(value.nonce) // one-time use
  const now = Math.floor(Date.now() / 1000)
  const token = signToken({ sub: value.address, iat: now, exp: now + TOKEN_TTL_S })
  logger.info({ address: value.address }, 'auth verified')
  res.json({ token, address: value.address, expiresInSeconds: TOKEN_TTL_S })
})

module.exports = { router, verifyToken }

