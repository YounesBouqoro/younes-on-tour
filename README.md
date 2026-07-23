# Younes on Tour – Version 1.5 (statische GitHub-Pages-Version)

Diese Version läuft ohne Next.js, npm, package-lock.json oder GitHub Actions.

## Enthalten

- bestehender Firebase-Login
- Firestore-Adminbereich
- Touren erstellen, bearbeiten und löschen
- Rad- und Lauftouren
- automatische Statistiken
- Galerie, Video- und Aktivitätslinks
- interaktive OpenStreetMap-Karte aus einer öffentlichen GPX-Datei
- responsive Darstellung

## Installation

1. Sichere deine derzeitige `firebase-config.js`, weil dort deine echten Firebase-Werte stehen.
2. Lösche im Repository die Next.js-Dateien und Ordner: `.github`, `app`, `components`, `lib`, `public`, `types`, `package.json`, `next.config.mjs`, `next-env.d.ts`, `tsconfig.json`.
3. Lade alle Dateien dieses Ordners direkt in die oberste Ebene deines Repositorys.
4. Ersetze die mitgelieferte `firebase-config.js` durch deine zuvor gesicherte funktionierende Datei.
5. GitHub: `Settings → Pages → Source: Deploy from a branch → main → /(root)`.
6. Speichern und 1–3 Minuten warten.

## Ordner

- Bilder nach `media/`
- GPX-Dateien nach `gpx/`

Beispielbild:
`https://DEINNAME.github.io/younes-on-tour/media/xanten.webp`

Beispiel-GPX:
`https://DEINNAME.github.io/younes-on-tour/gpx/xanten.gpx`

Den vollständigen GPX-Link trägst du im Adminformular ein. Die Tourseite zeichnet die Strecke automatisch.

## Wichtig

GitHub kann keine leeren Ordner speichern. Die `.gitkeep`-Dateien in `media` und `gpx` deshalb nicht löschen, solange noch keine echten Dateien darin liegen.
