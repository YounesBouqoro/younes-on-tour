Desktop-Fix für Younes on Tour

Problem:
Die Desktop-Ansicht sieht ungestylt aus, weil im Repository sehr wahrscheinlich noch eine alte styles.css aktiv ist oder der Browser/GitHub Pages eine alte CSS-Datei aus dem Cache lädt.

Lösung:
Diese drei Dateien im Repository ersetzen:
- index.html
- styles.css
- app.js

Die index.html enthält zusätzlich Cache-Busting:
- styles.css?v=2.1
- app.js?v=2.1

Danach GitHub Pages 1-3 Minuten warten lassen und die Seite hart neu laden:
Mac: Cmd + Shift + R
Windows: Strg + F5
iPhone/Safari: Tab schließen und neu öffnen oder Website-Daten löschen.
