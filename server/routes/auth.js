const express = require('express');
const bcrypt = require('bcryptjs');
const { readDb, mutate } = require('../store');
const cryptoUtil = require('../crypto');
const sessionKeys = require('../session-keys');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

// Very small brute-force guard: after repeated failed logins for a
// username, force a short cooldown. In-memory only, resets on restart -
// good enough for a personal app on a home LAN, not a public service.
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

function checkLockout(key) {
  const entry = failedAttempts.get(key);
  if (!entry) return null;
  if (entry.count >= MAX_ATTEMPTS && Date.now() - entry.lastAt < LOCKOUT_MS) {
    return Math.ceil((LOCKOUT_MS - (Date.now() - entry.lastAt)) / 1000);
  }
  return null;
}

function recordFailure(key) {
  const entry = failedAttempts.get(key) || { count: 0, lastAt: 0 };
  entry.count += 1;
  entry.lastAt = Date.now();
  failedAttempts.set(key, entry);
}

function clearFailures(key) {
  failedAttempts.delete(key);
}

router.post('/register', (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: 'invalid_username',
      message: 'Benutzername muss 3-32 Zeichen lang sein (Buchstaben, Zahlen, _ oder -).',
    });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: 'invalid_password',
      message: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    });
  }

  const key = username.toLowerCase();
  const db = readDb();
  if (db.users[key]) {
    return res.status(409).json({ error: 'username_taken', message: 'Benutzername bereits vergeben.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const kekSalt = cryptoUtil.randomSalt().toString('base64');
  const kek = cryptoUtil.deriveKek(password, kekSalt);
  const dek = cryptoUtil.generateDek();
  const wrappedDek = cryptoUtil.wrapDek(dek, kek);

  mutate((mutableDb) => {
    mutableDb.users[key] = {
      username,
      passwordHash,
      kekSalt,
      wrappedDek,
      createdAt: new Date().toISOString(),
    };
    mutableDb.data[key] = { settings: null, logs: [] };
  }).then(() => {
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'session_error' });
      req.session.userId = key;
      req.session.username = username;
      sessionKeys.setDek(req.sessionID, dek);
      res.json({ username });
    });
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const key = username.toLowerCase();
  const lockedForSeconds = checkLockout(key);
  if (lockedForSeconds) {
    return res.status(429).json({
      error: 'too_many_attempts',
      retryAfterSeconds: lockedForSeconds,
      message: `Zu viele Fehlversuche. Bitte in ${lockedForSeconds}s erneut versuchen.`,
    });
  }

  const db = readDb();
  const user = db.users[key];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    recordFailure(key);
    return res.status(401).json({ error: 'invalid_credentials', message: 'Benutzername oder Passwort falsch.' });
  }

  clearFailures(key);

  let dek;
  try {
    const kek = cryptoUtil.deriveKek(password, user.kekSalt);
    dek = cryptoUtil.unwrapDek(user.wrappedDek, kek);
  } catch (e) {
    return res.status(500).json({ error: 'decrypt_error' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'session_error' });
    req.session.userId = key;
    req.session.username = user.username;
    sessionKeys.setDek(req.sessionID, dek);
    res.json({ username: user.username });
  });
});

router.post('/logout', (req, res) => {
  sessionKeys.clearDek(req.sessionID);
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  const userId = req.session && req.session.userId;
  const dek = userId ? sessionKeys.getDek(req.sessionID) : undefined;
  if (!userId || !dek) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  res.json({ username: req.session.username });
});

router.post('/change-password', sessionKeys.requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'invalid_request' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      error: 'invalid_password',
      message: `Neues Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    });
  }

  const db = readDb();
  const user = db.users[req.userId];
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Aktuelles Passwort ist falsch.' });
  }

  // Re-wrap the existing DEK under a new key derived from the new password.
  // The encrypted data itself never needs to be touched.
  const newPasswordHash = bcrypt.hashSync(newPassword, 10);
  const newKekSalt = cryptoUtil.randomSalt().toString('base64');
  const newKek = cryptoUtil.deriveKek(newPassword, newKekSalt);
  const newWrappedDek = cryptoUtil.wrapDek(req.dek, newKek);

  mutate((mutableDb) => {
    const u = mutableDb.users[req.userId];
    u.passwordHash = newPasswordHash;
    u.kekSalt = newKekSalt;
    u.wrappedDek = newWrappedDek;
  }).then(() => {
    res.json({ ok: true });
  });
});

module.exports = router;
