# Younes on Tour V2

## Umstieg von der bisherigen Seite

Deine Firebase-Daten bleiben erhalten. Nur das Frontend im GitHub-Repository wird ersetzt.

## Installation auf GitHub

1. Sichere deine bisherige `firebase-config.js` lokal, damit du die Werte noch hast.
2. Lösche die alten Website-Dateien im Repository.
3. Lade den vollständigen Inhalt dieses Ordners hoch.
4. Öffne `Settings → Pages`.
5. Stelle unter `Build and deployment` die Quelle auf `GitHub Actions`.

## GitHub Secrets anlegen

Unter `Settings → Secrets and variables → Actions → New repository secret` einzeln anlegen:

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_ADMIN_EMAIL

Die Werte kommen aus deiner bisherigen `firebase-config.js`. Nur den Wert eintragen, ohne Anführungszeichen.

## Firestore-Regeln

In `firestore.rules` deine echte E-Mail einsetzen und die Regeln in Firebase erneut veröffentlichen.

## Deployment

Nach jedem Upload startet unter `Actions` automatisch der Build. Die Website ist nach wenigen Minuten wieder unter derselben GitHub-Pages-Adresse erreichbar.

## Bilder und GPX

Bilder nach `public/media` hochladen.
GPX-Dateien nach `public/gpx` hochladen.

Beispiel Bild:
`https://DEINNAME.github.io/younes-on-tour/media/xanten.webp`

Beispiel GPX:
`https://DEINNAME.github.io/younes-on-tour/gpx/xanten.gpx`

Der GPX-Link wird im Adminformular hinterlegt und auf der Tourseite automatisch als OpenStreetMap-Karte angezeigt.
