# Younes on Tour – App V2

Diese Version ist eine statische Web-App für GitHub Pages. Kein Next.js, keine GitHub Actions, kein Build-Prozess.

## Enthalten

- Dark Adventure Design für Web und Mobile
- Hero-Dashboard mit Radkilometern, Laufkilometern und Abenteuer-Zähler
- automatische Roadmap mit Meilensteinen
- automatischer Fortschrittsbalken
- klickbare Statistik-Karten mit Insights
- klickbare Meilensteine mit Streckeninfos
- klickbare Tour-Karten mit Detailansicht
- klickbare Challenges mit Fortschritt
- GPX-Karten über OpenStreetMap/Leaflet
- Galerie aus Tourbildern
- Adminbereich für:
  - Hero-Titel, Untertext und Hero-Bild
  - Touren
  - Meilensteine
  - Challenges
- Mobile Bottom Navigation
- komplett kostenlos über GitHub Pages + Firebase

## Dateien

Diese Dateien müssen im Root deines GitHub-Repositories liegen:

- `index.html`
- `styles.css`
- `app.js`
- `firebase-config.js`
- `firestore.rules`
- `media/`
- `gpx/`

## Installation

1. Altes Repository sichern.
2. Alte Dateien ersetzen durch die Dateien aus diesem ZIP.
3. Deine funktionierende `firebase-config.js` wieder einsetzen oder die Platzhalter in der neuen Datei ausfüllen.
4. In `firestore.rules` deine Admin-E-Mail einsetzen.
5. Firestore-Regeln in Firebase veröffentlichen.
6. GitHub Pages auf `Deploy from branch`, Branch `main`, Folder `/root` stellen.

## Wichtig zu Firestore-Regeln

In `firestore.rules` diese Stelle ersetzen:

```txt
DEINE_EMAIL@BEISPIEL.DE
```

durch genau die E-Mail-Adresse, mit der du dich in Firebase Authentication einloggst.

## Adminbereich

Nach dem Login erscheint statt „Login“ der Button „Admin“.

Dort kannst du bearbeiten:

- Startseite
- Touren
- Meilensteine
- Challenges

## Meilensteine

Wenn noch keine Meilensteine in Firebase gespeichert sind, zeigt die Seite Demo-Meilensteine:

- Venlo erledigt
- Xanten geplant
- Amsterdam geplant
- Paris geplant
- Gardasee geplant

Im Adminbereich kannst du über „Standard-Meilensteine anlegen“ echte Datensätze in Firebase erstellen.

## Fortschrittsbalken

Der Fortschrittsbalken berechnet sich automatisch:

```txt
erledigte Meilensteine / alle Meilensteine
```

Zusätzlich wird die gepflegte Distanz angezeigt:

```txt
erledigte Kilometer von geplanten Kilometern
```

## Bilder

Bilder kannst du in GitHub in den Ordner `media` hochladen.

Beispiel:

```txt
media/venlo.webp
```

Öffentlicher Link:

```txt
https://DEINNAME.github.io/younes-on-tour/media/venlo.webp
```

## GPX

GPX-Dateien kannst du in GitHub in den Ordner `gpx` hochladen.

Beispiel:

```txt
gpx/venlo.gpx
```

Öffentlicher Link:

```txt
https://DEINNAME.github.io/younes-on-tour/gpx/venlo.gpx
```

Diesen Link trägst du im Adminbereich bei Tour oder Meilenstein als GPX-Link ein.
