const ExcelJS = require('exceljs');

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

function buildCsv(entries) {
  const header = ['Datum', 'Start', 'Ende', 'Pause (Min)', 'Gearbeitet (Std)', 'Gearbeitet (Min)', 'Verdienst (EUR)'];
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

function buildXml(entries, username) {
  const items = entries
    .map(
      (e) => `  <eintrag>
    <datum>${xmlEscape(e.date)}</datum>
    <start>${xmlEscape(e.start)}</start>
    <ende>${xmlEscape(e.end)}</ende>
    <pause_minuten>${e.breakMinutes}</pause_minuten>
    <gearbeitete_minuten>${e.workedMinutes}</gearbeitete_minuten>
    <verdienst_eur>${e.earnedAmount.toFixed(2)}</verdienst_eur>
  </eintrag>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<arbeitszeit-protokoll benutzer="${xmlEscape(username)}">\n${items}\n</arbeitszeit-protokoll>\n`;
}

async function buildXlsx(entries, username, res) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arbeitszeit-App';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Arbeitszeit', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Datum', key: 'date', width: 14 },
    { header: 'Start', key: 'start', width: 10 },
    { header: 'Ende', key: 'end', width: 10 },
    { header: 'Pause (Min)', key: 'breakMinutes', width: 13 },
    { header: 'Gearbeitet (Std)', key: 'workedHours', width: 16 },
    { header: 'Verdienst (EUR)', key: 'earnedAmount', width: 16 },
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
    date: 'Summe',
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
