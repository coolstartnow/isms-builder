'use strict'

const { getDb, init: initDb } = require('../knexDatabase')
const protection = require('../assetProtection')

const ASSET_TYPES = {
  hardware_server: 'Server', hardware_workstation: 'Workstation / PC',
  hardware_laptop: 'Laptop / Notebook', hardware_mobile: 'Mobilgerät',
  hardware_network: 'Netzwerk-Equipment', hardware_ics_ot: 'ICS/OT-Anlage',
  hardware_building: 'Gebäudetechnik (BAS/GLT)', hardware_other: 'Hardware (Sonstige)',
  software_app: 'Anwendungssoftware', software_os: 'Betriebssystem',
  software_cloud: 'Cloud-Dienst (IaaS/PaaS)', software_saas: 'SaaS-Anwendung',
  software_other: 'Software (Sonstige)', data_database: 'Datenbank',
  data_document: 'Dokumentensammlung', data_backup: 'Backup / Archiv',
  data_other: 'Daten (Sonstige)', service_internal: 'Interner Dienst',
  service_cloud: 'Cloud-Service (extern)', service_external: 'Externer Dienstleister',
  facility_office: 'Bürogebäude', facility_datacenter: 'Rechenzentrum / Serverraum',
  facility_production: 'Produktionsstätte / Werk', facility_other: 'Einrichtung (Sonstige)',
}

const CATEGORIES = {
  hardware: 'Hardware', software: 'Software',
  data: 'Daten / Informationen', service: 'Dienste', facility: 'Einrichtungen',
}

function nowISO() { return new Date().toISOString() }
function makeId() { return `asset_${require('crypto').randomBytes(4).toString('hex')}` }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

function rowToAsset(row) {
  if (!row) return null
  const d = _json(row.data, {})
  return {
    id: row.id, name: row.name, description: row.description,
    category: row.category, type: d.type || '',
    classification: row.classification, criticality: row.criticality,
    owner: row.owner, ownerEmail: d.ownerEmail || '',
    custodian: d.custodian || '', entityId: d.entityId || '',
    location: row.location, status: row.status,
    vendor: d.vendor || '', version: d.version || '',
    serialNumber: d.serialNumber || '', purchaseDate: d.purchaseDate || '',
    endOfLifeDate: row.eol_date || '',
    tags: d.tags || [], notes: d.notes || '',
    linkedControls: _json(row.linked_controls, []),
    linkedPolicies: d.linkedPolicies || [],
    // Schutzziele + Abhängigkeiten liegen im data-Blob — kein Schema-Change nötig
    protection: d.protection || null,
    dependsOn: Array.isArray(d.dependsOn) ? d.dependsOn : [],
    applicableEntities: _json(row.applicable_entities, []),
    createdBy: row.created_by, createdAt: row.created_at,
    updatedAt: row.updated_at, deletedAt: row.deleted_at || null,
    updatedBy: d.updatedBy || '', deletedBy: d.deletedBy || '',
  }
}

function packData(a) {
  return JSON.stringify({
    type: a.type, ownerEmail: a.ownerEmail, custodian: a.custodian,
    entityId: a.entityId, vendor: a.vendor, version: a.version,
    serialNumber: a.serialNumber, purchaseDate: a.purchaseDate,
    tags: a.tags || [], notes: a.notes || '',
    linkedPolicies: a.linkedPolicies || [],
    protection: a.protection || null,
    dependsOn: a.dependsOn || [],
    updatedBy: a.updatedBy || '', deletedBy: a.deletedBy || '',
  })
}

/** Alle nicht gelöschten Assets inkl. berechneter Vererbung. */
async function activeAnnotated() {
  const rows = await getDb()('assets').whereNull('deleted_at')
  return protection.annotate(rows.map(rowToAsset))
}

/** Hält `classification` (Altfeld) und `protection.c` konsistent. */
function syncClassification(item, rawProtection) {
  const explicitC = protection.normalizeLevel(rawProtection && rawProtection.c)
  if (explicitC !== null) {
    item.classification = protection.LEVEL_TO_CLASSIFICATION[explicitC]
  } else {
    item.protection.c = protection.CLASSIFICATION_TO_LEVEL[item.classification] ?? item.protection.c
  }
}

