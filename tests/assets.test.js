'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let assetId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-assets'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie  = await loginAs(app, 'admin')
  editorCookie = await loginAs(app, 'editor')
  readerCookie = await loginAs(app, 'reader')
})

afterAll(async () => {
  removeTestDataDir(dataDir)
})

describe('Asset Management CRUD', () => {
  test('GET /assets – leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/assets')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('GET /assets/summary – Zusammenfassung', async () => {
    const res = await authedGet(app, readerCookie, '/assets/summary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('byCategory')
    expect(res.body).toHaveProperty('byClassification')
    expect(res.body).toHaveProperty('byCriticality')
    expect(res.body).toHaveProperty('endOfLifeSoon')
    expect(res.body).toHaveProperty('criticalUnclassified')
  })

  test('reader darf NICHT erstellen (403)', async () => {
    const res = await authedPost(app, readerCookie, '/assets', {
      name: 'Test Asset', category: 'hardware', criticality: 'low',
    })
    expect(res.status).toBe(403)
  })

  test('POST /assets – editor erstellt Asset', async () => {
    const res = await authedPost(app, editorCookie, '/assets', {
      name:           'Testserver Werk 2',
      category:       'hardware',
      type:           'hardware_server',
      description:    'Testserver für Integrationstests',
      classification: 'confidential',
      criticality:    'high',
      status:         'active',
      owner:          'Max Mustermann',
      ownerEmail:     'max@test.local',
      custodian:      'IT-Betrieb',
      vendor:         'HPE',
      version:        'DL380 Gen10',
      serialNumber:   'SRV-TEST-001',
      location:       'RZ Test, Rack A-01',
      purchaseDate:   '2024-01-01',
      endOfLifeDate:  '2029-12-31',
      tags:           ['test', 'server'],
      notes:          'Nur für Tests',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^asset_/)
    expect(res.body.name).toBe('Testserver Werk 2')
    expect(res.body.classification).toBe('confidential')
    expect(res.body.criticality).toBe('high')
    assetId = res.body.id
  })

  test('GET /assets – Liste enthält das neue Asset', async () => {
    const res = await authedGet(app, readerCookie, '/assets')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some(a => a.id === assetId)).toBe(true)
  })

  test('GET /assets/:id – einzelnes Asset', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${assetId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(assetId)
    expect(res.body.name).toBe('Testserver Werk 2')
    expect(res.body.owner).toBe('Max Mustermann')
  })

  test('GET /assets/:id – 404 bei unbekannter ID', async () => {
    const res = await authedGet(app, readerCookie, '/assets/asset_000000xx')
    expect(res.status).toBe(404)
  })

  test('PUT /assets/:id – editor aktualisiert Asset', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${assetId}`, {
      name:     'Testserver Werk 2 (aktualisiert)',
      status:   'planned',
      notes:    'Aktualisierte Notiz',
    })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Testserver Werk 2 (aktualisiert)')
    expect(res.body.status).toBe('planned')
  })

  test('GET /assets mit Filter category=hardware', async () => {
    const res = await authedGet(app, readerCookie, '/assets?category=hardware')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.every(a => a.category === 'hardware')).toBe(true)
  })

  test('GET /assets mit Filter status=planned', async () => {
    const res = await authedGet(app, readerCookie, '/assets?status=planned')
    expect(res.status).toBe(200)
    expect(res.body.some(a => a.id === assetId)).toBe(true)
  })

  test('GET /assets/summary – zählt korrekten Total', async () => {
    const res = await authedGet(app, readerCookie, '/assets/summary')
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
  })

  test('editor darf NICHT löschen (403)', async () => {
    const res = await authedDelete(app, editorCookie, `/assets/${assetId}`)
    expect(res.status).toBe(403)
  })

  test('DELETE /assets/:id – admin löscht (soft-delete)', async () => {
    const res = await authedDelete(app, adminCookie, `/assets/${assetId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('GET /assets/:id – 404 nach soft-delete', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${assetId}`)
    expect(res.status).toBe(404)
  })

  test('GET /assets enthält gelöschtes Asset nicht mehr', async () => {
    const res = await authedGet(app, readerCookie, '/assets')
    expect(res.status).toBe(200)
    expect(res.body.some(a => a.id === assetId)).toBe(false)
  })

  test('DELETE /assets/:id – 404 bei unbekannter ID', async () => {
    const res = await authedDelete(app, adminCookie, '/assets/asset_000000xx')
    expect(res.status).toBe(404)
  })

  test('unauthentifizierter Zugriff gesperrt (401)', async () => {
    const request = require('supertest')
    const res = await request(app).get('/assets')
    expect([401, 403]).toContain(res.status)
  })
})

describe('Schutzziele (CIA + Authentizität)', () => {
  let id

  test('Asset ohne protection erbt C aus der Klassifizierung (Altdaten-Migration)', async () => {
    const res = await authedPost(app, editorCookie, '/assets', {
      name: 'Altbestand ohne Schutzziele', category: 'data', classification: 'confidential',
    })
    expect(res.status).toBe(201)
    expect(res.body.protection.c).toBe(3)      // confidential -> 3
    expect(res.body.protection.i).toBe(2)      // Default normal
    expect(res.body.protection.a).toBe(2)
    expect(res.body.protection.auth).toBeNull() // optional, nicht bewertet
    id = res.body.id
  })

  test('Schutzziele explizit setzen zieht classification nach', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${id}`, {
      protection: { c: 4, i: 3, a: 1, auth: 2 },
    })
    expect(res.status).toBe(200)
    expect(res.body.protection).toEqual({ c: 4, i: 3, a: 1, auth: 2 })
    expect(res.body.classification).toBe('strictly_confidential')
  })

  test('classification ändern zieht protection.c nach', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${id}`, { classification: 'public' })
    expect(res.status).toBe(200)
    expect(res.body.protection.c).toBe(1)
    expect(res.body.protection.i).toBe(3)   // andere Ziele bleiben unberührt
  })

  test('Werte außerhalb 1–4 werden begrenzt, Unsinn ergibt Default', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${id}`, {
      protection: { c: 9, i: -3, a: 'abc', auth: null },
    })
    expect(res.status).toBe(200)
    expect(res.body.protection.c).toBe(4)
    expect(res.body.protection.i).toBe(1)
    expect(res.body.protection.a).toBe(2)     // ungültig -> Default normal
    expect(res.body.protection.auth).toBeNull()
  })

  test('unclassified zählt jedes Asset höchstens einmal', async () => {
    // Asset ganz ohne classification traf früher zwei Bedingungen und wurde doppelt gezählt
    const before = (await authedGet(app, readerCookie, '/assets/summary')).body.unclassified
    const created = await authedPost(app, editorCookie, '/assets', { name: 'Ohne Klassifizierung', category: 'data' })
    await authedPut(app, editorCookie, `/assets/${created.body.id}`, { classification: 'public' })

    const after = (await authedGet(app, readerCookie, '/assets/summary')).body
    expect(after.unclassified).toBe(before + 1)
    expect(after.unclassified).toBeLessThanOrEqual(after.total)
    await authedDelete(app, adminCookie, `/assets/${created.body.id}`)
  })

  test('summary enthält Schutzziel-Kennzahlen', async () => {
    const res = await authedGet(app, readerCookie, '/assets/summary')
    expect(res.status).toBe(200)
    expect(res.body.byProtection).toHaveProperty('c')
    expect(res.body.byProtection).toHaveProperty('auth')
    expect(res.body).toHaveProperty('inheritedAssets')
    expect(res.body).toHaveProperty('dependencyEdges')
  })

  afterAll(async () => {
    if (id) await authedDelete(app, adminCookie, `/assets/${id}`)
  })
})

