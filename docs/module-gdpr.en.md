# Module: GDPR (General Data Protection Regulation)

> The GDPR module covers all central documentation obligations under the General
> Data Protection Regulation — from the processing register to data subject requests.

---

## Overview of Sub-Areas

| Area | Abbreviation | Legal basis |
|---|---|---|
| Records of Processing Activities | RoPA | Art. 30 GDPR |
| Data Processing Agreements | DPA | Art. 28 GDPR |
| Data Protection Impact Assessment | DPIA | Art. 35 GDPR |
| Data Breaches | — | Art. 33/34 GDPR |
| Data Subject Access Requests | DSAR | Art. 15–22 GDPR |
| Technical and Organisational Measures | TOMs | Art. 32 GDPR |
| Data Protection Officer | DPO | Art. 37–39 GDPR |
| Deletion log | — | Art. 17 GDPR |

---

## Records of Processing Activities (RoPA)

The RoPA is the central GDPR register — a complete list of all personal data
processing activities carried out by the organisation.

**Create:** GDPR → RoPA → **"+ New Processing Activity"**

Required fields under Art. 30 GDPR:
- Name and purpose of the processing
- Controller(s) and any joint controllers
- Categories of data subjects and personal data
- Recipients (internal/external)
- Third-country transfers (yes/no + safeguard)
- Retention periods
- Linked TOMs

**Export:** RoPA entries can be exported as CSV — directly usable as an annex to
a data protection report or for the supervisory authority.

---

## Data Processing Agreements (DPA)

A DPA under Art. 28 GDPR is required for every service provider that processes
personal data on behalf of the organisation (cloud services, IT providers, payroll, etc.).

**Create:** GDPR → DPA → **"+ New DPA"**

Fields: provider name, purpose, data categories, term, contract attachment (PDF upload).

> **Minimum role for DPA:** `contentowner`

---

## Data Protection Impact Assessment (DPIA)

A DPIA under Art. 35 GDPR is mandatory for processing activities that are **likely
to result in a high risk** to the rights of data subjects. Typical triggers: systematic
monitoring, processing of special categories, automated decision-making.

**Create:** GDPR → DPIA → **"+ New DPIA"**

Fields: processing description, necessity and proportionality, identified risks,
remedial measures, approval status.

> **Minimum role for DPIA:** `contentowner`

---

## Data Breaches

Personal data breaches involving a risk to data subjects must be reported to the
supervisory authority within **72 hours** (Art. 33 GDPR).

**Record:** GDPR → Data Breaches → **"+ New Breach"**

Fields: date and time, nature of the breach, categories and number of data subjects
affected, likely consequences, measures taken, notification obligation (yes/no).

> **Minimum role:** `auditor` or above

---

## Data Subject Access Requests (DSAR)

Data subjects have the right to access, rectification, erasure and portability
(Art. 15–22 GDPR). The deadline is **one month** (extendable to three months).

**Record:** GDPR → DSAR → **"+ New Request"**

Fields: request type (access/erasure/rectification/portability), date received,
deadline, status (open/in progress/completed), notes.

> **Minimum role:** `editor` or above — DSARs are confidential

---

## Technical and Organisational Measures (TOMs)

TOMs document the security measures under Art. 32 GDPR — both technical
(encryption, access control) and organisational (training, policies).

**Create:** GDPR → TOMs → **"+ New TOM"**

Fields: category (access control, encryption, logging, network security, application security,
backup & recovery, organizational, training, data retention), risk level, description, implementation status,
linked RoPA entries, evidence.

**Since version 1.80** the TOMs are kept in the central [measures register](module-measures.en.md) (*TOM* flag). They appear
there together with all other measures, can be filtered by origin “TOMs only”, and can additionally be assigned
to SoA controls. The rights stay as described here: create and change only from `contentowner`.

---

## Data Protection Officer (DPO)

Under GDPR → DPO, the contact details and appointment document of the data protection
officer can be stored (PDF upload). The information appears automatically on the GDPR
dashboard.

---

## Deletion Log

The deletion log documents actual deletions carried out — when which data category
was deleted and according to which retention period.

**GDPR → Deletion Log → "Add entry"**

Overdue deletions (based on retention periods stored in the RoPA) appear as a
notification on the dashboard.

---

## Dashboard

The GDPR dashboard provides a quick overview:
- Number of RoPA entries, open DSARs, active data breaches
- TOMs by category
- Overdue deletions
- DPO contact details

---

## Audit Note

In a GDPR audit by the supervisory authority, the following are typically requested:
completeness of the RoPA, DPAs for all relevant processors, DPIAs for high-risk
processing, evidence of DSAR handling within the deadline, and TOM documentation.
The GDPR module covers all these points.
