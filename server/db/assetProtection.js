// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Schutzziele (CIA + Authentizität), Asset-Abhängigkeiten und Vererbung.
//
// Vererbung folgt dem BSI-Maximumprinzip: Ein Asset erbt den höchsten
// Schutzbedarf aller Assets, die von ihm abhängen. Beispiel:
//   Anwendung "CRM" (C=4) --dependsOn--> DB-Server
//   => DB-Server wird effektiv auf C=4 hochgestuft.
//
// Backend-neutral: wird sowohl vom JSON- als auch vom Knex-Store genutzt.
'use strict'

const PROTECTION_GOALS = ['c', 'i', 'a', 'auth']

// 1–4 gemäß Issue #29; Authentizität ist optional (null = nicht bewertet)
const PROTECTION_LEVELS = {
  1: 'low',
  2: 'normal',
  3: 'high',
  4: 'very_high',
}

const CLASSIFICATION_TO_LEVEL = {
  public:                1,
  internal:              2,
  confidential:          3,
  strictly_confidential: 4,
}

const LEVEL_TO_CLASSIFICATION = {
  1: 'public',
  2: 'internal',
  3: 'confidential',
  4: 'strictly_confidential',
}

/** Erzwingt eine ganze Zahl im Bereich 1–4; alles andere ergibt null. */
function normalizeLevel(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return null
  if (n < 1) return 1
  if (n > 4) return 4
  return n
}

/**
 * Baut ein vollständiges protection-Objekt.
 * Fehlende C/I/A-Werte werden aus der Alt-Klassifizierung abgeleitet, damit
 * Bestandsdaten ohne Migrationslauf sinnvolle Schutzziele bekommen.
 */
function normalizeProtection(input, classification) {
  const src = input && typeof input === 'object' ? input : {}
  const fromClass = CLASSIFICATION_TO_LEVEL[classification] || 2

  return {
    c:    normalizeLevel(src.c) ?? fromClass,
    i:    normalizeLevel(src.i) ?? 2,
    a:    normalizeLevel(src.a) ?? 2,
    auth: normalizeLevel(src.auth),
  }
}

/** Dedupliziert, entfernt Leerwerte und Selbstbezug. */
function normalizeDependsOn(input, selfId) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const raw of input) {
    const id = String(raw || '').trim()
    if (!id || id === selfId || out.includes(id)) continue
    out.push(id)
  }
  return out
}

/**
 * Prüft, ob `dependsOn` für Asset `id` einen Zyklus erzeugen würde.
 * Folgt den Kanten ab den neuen Zielen; wird `id` erreicht, ist es ein Zyklus.
 */
function wouldCreateCycle(list, id, dependsOn) {
  const byId  = new Map(list.map(a => [a.id, a]))
  const seen  = new Set()
  const stack = [...(dependsOn || [])]

  while (stack.length) {
    const cur = stack.pop()
    if (cur === id) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    const asset = byId.get(cur)
    if (asset && Array.isArray(asset.dependsOn)) stack.push(...asset.dependsOn)
  }
  return false
}

/** Liefert die IDs aus `dependsOn`, zu denen es kein Asset gibt. */
function findUnknownDependencies(list, dependsOn) {
  const known = new Set(list.map(a => a.id))
  return (dependsOn || []).filter(depId => !known.has(depId))
}

/**
 * Berechnet effektive Schutzziele für alle Assets (BSI-Maximumprinzip) und
 * ergänzt jedes Asset um:
 *   effectiveProtection – Werte nach Vererbung
 *   protectionOrigins   – je Schutzziel die ID des Assets, dessen eigener Wert
 *                         den effektiven Wert bestimmt (= eigene ID, wenn nicht geerbt)
 *   requiredBy          – IDs der Assets, die direkt von diesem Asset abhängen
 *
 * Die Eingabeliste wird nicht verändert; es werden flache Kopien erzeugt.
 */
