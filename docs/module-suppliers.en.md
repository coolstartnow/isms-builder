# Module: Supplier Management

> Suppliers and service providers with access to information assets must be assessed
> and monitored — ISO 27001 A.5.19 to A.5.22.

---

## Why Supplier Management?

Many security incidents originate from third parties with access to systems or data
(supply chain attacks, insecure SaaS services, uncontrolled subcontractors). ISO 27001
therefore requires a systematic approach to supplier risk.

---

## Roles and Permissions

| Action | Minimum role |
|---|---|
| View suppliers | `reader` |
| Create and edit suppliers | `editor` |
| Delete / restore suppliers | `admin` |

---

## Creating a Supplier

**Suppliers → "+ New Supplier"**

Fields:
- **Name** — company name
- **Category** — e.g. IT service provider, cloud provider, maintenance company
- **Contact** — contact person, email
- **Access level** — which systems/data does the supplier have access to?
- **Risk rating** — `low` / `medium` / `high` / `critical`
- **Status** — `active` / `inactive` / `under_review`
- **Next review** — when is the next assessment due?
- **Security requirements** — what requirements have been agreed?
- **Evidence** — is an ISO certificate, SOC2 report, or DPA in place?

---

## Evidence link and expiry date

In the supplier form you can store an **evidence link**, for example to the supplier's ISO 27001 certificate or SOC report, and state **until when the evidence is valid**.

- **Evidence link** — address of a document that **you manage yourself** (e.g. SharePoint or the supplier portal). Only addresses starting with `http://` or `https://` are accepted.
- **Evidence label** — short text for the link, e.g. "ISO 27001 certificate".
- **Evidence valid until** — date on which the evidence expires.

ISMS Builder only stores the link. It never opens the link and checks neither reachability nor content or validity of the document; control stays with you. On the expiry date an entry **"Supplier evidence expires"** appears in the calendar, starting 60 days before and also after expiry, as long as the supplier is not "inactive" or "terminated". In the supplier list the "Evidence" column shows the link and marks expired evidence.

---

## Supplier Assessment by Email

For critical suppliers a **security questionnaire** can be sent without the supplier
needing an account:

**Open supplier → "Send assessment"**

The supplier receives a personalised link and fills in the questionnaire directly
in the browser. The responses are stored and assigned to the supplier profile.

---

## Questionnaire templates and NIS2 catalogue

You decide which questions a supplier has to answer under **Suppliers → Questionnaire templates**. This can differ by supplier or type of service.

- **Catalogues:** "Standard" (19 questions, ISO 27001) and "NIS2 supplier assessment" (56 questions in 13 sections, structured along Directive (EU) 2022/2555, Art. 20, Art. 21(2)(a)–(j) and Art. 23). The questions are our own wording, not an official checklist and not legal advice. The NIS2 catalogue is available in German and English; in other languages the questions appear in English.
- **Own templates:** For each question choose whether it is **asked**, whether it is **mandatory**, and whether a yes/no question offers a **comment field** (e.g. for an evidence link). Sections can be switched on or off as a whole; you can add your own questions. The built-in templates cannot be changed; use "Adapt as new template" to create your own version. Editors can create and change templates; readers can view them.
- **Adjust per supplier:** When creating an assessment link you choose a template and can still change the selection for this supplier. The selection is stored as a copy with the questionnaire; later changes to the template do not change questionnaires already issued.
- **Mandatory questions** are marked with * for the supplier and are also checked on the server. Older questionnaires behave as before.
- Comments and answers are supplier input and are displayed as text only; the Builder never opens a link given in a comment.

---

## Supplier mailbox (the Builder stays internal)

The Builder is meant for internal use. So that suppliers can still provide information themselves without the Builder being reachable from the internet, there is the **supplier mailbox** — a small separate service (project `isms-supplier-portal`) that only holds questionnaires and encrypted answers and knows no ISMS data.

