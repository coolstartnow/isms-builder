<!-- © 2026 Claude Hecker — ISMS Builder — AGPL-3.0 -->

# Changelog

All notable changes to ISMS Builder are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.32.0] — 2026-03-12

### Added
- **Findings → Calendar**: Finding action due dates appear as `finding_action_due` calendar events; overdue actions are marked as `severity: high`
- **Findings → Semantic Search**: Findings are automatically indexed via Ollama embeddings (`embeddingStore.indexDoc`) on create/update and removed on permanent delete
- **Findings → Reports**: New *Audit Findings* report type (`GET /reports/findings`) with KPI row (total, by severity, by status, open actions, overdue actions) and filterable table (Ref / Title / Severity / Status / Auditor / Area / Observation / Requirement / Open Actions)
- **PDF Export for Reports**: New PDF export button in the reports filter bar — generates a print-ready page in a new browser tab via `window.print()`

### Fixed
- Reports filter panel was hidden entirely for report types that don't require an entity selection (`needsEntity: false`); fixed by wrapping the entity selector in a dedicated `<div id="reportEntityWrap">`

---

## [1.31.80] — 2026-03-12

### Added
- **Audit Findings module**: Track audit findings, observations, and non-conformities with full CRUD and lifecycle
- **FR/NL Guidance translations**: French and Dutch seed documents in Guidance module
- **Admin Language Config**: Admin panel option to configure default application language per deployment

---

## [1.31.0] — 2026-03-09 / 2026-03-11

### Added
- **ISO Controls import button in SoA**: One-click import of ISO 27001 controls into Statement of Applicability
- **ISO Notice in Guidance**: Informational notice linking Guidance entries to applicable ISO controls
- **Login Splash Screen**: Configurable splash/welcome screen on login page (toggle in Admin panel)
- **EN presentation**: English-language slide deck for stakeholder presentations
- **EN/DE Demo Bundles**: Separate demo data bundles for English and German installations
- **Multi-function per user**: Users can hold multiple organisational functions (ciso, dso, qmb, bcm_manager, dept_head, auditor, admin_notify) independently of RBAC role
  - `functions[]` array in user records, JWT payload and `req.functions`
  - `getUsersByFunction(fn)` in rbacStore.js
  - `getCurrentFunctions()`, `hasFunction(fn)`, `renderFunctionBadges()` in app.js
  - Function badges in topbar (`#topbarFnBadges`) and admin user table
  - Checkbox grid in user edit modal
- **SMTP configuration in Admin UI**: SMTP settings editable in Admin → Organisation; Test-Mail button; `.env`-override banner; `POST /admin/email/test` and `GET /admin/email/status`
- **Nav order management**: Drag & drop + ↑↓ buttons to reorder sidebar navigation in Admin → Organisation; `navOrder[]` stored in orgSettingsStore; `saveNavOrder()` / `resetNavOrder()`
- **Architecture docs seeded into Guidance**: `guidanceStore.seedArchitectureDocs()` seeds README, CONTRIBUTING, C4 diagrams, data model and OpenAPI spec as admin-internal Guidance entries (idempotent)

### Changed
- `notifier.js`: `getRecipients(fn, fallback)` resolves recipients by function rather than by role alone; a user holding both ciso and dso receives both digest types
- `renderSettingsPanel()`: CISO / DSB sections shown when user has matching function OR matching role

---

## [1.30.0] — 2026-03-10

### Added
- **Full i18n coverage in app.js**: ~350 `t()` calls covering all render functions (Risk, Goals, Legal, Training, BCM, Assets, Suppliers, Governance, Calendar, Admin)
- **Vendor assets local**: All third-party JS/CSS assets vendored locally; no external CDN dependencies at runtime

### Changed
- **English demo data**: All seed data sets available in English; demo import bundles ship EN content
- Language switcher on login page functional for all UI strings

---

## [1.29.0] — 2026-03-09

