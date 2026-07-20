function combine(dateStr, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

// Net worked minutes between start and end, excluding whatever part of the
// configured break window actually falls inside [start, end].
function computeWorkedMinutes(dateStr, startHHMM, endHHMM, breakStartHHMM, breakMinutes) {
  const start = combine(dateStr, startHHMM);
  let end = combine(dateStr, endHHMM);
  if (end <= start) end = new Date(end.getTime() + 24 * 3600000); // overnight shift

  let breakStart = combine(dateStr, breakStartHHMM);
  if (breakStart < start) breakStart = new Date(start.getTime());
  const breakEnd = new Date(breakStart.getTime() + (breakMinutes || 0) * 60000);

  const overlapStart = Math.max(breakStart.getTime(), start.getTime());
  const overlapEnd = Math.min(breakEnd.getTime(), end.getTime());
  const breakOverlapMs = Math.max(0, overlapEnd - overlapStart);

  const totalMs = end.getTime() - start.getTime();
  const workedMs = Math.max(0, totalMs - breakOverlapMs);
  return Math.round(workedMs / 60000);
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

module.exports = { computeWorkedMinutes, todayStr, nowHHMM };
