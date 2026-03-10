# Reddit Posts — ISMS Builder Launch

Alle drei Posts sind unabhängig voneinander — nicht alle drei am selben Tag posten,
lieber 2–3 Tage Abstand damit es nicht wie eine Kampagne wirkt.

Empfohlene Reihenfolge: r/selfhosted → r/sysadmin → r/netsec

---

## 1. r/selfhosted

**Titel:**
```
I built a self-hosted ISMS platform for ISO 27001 / NIS2 / GDPR — open source, no cloud, your data stays yours
```

**Body:**
```
After 35+ years in IT (CIO → CISO → DSO) I got tired of the choice between
expensive SaaS tools (€5k–30k/year) and unauditable Excel spreadsheets.
So I built one myself.

**ISMS Builder** is a self-hosted web platform for managing an Information
Security Management System — covering the full compliance lifecycle from
policy authoring to audit evidence.

**What it does:**
- Policy management with full lifecycle (draft → review → approved → archived)
- Statement of Applicability: 313 controls across 8 frameworks
  (ISO 27001, NIS2, BSI IT-Grundschutz, GDPR, EUCS, EU AI Act, ISO 9001, CRA)
- Risk register + treatment plans
- GDPR modules: VVT, DSFA, DSAR queue, 72h incident timer, deletion log
- Asset management, BCM/BCP, supplier audits, training records
- Public incident reporting form (no login required — for employees)
- Optional local AI search via Ollama (nomic-embed-text) — no cloud, GDPR-safe
- Full audit log of every action

**Tech stack:** Node.js + Express, Vanilla JS SPA, SQLite or JSON backend,
Docker ready, JWT + TOTP 2FA, 176 automated tests.

**Self-hosting in 3 commands:**
```bash
git clone https://github.com/coolstartnow/isms-builder
cd isms-builder && npm install && cp .env.example .env
npm start   # https://localhost:3000
```

Demo credentials in the repo (admin/adminpass — change on first login).

License: AGPL-3.0

GitHub: https://github.com/coolstartnow/isms-builder

Happy to answer questions about the technical decisions or the compliance side.
```

**Flair:** `Project`

**Tipp für den ersten Kommentar** (selbst posten, direkt nach dem Post):
```
Screenshot of the dashboard with live demo data if anyone wants a quick visual:
https://github.com/coolstartnow/isms-builder/blob/main/docs/screenshots/02-dashboard.png

The full screenshot tour (login through admin panel) is in docs/screenshots/.
```

---

## 2. r/sysadmin

**Titel:**
```
NIS2 deadline passed, ISO 27001 pressure is real — I open-sourced my ISMS platform so SMEs don't have to pay €20k/year for compliance software
```

**Body:**
```
I've spent 35+ years in IT — the last chunk as CISO and Data Protection Officer.
One thing that never got better: the tooling situation for SMEs trying to build
a proper ISMS without a five-figure software budget.

Commercial options (Vanta, OneTrust, ISMS.online etc.) are either priced for
enterprise or lock your compliance data in their cloud. Excel is not auditable.
Gap between "nothing" and "€20k/year" is huge.

So I built **ISMS Builder** — self-hosted, open source (AGPL-3.0), runs on
a €5/month VPS or your own server.

**What it covers:**
- ISO 27001:2022 full policy lifecycle
- Statement of Applicability — 313 controls, 8 frameworks including NIS2 and BSI IT-Grundschutz
- Risk management with treatment tracking
- GDPR: processing records, DPIAs, DSAR queue, 72h breach timer
- Supplier risk management, BCM plans, asset register
- Audit log of every single action (exportable)
- RBAC: reader / editor / content owner / auditor / admin
- TOTP 2FA, enforceable org-wide

**Stack:** Node.js, SQLite, Docker. No external dependencies at runtime.
Optional local AI search via Ollama if you want semantic search without sending
data anywhere.

176 automated tests, CI on GitHub Actions (Node 18/20/22).

https://github.com/coolstartnow/isms-builder

If you're dealing with NIS2 implementation or ISO 27001 prep and want to
avoid vendor lock-in, this might save you some pain.
```

**Flair:** `Tool`

