# Module: Governance (ISMS Management)

> Governance documents the management activities that keep the ISMS running —
> reviews, decisions, and actions from leadership.
> ISO 27001 clause 9.3 (Management Review).

---

## Three Sub-Areas

| Area | Purpose |
|---|---|
| **Management Reviews** | Records of ISMS reviews by leadership |
| **Actions** | Measures and decisions arising from reviews |
| **Meetings** | Minutes of ISMS steering committee meetings |

---

## Management Reviews

ISO 27001 clause 9.3 requires that top management reviews the ISMS at **planned
intervals**. The review must consider specific inputs (audit results, incidents,
objective achievement) and lead to documented outputs (improvement decisions).

**Governance → Reviews → "+ New Review"**

Fields:
- **Date and participants**
- **Inputs** — audit results, KPI status, incidents since last review,
  risk situation, resource needs, improvement suggestions
- **Outputs** — decisions, responsible persons, deadlines
- **Next review date**

---

## Actions

Actions arising from reviews or other sources (audits, incidents) are tracked here.

**Governance → Actions → "+ New Action"**

Fields:
- **Title and description**
- **Source** — which review/audit/incident triggered this action?
- **Owner and due date**
- **Priority** — `low` / `medium` / `high`
- **Status** — `open` / `in_progress` / `completed` / `cancelled`

**Since version 1.80** these actions are kept in the central [measures register](module-measures.en.md) (*Governance* flag). Nothing
changes in how you work here; in the register they appear together with all other measures and can additionally be assigned to
controls, findings and risks. Attachments stay with the action in this area. Only an administrator may still delete them.

---

## Meetings

Minutes of regular ISMS steering meetings (e.g. monthly security committee).

**Governance → Meetings → "+ New Meeting"**

Fields: date, participants, agenda, decisions, next meeting.

---

## Dashboard

The governance overview shows:
- Open actions by priority and due date
- Last and next planned management review
- Overdue actions (highlighted red)

---

## Audit Note

ISO 27001 clause 9.3 is one of the most frequently cited non-conformities in
initial audits — many organisations have no documented management review.

The auditor checks:
1. Has a management review taken place? (at least once per year)
2. Were the prescribed inputs considered?
3. Are actions documented and traceable?

Recommendation: at least one formal management review per year, ideally every
six months.
