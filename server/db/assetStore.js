// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

const fs   = require('fs')
const path = require('path')

const protection = require('./assetProtection')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'assets.json')

const ASSET_TYPES = {
  hardware_server:      'Server',
  hardware_workstation: 'Workstation / PC',
  hardware_laptop:      'Laptop / Notebook',
  hardware_mobile:      'Mobilgerät',
  hardware_network:     'Netzwerk-Equipment',
  hardware_ics_ot:      'ICS/OT-Anlage',
  hardware_building:    'Gebäudetechnik (BAS/GLT)',
  hardware_other:       'Hardware (Sonstige)',
  software_app:         'Anwendungssoftware',
  software_os:          'Betriebssystem',
  software_cloud:       'Cloud-Dienst (IaaS/PaaS)',
  software_saas:        'SaaS-Anwendung',
  software_other:       'Software (Sonstige)',
  data_database:        'Datenbank',
  data_document:        'Dokumentensammlung',
  data_backup:          'Backup / Archiv',
  data_other:           'Daten (Sonstige)',
  service_internal:     'Interner Dienst',
  service_cloud:        'Cloud-Service (extern)',
  service_external:     'Externer Dienstleister',
  facility_office:      'Bürogebäude',
  facility_datacenter:  'Rechenzentrum / Serverraum',
  facility_production:  'Produktionsstätte / Werk',
  facility_other:       'Einrichtung (Sonstige)',
}

const CATEGORIES = {
  hardware: 'Hardware',
  software: 'Software',
  data:     'Daten / Informationen',
  service:  'Dienste',
  facility: 'Einrichtungen',
}

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return [] }
}
function save(list) {
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2))
}
function nowISO() { return new Date().toISOString() }
function makeId()  {
  const hex = require('crypto').randomBytes(4).toString('hex')
  return `asset_${hex}`
}

/** Alle nicht gelöschten Assets inkl. berechneter Vererbung. */
function _activeAnnotated() {
  return protection.annotate(load().filter(i => !i.deletedAt))
}

function getAll({ category, type, classification, criticality, status, entityId,
                  minC, minI, minA, minAuth, dependsOn } = {}) {
  // Vererbung wird immer über den vollständigen Graphen berechnet, erst danach gefiltert
  let list = _activeAnnotated()
  if (category)       list = list.filter(i => i.category       === category)
  if (type)           list = list.filter(i => i.type           === type)
  if (classification) list = list.filter(i => i.classification === classification)
  if (criticality)    list = list.filter(i => i.criticality    === criticality)
  if (status)         list = list.filter(i => i.status         === status)
  if (entityId)       list = list.filter(i => i.entityId       === entityId)
  if (dependsOn)      list = list.filter(i => i.dependsOn.includes(dependsOn))

  const minima = { c: minC, i: minI, a: minA, auth: minAuth }
  for (const [goal, raw] of Object.entries(minima)) {
    const min = protection.normalizeLevel(raw)
    if (min === null) continue
    list = list.filter(i => (i.effectiveProtection[goal] ?? 0) >= min)
  }
  return list
}

function getById(id) {
  return protection.annotateOne(load().filter(i => !i.deletedAt), id)
}

/** Knoten + Kanten für die Abhängigkeitsvisualisierung. */
function getGraph() {
  return protection.buildGraph(load().filter(i => !i.deletedAt))
}

/**
 * Prüft Abhängigkeiten vor dem Schreiben.
 * Rückgabe: { ok: true, dependsOn } oder { ok: false, error, unknown? }
 */
function validateDependencies(id, rawDependsOn) {
  const list      = load().filter(i => !i.deletedAt)
  const dependsOn = protection.normalizeDependsOn(rawDependsOn, id)

  const unknown = protection.findUnknownDependencies(list, dependsOn)
  if (unknown.length) {
    return { ok: false, error: 'Unbekannte Abhängigkeiten', unknown }
  }
  if (id && protection.wouldCreateCycle(list, id, dependsOn)) {
    return { ok: false, error: 'Zirkuläre Abhängigkeit' }
  }
  return { ok: true, dependsOn }
}