module.exports = {
  init: async () => { await initDb() },

  getAll: async ({ category, type, classification, criticality, status, entityId,
                   minC, minI, minA, minAuth, dependsOn } = {}) => {
    // Vererbung braucht den vollständigen Graphen, daher erst annotieren, dann filtern
    let list = await activeAnnotated()
    if (category) list = list.filter(i => i.category === category)
    if (classification) list = list.filter(i => i.classification === classification)
    if (criticality) list = list.filter(i => i.criticality === criticality)
    if (status) list = list.filter(i => i.status === status)
    if (type) list = list.filter(i => i.type === type)
    if (entityId) list = list.filter(i => i.entityId === entityId)
    if (dependsOn) list = list.filter(i => i.dependsOn.includes(dependsOn))

    const minima = { c: minC, i: minI, a: minA, auth: minAuth }
    for (const [goal, raw] of Object.entries(minima)) {
      const min = protection.normalizeLevel(raw)
      if (min === null) continue
      list = list.filter(i => (i.effectiveProtection[goal] ?? 0) >= min)
    }
    return list
  },

  getById: async (id) => {
    const list = await activeAnnotated()
    return list.find(a => a.id === id) || null
  },

  getGraph: async () => {
    const rows = await getDb()('assets').whereNull('deleted_at')
    return protection.buildGraph(rows.map(rowToAsset))
  },

  validateDependencies: async (id, rawDependsOn) => {
    const rows = await getDb()('assets').whereNull('deleted_at')
    const list = rows.map(rowToAsset)
    const dependsOn = protection.normalizeDependsOn(rawDependsOn, id)

    const unknown = protection.findUnknownDependencies(list, dependsOn)
    if (unknown.length) return { ok: false, error: 'Unbekannte Abhängigkeiten', unknown }
    if (id && protection.wouldCreateCycle(list, id, dependsOn)) {
      return { ok: false, error: 'Zirkuläre Abhängigkeit' }
    }
    return { ok: true, dependsOn }
  },

  create: async (data, { createdBy } = {}) => {
    const a = {
      id: makeId(),
      name: data.name || '', category: data.category || 'hardware',
      type: data.type || '', description: data.description || '',
      owner: data.owner || '', ownerEmail: data.ownerEmail || '',
      custodian: data.custodian || '', entityId: data.entityId || '',
      location: data.location || '',
      classification: data.classification || 'internal',
      criticality: data.criticality || 'medium',
      status: data.status || 'active',
      vendor: data.vendor || '', version: data.version || '',
      serialNumber: data.serialNumber || '', purchaseDate: data.purchaseDate || '',
      endOfLifeDate: data.endOfLifeDate || '',
      tags: Array.isArray(data.tags) ? data.tags : (data.tags ? String(data.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
      notes: data.notes || '',
      linkedControls: Array.isArray(data.linkedControls) ? data.linkedControls : [],
      linkedPolicies: Array.isArray(data.linkedPolicies) ? data.linkedPolicies : [],
      protection: protection.normalizeProtection(data.protection, data.classification || 'internal'),
      dependsOn: protection.normalizeDependsOn(data.dependsOn, null),
      createdBy: createdBy || 'system',
    }
    syncClassification(a, data.protection)
    const now = nowISO()
    await getDb()('assets').insert({
      id: a.id, name: a.name, description: a.description,
      category: a.category, classification: a.classification,
      criticality: a.criticality, owner: a.owner, location: a.location,
      eol_date: a.endOfLifeDate || null, status: a.status,
      applicable_entities: JSON.stringify(data.applicableEntities || []),
      linked_controls: JSON.stringify(a.linkedControls),
      data: packData(a), created_by: a.createdBy, created_at: now, updated_at: now,
    })
    const list = await activeAnnotated()
    return list.find(x => x.id === a.id) || { ...a, createdAt: now, updatedAt: now }
  },

  update: async (id, patch, { changedBy } = {}) => {
    const row = await getDb()('assets').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const a = rowToAsset(row)
    const allowed = ['name','category','type','description','owner','ownerEmail','custodian','entityId',
      'location','classification','criticality','status','vendor','version','serialNumber',
      'purchaseDate','endOfLifeDate','tags','notes','linkedControls','linkedPolicies']
    for (const k of allowed) {
      if (patch[k] !== undefined) a[k] = patch[k]
    }
    if (patch.tags !== undefined && !Array.isArray(a.tags)) {
      a.tags = String(a.tags).split(',').map(t => t.trim()).filter(Boolean)
    }

    // Schutzziele: fehlende Werte aus dem bisherigen Stand bzw. der Klassifizierung
    a.protection = protection.normalizeProtection(
      patch.protection !== undefined ? patch.protection : a.protection,
      a.classification,
    )
    if (patch.protection !== undefined || patch.classification !== undefined) {
      syncClassification(a, patch.protection)
    }
    if (patch.dependsOn !== undefined) {
      a.dependsOn = protection.normalizeDependsOn(patch.dependsOn, id)
    }

    a.updatedAt = nowISO()
    if (changedBy) a.updatedBy = changedBy
    await getDb()('assets').where('id', id).update({
      name: a.name, description: a.description, category: a.category,
      classification: a.classification, criticality: a.criticality,
      owner: a.owner, location: a.location, status: a.status,
      eol_date: a.endOfLifeDate || null,
      linked_controls: JSON.stringify(a.linkedControls || []),
      data: packData(a), updated_at: a.updatedAt,
    })
    const list = await activeAnnotated()
    return list.find(x => x.id === id) || a
  },

  remove: async (id) => {
    const affected = await getDb()('assets').where('id', id).whereNull('deleted_at')
      .update({ deleted_at: nowISO() })
    return affected > 0
  },

  getSummary: async () => {
    const rows = await getDb()('assets').whereNull('deleted_at')
    const raw  = rows.map(rowToAsset)
    const list = protection.annotate(raw)
    const now = new Date()

    const byProtection = {
      c:    { 1: 0, 2: 0, 3: 0, 4: 0 },
      i:    { 1: 0, 2: 0, 3: 0, 4: 0 },
      a:    { 1: 0, 2: 0, 3: 0, 4: 0 },
      auth: { 1: 0, 2: 0, 3: 0, 4: 0 },
    }
    let protectionUnassessed = 0
    let inheritedAssets      = 0
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
    const in90 = new Date(now.getTime() + 90 * 86400000)
    const byCategory = { hardware: 0, software: 0, data: 0, service: 0, facility: 0 }
    const byClassification = { public: 0, internal: 0, confidential: 0, strictly_confidential: 0 }
    const byCriticality = { low: 0, medium: 0, high: 0, critical: 0 }
    let unclassified = 0, criticalUnclassified = 0, endOfLifeSoon = 0
    for (const a of list) {
      if (byCategory[a.category] !== undefined) byCategory[a.category]++
      if (byClassification[a.classification] !== undefined) byClassification[a.classification]++
      if (byCriticality[a.criticality] !== undefined) byCriticality[a.criticality]++
      // Einmal je Asset zählen (siehe assetStore.js — fehlende Werte wurden doppelt gezählt)
      if (!a.classification || byClassification[a.classification] === undefined || a.classification === 'public') {
        unclassified++
      }
      if ((a.criticality === 'critical' || a.criticality === 'high') && (!a.classification || a.classification === 'public')) criticalUnclassified++
      if (a.endOfLifeDate) {
        const eol = new Date(a.endOfLifeDate)
        if (eol >= now && eol <= in90) endOfLifeSoon++
      }
    }
    return {
      total: list.length,
      active: list.filter(i => i.status === 'active').length,
      decommissioned: list.filter(i => i.status === 'decommissioned').length,
      planned: list.filter(i => i.status === 'planned').length,
      unclassified, byCategory, byClassification, byCriticality,
      criticalUnclassified, endOfLifeSoon,
      byProtection, protectionUnassessed, inheritedAssets,
      withDependencies, dependencyEdges, authAssessed,
    }
  },

  ASSET_TYPES, CATEGORIES,
  PROTECTION_LEVELS: protection.PROTECTION_LEVELS,
  PROTECTION_GOALS:  protection.PROTECTION_GOALS,
}
