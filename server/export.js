const ExcelJS = require('exceljs');

const LABELS = {
  de: {
    date: 'Datum',
    start: 'Start',
    end: 'Ende',
    breakMin: 'Pause (Min)',
    workedHours: 'Gearbeitet (Std)',
    workedMin: 'Gearbeitet (Min)',
    earnings: 'Verdienst (EUR)',
    sum: 'Summe',
    sheetName: 'Arbeitszeit',
    xmlRoot: 'arbeitszeit-protokoll',
    xmlUser: 'benutzer',
    xmlEntry: 'eintrag',
    xmlDate: 'datum',
    xmlStart: 'start',
    xmlEnd: 'ende',
    xmlBreakMin: 'pause_minuten',
    xmlWorkedMin: 'gearbeitete_minuten',
    xmlEarnings: 'verdienst_eur',
  },
  en: {
    date: 'Date',
    start: 'Start',
    end: 'End',
    breakMin: 'Break (min)',
    workedHours: 'Worked (h)',
    workedMin: 'Worked (min)',
    earnings: 'Earnings (EUR)',
    sum: 'Total',
    sheetName: 'Worktime',
    xmlRoot: 'worklog',
    xmlUser: 'user',
    xmlEntry: 'entry',
    xmlDate: 'date',
    xmlStart: 'start',
    xmlEnd: 'end',
    xmlBreakMin: 'break_minutes',
    xmlWorkedMin: 'worked_minutes',
    xmlEarnings: 'earnings_eur',
  },
};

function labelsFor(lang) {
  return LABELS[lang] || LABELS.de;
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function csvEscape(value) {
  const str = String(value);
  if (/[;"\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildCsv(entries, lang) {
  const L = labelsFor(lang);
  const header = [L.date, L.start, L.end, L.breakMin, L.workedHours, L.workedMin, L.earnings];
  const rows = entries.map((e) => [
    e.date,
    e.start,
    e.end,
    e.breakMinutes,
    formatHours(e.workedMinutes),
    e.workedMinutes,
    e.earnedAmount.toFixed(2),
  ]);
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(';'));
  // UTF-8 BOM so Excel renders umlauts correctly.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function xmlEscape(value) {
  return String(value).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[c]));
}

function buildXml(entries, username, lang) {
  const L = labelsFor(lang);
  const items = entries
    .map(
      (e) => `  <${L.xmlEntry}>
    <${L.xmlDate}>${xmlEscape(e.date)}</${L.xmlDate}>
    <${L.xmlStart}>${xmlEscape(e.start)}</${L.xmlStart}>
    <${L.xmlEnd}>${xmlEscape(e.end)}</${L.xmlEnd}>
    <${L.xmlBreakMin}>${e.breakMinutes}</${L.xmlBreakMin}>
    <${L.xmlWorkedMin}>${e.workedMinutes}</${L.xmlWorkedMin}>
    <${L.xmlEarnings}>${e.earnedAmount.toFixed(2)}</${L.xmlEarnings}>
  </${L.xmlEntry}>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${L.xmlRoot} ${L.xmlUser}="${xmlEscape(username)}">\n${items}\n</${L.xmlRoot}>\n`;
}

async function buildXlsx(entries, username, lang, res) {
  const L = labelsFor(lang);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arbeitszeit-App';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(L.sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: L.date, key: 'date', width: 14 },
    { header: L.start, key: 'start', width: 10 },
    { header: L.end, key: 'end', width: 10 },
    { header: L.breakMin, key: 'breakMinutes', width: 13 },
    { header: L.workedHours, key: 'workedHours', width: 16 },
    { header: L.earnings, key: 'earnedAmount', width: 16 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  let totalMinutes = 0;
  let totalEarned = 0;

  for (const e of entries) {
    totalMinutes += e.workedMinutes;
    totalEarned += e.earnedAmount;
    const row = sheet.addRow({
      date: e.date,
      start: e.start,
      end: e.end,
      breakMinutes: e.breakMinutes,
      workedHours: e.workedMinutes / 60,
      earnedAmount: e.earnedAmount,
    });
    row.getCell('workedHours').numFmt = '0.00 "h"';
    row.getCell('earnedAmount').numFmt = '#,##0.00 "€"';
  }

  const totalsRow = sheet.addRow({
    date: L.sum,
    start: '',
    end: '',
    breakMinutes: '',
    workedHours: totalMinutes / 60,
    earnedAmount: totalEarned,
  });
  totalsRow.font = { bold: true };
  totalsRow.getCell('workedHours').numFmt = '0.00 "h"';
  totalsRow.getCell('earnedAmount').numFmt = '#,##0.00 "€"';

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
  });

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { buildCsv, buildXml, buildXlsx };
