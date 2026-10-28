# Keller – Inventar-App

Offline-fähige Web-App (PWA) fürs Handy: Was liegt in welchem Schrank, Fach, welcher Schublade oder Box?
Gegenstände schnell erfassen, als *entnommen* / *zurückgelegt* markieren, alles finden, Orte per QR-Code öffnen.

Alle Gegenstände, Fotos und Status liegen **nur auf deinem Gerät** (IndexedDB). Es gibt kein Backend und keinen Login.

---

## Starten (am PC)

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20.

```bash
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen. Im Entwicklungsmodus läuft **kein** Service Worker (also kein Offline-Modus).

Offline-Verhalten testen:

```bash
npm run build
npm run preview
```

→ <http://localhost:4173>

---

## Die Config bearbeiten: `keller.config.json`

Die Datei im Projektordner beschreibt Raum, Möbel und freie Positionen. Maße in cm.

**Koordinaten:** `x` = Raumlänge ab Türwand (0) bis Rückwand. `y` = Raumbreite ab linker Wand (0).
Bei Möbeln ist `x` der Startpunkt entlang der Wand (`wand`: `links`, `rechts`, `hinten`, `vorne`).

### Möbeltypen

**Kallax** (`"typ": "kallax"`): `spalten`, `reihen` und `belegung_oben_nach_unten`, ein Array pro Reihe von oben.
Erlaubte Werte pro Fach:

| Wert | Bedeutung |
|---|---|
| `offen` | Gegenstände liegen direkt im Fach |
| `box-grau`, `box-weiss`, `box-schwarz`, `box-beige` … | eine Box im Fach |
| `schubladeneinsatz-3` | Einsatz mit 3 Schubladen (auch `-2` usw.) |

**PAX** (`"typ": "pax"`): `einteilung_von_unten` ist eine Liste von Elementen mit `typ` = `schublade`, `drahtkorb`, `boden` oder `kleiderstange` und optional `anzahl`.

**Schrank mit Drehtüren** (`"typ": "schrank"`): `faecher` (Anzahl) und `tueren.anzahl`.
`tueren.faecher_je_tuer_von_unten` legt fest, wie viele Fächer hinter jeder Tür liegen, z. B. `[2, 2, 1]`.
Ohne das Feld werden die Fächer gleichmäßig verteilt.

**Freie Positionen** (`freie_positionen`): Orte außerhalb von Möbeln (Leiter, Reifen …).
`inhalt` legt beim ersten Start automatisch Gegenstände an (z. B. die Koffer).

### Optionale Felder (werden auch von der App geschrieben)

```json
"boxen": [ { "id": "box-werkzeug", "name": "Werkzeugkiste", "in": "pax-vorne/boden-1" } ],
"bezeichnungen": { "kallax-3x4/r2c3/box": "Elektro" }
```

### Orts-IDs (stehen in den QR-Codes)

| Ort | ID-Schema | Beispiel |
|---|---|---|
| Kallax-Fach | `<möbel>/r<reihe>c<spalte>` (Reihe 1 = oben) | `kallax-3x4/r2c3` |
| Box im Kallax-Fach | `…/box` | `kallax-3x4/r2c3/box` |
| Schublade im Einsatz | `…/s<n>` (1 = oben) | `kallax-3x4/r1c2/s1` |
| PAX-Element | `<möbel>/<typ>-<n>` (n von unten je Typ) | `pax-vorne/schublade-1` |
| Schrankfach | `<möbel>/fach-<n>` (n von unten) | `schrank-dunkel/fach-5` |

Solange es ein Fach weiterhin gibt, bleiben seine ID und damit auch QR-Code und Inhalt gültig.
Fällt ein Fach weg (z. B. weil du den PAX umbaust), erscheinen seine Gegenstände in der Übersicht unter **„Ohne Ort“**. Von dort kannst du sie neu zuordnen.

### Datei vs. App

- Möbel lassen sich auch in der App ändern (**Mehr → Raum & Möbel bearbeiten**, auf jeder Ortsseite *Name* / *Box rein*).
  Diese Änderungen speichert die App lokal und legt sie über die Datei.
- **Mehr → Config herunterladen** liefert die aktuelle Version als `keller.config.json`. Damit kannst du die Datei im Projekt ersetzen.
- Änderst du die Datei, nachdem du in der App bearbeitet hast, fragt die App, welche Version gelten soll.
- Ohne App-Änderungen gilt die Datei automatisch, sobald die neue Version deployt ist.

---

## Aufs Handy bringen (GitHub Pages)

PWA-Installation, Offline-Modus und Kamera brauchen HTTPS. GitHub Pages ist kostenlos und liefert HTTPS.
Im Repository liegen nur App-Code und Möbel-Config, **nicht** deine Gegenstände.

1. Auf GitHub ein neues Repository anlegen, z. B. `keller`.
2. Im Projektordner:
   ```bash
   git init
   git add .
   git commit -m "Keller-App"
   git branch -M main
   git remote add origin https://github.com/<dein-name>/keller.git
   git push -u origin main
   ```
3. Auf GitHub: **Settings → Pages → Source: „GitHub Actions“** wählen.
   Der Workflow `.github/workflows/deploy.yml` baut und veröffentlicht die App bei jedem Push.
4. Die App ist danach unter `https://<dein-name>.github.io/keller/` erreichbar.

### Installieren

- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → **„Zum Home-Bildschirm“**.
- **Android (Chrome):** Seite öffnen → Menü ⋮ → **„App installieren“**.

