# Module: Policy Acknowledgements

> Verifiable distribution and confirmation of policies by staff —
> a central audit document for ISO 27001.

---

## What is a Policy Acknowledgement?

ISO 27001 requires not only that policies exist but that they have been **communicated**
to the relevant persons and that those persons have **confirmed their understanding**
(requirements 7.3 and A.6.3). The classic proof: a signed acknowledgement receipt.

ISMS Builder fully automates this process:
- Select policy → define recipients → send link by email
- Recipient confirms via a personalised link (no login required)
- The recipient sees the policy **properly formatted** (rendered Markdown: headings, tables, lists), no longer as raw source
- Complete audit trail with timestamp and CSV export

---

## Roles and Permissions

| Action | Minimum role |
|---|---|
| See dashboard figures (“Active distributions”, “Pending acknowledgements”) | `reader` |
| View the distribution overview and acknowledgement details (menu item “Policy Acknowledgements”) | `contentowner` |
| Create and send distribution | `contentowner` |
| Send reminder | `contentowner` |
| Record or import acknowledgement manually | `contentowner` |
| Delete distribution | `admin` |

Readers only see the summary figures on the dashboard. The recipient lists with e-mail address, name, time and IP address of the acknowledgement are reserved for the content owner because they contain personal data.

---

## Workflow: Distributing a Policy

**Step 1 — Create distribution**
In the **"Policy Acknowledgements"** menu click **"+ New Distribution"**.

**Step 2 — Required fields**
- **Select policy** — only templates with status `approved` are available
- **Distribution title** — e.g. "Password Policy 2026 – Annual Distribution"
- **Due date** — deadline for all acknowledgements
- **Recipients** — names and email addresses of the people to notify

**Step 3 — Send**
Clicking **"Send"** dispatches an email to each recipient with a **personalised
confirmation link**. The link is tied to that person and works without a login.

**Step 4 — Confirmation by recipient**
The recipient opens the link, reads the full policy text and clicks
**"I confirm that I have read and understood this policy"**.
The timestamp and IP address are stored.

**Step 5 — Track status**
The distribution overview shows the current state at any time:
- Who has confirmed (with timestamp)
- Who has not yet confirmed
- Percentage completed

---

## Reminder Function

**"Send reminder"** re-dispatches an email with the same personalised link to all
recipients who have not yet confirmed.

---

## Manual Entry and Import

For people without email access (e.g. production staff):

**Single entry:** In the distribution click **"Record acknowledgement"** — enter
name, date and optional note.

**CSV import:** Bulk import via a CSV file with columns
`name, email, confirmedAt` (format: ISO 8601).

---

## Export and Evidence

**"Export CSV"** in the distribution downloads a complete confirmation list —
suitable as audit evidence:

```
name, email, confirmedAt, method
John Smith, j.smith@company.com, 2026-03-15T10:23:00Z, link
Anna Jones, a.jones@company.com, 2026-03-16T08:45:00Z, manual
```

---

## Audit Note

The auditor expects evidence of communication for every security-relevant policy.
The CSV exports of distributions are the appropriate document for this. Recommendations:
- Annual distribution of all active policies
- When a policy changes: trigger a new distribution
- Archive exports in the document management system
