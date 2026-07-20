const crypto = require('crypto');

const SCRYPT_KEYLEN = 32;

function randomSalt() {
  return crypto.randomBytes(16);
}

// Derives a key-encryption-key from a plaintext password + salt.
// Used both to check nothing (bcrypt handles login) and to wrap/unwrap
// each user's random data-encryption-key (DEK).
function deriveKek(password, saltB64) {
  const salt = Buffer.from(saltB64, 'base64');
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
}

function encryptJson(obj, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function decryptJson(record, key) {
  const iv = Buffer.from(record.iv, 'base64');
  const tag = Buffer.from(record.tag, 'base64');
  const ciphertext = Buffer.from(record.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

function generateDek() {
  return crypto.randomBytes(32);
}

function wrapDek(dek, kek) {
  return encryptJson({ dek: dek.toString('base64') }, kek);
}

function unwrapDek(wrapped, kek) {
  const { dek } = decryptJson(wrapped, kek);
  return Buffer.from(dek, 'base64');
}

module.exports = {
  randomSalt,
  deriveKek,
  encryptJson,
  decryptJson,
  generateDek,
  wrapDek,
  unwrapDek,
};
