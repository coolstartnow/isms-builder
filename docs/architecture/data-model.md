# ISMS Builder – Data Model

All data is stored as JSON files in `data/`. The SQLite backend mirrors the same schema.
Soft-delete: records are never physically removed — `deletedAt` marks them as deleted.

---

## Common Fields (all modules)

| Field | Type | Description |
|---|---|---|
| `id` | string | `Date.now().toString(36) + random` — URL-safe, sortable |
| `createdAt` | ISO 8601 | Creation timestamp |
| `updatedAt` | ISO 8601 | Last modification timestamp |
| `deletedAt` | ISO 8601 \| null | Soft-delete marker; null = active |
| `deletedBy` | string \| null | Username who deleted the record |
| `linkedControls` | string[] | SoA Control IDs (e.g. `["ISO-5.9", "BSI-ORP.3"]`) |
| `linkedPolicies` | string[] | Template IDs of linked policy documents |

---

## Users (`data/rbac_users.json`)

```json
{
  "admin": {
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "domain": "Global",
    "passwordHash": "$2a$10$...",
    "totpSecret": "",
    "totpVerified": false,
    "sections": []
  }
}
```

**Roles & Ranks:**

| Role | Rank | Capabilities |
|---|---|---|
| `reader` / `revision` | 1 | Read all modules |
| `editor` / `dept_head` / `qmb` | 2 | + Create/edit content |
| `contentowner` / `auditor` | 3 | + Approve, CISO/DSB settings |
| `admin` | 4 | + User management, delete, system config |

---

## Templates (`data/templates.json`)

```json
{
  "id": "abc123",
  "type": "Richtlinie",
  "language": "de",
  "title": "Passwort-Richtlinie",
  "content": "## Inhalt …",
  "owner": "admin",
  "version": 3,
  "status": "approved",
  "statusHistory": [
    { "status": "draft", "changedBy": "admin", "changedAt": "2026-01-01T10:00:00Z" }
  ],
  "parentId": null,
  "sortOrder": 0,
  "nextReviewDate": "2027-01-01",
  "applicableEntities": ["entity-1"],
  "linkedControls": ["ISO-5.1", "ISO-5.2"],
  "attachments": [
    { "id": "att1", "originalName": "policy.pdf", "storedName": "att1.pdf", "size": 102400 }
  ],
  "createdAt": "2026-01-01T09:00:00Z",
  "updatedAt": "2026-03-01T12:00:00Z",
  "deletedAt": null
}
```

**Lifecycle states:** `draft` → `review` → `approved` → `archived`

---

## SoA Controls (`data/soa.json`)

```json
{
  "ISO-5.1": {
    "id": "ISO-5.1",
    "framework": "ISO27001",
    "theme": "Organisatorische Maßnahmen",
    "title": "Informationssicherheitsrichtlinien",
    "applicable": true,
    "status": "implemented",
    "owner": "admin",
    "justification": "Pflichtanforderung ISO 27001",
    "linkedTemplates": ["abc123"],
    "applicableEntities": []
  }
}
```

**Status values:** `not_started` | `in_progress` | `implemented` | `not_applicable`

---

## Risks (`data/risks.json`)

```json
{
  "id": "risk-1",
  "title": "Ransomware-Angriff",
  "category": "Cyberangriff",
  "description": "…",
  "probability": 3,
  "impact": 5,
  "score": 15,
  "inherentProbability": 5,
  "inherentImpact": 5,
  "targetProbability": 2,
  "targetImpact": 3,
  "treatment": "mitigate",
  "status": "open",
  "owner": "admin",
  "linkedControls": ["ISO-5.29"],
  "linkedTemplates": ["abc123"],
  "linkedAssets": ["asset-1"],
  "linkedAssetTypes": ["hardware_server"],
  "linkedSuppliers": ["supplier-1"],
  "treatments": [
    { "id": "t1", "description": "EDR einführen", "dueDate": "2026-06-01", "status": "in_progress" }
  ]
}
```

`score` und `riskLevel` (low/medium/high/critical) sind berechnet (Wahrscheinlichkeit × Auswirkung,
Schwellen ≤4 / ≤9 / ≤14 / darüber). Die vier Felder `inherent*` und `target*` sind optional (1–5 oder
`null`); `inherentScore`/`inherentLevel` und `targetScore`/`targetLevel` werden daraus berechnet und
nicht gespeichert (V 1.60). Bei SQLite/PostgreSQL liegen sie im JSON-Blob der Spalte `treatments`.
`linkedAssets`, `linkedAssetTypes` und `linkedSuppliers` sind ID-Listen (V 1.60); `GET /risks` filtert über
`?asset=`, `?assetType=` und `?supplier=`.

---

## Assets (`data/assets.json`)

