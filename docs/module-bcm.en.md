# Module: Business Continuity Management (BCM)

> BCM ensures the organisation remains operational during severe disruptions —
> ISO 27001 A.5.29/A.5.30, ISO 22301.

---

## Introduction: What is ISO 22301?

> **Important notice — not an official reproduction:** This introduction is ISMS Builder's **own, simplified summary**. It is **not the text of the standard**, **not an official or authoritative version** of ISO 22301 and **no substitute for the standard**. Only the **current edition of the standard** is authoritative; obtain it from your standards body (in Germany DIN/Beuth, internationally ISO). The text is **not advice** and gives no assurance that an implementation based on it will meet certification. Chapter numbers and terms may differ from the edition your organisation uses.

**ISO 22301** describes how an organisation builds and runs a **Business Continuity Management System (BCMS)**. The aim is that important services keep running during a disruption (fire, cyberattack, power failure, supplier failure, pandemic) or are available again within an acceptable time. Like ISO 27001 it is a **management system standard**: it says **what** a working system must achieve, not **how** to solve it technically. You can be certified against it. ISO 27001 protects information; ISO 22301 makes sure operations carry on.

The standard has **no annex with a catalogue of measures** (unlike ISO 27001) but requirements ("shall" statements) in clauses 4 to 10, following the pattern shared by all ISO management system standards:

| Clause | Question behind it | Support in ISMS Builder |
|---|---|---|
| **4 Context** | Where do we stand, what belongs to the system? | Organisation, scope (document), obligations in the Legal module |
| **5 Leadership** | Is management behind it? | Continuity policy as a policy (Documents), roles and owners |
| **6 Planning** | Which risks, which objectives? | Risk management, security goals (e.g. "critical service back within 4 hours") |
| **7 Support** | Resources, knowledge, documents? | Training and evidence, policy acknowledgements, document control |
| **8 Operation** | How is continuity achieved? | **this module**: BIA, plans, exercises |
| **9 Performance evaluation** | Does it really work? | Metrics and dashboard, audits, management review (Governance) |
| **10 Improvement** | How do we learn from failures? | Findings and measures, security goals |

### Clause 8 — Operation (the core, covered by this module)
- **8.2 Business impact analysis and risk assessment:** Which activities matter, how fast does an outage become costly, what do they depend on? → **BIA** tab.
- **8.3 Strategies and solutions:** How do we bridge an outage (alternate site, emergency power, second supplier, remote work)? → describe as strategy in the BIA and plans.
- **8.4 Plans and procedures:** response structure, warning, communication, continuity plans and the return to normal operation. → **Continuity Plans** tab.
- **8.5 Exercise programme:** plans are exercised at planned intervals and after significant changes, with a report. → **Exercises** tab.
- **8.6 Evaluation:** Are analysis, plans and procedures fit for purpose, and what follows? → results of exercises and audits.

### Clauses 9 and 10 — Evaluation and improvement (can be run with the system)
- **9.1 Monitoring and measurement:** BCM dashboard (BIAs by criticality, processes without an approved plan, last and next exercise) and reports; security goals with measured values.
- **9.2 Internal audit:** run an audit of the BCMS like any other — **Audits** module (check points, audit programme as annual plan, audit report).
- **9.3 Management review:** **Governance → Management Reviews**; record inputs (audit results, exercises, metrics) and decisions there.
- **10.1 Nonconformity and corrective action:** record gaps from audits and exercises as **findings** and track them with **measures** (Measures module) up to a check of effectiveness.
- **10.2 Continual improvement:** derive measures, security goals and the next exercises from what you learn.

### The 2024 amendment
ISO 22301:2019/Amd 1:2024 is very small: in **4.1** the organisation must decide whether **climate change** is a relevant issue for it; in **4.2.1** a note says interested parties can have climate-related requirements. It demands no new measures, only the check and its documentation (e.g. in the scope document or the risk register).

### ISO 22313 — the guidance that goes with it
**ISO 22313** is a **guidance document for implementing** ISO 22301. It contains no certifiable requirements but explains in detail how the individual requirements can be met in practice (advice and examples on BIA, strategies, plans and exercises). We recommend obtaining it in addition to ISO 22301, especially when building the first BIA and the first plans.

