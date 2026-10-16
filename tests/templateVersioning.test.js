'use strict'
// Dokument-Versionierung (#97): reine Logik, ohne Server.
const { everApproved, nextApprovalVersion, applyApproval, versionTable, contentChangeBlocked } = require('../server/db/templateVersioning')

const doc = (over = {}) => ({ version: 1, status: 'draft', title: 'T', content: 'c', statusHistory: [], versionHistory: [], ...over })

describe('templateVersioning', () => {
  test('erste Freigabe behält die Nummer, jede weitere zählt hoch', () => {
    const t = doc({ version: 4 })
    expect(everApproved(t)).toBe(false)
    expect(nextApprovalVersion(t)).toBe(4)
    applyApproval(t, { approvedBy: 'alice', changes: ' erste ', now: '2026-10-16T10:00:00Z' })
    expect(t.version).toBe(4)
    expect(nextApprovalVersion(t)).toBe(5)
    applyApproval(t, { approvedBy: 'bob', now: '2026-11-01T10:00:00Z' })
    expect(t.version).toBe(5)
    expect(t.versionHistory.map(v => [v.version, v.approvedBy, v.changes])).toEqual([[4, 'alice', 'erste'], [5, 'bob', '']])
  })

  test('Altbestand: früher freigegeben (nur Status-Historie) zählt als freigegeben', () => {
    const t = doc({ version: 7, status: 'review', statusHistory: [{ status: 'approved', changedBy: 'x', changedAt: 'z' }] })
    expect(everApproved(t)).toBe(true)
    expect(nextApprovalVersion(t)).toBe(8)
  })

  test('Versionstabelle: Snapshot raus, Altbestand aus der Status-Historie abgeleitet', () => {
    const t = doc({ version: 3, status: 'approved', statusHistory: [
      { status: 'draft', changedBy: 'a', changedAt: '1' }, { status: 'approved', changedBy: 'carol', changedAt: '2026-01-01T00:00:00Z' }] })
    expect(versionTable(t)).toEqual([{ version: 3, approvedBy: 'carol', approvedAt: '2026-01-01T00:00:00Z', changes: '', legacy: true }])
    applyApproval(doc(), { approvedBy: 'x', now: 'n' })
    const t2 = doc(); applyApproval(t2, { approvedBy: 'x', now: 'n' })
    expect(versionTable(t2)[0].content).toBeUndefined()
  })

  test('Sperre gilt nur für Titel/Inhalt freigegebener Dokumente und nur bei echter Änderung', () => {
    const approved = doc({ status: 'approved' })
    expect(contentChangeBlocked(approved, { content: 'neu' })).toBe(true)
    expect(contentChangeBlocked(approved, { title: 'Neu' })).toBe(true)
    expect(contentChangeBlocked(approved, { title: 'T', content: 'c' })).toBe(false)
    expect(contentChangeBlocked(approved, {})).toBe(false)
    expect(contentChangeBlocked(doc({ status: 'review' }), { content: 'neu' })).toBe(false)
  })
})