```json
{
  "id": "asset-1",
  "name": "SAP S/4HANA",
  "category": "software",
  "type": "ERP-System",
  "classification": "confidential",
  "criticality": "critical",
  "owner": "IT-Leitung",
  "location": "RZ Frankfurt",
  "status": "active",
  "endOfLifeDate": "2029-12-31",
  "entityId": "entity-1",
  "linkedControls": ["ISO-5.9", "ISO-5.10"],
  "linkedPolicies": ["abc123"]
}
```

**Categories:** `hardware` | `software` | `data` | `service` | `facility`
**Classification:** `public` | `internal` | `confidential` | `strictly_confidential`
**Criticality:** `low` | `medium` | `high` | `critical`

---

## BCM (`data/bcm.json`)

```json
{
  "bia": [{
    "id": "bia-1",
    "title": "ERP-System SAP",
    "processOwner": "IT-Leitung",
    "criticality": "critical",
    "rto": 4,
    "rpo": 1,
    "mtpd": 24,
    "dependencies": ["Netzwerk", "Strom"],
    "status": "approved",
    "linkedControls": ["ISO-5.29"],
    "linkedPolicies": []
  }],
  "plans": [{
    "id": "plan-1",
    "title": "IT-Wiederanlaufplan SAP",
    "type": "itp",
    "status": "tested",
    "testResult": "pass",
    "lastTested": "2025-12-01",
    "nextTest": "2026-06-01",
    "linkedBiaIds": ["bia-1"],
    "attachments": []
  }],
  "exercises": [{
    "id": "ex-1",
    "title": "Tabletop Ransomware",
    "type": "tabletop",
    "date": "2025-09-15",
    "result": "pass",
    "linkedPlanId": "plan-1"
  }]
}
```

---

## Governance (`data/governance.json`)

```json
{
  "reviews": [{
    "id": "rev-1",
    "title": "Management Review 2025",
    "type": "annual",
    "date": "2025-11-15",
    "status": "approved",
    "chair": "Dr. Müller (CEO)",
    "decisions": "…",
    "attachments": [],
    "linkedControls": ["ISO-9.3"]
  }],
  "actions": [{
    "id": "act-1",
    "title": "Penetrationstest durchführen",
    "source": "management_review",
    "priority": "high",
    "status": "in_progress",
    "owner": "CISO",
    "dueDate": "2026-06-30",
    "progress": 40
  }],
  "meetings": [{
    "id": "meet-1",
    "title": "ISMS-Ausschuss Q1/2026",
    "committee": "isms_committee",
    "date": "2026-03-01",
    "approved": true,
    "attachments": []
  }]
}
```

---

## GDPR (`data/gdpr/*.json`)

Nine sub-modules, each in its own file:

| File | Content |
|---|---|
| `vvt.json` | Verarbeitungsverzeichnis (Art. 30 DSGVO) |
| `av.json` | Auftragsverarbeitungsverträge (Art. 28) |
| `dsfa.json` | Datenschutz-Folgenabschätzungen (Art. 35) |
| `toms.json` | Technische & organisatorische Maßnahmen |
| `incidents.json` | Datenpannen (Art. 33/34) |
| `dsar.json` | Betroffenenanfragen (Art. 15–22) |
| `dsb.json` | DSB-Kontaktdaten |
| `deletion-log.json` | Art. 17 Löschprotokoll |
| `policies.json` | Datenschutzrichtlinien |

---

## Entities (`data/entities.json`)

```json
[{
  "id": "entity-1",
  "name": "Mustermann AG",
  "short": "MAG",
  "type": "holding",
  "parentId": null,
  "sortOrder": 0
}]
```

---

## Org Settings (`data/org-settings.json`)

Top-level keys: `orgName`, `orgShort`, `ismsScope`, `logoText`, `require2FA`,
`cisoName`, `cisoEmail`, `gdpoName`, `gdpoEmail`, `icsContact`,
`modules` (object, all boolean), `soaFrameworks` (object, all boolean),
`cisoSettings`, `gdpoSettings`, `icsSettings`, `revisionSettings`, `qmSettings`

---

## ID Format

All record IDs are generated as:
```js
Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
// example: "lx3k8fab2c"
```
This gives ~36-bit entropy, URL-safe, roughly time-sortable, no external dependency.

---

## Entity-Relationship Overview

```
Templates ──linkedControls──▶ SoA Controls
SoA Controls ──linkedTemplates──▶ Templates  (bidirectional sync)

Risks ──linkedControls──▶ SoA Controls
Risks ──linkedTemplates──▶ Templates

Assets ──linkedControls──▶ SoA Controls
Assets ──linkedPolicies──▶ Templates
Assets ──entityId──▶ Entities

BCM Plans ──linkedBiaIds──▶ BCM BIA
BCM * ──linkedControls──▶ SoA Controls
BCM * ──linkedPolicies──▶ Templates

Governance * ──linkedControls──▶ SoA Controls
Governance * ──linkedPolicies──▶ Templates
Governance * ──attachments[]──▶ Files (data/governance-files/)

Templates ──applicableEntities[]──▶ Entities
SoA Controls ──applicableEntities[]──▶ Entities
```
