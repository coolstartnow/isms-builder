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

## Supplier Assessment by Email

For critical suppliers a **security questionnaire** can be sent without the supplier
needing an account:

**Open supplier → "Send assessment"**

The supplier receives a personalised link and fills in the questionnaire directly
in the browser. The responses are stored and assigned to the supplier profile.

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
