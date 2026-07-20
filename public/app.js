(() => {
  const el = (id) => document.getElementById(id);
  const t = window.i18n.t;

  const els = {
    langSelect: el('langSelect'),
    themeSelect: el('themeSelect'),

    authView: el('authView'),
    appView: el('appView'),
    authAlert: el('authAlert'),
    appAlert: el('appAlert'),
    tabLogin: el('tabLogin'),
    tabRegister: el('tabRegister'),
    loginForm: el('loginForm'),
    registerForm: el('registerForm'),
    loginUsername: el('loginUsername'),
    loginPassword: el('loginPassword'),
    registerUsername: el('registerUsername'),
    registerPassword: el('registerPassword'),

    currentUsername: el('currentUsername'),
    logoutBtn: el('logoutBtn'),
    changePasswordBtn: el('changePasswordBtn'),
    changePasswordCard: el('changePasswordCard'),
    changePasswordForm: el('changePasswordForm'),
    cancelChangePassword: el('cancelChangePassword'),
    currentPassword: el('currentPassword'),
    newPassword: el('newPassword'),

    apiTokenBtn: el('apiTokenBtn'),
    apiTokenCard: el('apiTokenCard'),
    apiTokenStatus: el('apiTokenStatus'),
    apiTokenResult: el('apiTokenResult'),
    apiTokenValue: el('apiTokenValue'),
    apiTokenUsage: el('apiTokenUsage'),
    apiTokenGenerateBtn: el('apiTokenGenerateBtn'),
    apiTokenRevokeBtn: el('apiTokenRevokeBtn'),
    closeApiTokenCard: el('closeApiTokenCard'),

    setupCard: el('setupCard'),
    startTime: el('startTime'),
    duration: el('duration'),
    breakStart: el('breakStart'),
    breakMinutes: el('breakMinutes'),
    salaryAmount: el('salaryAmount'),
    weeklyHours: el('weeklyHours'),
    nightSurchargePercent: el('nightSurchargePercent'),
    sundaySurchargePercent: el('sundaySurchargePercent'),
    holidaySurchargePercent: el('holidaySurchargePercent'),
    highHolidaySurchargePercent: el('highHolidaySurchargePercent'),
    saveSettingsBtn: el('saveSettingsBtn'),
    startBtn: el('startBtn'),
    notifyToggle: el('notifyToggle'),

    statusCard: el('statusCard'),
    countdown: el('countdown'),
    feierabendTime: el('feierabendTime'),
    progressFill: el('progressFill'),
    finishBtn: el('finishBtn'),
    cancelBtn: el('cancelBtn'),

    earningsCard: el('earningsCard'),
    earnedAmount: el('earnedAmount'),
    breakNote: el('breakNote'),
    hourlyRate: el('hourlyRate'),
    toggleMoneyBtn: el('toggleMoneyBtn'),

    overviewCard: el('overviewCard'),
    balanceValue: el('balanceValue'),
    weekValue: el('weekValue'),
    monthValue: el('monthValue'),

    historyBody: el('historyBody'),
    historyEmpty: el('historyEmpty'),
    exportCsv: el('exportCsv'),
    exportXml: el('exportXml'),
    exportXlsx: el('exportXlsx'),
    excludeEarningsExport: el('excludeEarningsExport'),
  };

  let settings = null;
  let tickInterval = null;
  let notifiedThisSession = false;

  async function api(path, options = {}) {
    const res = await fetch('/api' + path, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.message) || t('err_generic'));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const ALERT_AUTO_HIDE_MS = 10000;
  const alertTimers = new WeakMap();

  function showAlert(container, message, type = 'error') {
    const existingTimer = alertTimers.get(container);
    if (existingTimer) clearTimeout(existingTimer);

    container.innerHTML = `<div class="alert${type === 'success' ? ' success' : ''}">${message}</div>`;

    if (type === 'success') {
      const timerId = setTimeout(() => clearAlert(container), ALERT_AUTO_HIDE_MS);
      alertTimers.set(container, timerId);
    } else {
      alertTimers.delete(container);
    }
  }

  function showError(container, err) {
    showAlert(container, window.i18n.localizeError(err.data, err.message));
  }

  function clearAlert(container) {
    const existingTimer = alertTimers.get(container);
    if (existingTimer) {
      clearTimeout(existingTimer);
      alertTimers.delete(container);
    }
    container.innerHTML = '';
  }

  function getSalaryType() {
    return document.querySelector('input[name="salaryType"]:checked').value;
  }

  function setSalaryType(type) {
    document.querySelector(`input[name="salaryType"][value="${type}"]`).checked = true;
  }

  // --- Theme ---

  const THEME_KEY = 'arbeitszeit.theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function effectiveTheme() {
    return getStoredTheme() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* ignore */
    }
  }

  els.themeSelect.value = effectiveTheme();
  els.themeSelect.addEventListener('change', () => setTheme(els.themeSelect.value));

  // --- Hide/show earnings (privacy) ---

  const MONEY_HIDDEN_KEY = 'arbeitszeit.hideMoney';
  const MASK = '••••••';

  const EYE_OPEN_SVG =
    '<svg viewBox="0 0 24 16" width="20" height="14"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M12 1C5 1 0 8 0 8s5 7 12 7 12-7 12-7-5-7-12-7zm0 10a3 3 0 100-6 3 3 0 000 6zm0-2a1 1 0 110-2 1 1 0 010 2z"/></svg>';
  const EYE_CLOSED_SVG =
    '<svg viewBox="0 0 24 16" width="20" height="14"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M12 1C5 1 0 8 0 8s5 7 12 7 12-7 12-7-5-7-12-7zm0 10a3 3 0 100-6 3 3 0 000 6zm0-2a1 1 0 110-2 1 1 0 010 2z"/><line x1="1" y1="1" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  let moneyHidden = false;
  try {
    moneyHidden = localStorage.getItem(MONEY_HIDDEN_KEY) === '1';
  } catch (e) {
    /* ignore */
  }

  function renderMoneyToggle() {
    els.toggleMoneyBtn.innerHTML = moneyHidden ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
    els.toggleMoneyBtn.title = moneyHidden ? t('showMoney') : t('hideMoney');
  }

  function maskMoney(formatted) {
    return moneyHidden ? MASK : formatted;
  }

  els.toggleMoneyBtn.addEventListener('click', () => {
    moneyHidden = !moneyHidden;
    try {
      localStorage.setItem(MONEY_HIDDEN_KEY, moneyHidden ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
    renderMoneyToggle();
    tick();
    if (!els.appView.hidden) loadHistory();
  });

  renderMoneyToggle();

  // --- Browser notification on Feierabend ---

  const NOTIFY_KEY = 'arbeitszeit.notify';

  function initNotifyToggle() {
    els.notifyToggle.checked =
      localStorage.getItem(NOTIFY_KEY) === '1' && 'Notification' in window && Notification.permission === 'granted';
  }

  els.notifyToggle.addEventListener('change', async () => {
    if (!els.notifyToggle.checked) {
      try {
        localStorage.setItem(NOTIFY_KEY, '0');
      } catch (e) {
        /* ignore */
      }
      return;
    }
    if (!('Notification' in window)) {
      els.notifyToggle.checked = false;
      return;
    }
    // Some Chromium-based browsers (Opera included) silently refuse to even
    // show the permission prompt on insecure (non-HTTPS) origins, or once a
    // site was denied before - requestPermission() then just resolves to
    // 'denied' with no dialog. Skip the pointless call in the known case.
    if (Notification.permission === 'denied') {
      els.notifyToggle.checked = false;
      showAlert(els.appAlert, t('notifyPermissionDenied'));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        localStorage.setItem(NOTIFY_KEY, '1');
      } catch (e) {
        /* ignore */
      }
    } else {
      els.notifyToggle.checked = false;
      showAlert(els.appAlert, t('notifyPermissionDenied'));
    }
  });

  function maybeNotifyQuittingTime() {
    if (localStorage.getItem(NOTIFY_KEY) !== '1') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(t('quittingTimeDone'), { body: els.feierabendTime.textContent });
  }

  // --- Language ---

  els.langSelect.value = window.i18n.getLang();
  els.langSelect.addEventListener('change', () => window.i18n.setLang(els.langSelect.value));

  document.addEventListener('i18n:change', () => {
    renderMoneyToggle();
    tick();
    if (!els.appView.hidden) loadHistory();
  });

  // --- Auth view ---

  els.tabLogin.addEventListener('click', () => {
    els.tabLogin.classList.add('active');
    els.tabRegister.classList.remove('active');
    els.loginForm.hidden = false;
    els.registerForm.hidden = true;
    clearAlert(els.authAlert);
  });

  els.tabRegister.addEventListener('click', () => {
    els.tabRegister.classList.add('active');
    els.tabLogin.classList.remove('active');
    els.registerForm.hidden = false;
    els.loginForm.hidden = true;
    clearAlert(els.authAlert);
  });

  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(els.authAlert);
    try {
      const data = await api('/login', {
        method: 'POST',
        body: { username: els.loginUsername.value, password: els.loginPassword.value },
      });
      await enterApp(data.username);
    } catch (err) {
      showError(els.authAlert, err);
    }
  });

  els.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(els.authAlert);
    try {
      const data = await api('/register', {
        method: 'POST',
        body: { username: els.registerUsername.value, password: els.registerPassword.value },
      });
      await enterApp(data.username);
    } catch (err) {
      showError(els.authAlert, err);
    }
  });

  els.logoutBtn.addEventListener('click', async () => {
    await api('/logout', { method: 'POST' });
    stopTicking();
    settings = null;
    els.appView.hidden = true;
    els.authView.hidden = false;
    els.loginForm.reset();
    els.registerForm.reset();
  });

  // --- Change password ---

  els.changePasswordBtn.addEventListener('click', () => {
    els.changePasswordCard.hidden = false;
    els.changePasswordCard.scrollIntoView({ behavior: 'smooth' });
  });

  els.cancelChangePassword.addEventListener('click', () => {
    els.changePasswordCard.hidden = true;
    els.changePasswordForm.reset();
  });

  els.changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(els.appAlert);
    try {
      await api('/change-password', {
        method: 'POST',
        body: { currentPassword: els.currentPassword.value, newPassword: els.newPassword.value },
      });
      els.changePasswordCard.hidden = true;
      els.changePasswordForm.reset();
      showAlert(els.appAlert, t('passwordChanged'), 'success');
    } catch (err) {
      showError(els.appAlert, err);
    }
  });

  // --- API token for Shortcuts / NFC ---

  async function refreshApiTokenStatus() {
    const status = await api('/token/status');
    if (status.active) {
      els.apiTokenStatus.textContent = t('apiTokenActiveSince', {
        date: new Date(status.createdAt).toLocaleDateString(window.i18n.locale()),
      });
      els.apiTokenRevokeBtn.hidden = false;
      els.apiTokenGenerateBtn.textContent = t('apiTokenRegenerate');
    } else {
      els.apiTokenStatus.textContent = t('apiTokenNone');
      els.apiTokenRevokeBtn.hidden = true;
      els.apiTokenGenerateBtn.textContent = t('apiTokenGenerate');
    }
  }

  els.apiTokenBtn.addEventListener('click', async () => {
    els.apiTokenCard.hidden = false;
    els.apiTokenResult.hidden = true;
    els.apiTokenCard.scrollIntoView({ behavior: 'smooth' });
    try {
      await refreshApiTokenStatus();
    } catch (err) {
      showError(els.appAlert, err);
    }
  });

  els.closeApiTokenCard.addEventListener('click', () => {
    els.apiTokenCard.hidden = true;
  });

  els.apiTokenGenerateBtn.addEventListener('click', async () => {
    clearAlert(els.appAlert);
    try {
      const data = await api('/token/generate', { method: 'POST' });
      els.apiTokenValue.value = data.token;
      els.apiTokenUsage.textContent = [
        t('apiTokenUsageIntro'),
        'Method: POST',
        `URL: ${window.location.origin}/api/toggle`,
        `Header: Authorization: Bearer ${data.token}`,
      ].join('\n');
      els.apiTokenResult.hidden = false;
      await refreshApiTokenStatus();
      showAlert(els.appAlert, t('apiTokenGenerated'), 'success');
    } catch (err) {
      showError(els.appAlert, err);
    }
  });

  els.apiTokenValue.addEventListener('click', () => els.apiTokenValue.select());

  els.apiTokenRevokeBtn.addEventListener('click', async () => {
    if (!confirm(t('apiTokenRevokeConfirm'))) return;
    clearAlert(els.appAlert);
    try {
      await api('/token/revoke', { method: 'POST' });
      els.apiTokenResult.hidden = true;
      await refreshApiTokenStatus();
      showAlert(els.appAlert, t('apiTokenRevoked'), 'success');
    } catch (err) {
      showError(els.appAlert, err);
    }
  });

  // --- Settings / workday ---

  function fillSettingsForm(s) {
    els.duration.value = s.duration;
    els.breakStart.value = s.breakStart;
    els.breakMinutes.value = s.breakMinutes;
    els.salaryAmount.value = s.salaryAmount || '';
    els.weeklyHours.value = s.weeklyHours;
    els.nightSurchargePercent.value = s.nightSurchargePercent;
    els.sundaySurchargePercent.value = s.sundaySurchargePercent;
    els.holidaySurchargePercent.value = s.holidaySurchargePercent;
    els.highHolidaySurchargePercent.value = s.highHolidaySurchargePercent;
    setSalaryType(s.salaryType);
    if (!s.active) {
      const now = new Date();
      els.startTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }

  function readSettingsForm() {
    return {
      duration: parseFloat(els.duration.value) || 0,
      breakStart: els.breakStart.value || '12:00',
      breakMinutes: parseFloat(els.breakMinutes.value) || 0,
      salaryType: getSalaryType(),
      salaryAmount: parseFloat(els.salaryAmount.value) || 0,
      weeklyHours: parseFloat(els.weeklyHours.value) || 1,
      nightSurchargePercent: parseFloat(els.nightSurchargePercent.value) || 0,
      sundaySurchargePercent: parseFloat(els.sundaySurchargePercent.value) || 0,
      holidaySurchargePercent: parseFloat(els.holidaySurchargePercent.value) || 0,
      highHolidaySurchargePercent: parseFloat(els.highHolidaySurchargePercent.value) || 0,
    };
  }

  els.saveSettingsBtn.addEventListener('click', async () => {
    clearAlert(els.appAlert);
    try {
      await api('/settings', { method: 'PUT', body: readSettingsForm() });
      showAlert(els.appAlert, t('settingsSaved'), 'success');
    } catch (err) {
      showError(els.appAlert, err);
    }
  });

  els.startBtn.addEventListener('click', async () => {
    clearAlert(els.appAlert);
    try {
      await api('/settings', { method: 'PUT', body: readSettingsForm() });
      settings = await api('/workday/start', { method: 'POST', body: { startTime: els.startTime.value } });
      renderWorkdayState();
    } catch (err) {
      showError(els.appAlert, err);
    }
  });

  els.cancelBtn.addEventListener('click', async () => {
    settings = await api('/workday/cancel', { method: 'POST' });
    renderWorkdayState();
  });

  els.finishBtn.addEventListener('click', async () => {
    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const entry = await api('/workday/finish', { method: 'POST', body: { endTime } });
    settings.active = null;
    fillSettingsForm(settings);
    renderWorkdayState();
    await loadHistory();
    showAlert(
      els.appAlert,
      t('dayCompleted', { duration: formatHM(entry.workedMinutes), amount: maskMoney(formatMoney(entry.earnedAmount)) }),
      'success'
    );
  });

  function renderWorkdayState() {
    const active = !!(settings && settings.active);
    els.setupCard.hidden = active;
    els.statusCard.hidden = !active;
    els.earningsCard.hidden = !active;
    if (active) {
      notifiedThisSession = false;
      startTicking();
    } else {
      stopTicking();
    }
  }

  // --- Live countdown / earnings ---

  function getStartDate(dateStr, hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function formatMoney(value) {
    return value.toLocaleString(window.i18n.locale(), { style: 'currency', currency: 'EUR' });
  }

  function formatHM(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}:${String(m).padStart(2, '0')} h`;
  }

  function hourlyRateFor(s) {
    const amount = s.salaryAmount || 0;
    const weeklyHours = s.weeklyHours || 1;
    return s.salaryType === 'yearly' ? amount / (weeklyHours * 52) : amount / (weeklyHours * 4.33);
  }

  function tick() {
    if (!settings || !settings.active) return;
    const { date, start } = settings.active;
    const now = new Date();
    const startD = getStartDate(date, start);
    const durationMs = settings.duration * 3600000;
    const breakMs = (settings.breakMinutes || 0) * 60000;

    let breakStart = getStartDate(date, settings.breakStart);
    if (breakStart < startD) breakStart = new Date(startD.getTime());
    const breakEnd = new Date(breakStart.getTime() + breakMs);

    const feierabend = new Date(startD.getTime() + durationMs + breakMs);
    const remaining = feierabend - now;

    els.countdown.textContent = remaining > 0 ? formatDuration(remaining) : t('quittingTimeDone');
    els.countdown.classList.toggle('done', remaining <= 0);
    els.feierabendTime.textContent = feierabend.toLocaleTimeString(window.i18n.locale(), { hour: '2-digit', minute: '2-digit' });

    if (remaining <= 0 && !notifiedThisSession) {
      notifiedThisSession = true;
      maybeNotifyQuittingTime();
    }

    const totalWindowMs = durationMs + breakMs;
    const rawElapsedMs = Math.min(Math.max(now - startD, 0), totalWindowMs);
    const progressPct = totalWindowMs > 0 ? (rawElapsedMs / totalWindowMs) * 100 : 0;
    els.progressFill.style.width = progressPct + '%';

    let workedMs;
    if (now <= breakStart) {
      workedMs = Math.max(now - startD, 0);
    } else if (now < breakEnd) {
      workedMs = breakStart - startD;
    } else {
      workedMs = now - startD - breakMs;
    }
    workedMs = Math.max(workedMs, 0);

    const inBreak = now > breakStart && now < breakEnd;
    els.breakNote.textContent = inBreak ? t('breakRunning') : '';

    const rate = hourlyRateFor(settings);
    const earned = rate * (workedMs / 3600000);
    els.earnedAmount.textContent = maskMoney(formatMoney(earned));
    els.earnedAmount.classList.toggle('masked', moneyHidden);
    els.hourlyRate.textContent = maskMoney(rate.toFixed(2));
  }

  function startTicking() {
    stopTicking();
    tick();
    tickInterval = setInterval(tick, 1000);
  }

  function stopTicking() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
  }

  // --- Übersicht: Gleitzeitkonto + Woche/Monat ---

  function startOfWeek(d) {
    const date = new Date(d);
    const dayIndex = (date.getDay() + 6) % 7; // 0 = Monday
    date.setDate(date.getDate() - dayIndex);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function computeOverview(entries) {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let balanceMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;

    for (const e of entries) {
      const planned = e.plannedMinutes ?? e.workedMinutes;
      balanceMinutes += e.workedMinutes - planned;

      const entryDate = new Date(`${e.date}T00:00:00`);
      if (entryDate >= weekStart) weekMinutes += e.workedMinutes;
      if (e.date.startsWith(monthPrefix)) monthMinutes += e.workedMinutes;
    }

    return { balanceMinutes, weekMinutes, monthMinutes };
  }

  function renderOverview(entries) {
    if (entries.length === 0) {
      els.overviewCard.hidden = true;
      return;
    }
    els.overviewCard.hidden = false;
    const o = computeOverview(entries);

    const sign = o.balanceMinutes >= 0 ? '+' : '−';
    els.balanceValue.textContent = `${sign}${formatHM(Math.round(Math.abs(o.balanceMinutes)))}`;
    els.balanceValue.className = 'overview-value ' + (o.balanceMinutes >= 0 ? 'positive' : 'negative');

    els.weekValue.textContent = formatHM(o.weekMinutes);
    els.monthValue.textContent = formatHM(o.monthMinutes);
  }

  // --- History ---

  const SURCHARGE_TYPES = ['none', 'night', 'sunday', 'holiday', 'highHoliday'];
  const SURCHARGE_LABEL_KEYS = {
    none: 'surchargeNone',
    night: 'surchargeNight',
    sunday: 'surchargeSunday',
    holiday: 'surchargeHoliday',
    highHoliday: 'surchargeHighHoliday',
  };

  function surchargeOptionsHtml(selected) {
    return SURCHARGE_TYPES.map(
      (type) => `<option value="${type}"${type === selected ? ' selected' : ''}>${t(SURCHARGE_LABEL_KEYS[type])}</option>`
    ).join('');
  }

  function renderRow(entry) {
    const surchargeType = entry.surchargeType || 'none';
    const badge =
      surchargeType !== 'none' ? `<span class="surcharge-badge">${t(SURCHARGE_LABEL_KEYS[surchargeType])}</span>` : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.start}</td>
      <td>${entry.end}</td>
      <td class="num">${entry.breakMinutes} min</td>
      <td class="num">${formatHM(entry.workedMinutes)}</td>
      <td class="num${moneyHidden ? ' masked' : ''}">${maskMoney(formatMoney(entry.earnedAmount))}${badge}</td>
      <td>
        <div class="row-actions">
          <button class="edit-btn" title="${t('editEntry')}" data-id="${entry.id}">✎</button>
          <button class="del-btn" title="${t('deleteEntry')}" data-id="${entry.id}">✕</button>
        </div>
      </td>
    `;
    tr.querySelector('.edit-btn').addEventListener('click', () => startEditRow(tr, entry));
    tr.querySelector('.del-btn').addEventListener('click', async () => {
      if (!confirm(t('confirmDeleteEntry'))) return;
      await api(`/worklog/${entry.id}`, { method: 'DELETE' });
      loadHistory();
    });
    return tr;
  }

  function startEditRow(tr, entry) {
    tr.innerHTML = `
      <td><input type="date" class="edit-date" value="${entry.date}"></td>
      <td><input type="time" class="edit-start" value="${entry.start}"></td>
      <td><input type="time" class="edit-end" value="${entry.end}"></td>
      <td class="num"><input type="number" class="edit-break" min="0" step="5" value="${entry.breakMinutes}"></td>
      <td class="num"></td>
      <td><select class="edit-surcharge" title="${t('surchargeType')}">${surchargeOptionsHtml(entry.surchargeType || 'none')}</select></td>
      <td>
        <div class="row-actions">
          <button class="save-edit-btn" title="${t('save')}">✓</button>
          <button class="cancel-edit-btn" title="${t('cancel')}">✕</button>
        </div>
      </td>
    `;
    tr.querySelector('.save-edit-btn').addEventListener('click', async () => {
      const body = {
        date: tr.querySelector('.edit-date').value,
        start: tr.querySelector('.edit-start').value,
        end: tr.querySelector('.edit-end').value,
        breakMinutes: parseFloat(tr.querySelector('.edit-break').value) || 0,
        surchargeType: tr.querySelector('.edit-surcharge').value,
      };
      clearAlert(els.appAlert);
      try {
        await api(`/worklog/${entry.id}`, { method: 'PATCH', body });
        showAlert(els.appAlert, t('entryUpdated'), 'success');
        loadHistory();
      } catch (err) {
        showError(els.appAlert, err);
      }
    });
    tr.querySelector('.cancel-edit-btn').addEventListener('click', () => loadHistory());
  }

  async function loadHistory() {
    const entries = await api('/worklog');
    els.historyBody.innerHTML = '';
    els.historyEmpty.hidden = entries.length > 0;
    for (const entry of entries) {
      els.historyBody.appendChild(renderRow(entry));
    }
    renderOverview(entries);
  }

  function exportUrl(format) {
    const hideEarnings = els.excludeEarningsExport.checked ? '1' : '0';
    return `/api/export?format=${format}&lang=${window.i18n.getLang()}&hideEarnings=${hideEarnings}`;
  }

  els.exportCsv.addEventListener('click', () => {
    window.location.href = exportUrl('csv');
  });
  els.exportXml.addEventListener('click', () => {
    window.location.href = exportUrl('xml');
  });
  els.exportXlsx.addEventListener('click', () => {
    window.location.href = exportUrl('xlsx');
  });

  // --- Bootstrap ---

  async function enterApp(username) {
    els.authView.hidden = true;
    els.appView.hidden = false;
    els.currentUsername.textContent = username;
    initNotifyToggle();
    settings = await api('/settings');
    fillSettingsForm(settings);
    renderWorkdayState();
    await loadHistory();
  }

  async function init() {
    window.i18n.applyStaticTranslations();
    try {
      const me = await api('/me');
      await enterApp(me.username);
    } catch (e) {
      els.authView.hidden = false;
      els.appView.hidden = true;
    }
  }

  init();
})();
