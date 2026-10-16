'use strict'
// Verknüpfungen Risiko ↔ Asset / Asset-Typ / Lieferant (#92).
const { normalizeIds, matchesLinks } = require('../server/db/riskLinks')

describe('riskLinks', () => {
  test('normalizeIds: nur nicht-leere Strings, ohne Duplikate', () => {
    expect(normalizeIds(['a', ' b ', 'a', '', '  ', 5, null, {}])).toEqual(['a', 'b'])
    expect(normalizeIds(undefined)).toEqual([])
    expect(normalizeIds('abc')).toEqual([])
  })

  test('matchesLinks: Asset direkt oder über den Asset-Typ', () => {
    const r = { linkedAssets: ['a1'], linkedAssetTypes: ['server'], linkedSuppliers: ['s1'] }
    expect(matchesLinks(r, { asset: 'a1' })).toBe(true)
    expect(matchesLinks(r, { asset: 'a2' })).toBe(false)
    expect(matchesLinks(r, { asset: 'a2', assetType: 'server' })).toBe(true)
    expect(matchesLinks(r, { assetType: 'laptop' })).toBe(false)
  })

  test('matchesLinks: Lieferant und Kombination', () => {
    const r = { linkedAssets: ['a1'], linkedSuppliers: ['s1'] }
    expect(matchesLinks(r, { supplier: 's1' })).toBe(true)
    expect(matchesLinks(r, { supplier: 's2' })).toBe(false)
    expect(matchesLinks(r, { asset: 'a1', supplier: 's2' })).toBe(false)
    expect(matchesLinks({}, {})).toBe(true)
    expect(matchesLinks({}, { asset: 'a1' })).toBe(false)
  })
})