/**
 * Hält `classification` (Altfeld, weiterhin für Filter/Reports genutzt) und
 * `protection.c` konsistent. Ein explizit gesetztes C gewinnt, sonst wird C
 * aus der Klassifizierung abgeleitet.
 */
function _syncClassification(item, rawProtection) {
  const explicitC = protection.normalizeLevel(rawProtection && rawProtection.c)
  if (explicitC !== null) {
    item.classification = protection.LEVEL_TO_CLASSIFICATION[explicitC]
  } else {
    item.protection.c = protection.CLASSIFICATION_TO_LEVEL[item.classification] ?? item.protection.c
  }
}

function create(data, { createdBy } = {}) {
  const list = load()
  const asset = {
    id:             makeId(),
    name:           data.name           || '',
    category:       data.category       || 'hardware',
    type:           data.type           || '',
    description:    data.description    || '',
    owner:          data.owner          || '',
    ownerEmail:     data.ownerEmail     || '',
    custodian:      data.custodian      || '',
    entityId:       data.entityId       || '',
    location:       data.location       || '',
    classification: data.classification || 'internal',
    criticality:    data.criticality    || 'medium',
    status:         data.status         || 'active',
    vendor:         data.vendor         || '',
    version:        data.version        || '',
    serialNumber:   data.serialNumber   || '',
    purchaseDate:   data.purchaseDate   || '',
    endOfLifeDate:  data.endOfLifeDate  || '',
    tags:           Array.isArray(data.tags) ? data.tags : (data.tags ? String(data.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
    notes:          data.notes          || '',
    linkedControls: Array.isArray(data.linkedControls) ? data.linkedControls : [],
    linkedPolicies: Array.isArray(data.linkedPolicies) ? data.linkedPolicies : [],
    protection:     protection.normalizeProtection(data.protection, data.classification || 'internal'),
    dependsOn:      protection.normalizeDependsOn(data.dependsOn, null),
    createdAt:      nowISO(),
    updatedAt:      nowISO(),
    createdBy:      createdBy           || 'system',
  }
  _syncClassification(asset, data.protection)
  list.push(asset)
  save(list)
  return protection.annotateOne(list.filter(i => !i.deletedAt), asset.id)
}

function update(id, patch, { changedBy } = {}) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return null
  const item = list[idx]
  const allowed = [
    'name','category','type','description','owner','ownerEmail','custodian','entityId',
    'location','classification','criticality','status','vendor','version','serialNumber',
    'purchaseDate','endOfLifeDate','tags','notes','linkedControls','linkedPolicies',
  ]
  for (const k of allowed) {
    if (patch[k] !== undefined) item[k] = patch[k]
  }
  if (patch.tags !== undefined && !Array.isArray(item.tags)) {
    item.tags = String(item.tags).split(',').map(t => t.trim()).filter(Boolean)
  }

  // Schutzziele: fehlende Werte aus dem bisherigen Stand bzw. der Klassifizierung
  item.protection = protection.normalizeProtection(
    patch.protection !== undefined ? patch.protection : item.protection,
    item.classification,
  )
  if (patch.protection !== undefined || patch.classification !== undefined) {
    _syncClassification(item, patch.protection)
  }
  if (patch.dependsOn !== undefined) {
    item.dependsOn = protection.normalizeDependsOn(patch.dependsOn, id)
  } else if (!Array.isArray(item.dependsOn)) {
    item.dependsOn = []
  }

  item.updatedAt = nowISO()
  if (changedBy) item.updatedBy = changedBy
  save(list)
  return protection.annotateOne(list.filter(i => !i.deletedAt), id)
}

function remove(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return false
  list[idx].deletedAt = nowISO()
  save(list)
  return true
}

function getSummary() {
  const raw   = load().filter(i => !i.deletedAt)
  const list  = protection.annotate(raw)
  const now   = new Date()
  const in90  = new Date(now.getTime() + 90 * 86400000)

  // Schutzziel-Kennzahlen (effektive Werte, also nach Vererbung)
  const byProtection = {
    c:    { 1: 0, 2: 0, 3: 0, 4: 0 },
    i:    { 1: 0, 2: 0, 3: 0, 4: 0 },
    a:    { 1: 0, 2: 0, 3: 0, 4: 0 },
    auth: { 1: 0, 2: 0, 3: 0, 4: 0 },
  }
  let protectionUnassessed = 0   // Assets ohne eigene Schutzbedarfsfeststellung
  let inheritedAssets      = 0   // Assets mit mindestens einem geerbten Wert
  let withDependencies     = 0
  let dependencyEdges      = 0
  let authAssessed         = 0

  const rawById = new Map(raw.map(a => [a.id, a]))

  for (const a of list) {
    for (const goal of protection.PROTECTION_GOALS) {
      const v = a.effectiveProtection[goal]
      if (v !== null && v !== undefined) byProtection[goal][v]++
    }
    if (a.effectiveProtection.auth !== null && a.effectiveProtection.auth !== undefined) authAssessed++

    const original = rawById.get(a.id)
    if (!original || !original.protection) protectionUnassessed++

    if (protection.PROTECTION_GOALS.some(g => a.protectionOrigins[g] && a.protectionOrigins[g] !== a.id)) {
      inheritedAssets++
    }
    if (a.dependsOn.length) {
      withDependencies++
      dependencyEdges += a.dependsOn.length
    }
  }

  const total           = list.length
  const active          = list.filter(i => i.status === 'active').length
  const decommissioned  = list.filter(i => i.status === 'decommissioned').length
  const planned         = list.filter(i => i.status === 'planned').length

  const byCategory       = { hardware: 0, software: 0, data: 0, service: 0, facility: 0 }
  const byClassification = { public: 0, internal: 0, confidential: 0, strictly_confidential: 0 }
  const byCriticality    = { low: 0, medium: 0, high: 0, critical: 0 }

  let unclassified         = 0
  let criticalUnclassified = 0
  let endOfLifeSoon        = 0

  for (const a of list) {
    if (byCategory[a.category]       !== undefined) byCategory[a.category]++
    if (byClassification[a.classification] !== undefined) byClassification[a.classification]++
    if (byCriticality[a.criticality] !== undefined) byCriticality[a.criticality]++

    // Gilt als unklassifiziert: kein Wert, unbekannter Wert oder 'public'.
    // Einmal je Asset zählen — fehlende Werte trafen früher zwei Bedingungen
    // und wurden dadurch doppelt gezählt.
    if (!a.classification || byClassification[a.classification] === undefined || a.classification === 'public') {
      unclassified++
    }

    if ((a.criticality === 'critical' || a.criticality === 'high') && (!a.classification || a.classification === 'public')) {
      criticalUnclassified++
    }

    if (a.endOfLifeDate) {
      const eol = new Date(a.endOfLifeDate)
      if (eol >= now && eol <= in90) endOfLifeSoon++
    }
  }

  return {
    total, active, decommissioned, planned,
    unclassified,
    byCategory, byClassification, byCriticality,
    criticalUnclassified, endOfLifeSoon,
    byProtection, protectionUnassessed, inheritedAssets,
    withDependencies, dependencyEdges, authAssessed,
  }
}

const _jsonExports = {
  getAll, getById, create, update, remove, getSummary,
  getGraph, validateDependencies,
  ASSET_TYPES, CATEGORIES,
  PROTECTION_LEVELS: protection.PROTECTION_LEVELS,
  PROTECTION_GOALS:  protection.PROTECTION_GOALS,
}

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/assetStore')
  _knex.init().catch(e => console.error('[assetStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
