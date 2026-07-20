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

    setupCard: el('setupCard'),
    startTime: el('startTime'),
    duration: el('duration'),
    breakStart: el('breakStart'),
    breakMinutes: el('breakMinutes'),
    salaryAmount: el('salaryAmount'),
    weeklyHours: el('weeklyHours'),
    saveSettingsBtn: el('saveSettingsBtn'),
    startBtn: el('startBtn'),

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

    historyBody: el('historyBody'),
    historyEmpty: el('historyEmpty'),
    exportCsv: el('exportCsv'),
    exportXml: el('exportXml'),
    exportXlsx: el('exportXlsx'),
  };

  let settings = null;
  let tickInterval = null;

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

  function showAlert(container, message, type = 'error') {
    container.innerHTML = `<div class="alert${type === 'success' ? ' success' : ''}">${message}</div>`;
  }

  function showError(container, err) {
    showAlert(container, window.i18n.localizeError(err.data, err.message));
  }

  function clearAlert(container) {
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

  // --- Language ---

  els.langSelect.value = window.i18n.getLang();
  els.langSelect.addEventListener('change', () => window.i18n.setLang(els.langSelect.value));

  document.addEventListener('i18n:change', () => {
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

  // --- Settings / workday ---

  function fillSettingsForm(s) {
    els.duration.value = s.duration;
    els.breakStart.value = s.breakStart;
    els.breakMinutes.value = s.breakMinutes;
    els.salaryAmount.value = s.salaryAmount || '';
    els.weeklyHours.value = s.weeklyHours;
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
      t('dayCompleted', { duration: formatHM(entry.workedMinutes), amount: formatMoney(entry.earnedAmount) }),
      'success'
    );
  });

  function renderWorkdayState() {
    const active = !!(settings && settings.active);
    els.setupCard.hidden = active;
    els.statusCard.hidden = !active;
    els.earningsCard.hidden = !active;
    if (active) {
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
    els.earnedAmount.textContent = formatMoney(earned);
    els.hourlyRate.textContent = rate.toFixed(2);
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

  // --- History ---

  async function loadHistory() {
    const entries = await api('/worklog');
    els.historyBody.innerHTML = '';
    els.historyEmpty.hidden = entries.length > 0;
    for (const entry of entries) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.start}</td>
        <td>${entry.end}</td>
        <td class="num">${entry.breakMinutes} min</td>
        <td class="num">${formatHM(entry.workedMinutes)}</td>
        <td class="num">${formatMoney(entry.earnedAmount)}</td>
        <td><button class="del-btn" title="${t('deleteEntry')}" data-id="${entry.id}">✕</button></td>
      `;
      els.historyBody.appendChild(tr);
    }
    els.historyBody.querySelectorAll('.del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(t('confirmDeleteEntry'))) return;
        await api(`/worklog/${btn.dataset.id}`, { method: 'DELETE' });
        loadHistory();
      });
    });
  }

  els.exportCsv.addEventListener('click', () => {
    window.location.href = `/api/export?format=csv&lang=${window.i18n.getLang()}`;
  });
  els.exportXml.addEventListener('click', () => {
    window.location.href = `/api/export?format=xml&lang=${window.i18n.getLang()}`;
  });
  els.exportXlsx.addEventListener('click', () => {
    window.location.href = `/api/export?format=xlsx&lang=${window.i18n.getLang()}`;
  });

  // --- Bootstrap ---

  async function enterApp(username) {
    els.authView.hidden = true;
    els.appView.hidden = false;
    els.currentUsername.textContent = username;
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
