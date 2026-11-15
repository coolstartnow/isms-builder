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

> **In detail:** templates, pre-check, DPO review and print view are described in the guide “Module: Data Protection Impact Assessment (DPIA)” (`docs/module-dsfa.en.md`).

---

## Templates for entries

Each tab has templates that pre-fill a new form with a practical suggestion: **processing activities (RoPA)**, **processing agreements**, **data breaches**, **data subject rights** (reply letters) and **TOMs**. The **DPIA** has its own templates, see the guide “Module: Data Protection Impact Assessment (DPIA)”.

**How it works:** In the tab, click **Use template**, choose the template and click **Apply template**. The form opens with the suggestion. You review, adapt and save. An entry only comes into being when you save; the template itself is never changed.

> **Important:** All templates are practice-oriented but must be **carefully adapted to your own company**. They are **not legal advice** and must not be understood as such. Periods, legal bases and retention times are suggestions that you must check against the law that applies to you. You enter names, providers, figures and responsibilities yourself.

### Processing activities (RoPA) (14)

Pre-filled are purpose, legal basis, data categories, data subjects, recipients, retention and deletion procedure; “high risk” is only set where it usually applies. Retention months are only set where a short guideline value is common.

Accounting and invoicing; Applicant management; Contact form and general enquiries; Customer management (CRM); Customer support and ticketing; Events and training courses; IT operations, logging and information security; Newsletter and e-mail marketing; Personnel administration and payroll; Supplier and business partner management; Time recording and access control; Video surveillance; Website operation and web analytics; Whistleblowing system (reporting channel).

### Processing agreements (12)

Pre-filled are the title and scope of processing. Processor, country, contract dates and the **Art. 28 checklist** stay empty; you only tick what the contract actually contains.

AI service (e.g. assistant or text processing); Backup and archive service; Call centre and customer service provider; Cloud hosting and data centre; CRM and marketing software; Document shredding and media disposal; E-mail, calendar and collaboration service; HR and payroll software (SaaS); IT service provider, maintenance and remote maintenance; Support and ticketing system; Video surveillance and security service; Web hosting and website agency.

### Data breaches (10)

Pre-filled are type, data categories, data subjects, immediate measures, follow-up measures, risk and a **suggestion** whether the supervisory authority and the data subjects are to be notified. Whether a notification is required is for you to decide in the individual case.

Accidental deletion or alteration of data; Accidental publication of personal data; Loss or theft of a laptop, smartphone or storage medium; Misconfiguration: data publicly exposed or shared too widely; Misdirected e-mail or document; Misuse of access rights by employees; Phishing with disclosure of credentials; Ransomware attack; Theft or loss of paper documents; Unauthorised access through a compromised account.

### Data subject rights, reply letters (10)

Pre-filled is the reply text with opening and closing sentence. The placeholders `{{COMPANY_NAME}}` and `{{DATA_PROTECTION_OFFICER}}` are filled from the organisation data. There are also texts for requesting proof of identity, the extension of the time limit and refusal; open points are shown in brackets.

Notice of extension of the time limit (Art. 12(3)); Refusal of a request (Art. 12(4) and (5)); Reply regarding automated decisions (Art. 22); Reply to a data portability request (Art. 20); Reply to a rectification request (Art. 16); Reply to a request for restriction of processing (Art. 18); Reply to an access request (Art. 15); Reply to an erasure request (Art. 17); Reply to an objection (Art. 21); Request for proof of identity (Art. 12(6)).

### TOMs (24)

Pre-filled are title, category, description and implementation notes; the status is “Planned”. You enter what is actually implemented yourself.

Backup and tested restoration; Clear desk and screen lock; Confidentiality undertaking; Data protection and awareness training; Data protection management and involvement of the DPO; Deletion concept; Disk and device encryption; Emergency and recovery planning; Encryption of backups and portable storage media; Firewall and network segmentation; Input control (traceability of changes); Logging and review; Multi-factor authentication; Patch and vulnerability management; Physical access control to buildings and server rooms; Process for personal data breaches; Protection against malware; Pseudonymisation and anonymisation; Retention periods and archiving; Role-based permission concept; Secure development and protection of test data; Selection and oversight of processors; Separation control and purpose limitation; Transport encryption (TLS) and secured remote access.

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
