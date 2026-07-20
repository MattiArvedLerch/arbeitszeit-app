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
  // Surcharge percentages (Zuschlaege), editable - default to the rates from
  // § 3b EStG (the tax-free thresholds most collective agreements mirror).
  // These are NOT a general statutory pay entitlement (only night work has
  // one, via § 6 Abs. 5 ArbZG, and even that names no fixed percentage) -
  // just a commonly used reference scale, hence configurable per user.
  nightSurchargePercent: 25,
  sundaySurchargePercent: 50,
  holidaySurchargePercent: 125,
  highHolidaySurchargePercent: 150,
};

const SURCHARGE_TYPES = ['none', 'night', 'sunday', 'holiday', 'highHoliday'];

function surchargePercentFor(settings, surchargeType) {
  switch (surchargeType) {
    case 'night':
      return settings.nightSurchargePercent;
    case 'sunday':
      return settings.sundaySurchargePercent;
    case 'holiday':
      return settings.holidaySurchargePercent;
    case 'highHoliday':
      return settings.highHolidaySurchargePercent;
    default:
      return 0;
  }
}

function applySurcharge(baseAmount, settings, surchargeType) {
  const percent = surchargePercentFor(settings, surchargeType);
  return Math.round(baseAmount * (1 + percent / 100) * 100) / 100;
}

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
  const baseAmount = hourlyRateFor(settings) * (workedMinutes / 60);

  const entry = {
    date,
    start,
    end: finalEndTime,
    breakMinutes: settings.breakMinutes,
    workedMinutes,
    plannedMinutes: Math.round(settings.duration * 60),
    surchargeType: 'none',
    earnedAmount: applySurcharge(baseAmount, settings, 'none'),
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
  SURCHARGE_TYPES,
  getDecryptedSettings,
  saveSettings,
  hourlyRateFor,
  applySurcharge,
  startWorkday,
  finishWorkday,
};