describe('Asset-Abhängigkeiten und Vererbung (BSI-Maximumprinzip)', () => {
  // AlxBes Beispiel aus Issue #29:
  //   CRM --dependsOn--> DB-Server --dependsOn--> Container --dependsOn--> AWS
  //   Logserver --dependsOn--> AWS
  let crm, db, container, aws, logserver

  async function mkAsset(name, category, prot, dependsOn) {
    const res = await authedPost(app, editorCookie, '/assets', {
      name, category, protection: prot, dependsOn: dependsOn || [],
    })
    expect(res.status).toBe(201)
    return res.body.id
  }

  beforeAll(async () => {
    aws       = await mkAsset('AWS-Account', 'service',  { c: 1, i: 1, a: 1 })
    container = await mkAsset('Container',   'software', { c: 1, i: 1, a: 1 }, [aws])
    db        = await mkAsset('DB-Server',   'hardware', { c: 2, i: 2, a: 1 }, [container])
    crm       = await mkAsset('CRM',         'software', { c: 4, i: 3, a: 2 }, [db])
    logserver = await mkAsset('Logserver',   'hardware', { c: 2, i: 4, a: 2 }, [aws])
  })

  test('direkte Vererbung: DB-Server erbt C=4 vom CRM', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${db}`)
    expect(res.status).toBe(200)
    expect(res.body.protection.c).toBe(2)              // Eigenwert unverändert
    expect(res.body.effectiveProtection.c).toBe(4)     // geerbt
    expect(res.body.protectionOrigins.c).toBe(crm)
  })

  test('transitive Vererbung: Container erbt über DB-Server hinweg', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${container}`)
    expect(res.body.effectiveProtection.c).toBe(4)
    expect(res.body.effectiveProtection.i).toBe(3)
    expect(res.body.protectionOrigins.c).toBe(crm)
  })

  test('Vererbung je Schutzziel aus unterschiedlichen Quellen', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${aws}`)
    expect(res.body.effectiveProtection.c).toBe(4)     // vom CRM
    expect(res.body.protectionOrigins.c).toBe(crm)
    expect(res.body.effectiveProtection.i).toBe(4)     // vom Logserver
    expect(res.body.protectionOrigins.i).toBe(logserver)
  })

  test('Vererbung fließt nicht in die Gegenrichtung', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${crm}`)
    expect(res.body.effectiveProtection).toEqual({ c: 4, i: 3, a: 2, auth: null })
    expect(res.body.protectionOrigins.c).toBe(crm)     // nichts geerbt
  })

  test('requiredBy zeigt die abhängigen Assets', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${aws}`)
    expect(res.body.requiredBy).toEqual(expect.arrayContaining([container, logserver]))
  })

  test('Wertänderung an der Quelle schlägt sofort durch', async () => {
    await authedPut(app, editorCookie, `/assets/${crm}`, { protection: { c: 4, i: 3, a: 4 } })
    const res = await authedGet(app, readerCookie, `/assets/${aws}`)
    expect(res.body.effectiveProtection.a).toBe(4)
    expect(res.body.protectionOrigins.a).toBe(crm)
  })

  test('unbekannte Abhängigkeit wird abgelehnt (400)', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${db}`, {
      dependsOn: ['asset_doesnotexist'],
    })
    expect(res.status).toBe(400)
    expect(res.body.unknown).toContain('asset_doesnotexist')
  })

  test('Selbstbezug wird stillschweigend entfernt', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${logserver}`, {
      dependsOn: [aws, logserver],
    })
    expect(res.status).toBe(200)
    expect(res.body.dependsOn).toEqual([aws])
  })

  test('direkter Zyklus wird abgelehnt (400)', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${db}`, { dependsOn: [crm] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/[Zz]irkul/)
  })

  test('transitiver Zyklus wird abgelehnt (400)', async () => {
    // AWS ist am Ende der Kette; eine Abhängigkeit zum CRM schlösse den Kreis
    const res = await authedPut(app, editorCookie, `/assets/${aws}`, { dependsOn: [crm] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/[Zz]irkul/)
  })

  test('Mehrfach-Abhängigkeiten und Duplikate', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${crm}`, {
      dependsOn: [db, logserver, db],
    })
    expect(res.status).toBe(200)
    expect(res.body.dependsOn).toEqual([db, logserver])
  })

  test('Filter minC liefert nur Assets ab effektiv C=4', async () => {
    const res = await authedGet(app, readerCookie, '/assets?minC=4')
    expect(res.status).toBe(200)
    const ids = res.body.map(a => a.id)
    expect(ids).toEqual(expect.arrayContaining([crm, db, container, aws]))
    expect(res.body.every(a => a.effectiveProtection.c >= 4)).toBe(true)
  })

  test('GET /assets/graph liefert Knoten und Kanten', async () => {
    const res = await authedGet(app, readerCookie, '/assets/graph')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.nodes)).toBe(true)
    expect(Array.isArray(res.body.edges)).toBe(true)
    expect(res.body.edges).toContainEqual({ from: container, to: aws })
    const awsNode = res.body.nodes.find(n => n.id === aws)
    expect(awsNode.inherited).toBe(true)
  })

  test('gelöschtes Asset verschwindet aus dem Graphen', async () => {
    await authedDelete(app, adminCookie, `/assets/${logserver}`)
    const res = await authedGet(app, readerCookie, '/assets/graph')
    expect(res.body.nodes.some(n => n.id === logserver)).toBe(false)
    expect(res.body.edges.some(e => e.from === logserver || e.to === logserver)).toBe(false)
  })

  test('nach Löschen der Quelle entfällt die geerbte Erhöhung', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${aws}`)
    expect(res.body.effectiveProtection.i).toBe(3)   // Logserver-I=4 ist weg, CRM-I=3 bleibt
    expect(res.body.protectionOrigins.i).toBe(crm)
  })

  afterAll(async () => {
    for (const assetId of [crm, db, container, aws]) {
      if (assetId) await authedDelete(app, adminCookie, `/assets/${assetId}`)
    }
  })
})
