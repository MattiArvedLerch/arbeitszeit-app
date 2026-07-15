# Arbeitszeit-App

Kleine Web-App zum Tracken der Arbeitszeit: Countdown bis Feierabend
(inkl. Pause) und ein Live-Verdienst-Counter auf Basis von Monats- oder
Jahresgehalt. Alle Daten (Startzeit, Pause, Gehalt) werden lokal im
Browser gespeichert (`localStorage`) – es gibt keinen Server-seitigen
Zustand.

## Lokal mit Docker starten

```bash
docker compose up -d --build
```

Danach ist die App unter [http://localhost:8080](http://localhost:8080)
erreichbar. Port lässt sich in `docker-compose.yml` anpassen.

## Deployment auf dem Raspberry Pi

Auf dem Pi muss nur Docker (inkl. Compose-Plugin) installiert sein. Das
Image wird direkt auf dem Pi gebaut, dadurch ist die Prozessor-Architektur
(ARM) kein Thema.

```bash
git clone <repo-url>
cd arbeitszeit-app
docker compose up -d --build
```

Die App läuft danach dauerhaft im Hintergrund (`restart: unless-stopped`)
und ist im lokalen Netzwerk unter `http://<pi-ip>:8080` erreichbar.

### Update nach Änderungen

```bash
git pull
docker compose up -d --build
```

## Hinweis zu den Daten

Da alle Einstellungen im `localStorage` des jeweiligen Browsers liegen,
sind sie **pro Gerät/Browser separat** – es findet keine Synchronisation
zwischen mehreren Geräten statt.
