// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Definitionen eigener SoA-Gruppen (nutzerdefinierte Frameworks): data/soa-frameworks.json
// Konfiguration, keine Fachdaten — deshalb für alle Speicher-Backends dieselbe Datei (wie data/iso-controls.json).
// Die Controls selbst liegen wie alle anderen in soa.json bzw. der Tabelle soa_controls.
const fs = require('fs')
const path = require('path')
const defs = require('../soaFrameworkDefs')

// Pfad bei jedem Zugriff bestimmen: Tests und Demo-Wechsel setzen DATA_DIR vor dem ersten Laden anderer Module
const file = () => path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'soa-frameworks.json')

// Gelöschte Gruppen bleiben als Löschmarkierung (deletedAt) in der Datei, damit der Mobile-Sync das Löschen weitergeben kann.
// Alle Lesefunktionen unten blenden sie aus; nur der Sync (routes/sync.js) liest die Datei roh.
function readRaw() {
  try {
    const list = JSON.parse(fs.readFileSync(file(), 'utf8'))
    return Array.isArray(list) ? list.filter(f => f && typeof f.id === 'string') : []
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[soaFrameworkStore] soa-frameworks.json load error:', e.message)
    return []
  }
}
const readAll = () => readRaw().filter(f => !f.deletedAt)

// atomisch: erst in eine Temp-Datei, dann umbenennen (ein Abbruch hinterlässt nie eine halbe Datei)
function writeAll(list) {
  const f = file()
  fs.mkdirSync(path.dirname(f), { recursive: true })
  // Eine unlesbare Datei wird nie stillschweigend überschrieben: erst eine Kopie daneben legen (die Definitionen lassen sich daraus retten)
  try { JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) {
    if (e.code !== 'ENOENT') { try { fs.copyFileSync(f, f + '.defekt-' + Date.now()) } catch {} }
  }
  const tmp = f + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2))
  fs.renameSync(tmp, f)
}

// nach Anlage sortiert (älteste zuerst) → stabile Reihenfolge der Tabs
const getAllSync = () => readAll().sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
const getByIdSync = id => getAllSync().find(f => f.id === id) || null

// → { framework } | { code: invalid_id|reserved_id|invalid_label|invalid_color|exists }
function createSync(def, { by } = {}) {
  const v = defs.validateDefinition(def)
  if (v.code) return { code: v.code }
  const list = readRaw()
  if (list.some(f => f.id === v.value.id && !f.deletedAt)) return { code: 'exists' }
  const now = new Date().toISOString()
  const framework = { ...v.value, createdAt: now, createdBy: by || 'unknown', updatedAt: now }
  const old = list.findIndex(f => f.id === v.value.id)   // eine Löschmarkierung gleicher Kennung wird ersetzt
  if (old >= 0) list[old] = framework; else list.push(framework)
  writeAll(list)
  return { framework }
}

// ID unveränderlich: nur Bezeichnung und Farbe. → { framework } | { code: not_found|invalid_label|invalid_color }
function updateSync(id, patch, { by } = {}) {
  const list = readRaw()
  const i = list.findIndex(f => f.id === id && !f.deletedAt)
  if (i < 0) return { code: 'not_found' }
  const v = defs.validateDefinition({ id, label: patch && patch.label !== undefined ? patch.label : list[i].label, color: patch && patch.color !== undefined ? patch.color : list[i].color })
  if (v.code) return { code: v.code }
  list[i] = { ...list[i], label: v.value.label, color: v.value.color, updatedAt: new Date().toISOString(), updatedBy: by || 'unknown' }
  writeAll(list)
  return { framework: list[i] }
}

// Das Prüfen auf vorhandene Controls übernimmt die Route (der Speicher kennt die Controls nicht).
function removeSync(id, { by } = {}) {
  const list = readRaw()
  const i = list.findIndex(f => f.id === id && !f.deletedAt)
  if (i < 0) return { code: 'not_found' }
  const now = new Date().toISOString()
  list[i] = { ...list[i], deletedAt: now, deletedBy: by || 'unknown', updatedAt: now }
  writeAll(list)
  return { framework: list[i] }
}

module.exports = {
  getAll: async () => getAllSync(), getById: async id => getByIdSync(id),
  create: async (d, o) => createSync(d, o), update: async (id, p, o) => updateSync(id, p, o), remove: async (id, o) => removeSync(id, o),
  getAllSync, getByIdSync, createSync, updateSync, removeSync,
}
