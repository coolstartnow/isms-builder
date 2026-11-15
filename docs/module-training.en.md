# Module: Training and Security Awareness

> Staff are the most important — and often most vulnerable — factor in the ISMS.
> ISO 27001 clauses 7.2 and 7.3 and A.6.3 require demonstrable competence
> and security awareness.

---

## What is Documented Here?

The training module records all security awareness measures:
- Mandatory training (onboarding, annual training)
- Phishing simulations
- Workshops and external seminars
- E-learning completions
- Role-specific training (admins, CISO, DPO)

---

## Roles and Permissions

| Action | Minimum role |
|---|---|
| View training records | `reader` |
| Create and edit training records | `editor` |
| Delete / restore training records | `admin` |

---

## Creating a Training Record

**Training → "+ New Training"**

Fields:
- **Title** — e.g. "Phishing Awareness Q1 2026"
- **Type** — Mandatory / Phishing simulation / Workshop / E-learning / Other
- **Date** — when did the training take place?
- **Duration** — in hours
- **Trainer / Provider**
- **Target audience** — all staff / IT department / management etc.
- **Number of participants** — how many people were trained?
- **Coverage rate** — what percentage of the target audience was reached?
- **Outcome / Notes** — assessment, findings, areas for improvement
- **Status** — `planned` / `completed` / `cancelled`

---

## Recording Evidence (the "Evidence" tab)

Evidence is **not a record of its own**; it is the **"Evidence / Notes"** field of a training record. The **"Evidence"** tab therefore has no "New" button: it only lists the trainings with status **Completed** and the evidence text entered there.

How to proceed:
1. **"Plan" tab** → open the training with the pencil icon (or create it with "+ New training").
2. Set the **status** to *Completed* and enter the completion date.
3. In the **"Evidence"** section fill in **"Evidence / Notes"**: attendance list, certificate numbers, links (`http`/`https`) to the stored documents.
4. **Save.** The training now appears in the "Evidence" tab; a click on its card shows the training for viewing only (changes are made only in the "Plan" tab).

Note: a training that is not yet *Completed* does not appear in the "Evidence" tab, even if it already has an evidence text. Files are attached in the same form under "Attachments" (see below).

---

## Attachments and Confirmation of Participation

**Attachments** (attendance list, a provider's certificate, photos): "Plan" tab → open the training → section **"Attachments"** → "Add file". This is possible once the training has been saved.
- Allowed: PDF, PNG, JPG, DOCX, XLSX and TXT up to 20 MB per file. Both the extension **and** the file content are checked; other or disguised files are rejected.
- Accounts from Editor upwards may upload and remove; every account with read access may download. In the "Evidence" tab the attachments appear as buttons on the card.
- **"Remove" only hides the attachment from the list.** The file is kept on the server as evidence (folder `training-files/` in the data directory). Back this folder up as well; it is not part of the JSON data export.
- Every upload and removal is recorded in the audit log.

**Confirmation of participation (PDF):** button "Confirmation of participation (PDF)" in the "Evidence" tab (on the card) and in the training form.
- It exists **only for trainings with status "Completed"**. For any other status the system says it is issued after completion.
- **One confirmation per training** (not per participant): title, category, description, completion date, instructor/provider, participants (field "Assigned to"), mandatory yes/no, linked controls, company logo and name. The accent colour follows the category, the language follows the installation's default language.
- **The verification code** is calculated from ID, title, completion date, instructor and participants (SHA-256, first 12 characters). If these details change, the code changes, so you can tell whether an older confirmation still matches the current state of the training.
- **It is an internal record of the company, not a certification** by a third party; the document says so. It carries no signature.
- Limit: the PDF font has no Hungarian ő/ű; they appear as ö/ü.
- Every issue is recorded in the audit log with the verification code.

---

## Progress and Metrics

The training overview shows:
- Coverage rate across all training (target: 100% of mandatory training)
- Planned vs. completed training
- Training by type and period

---

## Linking to SoA

Training measures can be linked as implementation evidence for controls, e.g.:
- ISO A.6.3 (Security Awareness Training) → annual training
- ISO A.8.7 (Protection against malware) → phishing simulation

---

## Audit Note

ISO 27001 clause 7.2 requires evidence that staff have the necessary competence.
Clause 7.3 requires awareness of the ISMS policy and their personal role within it.

The auditor expects:
1. A training plan for the current year
2. Evidence of completed training (attendance lists, certificates)
3. A coverage rate that captures all relevant staff

Recommendation: enter the attendance list and links (http/https) in the "Evidence / Notes" field and attach certificates and lists as files under "Attachments", so they are immediately available during the audit. In the "Evidence" tab a click on a card shows the training for viewing only (changes are made in the "Plan" tab); links in the evidence text are clickable.