> **Note:** This introduction summarises the standard in our own words and replaces neither the standard nor the guidance. ISO standards are protected by copyright and are not shipped with ISMS Builder; the text of the edition you have licensed is authoritative. The mapping to modules is an orientation, not a certification statement.

---

## Three Sub-Areas

The BCM module consists of three closely linked areas:

| Area | Purpose |
|---|---|
| **BIA** (Business Impact Analysis) | Identify critical processes and assess the impact of outages |
| **Continuity Plans** | Concrete recovery plans for critical processes |
| **Exercises** | Document and track tests of plans |

---

## Business Impact Analysis (BIA)

The BIA answers: **What happens if this process fails — and how long can we afford it?**

**BCM → BIA → "+ New BIA"**

Fields:
- **Process name** — which business process?
- **Process owner and department**
- **Criticality** — `low` / `medium` / `high` / `critical`
- **RTO** (Recovery Time Objective) — maximum tolerable downtime (hours)
- **RPO** (Recovery Point Objective) — maximum tolerable data loss (hours)
- **MTPD** (Maximum Tolerable Period of Disruption) — absolute maximum outage time
- **Dependencies** — which systems/suppliers does this depend on?
- **Affected systems**
- **Status** — `draft` / `reviewed` / `approved`

> **RTO and RPO** are the central metrics of the BIA. RTO defines how quickly the
> process must be restored; RPO defines how old the data may be at the point of recovery.

---

## Continuity Plans (Recovery Plans)

For every critical process (BIA criticality `high`/`critical`) a recovery plan
should exist.

**BCM → Plans → "+ New Plan"**

Fields:
- **Plan name** — e.g. "Production Database Recovery"
- **Linked BIA** — which BIA does this plan relate to?
- **Trigger** — when is the plan activated?
- **Owner**
- **Steps** — numbered action instructions
- **Resources** — required systems, contacts, access credentials (encrypted)
- **Status** — `draft` / `tested` / `approved`

---

## Exercises

BCM plans are only effective if they are regularly practised.
ISO 22301 requires evidence of tests conducted.

**BCM → Exercises → "+ New Exercise"**

Fields:
- **Exercise type** — Tabletop / Simulation / Full test
- **Date and duration**
- **Plans tested**
- **Participants**
- **Outcome** — what worked, what did not?
- **Actions** — what needs to be improved?

---

## Templates for BIA, Plans and Exercises

Each tab (**BIA**, **Plans**, **Exercises**) has a **"Use template"** button next to "New" (Editor role and above). It fills the form with suggested values that you review and adapt before saving.

- **BIA templates** contain criticality, RTO/RPO/MTPD (hours), typical dependencies and systems (types only) and a note. The times are **suggestions**: the process owners decide.
- **Plan templates** bring a structured text: purpose and scope, activation criteria, roles, immediate actions, recovery, communication, return to normal operation, maintenance and exercises. `{{COMPANY_NAME}}` and `{{ISMS_OWNER}}` are filled from the organisation data; the system reports missing values.
- **Exercise templates** fill the new field **"Scenario and course"**: scenario, objectives, injects and evaluation questions.

**Templates included (English):**
- BIA: Payroll; IT operations and data centre; Customer service and support; Order processing and sales; Production and service delivery; Procurement and supplier management; Corporate communication and website; Recruiting and staff support
- Plans: General business continuity plan; IT disaster recovery plan; Cyber attack and ransomware; Power outage; Building and site loss; Failure of a critical supplier; Pandemic and major staff shortage; Crisis communication; Data centre restart
- Exercises: Tabletop exercise: ransomware; Backup restore test; Evacuation and site loss; Supplier outage; Alerting chain test; Power outage drill

The templates are practice-oriented suggestions in our own words. They must be carefully adapted to your company, are not advice and contain no text of any standard. FR, NL and HU are our own translations; a professional review is recommended. The guidance **ISO 22313** helps when building up the system.

---

## AI Drafts for Plans and Exercises

The form of a **plan** (field "Procedures") and of an **exercise** (field "Scenario and course") has the button **"Draft with AI"** (Content Owner role and above, as for documents). It opens the same safe dialog as for policies: you choose a topic from the title list (9 plans, 6 exercises), see **the exact text that would be sent**, and either send it to the connected AI or **copy** it for an AI of your choice. Personal data in the hint field is blocked, company placeholders are replaced locally. The result then appears in the form's text field (with a confirmation if it already contains text) and is a **draft** that you review and adapt. Details and the title list: guide "AI Drafts".

