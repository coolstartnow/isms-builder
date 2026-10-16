# Templates: Usage in ISMS Builder

> Templates are the central working tool in ISMS Builder. This guide explains how to
> create, edit, move templates through the approval lifecycle, and link them to other modules.

---

## What is a Template?

A template is a versioned, status-managed document — for example a policy, a procedure,
or a release document. Each template follows a defined lifecycle and can be linked to
controls (SoA), risks, and other templates.

Available template types:

| Type | Purpose | Separate docs |
|---|---|---|
| **policy** | Binding rules (What applies?) | [template-type-policy.md](template-type-policy.md) |
| **procedure** | Work instructions (How is it done?) | [template-type-procedure.md](template-type-procedure.md) |
| **soa** | Supporting documents for the SoA process | [template-type-soa.md](template-type-soa.md) |
| **incident** | Incident response plans and templates | [template-type-incident.md](template-type-incident.md) |
| **release** | Change and release documentation | [template-type-release.md](template-type-release.md) |

---

## Roles and Permissions

| Action | Minimum role |
|---|---|
| Read templates | `reader` |
| Edit template (content, status) | `editor` |
| Create, move, delete templates | `contentowner` |
| Permanently delete, restore templates | `admin` |

---

## Creating a Template

**Step 1 — Choose type**
In the sidebar under the desired template type (e.g. "Policy") click **"+ New"** or
use the "Create" button at the top of the sidebar and select the type.

**Step 2 — Fill in required fields**
- **Title** — unique name (e.g. "Password Policy v1.0")
- **Owner** — responsible person or role
- **Valid from / Next review** — date fields for lifecycle management
- **Linked ISO controls** — optional link to SoA controls

**Step 3 — Enter content**
The content area supports **Markdown**. Headings, lists, tables and code blocks are
rendered. For structured policies the following outline is recommended:

```
# Title
## 1. Purpose
## 2. Scope
## 3. Rules
## 4. Responsibilities
## 5. Violations and consequences
## 6. Review and updates
```

**Step 4 — Save**
The template is saved with status `draft` and is visible only to logged-in users
with `reader` role or above.

---

## Lifecycle (Status Workflow)

Each template passes through four status stages:

```
draft  →  review  →  approved  →  archived
```

| Status | Meaning | Visible to |
|---|---|---|
| `draft` | In progress, not yet released | From `reader` (internal) |
| `review` | Under review, awaiting approval | From `reader` (internal) |
| `approved` | Officially valid, in production use | From `reader` |
| `archived` | Superseded, kept for reference only | From `reader` |

**Changing status:** Use the status dropdown in the template detail view. Every
status change is logged with timestamp and user in the **status history**
(accessible via the clock icon in the template).

> **Audit note:** The complete status history is stored in the audit log and can be
> reviewed by the auditor. A template moved directly from `draft` to `approved`
> without `review` is permitted but should be a conscious organisational decision.

---

## Version History

The **version only changes on approval**, not when you save. You can save as often as you like without changing the version number; a document gets its version when it moves from `review` to `approved`. The first approval keeps the existing number, every further approval increases it by 1.

**Approving:** The "Approve" button asks first: **"Approve as version X?"**, plus an optional **change comment**. Only "Yes, approve" performs the approval.

**Approved documents are locked:** Title and content cannot be changed while the status is `approved` (the UI shows the read-only view and a hint, the server rejects changes with `409`). The next review date stays editable. To keep working, set the document back to `review` (role `contentowner`), edit it and approve it again — this creates the next version.

**Version history in the document header:** Above the document (collapsible, also via the **history icon**) there is the table

| Version | Approved by | Approved on | Changes |
|---|---|---|---|

showing the user name, time and change comment of every approval. The same table appears in the print/PDF output and in the PDF used for the Nextcloud publish. Each approval also stores a snapshot of the content. Documents that were approved before this feature show the last approval from the status history as their first row.

This enables the full traceability that ISO 27001 requires for documents.

---

## Attachments

Templates can have files attached (PDF, DOCX — max. 25 MB):

**Add attachment:** Click **"Upload attachment"** in the template detail view.
Minimum role: `editor`.

**Download attachment:** Visible to all users from `reader` upwards.

**Delete attachment:** Minimum role: `editor`.

---

## Links to Other Modules

Templates can be linked to other modules:

**→ SoA controls:** Select the ISO controls covered by this document. The control
will then appear in the SoA with a reference to the template ("implementation evidence").
This is relevant for the gap analysis and the compliance report.

**→ Risks:** Via the risk module, policies and procedures can be assigned to a risk
as risk-mitigating measures.

**→ Policy acknowledgement:** Approved policies can be sent to staff for confirmation
(module "Policy Acknowledgements").

---

## Moving a Template

A template can be moved to a different type (e.g. from `procedure` to `policy`) —
minimum role: `contentowner`. All links and the version history are preserved.

---

## Deleting and Restoring Templates

**Soft delete** (minimum role `contentowner`): The template is marked as deleted and
removed from view but remains in the system. Links to controls and risks are preserved.

**Restore** (minimum role `admin`): Deleted templates can be restored in the Admin
panel under "Trash".

**Permanent delete** (minimum role `admin`): Removes the template irreversibly
including version history and attachments. Cannot be undone.

---

## Review Due Dates

The **"Next review"** field is actively monitored:

- Templates whose review is due in ≤ 14 days appear in the **calendar** (highlighted red)
- The admin receives an **email notification** (if SMTP is configured)
- Due reviews appear as tasks on the **dashboard**

Recommendation: review policies annually, procedures every six months.