### Added
- **i18n DE/EN system**:
  - `ui/i18n/t.js` — translation engine
  - `ui/i18n/translations.js` — 200+ keys in DE and EN
  - Language persisted in `localStorage` (`isms_lang`)
  - `SECTION_META.labelKey` and `LIFECYCLE_TRANSITIONS.labelKey` for translated nav and lifecycle labels
  - Login page: DE/EN toggle buttons, `data-i18n` attributes, `applyLoginLang()` / `switchLoginLang()`
  - Settings: Language switcher section; `switchAppLang()` triggers reload
- **Semantic search (Ollama, local, GDPR-compliant)**:
  - `server/ai/embedder.js` — Ollama `/api/embed` wrapper with cosine similarity; graceful fallback when Ollama is unavailable
  - `server/ai/embeddingStore.js` — JSON vector index (`data/embeddings.json`); `indexDoc` / `removeDoc` / `search` / `reindexAll`
  - `server/routes/ai.js` — `GET /api/ai/search`, `POST /api/ai/reindex` (admin), `GET /api/ai/status`
  - Fire-and-forget embedding hooks in: risks, guidance, goals, assets, training, suppliers
  - Frontend: `_initSemanticSearch()` with keyboard navigation (↑↓ Enter Esc) and 320 ms debounce
  - Model: `nomic-embed-text` (768 dimensions)
- **Release workflow**: `scripts/bump-version.sh`, `.github/workflows/release.yml`
- **Open-source README**: Full README with CI badge, tests badge, feature table, roadmap table, Docker + SSL quick-start

### Changed
- `package.json` version field now managed by `bump-version.sh`

---

## [1.28.0] — 2026-03-08

### Added
- **Demo Reset & Demo Import**:
  - `POST /admin/demo-reset` — exports all data, wipes all modules, removes all users except admin (no 2FA), writes `data/.demo_reset_done` flag
  - `POST /admin/demo-import` — restores bundle, recreates alice/bob (alicepass/bobpass), removes flag
  - `GET /auth/demo-reset-done` — public endpoint; returns `{ active: bool }`
  - Login page: yellow banner when flag is active; auto-cleared on first admin login
  - Admin Maintenance tab: Demo Reset (red, requires "RESET" prompt) + Demo Import (orange, JSON picker)
- **Public Incident Reporting**: Login-page "Report Security Incident" button (no auth required); 7-field modal; `POST /public/incident`; CISO inbox under `incident` section (minRole: contentowner); `DELETE /public/incident/:id` (admin); `server/db/publicIncidentStore.js`; INC-YYYY-NNNN reference numbers; 10 demo entries
- **Papierkorb & Soft-Delete**: Soft-delete with `deletedAt` / `deletedBy` across all 8 modules (templates, risks, goals, guidance, training, legal, gdpr, public-incidents); `GET /trash` aggregates all deleted items; `DELETE /:id/permanent` and `POST /:id/restore` (admin) per module; Admin panel "Papierkorb" tab; 30-day autopurge on server start (`runAutopurge()`); guidance files preserved on soft-delete, removed only on permanent delete; all deletions logged to audit log
- **Supplier / Supply Chain module**:
  - `server/db/supplierStore.js` — CRUD, `getSummary`, `getUpcomingAudits(days)`
  - `server/routes/suppliers.js` — REST + soft-delete + restore
  - `data/suppliers.json` — 10 seed entries (Microsoft, DATEV, SAP, Hetzner, AWS EMEA, …)
  - Calendar events: `supplier_audit` (60-day window)
  - Notifier: `checkSupplierAudits()` in CISO digest; `emailNotifications.supplierAudits` toggle
  - UI: 3 tabs, inline form, KPI block, dashboard card + alert
- **Email notifications (notifier.js)**:
  - `server/mailer.js` — Nodemailer wrapper; no-op when SMTP_HOST is absent
  - `server/notifier.js` — `runDailyChecks()` + `start()` via `setInterval`; only active under `require.main` guard
  - 6 notification types: risks → CISO, DSAR + GDPR incidents → GDPO, contracts + templates → admin
  - SMTP env vars: `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`
  - Admin → Organisation → Email Notifications: global toggle + per-type toggles + adminEmail field