---

## Register of ISO 22301 Requirements

The **"Requirements"** tab shows the requirements of ISO 22301 (clauses 4 to 10) and the status of your implementation. You see at a glance **which requirement is evidenced by what** and where evidence is still missing.

**Important:** The **text of the standard is not shipped with ISMS Builder** (copyright). An administrator imports it from the **licensed edition** of the standard that your company holds. The register is a working aid, not a certification statement; the text of your licensed edition is authoritative.

### Workflow
1. **Download the template:** "Requirements" tab → "Template (CSV)". It contains invented example rows only.
2. **Enter your own texts** (ID, title, description) from your licensed standard, or provide the same fields as JSON.
3. **Import** (administrators only): choose the file. First there is a **preview** (new, updated, rejected with the reason per row); only "Apply" saves.
4. **Maintain the status** (Editor role and above): per requirement status, owner, justification, evidence and links to BIAs, plans and exercises.
5. **Importing again** (e.g. a new edition or an amendment) changes the **descriptions**, not the implementation status; nothing is deleted.

Status: *Open*, *Partial*, *Implemented*, *Not applicable* (a **justification is mandatory**). The coverage bar counts only the lowest-level items, not chapter headings. For 8.2.2, 8.4.4 and 8.5 the system shows hints from existing data (number of BIAs, approved plans, exercises carried out); the status is **never set automatically**. Export of the status: "Export (CSV)".

### Layout of the import file
One row per requirement. **CSV** (UTF-8, comma or semicolon as separator, fields containing a comma or line break in quotes) or **JSON** (a list or `{ "requirements": [ … ] }`). Column names in lower case, any order; unknown columns are reported and ignored. At most **2 MB** and **2000 rows**.

| Column | Required | Meaning | Limit |
|---|---|---|---|
| `framework` | yes | ID of the standard, currently only `ISO22301` | – |
| `id` | yes | ID of the requirement, e.g. `9.1` (unique per file) | 40 characters |
| `parent` | no | `id` of the parent requirement (must be in the file or already stored) | 40 |
| `chapter` | no | Chapter; if empty, the number before the first dot of the `id` | 40 |
| `title_de`, `title_en`, `title_fr`, `title_nl`, `title_hu` | at least one title | Title per language; the interface language is shown, else English, else the first available | 512 |
| `summary_de` … `summary_hu` | no | Description per language | 4000 |
| `title`, `summary` | no | Title/description without a language (treated as English if `title_en` is missing) | 512 / 4000 |
| `amendment` | no | Note on an amendment, e.g. `Amd 1:2024` | 60 |

The preview names rejected rows with the reason: required field missing, unknown framework, duplicate ID, unknown parent requirement, text too long.

**CSV example** (invented texts):

```csv
framework,id,parent,chapter,title_en,summary_en
ISO22301,9,,9,Example chapter,
ISO22301,9.9,9,9,Example requirement,Your description from the licensed standard goes here.
```

**JSON example** (invented texts):

```json
[
  { "framework": "ISO22301", "id": "9",   "chapter": "9", "title_en": "Example chapter" },
  { "framework": "ISO22301", "id": "9.9", "parent": "9", "chapter": "9",
    "title_en": "Example requirement", "summary_en": "Your description from the licensed standard goes here." }
]
```

Texts are stored as plain text and escaped when displayed. For exports to spreadsheets, cells starting with `=`, `+`, `-` or `@` are neutralised.

**Rights:** view from Reader, maintain from Editor, import administrators only. Every import and change is in the audit log. When switching to production (demo reset) the register is cleared like the other demo data.

---

## Dashboard

The BCM dashboard shows:
- Number of BIAs by criticality
- Processes without an approved plan
- Last exercise and next planned exercise
- Plans with status `draft` (action required)

---

## Audit Note

ISO 27001 A.5.29 requires information security in business continuity.
A.5.30 addresses ICT readiness for business continuity.

The auditor typically checks:
1. Does a BIA exist with documented RTO/RPO values?
2. Are there approved recovery plans for critical processes?
3. Have the plans been tested? (exercise records)
4. Have lessons from exercises been incorporated into the plans?

Recommendation: at least one tabletop exercise per year per critical plan.
