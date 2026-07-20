window.i18n = (function () {
  const STORAGE_KEY = 'arbeitszeit.lang';

  const translations = {
    de: {
      themeLight: 'Hell',
      themeDark: 'Dunkel',
      themePcb: 'Platine',

      tabLogin: 'Anmelden',
      tabRegister: 'Registrieren',
      username: 'Benutzername',
      password: 'Passwort',
      passwordMin: 'Passwort (mind. 8 Zeichen)',
      loginSubmit: 'Anmelden',
      registerSubmit: 'Konto erstellen',

      loggedInAs: 'Angemeldet als',
      changePassword: 'Passwort ändern',
      logout: 'Abmelden',
      currentPassword: 'Aktuelles Passwort',
      newPasswordMin: 'Neues Passwort (mind. 8 Zeichen)',
      save: 'Speichern',
      cancel: 'Abbrechen',

      settings: 'Einstellungen',
      workStart: 'Arbeitsbeginn',
      workDuration: 'Arbeitsdauer (Stunden, ohne Pause)',
      break: 'Pause',
      breakFrom: 'Pause ab',
      breakDuration: 'Pausendauer (Minuten)',
      salary: 'Gehalt',
      monthlySalary: 'Monatsgehalt',
      yearlySalary: 'Jahresgehalt',
      salaryAmount: 'Betrag (€ brutto)',
      salaryAmountPlaceholder: 'z.B. 3500',
      weeklyHours: 'Vertragliche Wochenstunden',
      saveSettings: 'Einstellungen speichern',
      startWorkday: 'Arbeitstag starten',

      untilQuittingTime: 'Bis Feierabend',
      quittingTimeAt: 'Feierabend um',
      quittingTimeSuffix: 'Uhr (inkl. Pause)',
      quittingTimeDone: 'Feierabend! 🎉',
      finishWorkday: 'Tag abschließen',
      discard: 'Verwerfen',

      earningsToday: 'Verdienst heute',
      hourlyRate: 'Stundenlohn:',
      breakRunning: 'Pause läuft – kein Verdienst',

      log: 'Protokoll',
      date: 'Datum',
      start: 'Start',
      end: 'Ende',
      worked: 'Gearbeitet',
      earnings: 'Verdienst',
      noEntries: 'Noch keine Einträge.',
      exportCsv: 'CSV exportieren',
      exportXml: 'XML exportieren',
      exportXlsx: 'Excel exportieren',
      excludeEarningsExport: 'Verdienst im Export ausblenden',
      deleteEntry: 'Löschen',
      editEntry: 'Bearbeiten',
      confirmDeleteEntry: 'Diesen Eintrag wirklich löschen?',

      overview: 'Übersicht',
      overtimeBalance: 'Gleitzeitkonto',
      thisWeek: 'Diese Woche',
      thisMonth: 'Dieser Monat',

      notifyOnFinish: 'Browser-Benachrichtigung bei Feierabend',
      notifyPermissionDenied: 'Benachrichtigungen konnten nicht aktiviert werden. Manche Browser (u.a. Opera) fragen dafür auf unverschlüsselten Seiten wie dieser hier gar nicht erst nach. Bitte in den Website-Einstellungen deines Browsers manuell erlauben (z.B. über das Schloss-/Info-Symbol in der Adressleiste → Berechtigungen → Benachrichtigungen).',

      hideMoney: 'Verdienst ausblenden',
      showMoney: 'Verdienst einblenden',

      settingsSaved: 'Einstellungen gespeichert.',
      passwordChanged: 'Passwort geändert.',
      dayCompleted: 'Tag gespeichert: {duration} gearbeitet, {amount} verdient.',
      entryUpdated: 'Eintrag aktualisiert.',

      err_invalid_username: 'Benutzername muss 3-32 Zeichen lang sein (Buchstaben, Zahlen, _ oder -).',
      err_invalid_password: 'Passwort muss mindestens 8 Zeichen lang sein.',
      err_username_taken: 'Benutzername bereits vergeben.',
      err_invalid_request: 'Ungültige Anfrage.',
      err_too_many_attempts: 'Zu viele Fehlversuche. Bitte in {seconds}s erneut versuchen.',
      err_invalid_credentials: 'Benutzername oder Passwort falsch.',
      err_decrypt_error: 'Entschlüsselung fehlgeschlagen.',
      err_session_error: 'Sitzungsfehler, bitte erneut versuchen.',
      err_not_authenticated: 'Bitte erneut anmelden.',
      err_invalid_duration: 'Ungültige Arbeitsdauer.',
      err_invalid_break_minutes: 'Ungültige Pausendauer.',
      err_invalid_weekly_hours: 'Ungültige Wochenstunden.',
      err_invalid_salary_amount: 'Ungültiger Gehaltsbetrag.',
      err_no_active_workday: 'Kein laufender Arbeitstag.',
      err_invalid_format: 'Ungültiges Exportformat.',
      err_not_found: 'Eintrag nicht gefunden.',
      err_generic: 'Ein Fehler ist aufgetreten.',
    },
    en: {
      themeLight: 'Light',
      themeDark: 'Dark',
      themePcb: 'PCB',

      tabLogin: 'Sign in',
      tabRegister: 'Register',
      username: 'Username',
      password: 'Password',
      passwordMin: 'Password (min. 8 characters)',
      loginSubmit: 'Sign in',
      registerSubmit: 'Create account',

      loggedInAs: 'Signed in as',
      changePassword: 'Change password',
      logout: 'Sign out',
      currentPassword: 'Current password',
      newPasswordMin: 'New password (min. 8 characters)',
      save: 'Save',
      cancel: 'Cancel',

      settings: 'Settings',
      workStart: 'Work start',
      workDuration: 'Work duration (hours, excl. break)',
      break: 'Break',
      breakFrom: 'Break from',
      breakDuration: 'Break duration (minutes)',
      salary: 'Salary',
      monthlySalary: 'Monthly salary',
      yearlySalary: 'Yearly salary',
      salaryAmount: 'Amount (€ gross)',
      salaryAmountPlaceholder: 'e.g. 3500',
      weeklyHours: 'Contractual weekly hours',
      saveSettings: 'Save settings',
      startWorkday: 'Start workday',

      untilQuittingTime: 'Until end of workday',
      quittingTimeAt: 'End of workday at',
      quittingTimeSuffix: '(incl. break)',
      quittingTimeDone: 'Done for the day! 🎉',
      finishWorkday: 'Finish workday',
      discard: 'Discard',

      earningsToday: "Today's earnings",
      hourlyRate: 'Hourly rate:',
      breakRunning: 'Break in progress – no earnings',

      log: 'Log',
      date: 'Date',
      start: 'Start',
      end: 'End',
      worked: 'Worked',
      earnings: 'Earnings',
      noEntries: 'No entries yet.',
      exportCsv: 'Export CSV',
      exportXml: 'Export XML',
      exportXlsx: 'Export Excel',
      excludeEarningsExport: 'Exclude earnings from export',
      deleteEntry: 'Delete',
      editEntry: 'Edit',
      confirmDeleteEntry: 'Really delete this entry?',

      overview: 'Overview',
      overtimeBalance: 'Overtime balance',
      thisWeek: 'This week',
      thisMonth: 'This month',

      notifyOnFinish: 'Browser notification when workday ends',
      notifyPermissionDenied: "Notifications couldn't be enabled. Some browsers (Opera included) won't even show a prompt on non-HTTPS pages like this one. Please allow it manually in your browser's site settings (e.g. via the lock/info icon in the address bar → Permissions → Notifications).",

      hideMoney: 'Hide earnings',
      showMoney: 'Show earnings',

      settingsSaved: 'Settings saved.',
      passwordChanged: 'Password changed.',
      dayCompleted: 'Day saved: {duration} worked, {amount} earned.',
      entryUpdated: 'Entry updated.',

      err_invalid_username: 'Username must be 3-32 characters (letters, numbers, _ or -).',
      err_invalid_password: 'Password must be at least 8 characters long.',
      err_username_taken: 'Username is already taken.',
      err_invalid_request: 'Invalid request.',
      err_too_many_attempts: 'Too many failed attempts. Please try again in {seconds}s.',
      err_invalid_credentials: 'Username or password is incorrect.',
      err_decrypt_error: 'Decryption failed.',
      err_session_error: 'Session error, please try again.',
      err_not_authenticated: 'Please sign in again.',
      err_invalid_duration: 'Invalid work duration.',
      err_invalid_break_minutes: 'Invalid break duration.',
      err_invalid_weekly_hours: 'Invalid weekly hours.',
      err_invalid_salary_amount: 'Invalid salary amount.',
      err_no_active_workday: 'No workday currently running.',
      err_invalid_format: 'Invalid export format.',
      err_not_found: 'Entry not found.',
      err_generic: 'Something went wrong.',
    },
  };

  const localeByLang = { de: 'de-DE', en: 'en-GB' };

  let currentLang = detectInitialLang();

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved]) return saved;
    } catch (e) {
      /* ignore */
    }
    const nav = (navigator.language || 'de').slice(0, 2);
    return translations[nav] ? nav : 'de';
  }

  function t(key, vars) {
    let str = (translations[currentLang] && translations[currentLang][key]) || translations.de[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace(`{${k}}`, vars[k]);
      });
    }
    return str;
  }

  function locale() {
    return localeByLang[currentLang] || 'de-DE';
  }

  function setFirstTextNode(el, text) {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = text;
        return;
      }
    }
    el.textContent = text;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      setFirstTextNode(el, t(el.getAttribute('data-i18n')));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
  }

  function setLang(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* ignore */
    }
    applyStaticTranslations();
    document.dispatchEvent(new CustomEvent('i18n:change'));
  }

  function getLang() {
    return currentLang;
  }

  // Maps an API error response ({ error, message, ...extra }) to a
  // localized string, falling back to the server-provided message.
  function localizeError(data, fallbackMessage) {
    if (data && data.error) {
      const key = 'err_' + data.error;
      const known = translations[currentLang][key] || translations.de[key];
      if (known) {
        return t(key, { seconds: data.retryAfterSeconds });
      }
    }
    return fallbackMessage || t('err_generic');
  }

  return { t, locale, getLang, setLang, applyStaticTranslations, localizeError };
})();
