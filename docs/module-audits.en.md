# Module: Audit Management

> Plan, run and follow up audits — from the checklist through the findings to the annual
> audit programme (ISO 27001 clause 9.2, ISO 19011).

---

## Why Audit Management?

ISO 27001 requires internal audits at planned intervals and an audit programme that defines frequency,
methods, responsibilities and reporting. The module brings this together: the **audit** as an object,
**checklist items** with a result, the **findings** that come out of them, and the **audit programme** as an annual plan.

---

## Roles and Permissions

| Action | Minimum role |
|---|---|
| View audits and audit programmes | `reader` |
| Create and edit audits, checklist items, audit programmes | `auditor` or `contentowner` |
| Approve an audit programme / set it back to draft | `auditor` or `contentowner` |
| Delete permanently or restore from the trash | `admin` |

The **Audits** menu entry is visible from `contentowner` and to the functions CISO, Revision and QMB.
Administrators can switch the module off under **Admin → System**.

---

## Creating an Audit

**Audits → "New audit"**

- **Title**, **audit type** (internal, external, supplier audit, certification) and **status**
  (planned, in progress, completed, cancelled).
- **Standard / norm** and **audit scope**, affected **entities**, and for supplier audits the **supplier**.
- **Lead auditor** and **audit team**.
- **Planned start / end**, **actual start / end** and a **follow-up date**.
- **Audit programme**: assignment to an annual plan (optional).
- **Conclusion / result**.

Every audit gets a reference **AUD-YYYY-NNNN**. The list can be filtered by status, type and year.

---

## Checklist Items

The audit detail contains the **checklist**. Each item has

- a **control reference** (picked from the SoA, optional),
- the **question / requirement**,
- a **result**: open, conform, **non-conformity** or not applicable,
- **evidence** and **notes**.

You can change the result directly in the row. For a **non-conformity** the button
**"Create finding"** appears: it creates a finding and pre-fills it (question as the required state,
notes as the observed state, auditor, audit period, control link). Only one finding is created per item;
it is then linked in the item.

---

## Assigning Findings to an Audit

Findings created from a checklist item belong to the audit automatically. Existing findings can be
assigned (or detached) in the findings form under **Audit**. The audit detail lists all assigned findings.

---

## Audit Programme (Annual Plan)

**Audits → "Audit programme" tab → "New audit programme"**

A programme has a **year**, **objectives** and **scope** and gets the reference **AP-YYYY-NNNN**. Audits are assigned through
the audit form (or directly in the programme via **"Add audit to this programme"**). The programme view shows the audits
**by quarter** of the planned start; audits without a date appear in their own group.

**Approval:** **"Approve"** records the programme with user and date and locks it. To revise it, use
**"Back to draft"**.

---

## Calendar and Dashboard

The **calendar** shows, for each audit, the planned start, the planned end (until completed) and the follow-up date.
The **dashboard** shows total audits, overdue, due within 30 days and open non-conformities.
A planned or running audit is overdue when its planned end has passed.

---

## Export

- **Audit list:** CSV and PDF (respects the active filters).
- **Audit report:** in the audit detail via **"Audit report"** — master data, checklist, findings and conclusion as PDF.
- **Audit programme:** CSV and PDF with the quarterly plan.

The PDF is created through the browser's print dialog.

---

## Actions for findings

Every finding has an **action plan** (Reports → Audit Findings → open a finding). `auditor` and `contentowner` may create or delete
an action; anyone from `editor` upwards may change its status.

**Since version 1.80** these actions are entries in the central [measures register](module-measures.en.md): the finding’s action plan shows
them as before, and below it the block **“Measures (register)”** lists them with reference (`M-…`) and status. The same measure can
additionally be assigned to controls and risks in the register. If an action that is still assigned elsewhere is deleted in the action plan,
only the assignment to this finding is removed.

---

## Trash

Deleted audits and audit programmes stay in the trash for 30 days (**Admin → Trash**) and can be restored or
deleted permanently by administrators.

---

## Audit Note

All changes are recorded in the audit log. Audit Management does not replace an audit report from a certification body,
but it provides the evidence for planning, execution and follow-up under ISO 27001 clause 9.2.
