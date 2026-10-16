// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gemeinsame Risikobewertung für JSON- und Knex-Store (#94).
// Wahrscheinlichkeit × Auswirkung (je 1–5) → Score 1–25 → Stufe.
'use strict'

function clamp(v) { return Math.min(5, Math.max(1, parseInt(v) || 1)) }

function riskLevel(score) {
  if (score <= 4)  return 'low'
  if (score <= 9)  return 'medium'
  if (score <= 14) return 'high'
  return 'critical'
}

/** Score des aktuellen Risikos (probability × impact); fehlende Werte zählen als 1. */
function calcScore(r) {
  return clamp(r.probability) * clamp(r.impact)
}

/** Optionale Bewertung (Inherent / Ziel): leer → null, sonst auf 1–5 begrenzt. */
function optRating(v) {
  if (v === undefined || v === null || v === '') return null
  const n = parseInt(v)
  return Number.isNaN(n) ? null : clamp(n)
}

const OPTIONAL_RATINGS = ['inherentProbability', 'inherentImpact', 'targetProbability', 'targetImpact']

/** Score/Stufe für ein Wertepaar; null, wenn eines der beiden Felder fehlt. */
function pairScore(p, i) {
  return (p == null || i == null) ? null : clamp(p) * clamp(i)
}

/**
 * Berechnete Felder für Inherent- und Zielbewertung. Nichts davon wird
 * gespeichert — nur die vier Eingabewerte.
 */
function derivedRatings(r) {
  const inherentScore = pairScore(r.inherentProbability, r.inherentImpact)
  const targetScore   = pairScore(r.targetProbability,   r.targetImpact)
  return {
    inherentScore,
    inherentLevel: inherentScore == null ? null : riskLevel(inherentScore),
    targetScore,
    targetLevel:   targetScore   == null ? null : riskLevel(targetScore),
  }
}

module.exports = { clamp, riskLevel, calcScore, optRating, OPTIONAL_RATINGS, derivedRatings }