- **Admin panel consolidated** (7 tabs): Users / Entities / Templates / Lists / Organisation / Audit-Log / Maintenance
  - Custom lists (`templateTypes`, `riskCategories`, `riskTreatments`, `gdprDataCategories`, `gdprSubjectTypes`, `incidentTypes`); `server/db/customListsStore.js`; `GET /admin/lists`; `PUT /admin/list/:listId` + `POST /admin/list/:listId/reset` (admin)
  - Organisation tab: Org name, ISMS scope, CISO/DSB contact; `GET/PUT /admin/org-settings`; `GET/PUT /admin/role-settings` (contentowner+)
  - Audit-Log tab: filterable (user/action/resource/date), pagination, delete; `server/db/auditStore.js`; `GET/DELETE /admin/audit-log`
  - Maintenance tab: full export (`GET /admin/export`), orphaned-attachment cleanup (`POST /admin/maintenance/cleanup`)
  - System configuration: `MODULE_CONFIG` (10 modules) + `SOA_FW_CONFIG` (8 frameworks); loaded in `init()` via `GET /admin/modules` + `GET /admin/soa-frameworks`; `saveModuleConfig()` persists both; dashboard skips fetch and KPIs for disabled modules; minimum 1 active framework enforced client-side
- **2FA Enforcement**: `orgSettingsStore.require2FA`; `GET/PUT /admin/security`; login checks enforcement → 403 + `code:'ENFORCE_2FA'`; `_show2FABanner()` shows sticky yellow banner when user has no 2FA; Admin → Org → Security Policies toggle

### Changed
- SQLite set as default storage backend (`STORAGE_BACKEND=sqlite` in `.env.example` and `.env.docker`)

---

## [1.27.0]

### Added
- **Asset Management**:
  - `assetStore.js`; `data/assets.json` (8 seed entries)
  - `GET/POST/PUT/DELETE /assets` + `/assets/summary`
  - 5 categories (hardware/software/data/service/facility), 4 classification levels (ISO 27001 A.5.12), 4 criticality levels
  - Calendar integration (`asset_eol`); dashboard KPIs + alerts
  - 3 UI tabs (List / Category / Classification); `openAssetForm()` inline form
  - RBAC: reader read-only; editor+ CRUD; admin delete
- **BCM/BCP module**:
  - `bcmStore.js` — BIA / Plans / Exercises in `data/bcm.json`
  - 15 API routes under `/bcm/*`; 21 seed entries; 29 tests
  - Calendar events: `bcm_exercise`, `bcm_plan_test`
  - `renderBcm()` — 3 tabs + inline forms
- **Governance module**
- **Cross-module Traceability**: All modules carry `linkedControls` (SoA control IDs) and `linkedPolicies` (template IDs); collapsible "Verknüpfungen" `<details>` block in every edit form with Control Picker and Policy Picker

---

## [1.26.0]

### Added
- **Legal & Privacy module**:
  - `legalStore.js` (contracts / NDAs / privacy policies); `data/legal/`
  - `GET/POST/PUT/DELETE /legal/contracts|ndas|policies`
  - Contract expiry events in Calendar (`contract_expiring`)
- **SQLite backend**:
  - `server/db/database.js` — WAL mode, foreign keys, full schema
  - `server/db/sqliteStore.js` — API-compatible drop-in for jsonStore
  - `STORAGE_BACKEND=sqlite` env switch; `tools/migrate-json-to-sqlite.js`
- **SSL/HTTPS**: `server/index.js` reads `SSL_CERT_FILE` + `SSL_KEY_FILE` from `.env` → HTTPS; falls back to HTTP on missing or unreadable certificate files

---

## [1.25.0]

### Added
- **GDPR & Data Protection module** (complete):
  - `gdprStore.js` — 9 sub-modules including deletion log
  - `data/gdpr/`; 9 UI tabs; 72h incident timer; Art. 17 deletion log; CSV export VVT
  - All GDPR forms rendered as full-page inline forms (`openVvtForm`, `openAvForm`, `openDsfaForm`, `openIncidentForm`, `openDsarForm`, `openTomForm`)
- **Risk & Compliance module**:
  - `riskStore.js`; `GET/POST/PUT/DELETE /risks` + `/risks/:id/treatments`
  - `auditor` role (rank 3); 5 UI tabs; `data/risks.json`
