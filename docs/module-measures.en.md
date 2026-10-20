# Module: Measures Register

> One central register for all measures in the ISMS — ISO 27001 clause 6.1.3 requires risk treatments to be
> defined, implemented and followed up; Art. 32 GDPR requires the same for technical and organisational
> measures (TOMs).

---

## One measure, one place

Measures arise in many places: as the treatment of a risk, as the result of an audit finding, as a decision
from a management review, or as a TOM under Art. 32 GDPR. Previously each module kept its own list. Since
version 1.80 there is **one data set**: the measures register. The modules still show their measures in
their familiar place, but they read and write them in the register. A change in one place therefore applies
everywhere, and no measure appears twice.

| Origin | Where it is edited | Marker in the register |
|---|---|---|
| Risk treatment | Risk & Compliance → Treatment Plans | Assigned to a **risk** |
| Action for a finding | Reports → Audit Findings | Assigned to a **finding** |
| Governance measure | Governance → Actions | **Governance** flag |
| TOM under Art. 32 GDPR | GDPR → TOMs | **TOM** flag |
| Own measure | Measures | Assigned to **SoA controls**, or unassigned |

A measure can be several things at once: a measure “MFA for administrators” can implement a control and
treat a risk at the same time.

---

## Roles and permissions

| Action | Minimum role |
|---|---|
| View measures | `reader` |
| Create and edit a measure | `editor` |
| Assign a measure to a **risk** or a **finding**; change measures that are assigned to a risk | `auditor` or `contentowner` |
| Create or change a TOM (TOM flag) | `contentowner` |
| Delete a measure | `contentowner` |
| Delete a governance measure | `admin` |
| Restore a deleted measure or delete it permanently | `admin` |

The register grants nobody more rights than the modules did before: whoever could only change risk
treatments as an auditor can also only change them as an auditor in the register.

---

## The register

**Measures** (in the navigation, after “SoA – Controls”)

![Measures register with key figures, filters and list](images/measures/register-list.png)

*The screenshots show the German interface with the German demo data set; the interface is available in
five languages.*

**Key figures** at the top: Total, Planned, In progress, Implemented (including “Effectiveness verified”),
Overdue and Unassigned. A measure is *overdue* when its due date has passed and it is still planned or in
progress. *Unassigned* are measures that are not assigned to a control, a finding or a risk and are neither a
TOM nor a governance measure — they stand out first in an audit because it is unclear what they are for.

**Search and filter:** full text (reference, title, description, implementation, responsible person), status,
responsible person, “Overdue only” and **origin**.

![Filter “Risk treatments only”](images/measures/register-filter-risk.png)

The origin filters: *All origins*, *TOMs only*, *Governance measures only*, *Risk treatments only*,
*Finding actions only*.

**“Assignment” column:** icons show what the measure is linked to (control, finding, risk), with a count.

**Export:** **CSV** (protected against formula injection in spreadsheets) and **PDF** (print view) contain the
currently filtered list.

---

## Create and edit a measure

**Measures → “+ New measure”**. The measure automatically receives a reference `M-001`, `M-002`, …

| Field | Meaning |
|---|---|
| Title, description | What is to be achieved |
| Implementation (concrete) | What has been done: what, how, where, how often — the evidence for auditors |
| Responsible | Who implements it |
| Due date / Review on | Implementation deadline and follow-up date for the effectiveness check |
| Status | `Planned` · `In progress` · `Implemented` · `Effectiveness verified` · `Cancelled` |

When a measure is set to *Implemented* or *Effectiveness verified*, the system enters the date as “Completed
on” if none is given. Cancelled measures stay in the register (for traceability) but no longer count as a
current treatment of a risk.

### Assignments

The **Assignment** section links the measure to **SoA controls**, **findings** and **risks**. Each list has a
filter field.

![Form with the three selection lists for controls, findings and risks](images/measures/form-links.png)

Every measure assigned to a risk counts as a **treatment of that risk** and appears under Risk & Compliance →
Treatment Plans. Every measure assigned to a finding appears in the finding’s action plan. Editors see these
two lists read-only (see roles); they can assign controls freely.

### Governance measure

With the **Governance measure** flag the measure is also managed in the Governance area. This adds further
fields: **Origin** (management review, internal or external audit, incident, other), **Reference** (e.g.
audit number), **Priority**, **Progress (%)**, the responsible person’s e-mail, **Completed on** and notes.

![Form: Governance measure section](images/measures/form-governance.png)

