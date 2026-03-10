# awesome-selfhosted Entry Draft

## Entry for [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted)

**Category:** `Document Management - Institutional Repository and Digital Library Software`
or alternatively: `Resource Planning` (ERP/ISMS fits here)

---

### PR text (for awesome-selfhosted PULL_REQUEST)

**Title:** Add ISMS Builder — self-hosted ISMS/compliance platform

**Body:**

```
## What is this?

ISMS Builder is a self-hosted Information Security Management System platform
for ISO 27001:2022, GDPR/DSGVO, NIS2 and BSI IT-Grundschutz compliance.
It covers the full lifecycle: policy authoring → risk management → audit evidence.

## Checklist
- [x] The project is self-hosted (runs on your own server, no cloud required)
- [x] The project is open source (AGPL-3.0)
- [x] The project has a working demo / clear Quick Start
- [x] No commercial or freemium model — fully free and open
- [x] CI passing: https://github.com/coolstartnow/isms-builder/actions
```

---

### Formatted entry line (markdown)

Paste into the correct alphabetical position in the relevant category section:

```markdown
- [ISMS Builder](https://github.com/coolstartnow/isms-builder) - Self-hosted Information Security Management System (ISMS) platform for ISO 27001:2022, NIS2, GDPR/DSGVO and BSI IT-Grundschutz. Covers policy management, risk register, Statement of Applicability (313 controls, 8 frameworks), GDPR modules, asset management, BCM, supplier management, reporting and optional local AI search via Ollama. `AGPL-3.0` `Nodejs`
```

---

### Notes

- awesome-selfhosted requires a demo or clear setup instructions → our Quick Start + demo data satisfies this
- Category "Document Management" may be more appropriate than "Resource Planning" — check current category list before submitting
- Wait until the GitHub repo is public and CI badge is green before submitting
- One PR per entry is the norm — no bundle submissions

---

## Heise/iX Pitch Text (German)

**Betreff:** Artikel-Pitch: Open-Source-ISMS-Plattform für KMU — ISO 27001 ohne Vendor Lock-in

**Text:**

Sehr geehrte Redaktion,

ich möchte Ihnen ein Open-Source-Projekt vorstellen, das aus über 35 Jahren IT-Praxis entstanden
ist und eine echte Marktlücke schließt: **ISMS Builder** — eine selbst gehostete Plattform für das
Management von Informationssicherheitsmanagementsystemen (ISMS) nach ISO 27001:2022, NIS2 und DSGVO.

**Zur Person:**
Ich bin seit mehr als 35 Jahren in der IT tätig — zunächst rund 15 Jahre als CIO, anschließend als
CISO und Datenschutzbeauftragter (DSO). In dieser Zeit habe ich unter anderem für einen europäischen
Konzern die gesamte IT-Infrastruktur sowie die standortübergreifende Vernetzung mittels VPN und
MPLS aufgebaut und verantwortet. Aus dieser Kombination aus technischer Tiefe und Führungs­verantwortung
heraus kenne ich die Anforderungen an ein praxistaugliches ISMS aus allen Perspektiven: als
Architekt, als Betreiber und als Verantwortlicher gegenüber Aufsichtsbehörden.

**Die Problemstellung:**
KMU und mittelständische IT-Teams stehen vor der Wahl zwischen teuren SaaS-Lösungen
(oft 5.000–30.000 € / Jahr) oder selbst gebauten Excel-Lösungen, die weder auditierbar
noch wartbar sind. Wer als CISO oder DSO Compliance nachweisen muss, braucht ein Werkzeug,
das den gesamten Lebenszyklus abbildet — von der Policy bis zum Audit-Log — ohne dabei
Daten in fremde Hände zu geben. Eine praxistaugliche Open-Source-Alternative fehlte bisher.

**Was ISMS Builder bietet:**
- Vollständiger Policy-Lebenszyklus (draft → review → approved → archived)
- Statement of Applicability mit 313 Controls aus 8 Frameworks (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA)
- Risikomanagement, Asset-Register, DSGVO-Module (VVT, DSFA, 72h-Timer, Löschprotokoll)
- BCM/BCP, Lieferantenmanagement, Legal-Modul, Schulungsnachweise
- Lokale KI-gestützte Suche via Ollama (ohne Cloud, DSGVO-konform)
- RBAC mit CISO/DSB/Auditor-Rollen, JWT + TOTP 2FA
- SQLite-Backend, Docker-ready, 176 automatisierte Tests

**Technischer Stack:** Node.js, Express, Vanilla JS — kein Framework-Overhead, einfach selbst gehostet.

**Lizenz:** AGPL-3.0 — Quellcode muss offen bleiben, auch bei SaaS-Betrieb.

Mögliche Artikelwinkel:
1. *"Open-Source-ISMS: ISO 27001 ohne Vendor Lock-in"* — Praxis-Tutorial für Administratoren
2. *"NIS2 umsetzen ohne Budget: Was Open-Source-Tools leisten können"* — Marktüberblick + Deep-Dive
3. *"35 Jahre IT-Praxis in einem Open-Source-Tool: ISMS Builder"* — Erfahrungsbericht eines CISO/DSO
4. *"Lokale KI im Compliance-Einsatz: ISMS Builder + Ollama"* — KI-Trend meets Datenschutz

Ich stehe gerne für ein Hintergrundgespräch zur Verfügung, kann eine Demo-Instanz bereitstellen
und bringe als langjähriger CISO und DSO konkrete Praxiserfahrung aus dem Enterprise-Umfeld mit.

Mit freundlichen Grüßen,
Claude Hecker
CISO / DSO | 35+ Jahre IT-Erfahrung

GitHub: https://github.com/coolstartnow/isms-builder
Dokumentation: https://github.com/coolstartnow/isms-builder/blob/main/docs/ISMS-build-documentation.md
