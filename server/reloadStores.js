// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Nach Demo-Reset und Demo-Import (Dateien wurden außerhalb der Speicher verändert): die Speicher, die ihre Daten beim Start einmal in den
// Arbeitsspeicher laden, neu einlesen und die Grunddaten (SoA, Guidance, Entitäten …) wieder anlegen — ohne Neustart des Servers.
// Sonst würden Dokumente, Entitäten, SoA und Benutzer weiter den alten Stand liefern und beim nächsten Speichern in die Dateien zurückschreiben.
// Alle übrigen Speicher lesen ihre Datei bei jedem Zugriff. Neue Speicher mit eigenem Arbeitsspeicher-Stand hier eintragen
// (tests/demoResetReload.test.js prüft über echte Anfragen, dass nach dem Reset kein Altstand bleibt).
let seeder = null
const setSeeder = fn => { seeder = fn }

async function reloadAll() {
  for (const mod of ['./db/jsonStore', './db/entityStore', './db/soaStore', './rbacStore']) {
    const m = require(mod)
    if (typeof m.init === 'function') await m.init()
  }
  require('./productionState').resetCache()
  require('./syncEpoch').bump()   // Mobile-Sync: Geräte holen nach einem Datenaustausch einmal alles (Datensätze mit altem Zeitstempel würden sonst nie ankommen)
  if (seeder) await seeder()
}

module.exports = { reloadAll, setSeeder }
