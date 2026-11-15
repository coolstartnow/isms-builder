// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Zentrales Datenverzeichnis (server/paths.js): `DATA_DIR` oder, ohne die Variable, `<Projekt>/data`. Alle veränderlichen Daten (JSON-Dateien,
// Uploads, SQLite-Datei, Markierungen) liegen darunter — nie fest unter `<Projekt>/data`, sonst gehen sie bei gesetztem DATA_DIR
// (z. B. Docker-Volume) verloren oder landen unerwartet im Projektverzeichnis. Statische Mitgelieferte (Demo-Bundles, Demo-Logo)
// bleiben im Projekt (`staticDataPath`), weil sie zum Programmstand gehören und nicht zu den Nutzerdaten.
const path = require('path')

const PROJECT_DATA = path.join(__dirname, '../data')   // Rückfall, wenn DATA_DIR nicht gesetzt ist
const dataDir = () => process.env.DATA_DIR || PROJECT_DATA
const dataPath = (...parts) => path.join(dataDir(), ...parts)
const staticDataPath = (...parts) => path.join(PROJECT_DATA, ...parts)

module.exports = { dataDir, dataPath, staticDataPath }