Only an administrator may delete a governance measure, in the register as well.

### TOM (Art. 32 GDPR)

With the **TOM** flag the measure also appears in the GDPR module under “TOMs”. Further fields: **Category**
(access control, encryption, logging, network security, application security, backup & recovery,
organisational, training, data retention), **Risk level**, **Retention rule** and **Evidence**. Only
content owners may create and change TOMs, as in the GDPR module.

---

## Where measures appear

**SoA – Controls:** In an expanded control, the block **“Measures for this control”** shows the assigned
measures with their status. A click opens the measure; **“Add measure”** creates a new one and assigns it to
the control right away.

![SoA: block “Measures for this control”](images/measures/soa-block.png)

**Findings:** A finding’s **action plan** shows its measures as before and works on the same records as the
register. Below it, the block **“Measures (register)”** lists them with reference and status.

![Finding: action plan and measures (register)](images/measures/finding-block.png)

**Risks:** The **Treatment Plans** tab shows all treatments of all risks; the risk detail shows the
treatments of the individual risk.

![Risk & Compliance: Treatment Plans](images/measures/risk-treatments.png)

**Governance:** The **Actions** tab shows the governance measures with origin, priority and progress.
Attachments (minutes, evidence) stay attached to the measure there.

![Governance: Actions](images/measures/governance-actions.png)

**GDPR:** The **TOMs** tab shows the measures carrying the TOM flag.

![GDPR: TOMs](images/measures/gdpr-toms.png)

**Calendar:** Due measures appear with their date. Risk treatments, finding actions and governance measures
each have their own event type; all others appear as a measure deadline. The same measure is not
additionally listed as a general measure deadline. If it belongs to a risk and a finding at the same time, it
appears for both contexts.

**AI search:** The register is part of the search; measures can be found by keyword or question.

---

## Existing data (upgrade to 1.80)

On the first start with version 1.80 the system automatically takes the measures previously embedded in the
modules into the register: TOMs, risk treatments, finding actions and governance measures.

- **Identifiers, timestamps and deletion status are preserved**; the `M-…` references are assigned by creation date.
- **The process is repeatable:** records already taken over are not created again.
- **The old data stays untouched** (`risks.json`, `findings.json`, `governance.json`, `gdpr/toms.json` or the
  database tables). It is no longer read but serves as a backup.
- **Statuses** are mapped: the modules’ *open / in progress / done* correspond to *Planned / In progress / Implemented*.
- **New IDs:** new governance measures receive IDs of the form `meas_…` (formerly `gact_…`); existing
  identifiers do not change.

When moving from JSON to an SQL database with `tools/migrate-json-to-knex.js`, the register is carried over
with all fields and attachments.

**Demo data:** The demo bundles (German, English, French, Dutch, Hungarian) contain the register with all
five origins. Loading a bundle again replaces the register.

---

## Trash

Deleted measures are in the trash (**Admin → Trash**, except TOMs: they appear among the GDPR
entries) and can be restored or permanently deleted by administrators. When a treatment in a risk or an
action in a finding is “deleted” while it is still assigned to a control or to further risks or findings, only
the assignment to that risk or finding is removed; the measure itself stays in the register.

---

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/measures` | List; filters `q`, `status`, `responsible`, `control`, `finding`, `risk`, `overdue`, `tom`, `governance`, `source`, `priority`, `category` |
| GET | `/measures/summary` | Key figures |
| GET | `/measures/{id}` | A single measure |
| POST | `/measures` | Create |
| PUT | `/measures/{id}` | Change (only the fields passed) |
| DELETE | `/measures/{id}` | Delete (trash) |
| POST | `/measures/{id}/restore` | Restore (admin) |
| DELETE | `/measures/{id}/permanent` | Delete permanently (admin) |

The modules’ existing interfaces (`/risks/{id}/treatments`, `/findings/{id}/actions`,
`/governance/actions`, `/gdpr/toms`) remain unchanged and work on the same data set.

---

## Audit note

For ISO 27001 the register and its entries are the evidence for clauses 6.1.3 (risk treatment), 8.3
(implementation of the treatment) and 10.2 (corrective actions). Auditors typically ask:

1. Is there a measure with a responsible person and a date for every risk that is not accepted?
2. Are overdue measures known and justified?
3. Is evidence (implementation, effectiveness check) recorded for implemented measures?
4. Do audit findings lead to measures, and can they be followed up?

For Art. 32 GDPR, the TOMs with category, risk level and evidence demonstrate that the measures are appropriate.
