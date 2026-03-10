<!-- © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0 -->
# ISMS Builder

**Self-hosted Information Security Management System — open source, no cloud required**

[![CI](https://github.com/claudehecker/isms-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/claudehecker/isms-builder/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-176%20passing-brightgreen)](https://github.com/claudehecker/isms-builder/actions)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-1.29-informational)](CHANGELOG.md)

---

## What is ISMS Builder?

ISMS Builder is a **self-hosted web platform** for managing an Information Security Management System (ISMS).
It covers the full compliance lifecycle — from policy authoring to audit evidence — for ISO 27001:2022, NIS2, GDPR/DSGVO, BSI IT-Grundschutz and other frameworks.

**No cloud. No SaaS fees. Your data stays on your server.**

> Designed for SMEs, IT teams, and consultants who need a real ISMS tool without a five-figure vendor contract.

---

## Screenshots

| Login | Dashboard |
|---|---|
| ![Login](docs/screenshots/01-login.png) | ![Dashboard](docs/screenshots/02-dashboard.png) |

| Statement of Applicability | Risk Management |
|---|---|
| ![SoA](docs/screenshots/04-soa.png) | ![Risks](docs/screenshots/05-risks.png) |

| GDPR & Datenschutz | Asset Management |
|---|---|
| ![GDPR](docs/screenshots/08-gdpr.png) | ![Assets](docs/screenshots/07-assets.png) |

| Guidance & Dokumentation | Reports |
|---|---|
| ![Guidance](docs/screenshots/13-guidance.png) | ![Reports](docs/screenshots/14-reports.png) |

> Run `npm start` and open `https://localhost:3000` to explore the full demo dataset locally.

---

## Feature Overview

| Module | Description | Standards |
|---|---|---|
| **Policy Management** | Template CRUD, versioning, lifecycle (draft → review → approved → archived), space hierarchy, attachments | ISO 27001 §5 |
| **Statement of Applicability** | 313 controls across 8 frameworks, inline editing, gap analysis, cross-mapping | ISO 27001 A / BSI / NIS2 / EUCS / EUAI / ISO 9001 / CRA |
| **Risk Management** | Risk register, treatment plans, auditor role | ISO 27001 §6.1 |
| **Security Goals** | KPI tracking with progress bars, calendar integration | ISO 27001 §6.2 |
| **GDPR & Privacy** | VVT, AV-contracts, DSFA, TOMs, DSAR queue, 72h-timer, deletion log with email alerts | DSGVO Art. 13–35 |
| **Asset Management** | Asset register, classification levels, EoL tracking | ISO 27001 A.5.9–5.12 |
| **BCM / BCP** | Business Impact Analysis, continuity plans, exercises | ISO 27001 A.5.29–5.30 / NIS2 |
| **Training Records** | Training catalogue, completion tracking, certificate upload | ISO 27001 A.6.3 |
| **Supplier Management** | Vendor register, audit scheduling, risk assessment | ISO 27001 A.5.19–5.22 |
| **Legal & Contracts** | Contracts, NDAs, privacy policies, expiry calendar | |
| **Incident Inbox** | CISO inbox + **public reporting form** (no login required) | NIS2 / BSI |
| **Governance** | Management reviews, action tracking | ISO 27001 §9.3 |
| **Reports** | Compliance matrix (Control × Entity), gap report, review cycles, CSV export | |
| **Traceability** | Every record links to SoA controls + policy documents — bidirectional | |
| **Semantic Search** | Local AI search via Ollama (nomic-embed-text) with keyword fallback | |
| **Multi-Entity** | Corporate structure tree, per-entity applicability for controls and policies | |

---

## Quick Start

```bash
git clone https://github.com/claudehecker/isms-builder.git
cd isms-builder
npm install
cp .env.example .env          # set JWT_SECRET to a long random string
npm start                     # http://localhost:3000
```

Login with **`admin` / `adminpass`** — change the password immediately after first login.

For production use with HTTPS and SQLite:

```bash
# .env
JWT_SECRET=your-very-long-random-secret
STORAGE_BACKEND=sqlite
SSL_CERT_FILE=/etc/ssl/certs/your.crt
SSL_KEY_FILE=/etc/ssl/private/your.key
```

---

## Docker

```bash
docker compose up -d --build
# App runs at http://localhost:3000
```

---

## Requirements

- **Node.js 18+** (tested: 18, 20, 22)
- npm 9+
- (Optional) Docker + Docker Compose
- (Optional) [Ollama](https://ollama.ai) for local AI semantic search

---

## Configuration (`.env`)

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | *(required)* | Secret for JWT signing — use 32+ random characters |
| `PORT` | `3000` | HTTP/HTTPS listen port |
| `STORAGE_BACKEND` | `json` | `json` (dev/demo) or `sqlite` (production) |
| `SSL_CERT_FILE` | — | Path to TLS certificate → enables HTTPS |
| `SSL_KEY_FILE` | — | Path to TLS private key |
| `DATA_DIR` | `./data` | Override data directory (Docker volumes) |
| `SMTP_HOST` | — | SMTP server for email alerts |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | — | Sender address for notifications |

---

## Architecture

```
server/
  index.js          — Express app setup, router mounts
  auth.js           — JWT auth, RBAC ranks, session
  routes/           — 17 Express route modules (one per domain)
  db/               — Data stores (jsonStore / sqliteStore / orgSettingsStore / …)
  ai/               — Semantic search (embedder, embeddingStore, lexicalSearch)
  reports.js        — Report generation logic
ui/
  index.html        — SPA shell (Atlassian Dark Theme)
  app.js            — All render functions, ~6000 lines vanilla JS
  style.css         — CSS variables, dark theme
data/               — JSON files / SQLite DB (gitignored)
docs/
  ISMS-build-documentation.md  — Full architecture reference
  architecture/                — C4 diagrams, data model, OpenAPI 3.0.3 spec
tests/              — Jest + Supertest (176 tests, --runInBand)
```

- **Auth:** JWT cookie (`sm_session`), bcrypt passwords, TOTP 2FA (enforceable org-wide)
- **RBAC:** `reader` → `editor` / `dept_head` → `contentowner` / `auditor` → `admin`
- **Persistence:** JSON files (default/demo) or SQLite via `better-sqlite3`
- **AI:** Optional local Ollama (nomic-embed-text); keyword search always available as fallback
- **Audit Log:** Every create/update/delete/login action recorded, filterable, exportable

See [`docs/architecture/`](docs/architecture/) for C4 diagrams, full data model, and OpenAPI 3.0.3 spec (80+ endpoints).

---

## Running Tests

```bash
npm test                  # runs all 176 tests
npm test -- --verbose     # with test names
```

Tests use an isolated temp directory — no production data is touched.

---

## Contributing

Contributions are very welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup (5 minutes to first test run)
- Code style and conventions
- How to open a good issue or PR
- Security vulnerability reporting

**Good first issues** are labelled [`good first issue`](https://github.com/coolstartnow/isms-builder/issues?q=label%3A%22good+first+issue%22) in the issue tracker.

---

## Roadmap

| Status | Feature |
|---|---|
| ✅ Done | Semantic search (Ollama / nomic-embed-text) |
| ✅ Done | SQLite backend, Docker, CI/CD |
| ✅ Done | GDPR deletion log email alerts |
| 🔜 Next | PostgreSQL backend |
| 🔜 Next | Scanner → Risk draft (nmap/OpenVAS XML import) |
| 🔜 Next | Audit-log anomaly detection (LLM batch) |
| 🚀 Later | ownCloud / Nextcloud integration |
| 🚀 Later | English UI mirror |

---

## About the Author

**Claude Hecker** has been working in IT for over 35 years. After roughly 15 years as CIO,
he transitioned into the roles of CISO and Data Protection Officer (DSO/DSB). During his career
he has designed and implemented enterprise-wide IT infrastructure and wide-area network connectivity
(VPN, MPLS) for a major European corporation — responsible for reliable, secure operations across
multiple sites and jurisdictions.

ISMS Builder grew directly out of that experience: building and maintaining a compliant ISMS in the
real world, across real audits, with real regulatory pressure. The tool reflects what practitioners
actually need — not what a product manager thinks they need.

**Why open source?**
SMEs deserve access to a proper ISMS platform without five-figure licence fees. The onboarding effort
is real regardless of which tool you choose — but that cost should not be compounded by vendor
lock-in or data leaving your own infrastructure. This project stands for software freedom and the
principle that your compliance data belongs to you.

---

## License

Copyright (C) 2026 Claude Hecker

This program is free software licensed under the
[GNU Affero General Public License v3.0](LICENSE).

If you run a modified version as a network service, you must make the
complete source code available to users of that service (AGPL §13).
