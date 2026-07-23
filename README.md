# Younes on Tour – kostenlose Einrichtung

## Wichtig vorab

Diese Version kostet dauerhaft 0 €, solange du:
- GitHub Pages im kostenlosen Rahmen nutzt,
- Firebase im Spark-Tarif lässt,
- Fotos und Videos nicht direkt in Firebase Storage hochlädst.

Firebase Storage verlangt inzwischen ein abrechnungsfähiges Blaze-Projekt. Deshalb arbeitet diese Null-Euro-Version mit öffentlichen Bild- und Video-Links. Bilder kannst du z. B. in ein öffentliches GitHub-Verzeichnis hochladen oder über einen kostenlosen externen Bildhost einbinden. Videos am besten über YouTube als „nicht gelistet“.

## 1. GitHub-Konto und Repository

1. Öffne github.com und erstelle kostenlos ein Konto.
2. Erstelle ein neues öffentliches Repository mit dem Namen:
   `younes-on-tour`
3. Lade alle Dateien aus diesem Ordner in das Repository hoch.
4. Öffne im Repository:
   `Settings → Pages`
5. Unter „Build and deployment“:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Ordner: `/ (root)`
6. Speichern.
7. Nach wenigen Minuten ist die Seite erreichbar unter:
   `https://DEIN-GITHUB-NAME.github.io/younes-on-tour/`

## 2. Firebase-Projekt anlegen

1. Öffne console.firebase.google.com.
2. Klicke „Projekt hinzufügen“.
3. Projektname: `younes-on-tour`
4. Google Analytics kannst du deaktivieren.
5. Im Projekt auf das Web-Symbol `</>` klicken.
6. App-Name: `younes-on-tour`
7. Die angezeigte `firebaseConfig` kopieren.
8. Öffne die Datei `firebase-config.js` und ersetze dort alle Platzhalter.
9. Trage dort auch deine eigene Login-E-Mail als `ADMIN_EMAIL` ein.

## 3. Login aktivieren

1. Firebase → `Build → Authentication`
2. „Loslegen“
3. Anbieter „E-Mail/Passwort“ aktivieren.
4. Danach `Nutzer → Nutzer hinzufügen`.
5. Deine E-Mail und ein starkes Passwort anlegen.

## 4. Datenbank aktivieren

1. Firebase → `Build → Firestore Database`
2. „Datenbank erstellen“
3. „Produktionsmodus“ auswählen.
4. Region möglichst nah wählen, z. B. `eur3`.
5. Danach den Reiter `Regeln` öffnen.
6. Inhalt aus `firestore.rules` einfügen.
7. In den Regeln `DEINE_EMAIL@BEISPIEL.DE` durch dieselbe Admin-E-Mail ersetzen.
8. „Veröffentlichen“.

## 5. Firebase-Domain freigeben

1. Firebase → `Authentication → Einstellungen → Autorisierte Domains`
2. Ergänze:
   `DEIN-GITHUB-NAME.github.io`

## 6. Änderungen wieder bei GitHub hochladen

Lade die bearbeitete Datei `firebase-config.js` erneut in das Repository hoch und ersetze die alte Version.

Danach:
1. Website öffnen.
2. Oben rechts auf „Login“.
3. Mit deiner Firebase-E-Mail anmelden.
4. Neue Tour eintragen und speichern.

## Fotos kostenlos einbinden

### Variante A: Bilder direkt im GitHub-Repository
1. Erstelle im Repository einen Ordner `media`.
2. Lade komprimierte JPG- oder WebP-Dateien hoch.
3. Der Bildlink lautet:
   `https://DEIN-GITHUB-NAME.github.io/younes-on-tour/media/dateiname.webp`
4. Diesen Link im Tourformular eintragen.

Empfehlung:
- Titelbilder maximal 1.600 px breit
- WebP oder JPG
- möglichst unter 500 KB je Bild
- keine privaten oder sensiblen Bilder hochladen, da das Repository öffentlich ist

### Videos
Videos nicht in GitHub hochladen. Nutze YouTube mit Sichtbarkeit „Nicht gelistet“ und trage den Link ein.

## GPX-Dateien
GPX-Dateien kannst du ebenfalls in einen Ordner `gpx` im Repository hochladen und den öffentlichen GitHub-Pages-Link im Formular eintragen.

## Datenschutz
Die Website ist öffentlich. Veröffentliche keine privaten Adressen, exakten Wohnorte oder sensible Echtzeit-Standorte. Touren am besten erst nach Abschluss veröffentlichen.
