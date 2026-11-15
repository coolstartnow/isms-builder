// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Daten-Epoche des Mobile-Sync. Der Abruf (GET /sync/pull) liefert nur Datensätze, die seit dem letzten Abgleich *geändert* wurden (Zeitstempel updatedAt).
// Daten, die mit altem Zeitstempel auf den Server gelangen (Demo-Import, Demo-Bündel, Wiederherstellung aus einem Backup, von Hand ersetzte Dateien),
// würden bereits abgleichende Geräte deshalb nie erreichen. Die Epoche ändert sich bei jedem Serverstart und nach jedem Austausch von Daten
// (server/reloadStores.js); der Abruf nennt sie (`epoch`), und eine App mit anderer Epoche holt einmal ALLE Daten (ohne `since`).
// Bewusst nur im Arbeitsspeicher: ein Neustart (typisch nach einer Wiederherstellung) ändert sie ohnehin; eine Datei im Datenverzeichnis würde mit
// einem Backup zurückgespielt und die Änderung unsichtbar machen.
const crypto = require('crypto')

const fresh = () => `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`
let epoch = fresh()

module.exports = { get: () => epoch, bump: () => { epoch = fresh(); return epoch } }