- **Calendar module**: `GET /calendar`; monthly view; chip display; navigation; day detail; agenda sidebar; `SECTION_META 'calendar'`
- **Personal Settings**: Change password (`PUT /me/password`) and 2FA setup/deactivation directly in `renderSettingsPanel()`; `_renderTwofaSettingsBlock()` loads QR code or deactivation button based on `has2FA`
- **2FA topbar chip**: `_show2FAHint(show)` controls `#topbar2faHint`; orange chip; disappears after `verify2FA()` success; reappears after `disable2FA()`

---

## [1.24.0]

### Added
- **Guidance module**: 4 categories (systemhandbuch / rollen / policy-prozesse / soa-audit); Markdown editor + preview; PDF/DOCX upload (multer, max 20 MB); `GET/POST/PUT/DELETE /guidance` + `POST /guidance/upload`; `guidanceStore.js`; 4 seed docs including GDPR guide; `data/guidance/files/`
- **Training & Schulungen module**: `trainingStore.js`; `GET/POST/PUT/DELETE /training` + `/training/summary`; 3 tabs; full-page inline form (`openTrainingForm`); `data/training.json` (3 seed entries)
- **Reports module**: `server/reports.js` — compliance, framework, gap, templates, reviews, matrix, audit report types; `GET /reports/*` + `GET /reports/export/csv`; JSON and CSV export; compliance matrix Control × Entity (traffic-light colours); review-cycle report (overdue / due soon)
- Audit-log hooks in Template, Risk, and User routes

---

## [1.23.0]

### Added
- **SoA Multi-Framework support**: 313 controls across ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9000, ISO 9001, CRA; framework tabs; inline edit; filter; JSON export
- **Cross-Mapping**: 20 topic groups; `crossmapStore.js`
- **Bidirectional Template ↔ Control linking**: `linkedControls` on templates, `linkedTemplates` on controls; sync on `PUT` of both sides; Control Picker modal in template editor

---

## [1.22.0]

### Added
- **Space Hierarchy (complete)**:
  - `parentId` / `sortOrder` on templates
  - `GET /templates/tree` (sorted by `sortOrder`)
  - `PUT /template/:type/:id/move` (no version bump; circular-reference check)
  - `POST /templates/reorder` (batch `sortOrder`)
  - Breadcrumb navigation; child-page button
  - Move dialog (modal with tree picker; descendants locked)
  - Drag & drop (drop on node = child; drop on drop zone = sibling reorder; root drop zone)
  - ↑↓ buttons per tree row

---

## [1.21.0]

### Added
- **Template attachments**: `attachments[]` on templates; multer in `data/template-files/`; `renderAttachmentsBar()`
- **nextReviewDate**: Date field in template editor (`tmpl-review-bar`); colour-coded hint; saved by `saveCurrent()`
- **User management UI**: Table UI for create / edit / delete users; `POST/PUT/DELETE /admin/users`; bcrypt-hashed passwords; role badges; `createUser` / `updateUser` / `deleteUser` in `rbacStore.js`
- **Entity modal**: `openEntityModal()` replaces `prompt()` dialogs; fields: Name, Abbreviation, Type

---

## [1.20.0]

### Added
- **Lifecycle management**: `draft → review → approved → archived` (role-gated, `statusHistory` recorded)
- **Dashboard (complete)**: Full ISMS overview with action-required section; aggregates templates / SoA / risks / GDPR / legal / training / calendar; Top-5 risks; 14-day preview; all modules as KPI cards with direct links
- **Konzernstruktur (entity hierarchy)**:
  - `entityStore.js`; `data/entities.json`
  - `GET/POST/PUT/DELETE /entities`; `GET /entities/tree`
  - Admin UI — Entities tab with tree CRUD
- **Applicability model**: `applicableEntities[]` on templates and SoA controls; Entity Picker in template editor and SoA detail panel

---

*Versions prior to 1.20 are not individually documented. The project began as a Node.js/Express REST API + Vanilla-JS SPA with JWT authentication (cookie `sm_session`), bcryptjs passwords, JSON-file persistence, and a basic template CRUD with versioning.*
