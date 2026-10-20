# ISMS Builder – Roadmap

This document tracks planned features, improvements, and known open work items.
It is maintained alongside the codebase and updated as priorities shift.

---

## Done (verified against the code, 1.80.0 in preparation)

- **Five UI and documentation languages** — DE, EN, FR, NL, HU (UI, demo bundles and all 13 module guides).
- **Multi-backend storage via Knex.js** — SQLite / PostgreSQL / MariaDB next to JSON (PR #15 by @volkermauel); `tools/migrate-json-to-knex.js` is the maintained migration path.
- **Asset protection goals and dependencies** — protection goals per asset type with inheritance and an asset dependency tree (issues #29, #64; see CHANGELOG).
- **Audit management and reports** — audits, findings with action plans, audit report PDF, programme planning.
- **Measures register** — one data set for risk treatments, finding actions, governance measures and TOMs (see `docs/module-measures.md`).
- **ISO control import hardening (#45)** — per-row validation, rejection reasons, no restart needed.

---

## Next: audit-proof deletion and audit log

Deleting must never destroy evidence. Planned as its own release:

1. Deleted records stay in the system for good: remove the 30-day autopurge and the "delete permanently" routes; the trash becomes a read-only archive with restore.
2. GDPR deletions: anonymise personal fields (placeholder values) and keep the record and its metadata.
3. Review the audit log for tamper resistance (chaining, protection against removal) and close any gaps found.

---

## Measures register — follow-ups

- **Mobile app:** the app does not synchronise the measures register yet and bundles the server logic of the version it was built with; it needs a rebuild and a sync module for measures.
- **AI search coverage:** the search indexes risks, measures, goals, guidance, training, assets, suppliers, BCM, findings and audits. Not yet covered: SoA controls, GDPR, legal, governance reviews, NIS2, entities, public incidents.
- **Dashboard:** key figures of the register (overdue, unassigned) on the dashboard.

---

## Documentation clean-up

- `docs/ISMS-build-documentation.md` still describes `server/db/mariadbStore.js` and `mariadbDatabase.js` as implemented; these files do not exist (Knex replaced them) — update the database chapters.
- `tools/migrate-json-to-sqlite.js` and `tools/migrate-json-to-mariadb.js` predate the Knex backends (they use `server/db/database` and do not know newer tables such as `measures`). Remove them or mark them as deprecated, and point the docs to `migrate-json-to-knex.js`.

---

## Internationalisation (i18n)

### Planned: Additional EU languages

The five supported languages are listed above. The following are planned (UI translations + documentation), priority by EU market size and ISO 27001 adoption:

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
| 9 | Romanian | `ro` | Planned |
| 10 | Slovak | `sk` | Planned |
| 11 | Croatian | `hr` | Planned |
| 12 | Greek | `el` | Planned |

**What adding a new language requires:**
1. UI translations in `ui/i18n/translations.js` (all keys)
2. Add the language code to `SUPPORTED_LANGS` in `server/routes/guidance.js`
3. Add the language option to the login page language selector
4. Documentation files: `docs/module-*.{lang}.md` for all 13 module guides
5. Demo bundle `data/demo-bundles/{lang}.json` (including the measures register)
6. Seed entries: add the `{lang}` key to `srcFiles` in `server/db/guidanceStore.js`

---

## Guidance Performance

`GET /guidance?category=X` still returns the full content of every document in a category
(measured: up to ~188 kB per document in `admin-intern`), which makes large categories slow to load.

**Planned fix:** return metadata only in list responses; load the full content on demand via `GET /guidance/:id`.

---

## Template UI Consolidation

Consolidate the two template creation/editing UI paths into a single unified interface.
**Status:** Planned (carried over unchanged; not re-verified for this revision).
