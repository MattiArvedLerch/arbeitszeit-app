const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function emptyDb() {
  return { users: {}, data: {} };
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb(), null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return raw.trim() ? JSON.parse(raw) : emptyDb();
}

function writeDb(db) {
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2));
  fs.renameSync(tmpPath, DB_PATH);
}

// All mutations run through this promise chain so concurrent requests
// within this single Node process never interleave read-modify-write cycles.
let writeChain = Promise.resolve();

function mutate(fn) {
  const result = writeChain.then(() => {
    const db = readDb();
    const value = fn(db);
    writeDb(db);
    return value;
  });
  // Keep the chain alive even if this mutation fails, but let the caller see the error.
  writeChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

module.exports = { readDb, mutate };
