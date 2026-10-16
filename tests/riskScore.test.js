'use strict'
// Gemeinsame Risikobewertung (#94): aktuell, inhärent, Ziel.
const { calcScore, riskLevel, optRating, derivedRatings } = require('../server/db/riskScore')

describe('riskScore', () => {
  test('Stufen-Schwellen', () => {
    expect([1, 4, 5, 9, 10, 14, 15, 25].map(riskLevel))
      .toEqual(['low', 'low', 'medium', 'medium', 'high', 'high', 'critical', 'critical'])
  })

  test('calcScore begrenzt auf 1–5, fehlende Werte zählen als 1', () => {
    expect(calcScore({ probability: 9, impact: 9 })).toBe(25)
    expect(calcScore({ probability: 0, impact: 'x' })).toBe(1)
    expect(calcScore({})).toBe(1)
  })

  test('optRating: leer → null, sonst 1–5', () => {
    expect(optRating(undefined)).toBeNull()
    expect(optRating(null)).toBeNull()
    expect(optRating('')).toBeNull()
    expect(optRating('abc')).toBeNull()
    expect(optRating('3')).toBe(3)
    expect(optRating(99)).toBe(5)
    expect(optRating(0)).toBe(1)
  })

  test('derivedRatings: nur mit beiden Werten, sonst null', () => {
    expect(derivedRatings({ inherentProbability: 5, inherentImpact: 3 }))
      .toEqual({ inherentScore: 15, inherentLevel: 'critical', targetScore: null, targetLevel: null })
    expect(derivedRatings({ targetProbability: 2 }).targetScore).toBeNull()
    expect(derivedRatings({ targetProbability: 2, targetImpact: 2 }).targetLevel).toBe('low')
  })
})
