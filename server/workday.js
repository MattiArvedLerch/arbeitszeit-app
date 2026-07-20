const cryptoUtil = require('./crypto');
const { computeWorkedMinutes, todayStr, nowHHMM } = require('./time');

const DEFAULT_SETTINGS = {
  duration: 8,
  breakStart: '12:00',
  breakMinutes: 30,
  salaryType: 'monthly',
  salaryAmount: 0,
  weeklyHours: 40,
  active: null, // { date, start } while a work day is running
};

function getDecryptedSettings(db, userId, dek) {
  const rec = db.data[userId] && db.data[userId].settings;
  if (!rec) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...cryptoUtil.decryptJson(rec, dek) };
}

function saveSettings(mutableDb, userId, dek, settings) {
  mutableDb.data[userId].settings = cryptoUtil.encryptJson(settings, dek);
}

function hourlyRateFor(settings) {
  return settings.salaryType === 'yearly'
    ? settings.salaryAmount / (settings.weeklyHours * 52)
    : settings.salaryAmount / (settings.weeklyHours * 4.33);
}

// Shared by the session-based /workday/start route and the token-based /toggle route.
function startWorkday(mutableDb, userId, dek, startTime) {
  const settings = getDecryptedSettings(mutableDb, userId, dek);
  settings.active = { date: todayStr(), start: startTime || nowHHMM() };
  saveSettings(mutableDb, userId, dek, settings);
  return settings;
}

// Shared by the session-based /workday/finish route and the token-based /toggle route.
// Returns null if no workday is currently active.
function finishWorkday(mutableDb, userId, dek, endTime) {
  const settings = getDecryptedSettings(mutableDb, userId, dek);
  if (!settings.active) return null;

  const finalEndTime = endTime || nowHHMM();
  const { date, start } = settings.active;
  const workedMinutes = computeWorkedMinutes(date, start, finalEndTime, settings.breakStart, settings.breakMinutes);
  const earnedAmount = Math.round(hourlyRateFor(settings) * (workedMinutes / 60) * 100) / 100;

  const entry = {
    date,
    start,
    end: finalEndTime,
    breakMinutes: settings.breakMinutes,
    workedMinutes,
    plannedMinutes: Math.round(settings.duration * 60),
    earnedAmount,
  };

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...cryptoUtil.encryptJson(entry, dek),
  };
  mutableDb.data[userId].logs.push(record);

  settings.active = null;
  saveSettings(mutableDb, userId, dek, settings);

  return { id, ...entry };
}

module.exports = {
  DEFAULT_SETTINGS,
  getDecryptedSettings,
  saveSettings,
  hourlyRateFor,
  startWorkday,
  finishWorkday,
};
