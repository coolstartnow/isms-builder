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
- **Company logo (1.82.0)** — upload in the organisation settings; shown on the login page, policy PDFs and print views; the ISMS Builder logo ships with the demo set and a notice asks for the company logo when switching to production.
- **BCM requirements register (1.84.0)** — ISO 22301 requirements by clause with status, evidence and links; the text of the standard is imported by the company from its licensed edition (CSV/JSON with preview), never shipped.
- **ISO control import hardening (#45)** — per-row validation, rejection reasons, no restart needed.

---

## Next: audit-proof deletion and audit log

Deleting must never destroy evidence. Planned as its own release:

1. Deleted records stay in the system for good: remove the 30-day autopurge and the "delete permanently" routes; the trash becomes a read-only archive with restore.
2. GDPR deletions: anonymise personal fields (placeholder values) and keep the record and its metadata.
3. Review the audit log for tamper resistance (chaining, protection against removal) and close any gaps found.

---

## BCM requirements register — follow-ups

- Other frameworks through the same register (the `framework` field is prepared), for example a checklist for the ISO 22313 guidance.
- Evidence choice from audits, management reviews and findings (chapters 9–10) instead of free text.

---

## Measures register — follow-ups

- **Mobile app 1.5.0:** the server side (sync protocol 2, rights derived from the linked modules) ships with 1.81.0; the app still has to be rebuilt with a measures module and the new rules.
- **AI search coverage:** the search indexes risks, measures, goals, guidance, training, assets, suppliers, BCM, findings and audits. Not yet covered: SoA controls, GDPR, legal, governance reviews, NIS2, entities, public incidents.
- **Dashboard:** key figures of the register (overdue, unassigned) on the dashboard.

---

## Safe AI drafts — mobile app (planned)

- **Done in 1.83.0 (main project):** title list, PII filter, placeholders filled locally, dialog that shows what is sent. The shared pure module `server/ai/safeDraft.js` is written for reuse.
- **Mobile app 1.6.0:** hand the filtered prompt over to an AI app through the Android share menu and paste the answer back; restore the AI button in the app (hidden since 1.5.2). The AI search is not part of this.

---

## Document languages (planned)

- **Goal:** each company chooses the languages it keeps its documents in; all 24 official languages of the EU (plus a few others such as Brazilian Portuguese) in one register. Example: a Dutch site is informed in Dutch, a site in Brazil in Portuguese, instead of English only.
- **Document language is independent of the interface language** (five languages, translated by us). In storage `templates.language` is already free text; the checks that are hard-wired to five languages are `server/ai/safeDraft.js`, `server/templateCsv.js`, `server/i18n.js`, e-mails and assessments.
- **PDF:** needs an embedded Unicode font (the PDF uses Helvetica so far, `server/pdfExport.js`). Right-to-left scripts and CJK are left out at first.
- **AI drafts:** the prompt is English and only names the target language, so quality depends on the model; titles without a translation fall back to the English title. Until this is built, the dialog offers the installation's main language and English.
- **Later:** link language variants of a document ("translation of", "outdated" notice after a change to the original).

---

## Two-factor authentication — follow-ups

- **Planned (not started):** self-enrolment at sign-in while the 2FA requirement is on — an account without 2FA signs in with its password, gets a restricted session that can only reach the 2FA setup, and is fully signed in after the first valid code. This would replace the lock-out wall (`ENFORCE_2FA`) for users; the operator emergency path (`scripts/emergency-2fa.js`) stays.

## Linked documents — follow-ups

- Done in the next release (#110): linked documents in a SoA control open directly (same view with a way back, or a new tab).
- **Planned (not started):** the same for linked documents in risks, assets, BCM and measures (risks currently show raw IDs), and an optional read-only preview inside the SoA control.

## Network binding — follow-up

- **Planned (not started):** an optional `HOST` (bind address) environment variable. Today the server listens on all interfaces (`app.listen(PORT)`), so a local test or demo instance is reachable from the local network. With `HOST=127.0.0.1` it would listen on the loopback interface only; the default stays unchanged so existing installations keep working. To do with it: tests (loopback only vs. all interfaces), the environment variable in `.env.example`, `docker-compose.yml` and the installation guides.

## Backup and restore — follow-up

- Done in the next release: the admin guide explains how to back up and restore (data directory, `.env`, database dumps for MariaDB/PostgreSQL), and the maintenance tab states that the full export is not a complete backup.
- **Planned (not started):** a command-line restore tool (`scripts/restore.js`, modelled on `scripts/emergency-2fa.js`): runs only while the server is stopped, shows a preview, keeps a safety copy of the current data and writes an audit-log entry. A restore from the web interface is deliberately not planned, because it could overwrite users, roles and 2FA settings. Needs its own plan and tests before work starts.

## Related projects

- **NIS2 Quick-Check** ([coolstartnow/nis2-quickcheck](https://github.com/coolstartnow/nis2-quickcheck), AGPL-3.0, already online) — planned as a link only (for example from the NIS2 module); no code integration, nothing else changes.

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