function annotate(list) {
  const assets = Array.isArray(list) ? list : []
  const byId   = new Map(assets.map(a => [a.id, a]))

  // Umgekehrte Kanten: wer hängt von wem ab
  const dependents = new Map()
  for (const asset of assets) {
    for (const depId of asset.dependsOn || []) {
      if (!byId.has(depId)) continue
      if (!dependents.has(depId)) dependents.set(depId, [])
      dependents.get(depId).push(asset.id)
    }
  }

  const memo     = new Map()
  const visiting = new Set()

  function resolve(id) {
    if (memo.has(id)) return memo.get(id)

    const asset = byId.get(id)
    if (!asset) return null

    const own = normalizeProtection(asset.protection, asset.classification)

    // Zyklenschutz: bei bereits importierten Altdaten kann trotz Schreibprüfung
    // ein Zyklus vorliegen — dann zählt nur der Eigenwert.
    if (visiting.has(id)) {
      return { values: own, origins: Object.fromEntries(PROTECTION_GOALS.map(g => [g, id])) }
    }
    visiting.add(id)

    const values  = { ...own }
    const origins = Object.fromEntries(PROTECTION_GOALS.map(g => [g, id]))

    for (const dependentId of dependents.get(id) || []) {
      const up = resolve(dependentId)
      if (!up) continue
      for (const goal of PROTECTION_GOALS) {
        const candidate = up.values[goal]
        if (candidate === null || candidate === undefined) continue
        if (values[goal] === null || values[goal] === undefined || candidate > values[goal]) {
          values[goal]  = candidate
          origins[goal] = up.origins[goal]
        }
      }
    }

    visiting.delete(id)
    const result = { values, origins }
    memo.set(id, result)
    return result
  }

  return assets.map(asset => {
    const resolved = resolve(asset.id)
    return {
      ...asset,
      protection:          normalizeProtection(asset.protection, asset.classification),
      dependsOn:           Array.isArray(asset.dependsOn) ? asset.dependsOn : [],
      effectiveProtection: resolved ? resolved.values  : normalizeProtection(asset.protection, asset.classification),
      protectionOrigins:   resolved ? resolved.origins : {},
      requiredBy:          dependents.get(asset.id) || [],
    }
  })
}

/** Wie annotate(), aber nur für ein Asset (Graph wird trotzdem vollständig ausgewertet). */
function annotateOne(list, id) {
  return annotate(list).find(a => a.id === id) || null
}

/**
 * Baut Knoten und Kanten für die Abhängigkeitsvisualisierung.
 * Kantenrichtung: from hängt ab von to (from --dependsOn--> to),
 * Vererbung fließt entgegengesetzt.
 */
function buildGraph(list) {
  const annotated = annotate(list)
  const known     = new Set(annotated.map(a => a.id))

  const nodes = annotated.map(a => ({
    id:                  a.id,
    name:                a.name,
    category:            a.category,
    criticality:         a.criticality,
    protection:          a.protection,
    effectiveProtection: a.effectiveProtection,
    protectionOrigins:   a.protectionOrigins,
    inherited:           PROTECTION_GOALS.some(g => a.protectionOrigins[g] && a.protectionOrigins[g] !== a.id),
    dependsOn:           a.dependsOn,
    requiredBy:          a.requiredBy,
  }))

  const edges = []
  for (const a of annotated) {
    for (const depId of a.dependsOn) {
      if (!known.has(depId)) continue
      edges.push({ from: a.id, to: depId })
    }
  }

  return { nodes, edges }
}

module.exports = {
  PROTECTION_GOALS,
  PROTECTION_LEVELS,
  CLASSIFICATION_TO_LEVEL,
  LEVEL_TO_CLASSIFICATION,
  normalizeLevel,
  normalizeProtection,
  normalizeDependsOn,
  wouldCreateCycle,
  findUnknownDependencies,
  annotate,
  annotateOne,
  buildGraph,
}
