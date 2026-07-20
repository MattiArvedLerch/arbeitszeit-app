const express = require('express');
const { readDb, mutate } = require('../store');
const cryptoUtil = require('../crypto');
const { requireAuth } = require('../session-keys');
const { computeWorkedMinutes, todayStr, nowHHMM } = require('../time');
const { buildCsv, buildXml, buildXlsx } = require('../export');

const router = express.Router();
router.use(requireAuth);

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

router.get('/settings', (req, res) => {
  const db = readDb();
  const settings = getDecryptedSettings(db, req.userId, req.dek);
  res.json(settings);
});

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const duration = Number(body.duration);
  const breakMinutes = Number(body.breakMinutes);
  const weeklyHours = Number(body.weeklyHours);
  const salaryAmount = Number(body.salaryAmount);
  const salaryType = body.salaryType === 'yearly' ? 'yearly' : 'monthly';
  const breakStart = typeof body.breakStart === 'string' ? body.breakStart : '12:00';

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
    };
    saveSettings(mutableDb, req.userId, req.dek, next);
  }).then(() => {
    res.json({ ok: true });
  });
});

router.post('/workday/start', (req, res) => {
  const startTime = typeof req.body.startTime === 'string' ? req.body.startTime : nowHHMM();

  mutate((mutableDb) => {
    const settings = getDecryptedSettings(mutableDb, req.userId, req.dek);
    settings.active = { date: todayStr(), start: startTime };
    saveSettings(mutableDb, req.userId, req.dek, settings);
    return settings;
  }).then((settings) => {
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
  const { date, start } = settings.active;
  const workedMinutes = computeWorkedMinutes(date, start, endTime, settings.breakStart, settings.breakMinutes);

  const hourlyRate =
    settings.salaryType === 'yearly'
      ? settings.salaryAmount / (settings.weeklyHours * 52)
      : settings.salaryAmount / (settings.weeklyHours * 4.33);
  const earnedAmount = Math.round(hourlyRate * (workedMinutes / 60) * 100) / 100;

  const entry = {
    date,
    start,
    end: endTime,
    breakMinutes: settings.breakMinutes,
    workedMinutes,
    earnedAmount,
  };

  mutate((mutableDb) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const record = {
      id,
      createdAt: new Date().toISOString(),
      ...cryptoUtil.encryptJson(entry, req.dek),
    };
    mutableDb.data[req.userId].logs.push(record);

    const s = getDecryptedSettings(mutableDb, req.userId, req.dek);
    s.active = null;
    saveSettings(mutableDb, req.userId, req.dek, s);

    return { id, ...entry };
  }).then((savedEntry) => {
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
  const db = readDb();
  const entries = listEntries(db, req.userId, req.dek);
  const filenameBase = `arbeitszeit-${req.username}-${todayStr()}`;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
    res.send(buildCsv(entries));
  } else if (format === 'xml') {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xml"`);
    res.send(buildXml(entries, req.username));
  } else if (format === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
    await buildXlsx(entries, req.username, res);
  } else {
    res.status(400).json({ error: 'invalid_format' });
  }
});

module.exports = router;
