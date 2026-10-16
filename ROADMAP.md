# ISMS Builder – Roadmap

This document tracks planned features, improvements, and known open work items.
It is maintained alongside the codebase and updated as priorities shift.

---

## Internationalisation (i18n)

### Current state
The application UI is fully translated into **5 languages**: DE, EN, FR, NL, HU.
All module documentation in Guidance is available in DE, EN, FR and NL.

### Planned: Additional EU languages

The following languages are planned for full support (UI translations + documentation).
Priority is based on EU market size and ISO 27001 adoption rates.

| Priority | Language | Code | Status |
|---|---|---|---|
| 1 | Spanish | `es` | Planned |
| 2 | Italian | `it` | Planned |
| 3 | Polish | `pl` | Planned |
| 4 | Portuguese | `pt` | Planned |
| 5 | Swedish | `sv` | Planned |
| 6 | Danish | `da` | Planned |
| 7 | Finnish | `fi` | Planned |
| 8 | Czech | `cs` | Planned |
| 9 | Hungarian | `hu` | Planned |
| 10 | Romanian | `ro` | Planned |
| 11 | Slovak | `sk` | Planned |
| 12 | Croatian | `hr` | Planned |
| 13 | Greek | `el` | Planned |

**What adding a new language requires:**
1. UI translations in `ui/i18n/translations.js` (all keys, ~400 strings)
2. Add language code to `SUPPORTED_LANGS` in `server/routes/guidance.js`
3. Add language option to the login page language selector
4. Documentation files: `docs/module-*.{lang}.md` for all 11 module guides
5. Seed entries: add `{lang}` key to `srcFiles` in `server/db/guidanceStore.js`

---

## Database Migration

Multi-backend database support via Knex.js ORM (SQLite / PostgreSQL / MariaDB).
**Status:** ✅ Merged — PR #15 by @volkermauel.
Switch via `STORAGE_BACKEND` env variable (`json` / `sqlite` / `pg` / `mariadb`).
Migration utility: `tools/migrate-json-to-knex.js`

---

## Template UI Consolidation

Consolidate the two template creation/editing UI paths into a single unified interface.
**Status:** Planned — not yet implemented.
See: `memory/project_refactoring.md`

---

## Guidance Performance

The `GET /guidance?category=X` endpoint currently returns full document content
for all documents in a category. For categories with large documents (e.g. `admin-intern`
with 134K+ char architecture docs) this causes noticeable load times.

**Planned fix:** Return metadata-only in list responses; load full content on demand
via `GET /guidance/:id` when a document is selected.
**Status:** Fix designed, implementation deferred — demo server not affected for now.

---

## Asset Protection Goals & Dependencies (ISO 27001 / BSI IT-Grundschutz)

Currently assets have a single classification field (confidentiality only).
Full ISO 27001 and BSI IT-Grundschutz compliance requires:

1. **Three (or four) protection goals per asset** — Confidentiality, Integrity, Availability + optionally Authenticity
2. **Asset dependency tree** — assets can reference other assets as dependencies (application → server → container → cloud provider)
3. **Protection goal inheritance** — child assets inherit the highest classification from parent assets

Raised by the community in issue #29.
**Status:** Planned.

---

## Audit Reports

Audit findings data model, action plan tracking, management summary, PDF export.
**Status:** Next major work package.
See: `memory/reports_audit.md`
