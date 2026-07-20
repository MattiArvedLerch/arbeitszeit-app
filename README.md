# Arbeitszeit-App (Work-Time Tracker)

🇩🇪 [Deutsche Version](README.de.md)

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

### Backups

Set up a periodic job on the host that copies the running container's
`data/db.json` (password hashes + encrypted settings/log entries) to
storage that is physically separate from the boot medium (e.g. an
attached USB drive), so a corrupted SD card doesn't take out the backups
with it — e.g. `docker cp arbeitszeit-app:/app/data/db.json <destination>`
on a cron schedule. Kept out of this repository intentionally, since such
a script tends to encode host-specific paths.

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
- "API token" (top right) generates a personal token for triggering
  start/finish from an iOS Shortcut (e.g. via an NFC tag): `POST
  /api/toggle` with header `Authorization: Bearer <token>` starts a
  workday if none is running, or finishes the running one. The token is
  shown once and can be revoked/regenerated at any time; treat it like a
  second password, since it can write to your data without a login
  session.
- **Surcharges (Zuschläge)**: German law only guarantees an "appropriate"
  night-work surcharge (§6 ArbZG, no fixed percentage); Sunday, holiday and
  overtime surcharges depend entirely on your collective/employment
  agreement, not a general legal entitlement. The "Surcharges" section in
  Settings defaults to the tax-free rates under §3b EStG (night 25%,
  Sunday 50%, holiday 125%, high holidays like Christmas/Easter
  Sunday/May 1st 150%) since many agreements mirror them, plus overtime
  at 25% (not covered by §3b, just a common contractual reference point)
  — all five are freely editable. Mark a completed day retroactively via
  its edit (✎) button in the log: check any combination of the five
  categories (holiday and high holiday are mutually exclusive, the rest
  combine freely) — the percentages add up rather than compound and
  recalculate that entry's earnings immediately.

## License

MIT, see [LICENSE](LICENSE).
