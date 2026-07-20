const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

const PORT = process.env.PORT || 3000;
let sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('SESSION_SECRET ist nicht gesetzt. Bitte in der .env definieren.');
    process.exit(1);
  }
  console.warn('SESSION_SECRET nicht gesetzt - verwende eine zufaellige (nur fuer lokale Entwicklung).');
  sessionSecret = crypto.randomBytes(32).toString('hex');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(
  session({
    name: 'arbeitszeit.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // app is served over plain HTTP on the local network
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use('/api', authRoutes);
app.use('/api', dataRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Arbeitszeit-App laeuft auf Port ${PORT}`);
});
