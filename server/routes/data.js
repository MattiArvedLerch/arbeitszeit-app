const express = require('express');
const { readDb, mutate } = require('../store');
const cryptoUtil = require('../crypto');
const { requireAuth } = require('../session-keys');
const { computeWorkedMinutes, todayStr, nowHHMM } = require('../time');
const { buildCsv, buildXml, buildXlsx } = require('../export');
const {
  getDecryptedSettings,
  saveSettings,
  hourlyRateFor,
  applySurcharge,
  startWorkday,
  finishWorkday,
  SURCHARGE_TYPES,
} = require('../workday');

const router = express.Router();
router.use(requireAuth);

router.get('/settings', (req, res) => {
  const db = readDb();
  const settings = getDecryptedSettings(db, req.userId, req.dek);
  res.json(settings);
});

function isValidPercent(value) {
  return Number.isFinite(value) && value >= 0 && value <= 300;
}

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const duration = Number(body.duration);
  const breakMinutes = Number(body.breakMinutes);
  const weeklyHours = Number(body.weeklyHours);
  const salaryAmount = Number(body.salaryAmount);
  const salaryType = body.salaryType === 'yearly' ? 'yearly' : 'monthly';
  const breakStart = typeof body.breakStart === 'string' ? body.breakStart : '12:00';
  const nightSurchargePercent = Number(body.nightSurchargePercent);
  const sundaySurchargePercent = Number(body.sundaySurchargePercent);
  const holidaySurchargePercent = Number(body.holidaySurchargePercent);
  const highHolidaySurchargePercent = Number(body.highHolidaySurchargePercent);

  if (!Number.isFinite(duration) || duration < 0 || duration > 24) {
    return res.status(400).json({ error: 'invalid_duration' });
  }
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes > 480) {
    return res.status(400).json({ error: 'invalid_break_minutes' });
  }
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0 || weeklyHours > 80) {
    return res.status(400).json({ error: 'invalid_weekly_hours' });
  }
  if (!Number.isFinite(salaryAmount) || salaryAmount < 0) {
    return res.status(400).json({ error: 'invalid_salary_amount' });
  }
  if (
    !isValidPercent(nightSurchargePercent) ||
    !isValidPercent(sundaySurchargePercent) ||
    !isValidPercent(holidaySurchargePercent) ||
    !isValidPercent(highHolidaySurchargePercent)
  ) {
    return res.status(400).json({ error: 'invalid_surcharge_percent' });
  }

  mutate((mutableDb) => {
    const current = getDecryptedSettings(mutableDb, req.userId, req.dek);
    const next = {
      ...current,
      duration,
      breakStart,
      breakMinutes,
      salaryType,
      salaryAmount,
      weeklyHours,
      nightSurchargePercent,
      sundaySurchargePercent,
      holidaySurchargePercent,
      highHolidaySurchargePercent,
    };
    saveSettings(mutableDb, req.userId, req.dek, next);
  }).then(() => {
    res.json({ ok: true });
  });
});

router.post('/workday/start', (req, res) => {
  const startTime = typeof req.body.startTime === 'string' ? req.body.startTime : nowHHMM();

  mutate((mutableDb) => startWorkday(mutableDb, req.userId, req.dek, startTime)).then((settings) => {
    res.json(settings);
  });
});

router.post('/workday/cancel', (req, res) => {
  mutate((mutableDb) => {
    const settings = getDecryptedSettings(mutableDb, req.userId, req.dek);
    settings.active = null;
    saveSettings(mutableDb, req.userId, req.dek, settings);
    return settings;
  }).then((settings) => {
    res.json(settings);
  });
});

router.post('/workday/finish', (req, res) => {
  const db = readDb();
  const settings = getDecryptedSettings(db, req.userId, req.dek);
  if (!settings.active) {
    return res.status(400).json({ error: 'no_active_workday' });
  }

  const endTime = typeof req.body.endTime === 'string' ? req.body.endTime : nowHHMM();

  mutate((mutableDb) => finishWorkday(mutableDb, req.userId, req.dek, endTime)).then((savedEntry) => {
    res.json(savedEntry);
  });
});

function listEntries(db, userId, dek) {
  const logs = (db.data[userId] && db.data[userId].logs) || [];
  return logs
    .map((rec) => ({ id: rec.id, createdAt: rec.createdAt, ...cryptoUtil.decryptJson(rec, dek) }))
    .sort((a, b) => (a.date + a.start > b.date + b.start ? -1 : 1));
}

router.get('/worklog', (req, res) => {
  const db = readDb();
  res.json(listEntries(db, req.userId, req.dek));
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

router.patch('/worklog/:id', (req, res) => {
  const body = req.body || {};
  const date = body.date;
  const start = body.start;
  const end = body.end;
  const breakMinutes = Number(body.breakMinutes);
  const surchargeType = SURCHARGE_TYPES.includes(body.surchargeType) ? body.surchargeType : 'none';

  if (!DATE_RE.test(date) || !TIME_RE.test(start) || !TIME_RE.test(end)) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes > 480) {
    return res.status(400).json({ error: 'invalid_break_minutes' });
  }

  mutate((mutableDb) => {
    const logs = mutableDb.data[req.userId].logs;
    const idx = logs.findIndex((l) => l.id === req.params.id);
    if (idx === -1) return null;

    const settings = getDecryptedSettings(mutableDb, req.userId, req.dek);
    const existing = cryptoUtil.decryptJson(logs[idx], req.dek);
    const workedMinutes = computeWorkedMinutes(date, start, end, start, breakMinutes);
    const baseAmount = hourlyRateFor(settings) * (workedMinutes / 60);

    const entry = {
      date,
      start,
      end,
      breakMinutes,
      workedMinutes,
      plannedMinutes: existing.plannedMinutes,
      surchargeType,
      earnedAmount: applySurcharge(baseAmount, settings, surchargeType),
    };

    logs[idx] = {
      id: logs[idx].id,
      createdAt: logs[idx].createdAt,
      ...cryptoUtil.encryptJson(entry, req.dek),
    };

    return { id: logs[idx].id, ...entry };
  }).then((updated) => {
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  });
});

router.delete('/worklog/:id', (req, res) => {
  mutate((mutableDb) => {
    const logs = mutableDb.data[req.userId].logs;
    const idx = logs.findIndex((l) => l.id === req.params.id);
    if (idx === -1) return false;
    logs.splice(idx, 1);
    return true;
  }).then((found) => {
    if (!found) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  });
});

router.get('/export', async (req, res) => {
  const format = req.query.format;
  const lang = req.query.lang === 'en' ? 'en' : 'de';
  const hideEarnings = req.query.hideEarnings === '1';
  const db = readDb();
  const entries = listEntries(db, req.userId, req.dek);
  const filenameBase = `arbeitszeit-${req.username}-${todayStr()}`;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
    res.send(buildCsv(entries, lang, hideEarnings));
  } else if (format === 'xml') {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xml"`);
    res.send(buildXml(entries, req.username, lang, hideEarnings));
  } else if (format === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
    await buildXlsx(entries, req.username, lang, hideEarnings, res);
  } else {
    res.status(400).json({ error: 'invalid_format' });
  }
});

module.exports = router;
