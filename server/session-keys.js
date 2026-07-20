// Holds each logged-in session's unwrapped data-encryption-key (DEK) in
// memory only. It is derived from the user's password at login time and
// never written to disk, so a server restart invalidates all sessions and
// requires a fresh login (by design - we don't want the key persisted).
const sessionDeks = new Map();

function setDek(sessionId, dek) {
  sessionDeks.set(sessionId, dek);
}

function getDek(sessionId) {
  return sessionDeks.get(sessionId);
}

function clearDek(sessionId) {
  sessionDeks.delete(sessionId);
}

function requireAuth(req, res, next) {
  const userId = req.session && req.session.userId;
  const dek = userId ? getDek(req.sessionID) : undefined;
  if (!userId || !dek) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  req.userId = userId;
  req.username = req.session.username;
  req.dek = dek;
  next();
}

module.exports = { setDek, getDek, clearDek, requireAuth };