Danach die App **einmal mit Netz öffnen**. Sie meldet „Bereit für die Offline-Nutzung“ und läuft dann auch im Keller ohne Empfang.

### Wichtig: Speicher und Scannen

- **iPhone:** Die installierte App hat einen **eigenen Speicher**, getrennt von Safari.
  Erfasse Daten deshalb immer in der installierten App und scanne Etiketten mit dem **Scannen-Knopf in der App**.
  Die normale Kamera-App öffnet Safari, und dort sind deine Daten nicht.
- **Android:** Mit installierter App öffnen gescannte Links meist direkt die App. Der In-App-Scanner funktioniert immer.
- **Backups:** Unter **Mehr → Backup speichern** regelmäßig sichern (JSON inkl. Fotos und Config).
  Mit **Backup laden** stellst du alles wieder her oder bringst es auf ein anderes Gerät.

### Updates

Nach jedem Push zeigt die App beim nächsten Öffnen mit Netz **„Neue Version verfügbar → Aktualisieren“**.

---

## QR-Etiketten

**Mehr → QR-Etiketten drucken**: Orte auswählen, Größe wählen, drucken (A4).
Jeder Code enthält die Adresse der App plus Orts-ID, z. B. `https://<dein-name>.github.io/keller/#/ort/kallax-3x4/r2c3/box`.
Drucke die Etiketten am besten erst, wenn die App auf GitHub Pages läuft. Alternativ trägst du die spätere Adresse oben auf der Etikettenseite ein.

---

## Bedienung in Kürze

- **Übersicht:** Baum Raum → Möbel → Fach → Box → Gegenstände. Zahlen = Anzahl im Teilbaum (orange = davon entnommen).
- **Erfassen:** Auf einer Ortsseite unten eintippen und Enter drücken. Mit **Mehrere** gibst du eine Zeile pro Gegenstand ein.
  Kurzschreibweise: `3x Schrauben M6 #Werkzeug` → Menge 3, Kategorie Werkzeug.
- **Raus / Zurück:** Knopf rechts an jedem Gegenstand. Danach erscheint kurz „Rückgängig“.
- **Entnommen:** Alles, was gerade nicht an seinem Platz ist.
- **Suche:** Durchsucht Name, Kategorie, Notiz und Ort (z. B. „box grau akku“). Umlaute sind egal („schluessel“ = „Schlüssel“).

---

## 3D-Ansicht

Erreichbar über den Umschalter **Liste | 3D** in der Übersicht, den Knopf **3D** auf jeder Ortsseite, **In 3D zeigen** bei einem Gegenstand oder in der Suche.

- **Bedienung:** Ein Finger dreht, zwei Finger zoomen und verschieben. Mit der Maus: links drehen, rechts verschieben, Rad zoomen.
  Oben rechts: **Würfel** = zurück zum Blick von der Tür, **×** = alles schließen.
- **Kallax:** Box antippen → sie fährt heraus, unten erscheint die Infokarte mit Inhalt und Raus/Zurück-Knöpfen. Nochmal antippen schiebt sie zurück.
  Der Schubladeneinsatz hat 3 einzeln ausziehbare Schubladen.
- **PAX:** Tür antippen → dieser PAX öffnet sich, und seine Tür fährt auf der gemeinsamen Schiene vor den anderen. Es ist immer nur ein PAX offen.
  Schubladen und Drahtkörbe fahren heraus; Boden und Kleiderstange sind antippbar.
- **Dunkler Schrank:** Jede der drei Drehtüren klappt einzeln auf.
- **Freie Positionen:** Koffer (je Gegenstand ein Koffer in seiner Farbe), Leiter und Reifenstapel sind antippbar.
  Hat eine freie Position keine Koordinaten, sucht die App in der Beschreibung (`ort`) nach Möbelnamen. Beispiel: „oben auf PAX vorne und hinten“.
- **Suche im Raum:** Treffer leuchten mit pulsierendem Rahmen. Ein Tipp auf einen Treffer-Chip fährt die Kamera hin.
- Alles wird maßstabsgetreu aus `keller.config.json` berechnet (`src/raum3d/layout.ts`), Umbauten erscheinen also auch in 3D.
  Annahmen ohne Angabe in der Config: PAX-Schubladen 20 cm, Drahtkörbe 17 cm hoch; der Rest wird auf Boden (1 Teil) und Kleiderstange (3 Teile) verteilt.
- **Performance:** Gerendert wird nur, wenn sich etwas bewegt. Keine Schatten, geteilte Geometrien. Der 3D-Teil (Three.js) wird erst beim Öffnen geladen, ist aber für offline vorab gecacht.

---

## Projektstruktur

```
keller.config.json      Raumstruktur (von dir bearbeitbar)
src/config/             Config-Typen und Ableitung der Orte (orte.ts)
src/db/                 IndexedDB und Backup
src/state/              Zentraler App-Zustand (KellerContext)
src/views/              Seiten: Übersicht, Ort, Gegenstand, Suche, Entnommen, Scan, Etiketten, Mehr, Einrichtung
src/components/         Wiederverwendbare Bausteine
src/raum3d/             3D: layout.ts (Geometrie aus der Config), Szene.tsx (Three.js), Ansicht3D.tsx (Seite)
scripts/make-icons.mjs  Erzeugt die App-Icons (npm run icons)
```

Technik: React, Vite, TypeScript, vite-plugin-pwa (Workbox), idb, qrcode, jsQR, Three.js mit React Three Fiber und drei.