**Tipp für den ersten Kommentar:**
```
Common question I expect: "why not just use [commercial tool]?"

Short answer: because your audit evidence, risk register, and GDPR processing
records shouldn't live in someone else's cloud. AGPL means if someone forks it
into a SaaS they still have to open-source it.

Also the onboarding effort is roughly the same as commercial tools — but you
own the data and pay nothing per seat.
```

---

## 3. r/netsec

**Titel:**
```
Open-sourced my ISMS platform — 35 years as CIO/CISO/DSO distilled into a self-hosted compliance tool (ISO 27001, NIS2, GDPR)
```

**Body:**
```
Background: I've been in IT for over 35 years — CIO for about 15 of those,
then moved into CISO and DSO roles. I've built enterprise network infrastructure
(VPN/MPLS) for a major European corporation, sat through more audits than I
can count, and dealt with GDPR enforcement from both sides.

The frustration that led to this project: there is no open-source ISMS platform
that takes the security practitioner seriously. What exists is either academic,
abandoned, or a lead-gen front for a SaaS product.

So I built **ISMS Builder**.

**From a security practitioner's perspective, it handles:**

*Access control:*
- JWT session management (httpOnly cookie, configurable expiry)
- bcrypt password hashing
- TOTP 2FA (enforceable at org level via admin toggle)
- RBAC with 4 ranks + functional roles (CISO, DSO, BCM manager, auditor, etc.)
- Full audit log — every create/update/delete/login with user + timestamp

*Compliance coverage:*
- ISO 27001:2022 Annex A — all 93 controls
- NIS2 (Article 21 measures mapped)
- BSI IT-Grundschutz
- GDPR/DSGVO — VVT, DSFA, AV-contracts, DSAR queue, 72h breach timer, deletion log
- EU AI Act, EUCS, CRA controls
- Total: 313 controls across 8 frameworks, all cross-mapped

*Operational security:*
- HTTPS via SSL_CERT_FILE / SSL_KEY_FILE in .env (Let's Encrypt compatible)
- Public incident reporting endpoint (no auth) — separate from internal CISO inbox
- Soft-delete with 30-day autopurge + permanent delete (admin only)
- SQLite WAL mode, foreign keys enforced

*AI integration:*
- Optional semantic search via local Ollama (nomic-embed-text, 768-dim)
- Falls back to keyword search automatically if Ollama is down
- No data leaves the server — GDPR-compliant by design
- All AI queries logged in audit trail

**Stack:** Node.js / Express, 17 route modules, Vanilla JS SPA (no framework,
no build step), SQLite via better-sqlite3. 176 Jest + Supertest tests.

License: AGPL-3.0 — forks that run as a network service must publish source.

https://github.com/coolstartnow/isms-builder

Happy to discuss architecture decisions, threat model, or the compliance
mapping methodology.
```

**Flair:** `Question` oder `Tools`

**Tipp für den ersten Kommentar:**
```
One thing I made a deliberate decision on: the password hashing uses bcrypt
with cost factor 12 in production, but 1 in tests (for speed — test suite
runs in ~15 seconds with 176 tests).

The test isolation uses mkdtemp per test run so no production data is ever
touched. DATA_DIR env variable overrides all store paths at module load time.

If anyone wants to review the auth code specifically:
https://github.com/coolstartnow/isms-builder/blob/main/server/auth.js
```

---

## Zeitplan (Empfehlung)

| Tag | Aktion |
|---|---|
| Tag 1 | r/selfhosted posten |
| Tag 3–4 | r/sysadmin posten |
| Tag 6–7 | r/netsec posten |
| Parallel | LinkedIn (du übernimmst das) |
| Nach erstem Feedback | awesome-selfhosted PR einreichen |

## Allgemeine Reddit-Tipps

- Poste **nicht** von einem frischen Account — Reddit-Spam-Filter blockt neue Accounts in vielen Subreddits
- Antworte auf **jeden** Kommentar in den ersten 2–3 Stunden — das pusht den Post ins "Hot"-Ranking
- Keine Selbst-Promotion in Kommentaren anderer Posts kurz davor oder danach
- Wenn jemand einen Bug oder eine Kritik nennt: ernst nehmen, nicht defensiv antworten
- Screenshots als Imgur-Links funktionieren besser als GitHub-Links (GitHub rendert keine Bilder direkt in Reddit)
