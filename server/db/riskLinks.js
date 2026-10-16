// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Verknüpfungen eines Risikos mit Assets, Asset-Typen (Klassen) und Lieferanten (#92).
// Gemeinsam für JSON- und Knex-Store; gespeichert werden nur ID-Listen.
'use strict'

const LINK_FIELDS = ['linkedAssets', 'linkedAssetTypes', 'linkedSuppliers']

/** Nur nicht-leere Strings, ohne Duplikate; alles andere → []. */
function normalizeIds(v) {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()))]
}

/**
 * Filter für GET /risks. `asset` und `assetType` gelten gemeinsam als "betrifft dieses Asset":
 * direkt verknüpft ODER über die Asset-Klasse (Typ). `supplier` filtert getrennt.
 */
function matchesLinks(r, { asset, assetType, supplier } = {}) {
  if (asset || assetType) {
    const direct = asset     && (r.linkedAssets     || []).includes(asset)
    const viaTyp = assetType && (r.linkedAssetTypes || []).includes(assetType)
    if (!direct && !viaTyp) return false
  }
  if (supplier && !(r.linkedSuppliers || []).includes(supplier)) return false
  return true
}

module.exports = { LINK_FIELDS, normalizeIds, matchesLinks }
