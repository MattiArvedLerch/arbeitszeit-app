# Arbeitszeit-App

🇬🇧 [English version](README.en.md)

Web-App zum Tracken der Arbeitszeit mit Mehrbenutzer-Login: Countdown bis
Feierabend (inkl. Pause), Live-Verdienst-Counter, ein Protokoll aller
vergangenen Arbeitstage und Export als CSV, XML oder Excel. Die Oberfläche
gibt es auf Deutsch und Englisch, dazu drei Themes (Hell, Dunkel, Platine).

## Sicherheit / Datenschutz

- Passwörter werden nur als bcrypt-Hash gespeichert, nie im Klartext.
- Jeder Nutzer hat einen eigenen zufälligen Datenschlüssel (DEK). Dieser wird
  beim Login aus dem Passwort abgeleitet und ausschließlich im Arbeitsspeicher
  des Servers gehalten (nie auf Platte). Alle Einstellungen und Protokoll-
  Einträge werden mit AES-256-GCM verschlüsselt gespeichert – ohne das
  richtige Passwort sind die Daten eines Nutzers auch mit Zugriff auf die
  Datendatei nicht lesbar.
- Ein Nutzer kann ausschließlich seine eigenen Daten abrufen, ändern,
  löschen oder exportieren.
- Die Datei mit den Passwort-Hashes und verschlüsselten Nutzerdaten
  (`data/db.json`) liegt nur in einem Docker-Volume auf dem Pi und wird
  über `.gitignore`/`.dockerignore` **nicht** ins Repository übernommen.
- Die App läuft nur im lokalen Netzwerk über HTTP (kein Internet-Zugriff,
  kein HTTPS). Für ein rein privates Heimnetz ist das ein akzeptabler
  Kompromiss – bei Bedarf lässt sich später ein Reverse-Proxy mit TLS
  davorsetzen.

## Lokal mit Docker starten

```bash
cp .env.example .env
# In .env einen zufälligen SESSION_SECRET eintragen, z.B.:
openssl rand -hex 32
docker compose up -d --build
```

Danach ist die App unter [http://localhost:8080](http://localhost:8080)
erreichbar.

## Deployment auf dem Raspberry Pi

Auf dem Pi muss nur Docker (inkl. Compose-Plugin) installiert sein. Das
Image wird direkt auf dem Pi gebaut, die Prozessor-Architektur (ARM) ist
dadurch kein Thema.

```bash
git clone <repo-url>
cd arbeitszeit-app
cp .env.example .env
# SESSION_SECRET in .env setzen (siehe oben)
docker compose up -d --build
```

Die App läuft danach dauerhaft im Hintergrund (`restart: unless-stopped`)
und ist im lokalen Netzwerk unter `http://<pi-ip>:8080` erreichbar.

Nutzerdaten liegen im benannten Docker-Volume `arbeitszeit-data` und
überleben damit `docker compose up -d --build`. Ein `docker compose down -v`
löscht dagegen auch das Volume und damit alle Accounts/Protokolle.

### Update nach Änderungen

```bash
git pull
docker compose up -d --build
```

Bestehende Accounts und Protokolle bleiben dabei erhalten (Daten liegen im
Volume, nicht im Image).

## Nutzung

- Registrierung ist offen: jeder mit Zugriff auf die App-URL im Heimnetz
  kann sich selbst ein Konto anlegen.
- Nach dem Login: Einstellungen (Arbeitsdauer, Pause, Gehalt) speichern,
  dann "Arbeitstag starten". Der Countdown und Verdienst-Counter laufen
  live; "Tag abschließen" schreibt den Tag mit der tatsächlichen Endzeit
  ins Protokoll.
- Im Protokoll-Bereich lassen sich vergangene Tage einsehen, einzelne
  Einträge löschen und die komplette Historie als CSV, XML oder Excel
  (mit Formatierung und Summenzeile) exportieren.
- Passwort ändern ist über den Link oben rechts möglich.
- Sprache (DE/EN) und Theme (Hell/Dunkel/Platine) lassen sich oben über die
  zwei Auswahlfelder umschalten; die Wahl wird pro Browser gespeichert und
  gilt auch schon auf dem Login-Bildschirm.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