- **Flow:** The Builder places the questionnaire in the mailbox *outbound*. The supplier opens the mailbox link and fills it in; their browser **encrypts the answers before sending** (AES-256-GCM, key wrapped with RSA-OAEP-256 for your public key). The Builder collects the answers *outbound* (every 5 minutes or via the "Collect answers" button), decrypts them itself and then deletes them in the mailbox. The mailbox cannot read the answers.
- **Setup (administrator)** under **Suppliers → Questionnaire templates → Supplier mailbox:** address (https), the mailbox API key, create a key pair, enable "Use the mailbox", test the connection. The **private key** is stored outside the data directory (`~/.config/isms-builder/supplier-portal.pem` or `SUPPLIER_PORTAL_KEY_FILE`, mode 600) and **you must back it up** — without it, received answers cannot be read. When the key pair is replaced, the old key is kept as a copy. If the mailbox uses a self-signed certificate, make the Builder trust the certificate authority via `NODE_EXTRA_CA_CERTS`.
- **Delivery:** When creating an assessment link, choose "Via the mailbox" or "Directly". Questionnaires that go through the mailbox are no longer served by the Builder's own page. If the questionnaire cannot be placed in the mailbox, it is not created.
- **Fallback without a network connection:** "Import file" takes a file with the answers from the mailbox; it is checked in the same way.
- **Limits:** The encryption protects confidentiality towards the mailbox but does not prove who an answer came from: anyone who knows the link can answer once. Answers are supplier input. If explicitly required questions are missing, the answer is accepted and marked with !. Retention periods and data-processing agreements for running the mailbox are for you to settle.

---

## Language, PDF form and entering answers

- **Language:** When creating an assessment link, only the languages enabled in the **organisation settings** (and with a complete translation) are offered. The UI language is preselected; if only one language is enabled, the choice is hidden. The title follows the chosen language. This applies to both delivery routes (mailbox and direct) and to the PDF.
- **Contact person:** Name and email of the contact person appear on the form; the CISO name and email from the organisation settings are preselected and can be changed per questionnaire.
- **Address:** Enter street, postcode/city, country and phone under **Administration → Organisation**; they appear in the header of the PDF form next to the company logo.
- **PDF form:** For an open questionnaire, the **PDF form** button creates a **fillable PDF** with logo, company name, address, contact person, supplier, due date, reference, tick boxes (yes/no), comment and text fields, mandatory questions marked with * and a signature block. The supplier fills it in on screen or by hand and returns it by email or post. The PDF does **not** contain the secret link, only the questionnaire reference. The PDF uses the organisation's embedded **PDF font** (default Liberation Sans; Administration → Organisation), so special letters of all EU official languages appear correctly. Exception: what the supplier types into the form fields is drawn by their PDF program with the standard PDF font; whether special characters appear there in every program has not been tested.
- **Enter answers:** With **Enter answers**, editors transfer the answers from the returned form into a form with the same questions. If mandatory answers are missing, the Builder asks for confirmation; they are only saved after confirmation and marked with !. The questionnaire is flagged "Form" and leaves a trace in the audit log. Only an open questionnaire can be answered this way; review it as usual afterwards.

---

## Risk Rating

The risk rating of a supplier is determined by:
- Type and extent of data access
- Criticality of dependent processes
- Demonstrated security measures (certificates, audits)
- Contractual safeguards (DPA, NDA, SLAs)

Suppliers rated `high` or `critical` should be reviewed at least annually.

---

## Link to GDPR

Suppliers that process personal data also appear in the GDPR module under
Data Processing Agreements. The link is created manually in the DPA entry.

---

## Linked Risks

In the risk form, risks can be linked to one or more suppliers (section "Links" → **Affected assets, asset types and suppliers**). In the supplier form (when editing), the **Linked risks** section lists all related risks with level and status.

---

## Dashboard

The supplier overview shows:
- Total number by risk rating
- Suppliers with overdue review
- Active vs. inactive suppliers

---

## Audit Note

ISO 27001 A.5.19 requires a policy for supplier relationships. A.5.20 requires
security requirements in supplier contracts. A.5.21 addresses supply chain risks.
A.5.22 requires regular monitoring of supplier performance and security.

The supplier assessment feature enables documented evidence of security reviews
to be presented to the auditor.
