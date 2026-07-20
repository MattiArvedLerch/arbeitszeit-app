# Arbeitszeit-App (Work-Time Tracker)

🇩🇪 [Deutsche Version](README.md)

A self-hosted web app for tracking work hours with multi-user login: a
countdown to the end of your workday (including your break), a live
earnings counter, a log of past workdays, and export as CSV, XML or Excel.
The UI is available in German and English, plus three themes (Light, Dark,
PCB).

## Security / privacy

- Passwords are stored only as bcrypt hashes, never in plain text.
- Each user has their own random data-encryption key (DEK). It is derived
  from the password at login time and kept only in the server's memory
  (never written to disk). All settings and log entries are stored
  encrypted with AES-256-GCM — without the correct password, a user's data
  is unreadable even with access to the data file.
- A user can only ever read, change, delete or export their own data.
- The file holding password hashes and encrypted user data
  (`data/db.json`) lives only in a Docker volume on the Pi and is excluded
  from the repository via `.gitignore`/`.dockerignore`.
- The app is served over plain HTTP on the local network only (no internet
  access, no HTTPS). For a private home network that's an acceptable
  trade-off — a reverse proxy with TLS can be added in front of it later
  if needed.

## Run locally with Docker

```bash
cp .env.example .env
# Put a random SESSION_SECRET into .env, e.g.:
openssl rand -hex 32
docker compose up -d --build
```

The app is then reachable at [http://localhost:8080](http://localhost:8080).

## Deploying to a Raspberry Pi

The Pi only needs Docker (with the Compose plugin) installed. The image is
built directly on the Pi, so the processor architecture (ARM) is a
non-issue.

```bash
git clone <repo-url>
cd arbeitszeit-app
cp .env.example .env
# set SESSION_SECRET in .env (see above)
docker compose up -d --build
```

The app then runs permanently in the background (`restart: unless-stopped`)
and is reachable on the local network at `http://<pi-ip>:8080`.

User data lives in the named Docker volume `arbeitszeit-data` and survives
`docker compose up -d --build`. Running `docker compose down -v` does
remove the volume, and with it all accounts/logs.

### Updating after changes

```bash
git pull
docker compose up -d --build
```

Existing accounts and logs are preserved (data lives in the volume, not
in the image).

## Usage

- Registration is open: anyone with access to the app URL on the home
  network can create their own account.
- After logging in: save your settings (work duration, break, salary),
  then click "Start workday". The countdown and earnings counter update
  live; "Finish workday" writes the day to the log with the actual end
  time.
- The log section lets you review past days, delete individual entries,
  and export the full history as CSV, XML or Excel (formatted, with a
  totals row).
- Change your password via the link in the top right.
- Language (DE/EN) and theme (Light/Dark/PCB) can be switched using the
  two dropdowns at the top; the choice is saved per browser and already
  applies on the login screen.

## License

MIT, see [LICENSE](LICENSE).
