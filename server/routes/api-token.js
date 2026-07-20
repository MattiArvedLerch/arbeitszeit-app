const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { readDb, mutate } = require('../store');
const cryptoUtil = require('../crypto');
const { requireAuth } = require('../session-keys');
const { getDecryptedSettings, startWorkday, finishWorkday } = require('../workday');

const router = express.Router();

// --- Token management (session-authenticated, i.e. the user is logged in normally) ---

router.post('/token/generate', requireAuth, (req, res) => {
  const secret = crypto.randomBytes(32).toString('hex');
  const hash = bcrypt.hashSync(secret, 10);
  const kekSalt = cryptoUtil.randomSalt().toString('base64');
  const kek = cryptoUtil.deriveKek(secret, kekSalt);
  const wrappedDek = cryptoUtil.wrapDek(req.dek, kek);
  const createdAt = new Date().toISOString();

  mutate((mutableDb) => {
    mutableDb.users[req.userId].apiToken = { hash, kekSalt, wrappedDek, createdAt };
  }).then(() => {
    res.json({ token: `${req.userId}.${secret}`, createdAt });
  });
});

router.post('/token/revoke', requireAuth, (req, res) => {
  mutate((mutableDb) => {
    mutableDb.users[req.userId].apiToken = null;
  }).then(() => {
    res.json({ ok: true });
  });
});

router.get('/token/status', requireAuth, (req, res) => {
  const db = readDb();
  const apiToken = db.users[req.userId].apiToken;
  res.json({ active: !!apiToken, createdAt: apiToken ? apiToken.createdAt : null });
});

// --- Token-based toggle (no login session needed - for iOS Shortcuts / NFC automations) ---

const failedTokenAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

function isLockedOut(key) {
  const entry = failedTokenAttempts.get(key);
  return !!entry && entry.count >= MAX_ATTEMPTS && Date.now() - entry.lastAt < LOCKOUT_MS;
}

function recordFailure(key) {
  const entry = failedTokenAttempts.get(key) || { count: 0, lastAt: 0 };
  entry.count += 1;
  entry.lastAt = Date.now();
  failedTokenAttempts.set(key, entry);
}

function clearFailures(key) {
  failedTokenAttempts.delete(key);
}

function requireApiToken(req, res, next) {
  const match = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  const [userId, secret] = match ? match[1].split('.') : [];
  if (!userId || !secret) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  if (isLockedOut(userId)) {
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  const db = readDb();
  const apiToken = db.users[userId] && db.users[userId].apiToken;
  if (!apiToken || !bcrypt.compareSync(secret, apiToken.hash)) {
    recordFailure(userId);
    return res.status(401).json({ error: 'not_authenticated' });
  }
  clearFailures(userId);

  try {
    const kek = cryptoUtil.deriveKek(secret, apiToken.kekSalt);
    req.dek = cryptoUtil.unwrapDek(apiToken.wrappedDek, kek);
  } catch (e) {
    return res.status(500).json({ error: 'decrypt_error' });
  }
  req.userId = userId;
  next();
}

router.post('/toggle', requireApiToken, (req, res) => {
  mutate((mutableDb) => {
    const settings = getDecryptedSettings(mutableDb, req.userId, req.dek);
    if (settings.active) {
      return { action: 'finished', ...finishWorkday(mutableDb, req.userId, req.dek) };
    }
    return { action: 'started', ...startWorkday(mutableDb, req.userId, req.dek).active };
  }).then((result) => {
    res.json(result);
  });
});

module.exports = router;
