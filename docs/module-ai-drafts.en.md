# Module: AI Drafts (Policy Assistant)

> From a document in the title list, a text draft is created in seconds, which you review, adjust and save. There are **two ways**:
> the **direct** way through the connected AI (Ollama) and the way by **copy and paste** with an AI of your choice. Both use the same, checked text,
> and with both, placeholders are filled automatically with your organisation's data.

> **Note on the templates:** The titles in the list are practice-oriented suggestions. Every draft must be **carefully adapted to your own company** and reviewed professionally. It is **not legal advice** and must not be understood as such.

---

## The essentials at a glance

| | Way A: direct | Way B: copy and paste |
|---|---|---|
| Who writes the text? | the connected AI (Ollama, usually on your own server) | an AI of your choice (web, app, company AI) |
| Set-up | Administrator: Admin → Maintenance → AI Integration (Ollama) | none |
| What you do | click **Create draft** | **Copy text**, paste it into the AI, paste the answer into the editor |
| Placeholders | filled immediately | filled when you paste (or with **Fill placeholders**) |
| Where does the text go? | only to your Ollama address (shown in the dialog) | wherever you paste it: **you are responsible for that** |

In both cases the text is a **draft**. Review it professionally before you save it and submit it for approval.

---

## Common basics

### The “Draft with AI” dialog

Open a document or create a new one (Create) and click **Draft with AI** in the editor toolbar (from role **Content Owner**). In the dialog you choose:

1. **Document** from the list. Only documents that match the type of the open document are offered (for *Policy*, for example: Information Security Policy, Password Policy, Backup Policy …).
2. **Language** of the text: your **languages your organisation has selected** (Admin → Organisation → Language Configuration; if all are selected, all are offered). The interface language is preselected. The request text is built in the chosen language and needs no editing. If only one language is selected, this is the only option and the selection is not shown.
3. **Hint (optional)**, at most 200 characters, e.g. “NIS2, remote work”.

Below the fields the dialog shows **exactly the text that is sent or copied**, and the target. It changes with every input.

**The title list** has 149 entries, ordered by document type. It covers the usual documents of an ISMS according to ISO 27001 and NIS2 and explicitly includes templates for **artificial intelligence** (use, labelling of AI-generated content under the transparency duty of the EU AI Act, AI-generated images, audio and video, governance and risk classification, AI literacy, confidential data in AI services, procurement of AI systems, human oversight, AI incidents). There is deliberately **no free title field**, so that no names or company data get into the request. If a document is missing, please suggest it.

**Policies (Policy)** (38): Information Security Policy; Acceptable Use Policy; Access Control Policy; Password Policy; Backup Policy; Cryptography Policy; Remote Work Policy; Supplier Security Policy; Clear Desk and Clear Screen Policy; Mobile Device Policy; Information Classification Policy; Artificial Intelligence Use Policy; AI-Generated Content Labelling Policy; Policy on AI-Generated Images, Audio and Video; AI Governance and Risk Classification Policy; AI Literacy Policy; Policy on Confidential Data in AI Services; AI System Procurement and Assessment Policy; Data Protection Policy; Retention and Deletion Policy; Physical Security Policy; Bring Your Own Device (BYOD) Policy; E-Mail and Internet Use Policy; Social Media Policy; Cloud Usage Policy; Network Security Policy; Vulnerability Management Policy; Logging and Monitoring Policy; Secure Development Policy; Asset Management Policy; Security Awareness and Training Policy; Human Resources Security Policy; Business Continuity Management Policy; Privileged Access Policy; Removable Media Policy; Information Security Roles and Responsibilities Policy; OT/ICS Security Policy; Product Security Policy (Cyber Resilience Act).

**Procedures (Procedure)** (63): Change Management Procedure; Joiner, Mover, Leaver Procedure; Patch Management Procedure; Access Review Procedure; Data Restore Procedure; Vulnerability Management Procedure; Coordinated Vulnerability Disclosure Procedure; Asset Inventory Procedure; Log Review Procedure; Data Subject Request Procedure; Internal Audit Procedure; Management Review Procedure; Document Control Procedure; Corrective Action and Continual Improvement Procedure; Supplier Assessment Procedure; Secure Media Disposal Procedure; Cryptographic Key Management Procedure; Risk Assessment and Treatment Procedure; Business Impact Analysis Procedure; Disaster Recovery Procedure; AI System Inventory and Risk Classification Procedure; Human Oversight of AI Systems Procedure; AI Use Case Approval Procedure; Configuration Management Procedure; Capacity Management Procedure; Malware Protection Procedure; Penetration Testing and Security Testing Procedure; User Access Provisioning and Revocation Procedure; Privileged Access and Break-Glass Procedure; Password Reset Procedure; Background Screening Procedure; Return of Assets Procedure; Visitor Management Procedure; Physical Access Control Procedure; Media Handling Procedure; Information Labelling and Handling Procedure; Secure Information Transfer Procedure; Supplier Onboarding Procedure; Supplier Offboarding Procedure; Data Protection Impact Assessment Procedure; Records of Processing Activities Procedure; Consent Management Procedure; Personal Data Deletion Procedure; Data Processing Agreement Procedure; Security Event Reporting and Assessment Procedure; Evidence Collection and Forensics Procedure; Post-Incident Review Procedure; Business Continuity Exercise and Test Procedure; Backup Verification Procedure; Security Metrics and Reporting Procedure; Legal and Regulatory Requirements Procedure; Competence and Training Procedure; Nonconformity Handling Procedure; Exception Request Procedure; Cloud Service Approval Procedure; Software Approval and Installation Procedure; Code Review and Security Testing Procedure; Certificate Management Procedure; Remote Access Procedure; Data Governance Procedure for AI; AI System Testing and Monitoring Procedure; Procedure for Informing People about AI Use; AI-Generated Content Labelling Procedure.

**Risk policies (Risk Policy)** (20): Risk Management Policy; Risk Acceptance and Risk Criteria Policy; AI Risk Management Policy; Supply Chain and Third-Party Risk Policy; Risk Assessment Methodology Policy; Risk Appetite and Tolerance Policy; Risk Treatment Policy; Risk Register Policy; Risk Reporting and Escalation Policy; Risk Ownership Policy; Risk Monitoring and Review Policy; Privacy Risk Management Policy; Cyber Risk Management Policy (NIS2); Project Risk Management Policy; Change Risk Assessment Policy; Business Continuity Risk Policy; Insider Risk Policy; Residual Risk and Risk Exception Policy; AI Impact Assessment Policy; Asset Valuation and Protection Needs Policy.

**Incidents (Incident)** (7): Incident Response Procedure; Data Breach Procedure; Significant Incident Reporting Procedure (NIS2); Ransomware Response Procedure; Lost or Stolen Device Procedure; AI Incident Procedure; Crisis Communication Plan.

**Releases (Release)** (4): Release and Approval Procedure; Emergency Change Procedure; Release Procedure for AI Systems and Models; Software Release Procedure with Security Review.

**Applicability (SoA)** (2): Statement of Applicability (SoA); Statement of Applicability Maintenance Procedure.

**BCM plans (BCM Plan)** (9; only in the BCM module, Plans tab, field "Procedures"): General business continuity plan; IT disaster recovery plan; Cyber attack and ransomware; Power outage; Building and site loss; Failure of a critical supplier; Pandemic and major staff shortage; Crisis communication; Data centre restart.

**BCM exercises (BCM Exercise)** (6; only in the BCM module, Exercises tab, field "Scenario and course"): Tabletop exercise: ransomware; Backup restore test; Evacuation and site loss; Supplier outage; Alerting chain test; Power outage drill.

### What is sent, and what is not

The text consists only of: a fixed instruction to the AI, the type and title from the list, a structure guideline per type, the target language, the request to use **placeholders instead of invented details**, and your hint. **Company names, personal names, addresses and system data of your installation are never included.**

The **hint** is the only free-text field and is checked:

- Allowed are letters, digits, spaces and `, . ; : ( ) / & + -`. Line breaks and quotation marks are not possible.
- **Blocked** (nothing is sent or copied, the dialog names the finding): e-mail addresses, web and domain names, IP and MAC addresses, IBANs, phone numbers, long numbers (six digits or more, e.g. customer numbers), UUIDs, keys and tokens, file paths, @names, company designations such as GmbH, AG or Ltd, and **the values of your organisation data** (organisation name, abbreviation, names of the CISO and the DPO).
- **Limit:** The filter cannot recognise arbitrary personal or company names. So do not write names into the hint.

### Placeholders

Instead of inventing company data, the AI writes placeholders. They are replaced from the organisation data:

| Placeholder | Replaced by | Where you maintain the value |
|---|---|---|
| `{{COMPANY_NAME}}` | organisation name | Admin → Organisation → General Information → *Organization Name* |
| `{{ISMS_OWNER}}` | name of the person responsible for the ISMS | Admin → Organisation → Responsibilities → *CISO / ISM Name* |
| `{{DATA_PROTECTION_OFFICER}}` | name of the data protection officer | Admin → Organisation → Responsibilities → *DPO / Privacy Officer Name* |
| `{{ISMS_SCOPE}}` | ISMS scope | Admin → Organisation → General Information → *ISMS Scope* |

- The spellings `[COMPANY_NAME]`, lower and upper case and spaces inside the brackets (`{{ company name }}`) are recognised as well.
- **If the value in the organisation data is empty, the placeholder stays in the text** and a notice names it. Enter the value and click **Fill placeholders**.
- Other brackets in the text (`{x}`, `[here]`) are left alone. Only these four placeholders are replaced.

---

## Way A: directly through the connected AI

### Set-up (once, administrator)

1. **Admin → Maintenance → AI Integration (Ollama).**
2. Switch on **Enable AI search**. It is the global switch for all AI functions, including the drafts.
3. Enter the **Ollama URL**. Empty means `http://localhost:11434`.
4. Enter the **Generation model (AI Policy Assistant)**. Empty means `llama3.2:3b`. The model must exist on the Ollama server.
5. Optionally enter the **API key** if the AI address requires one or if you want to recognise the requests in the log of a gateway in front of it (details: Administration console → AI integration). The key is never shown again.

### Procedure

1. Open the **Draft with AI** dialog, choose document, language and optionally a hint.
2. Check the text shown and the target. If the hint has a finding, **Create draft** is locked until it is fixed.
3. Click **Create draft**. If the editor already contains text, ISMS Builder asks before overwriting.
4. The draft is in the editor, the placeholders are filled. If the title field is empty, the title from the list is taken. Open placeholders are reported.
5. Review, adjust, **Save**. The document stays in status *Draft*.

Creating can take up to 60 seconds. The audit log records who created which document in which language (and whether a hint was used, not its text).

### If it does not work

| Message | Meaning and remedy |
|---|---|
| The direct AI connection is switched off | The switch in Admin → Maintenance is off. Switch it on or use way B. |
| Ollama not reachable | Wrong address, Ollama is not running or the firewall blocks it. Check the Ollama URL. |
| Ollama answered with HTTP … | Ollama reported an error, for example because the model does not exist there. Check the model name and Ollama. |
| Empty or too short answer | The model returned nothing usable. Try again or enter a larger model. |
| Not sent, the hint contains … | The filter found personal or technical data. Change or empty the hint. |

---

## Way B: copy and paste with an AI of your choice

This way needs no set-up and also works when the direct connection is switched off (the dialog still opens).

1. Open the **Draft with AI** dialog, choose document, language and optionally a hint.
2. Click **Copy text** (or select and copy the shown text yourself). If the hint has a finding, the button is locked.
3. In the AI of your choice, paste **only this text** and send it. Do not add company or personal data to it: that is exactly what the placeholders are for.
4. Copy the **answer of the AI**, best only the Markdown text, **without** the lines with three backticks (```) that some AIs put around the text.
5. **Paste** it into the document's editor (Ctrl+V). If the text contains placeholders, ISMS Builder replaces them at once and reports how many were replaced and which remain open.
6. Text that was already in the editor? Click **Fill placeholders**, which replaces in the whole text.
7. Review, adjust, **Save**.

**Data protection with way B:** The copied text contains no data of your organisation, and the filter has checked the hint. What the AI of your choice does with it depends on its terms. Use services your organisation has approved for such content. Pasting the answer into ISMS Builder replaces the placeholders locally; your organisation's name goes nowhere in the process.

---

## Questions and answers

**Why does my text still contain `{{COMPANY_NAME}}`?** The value is missing in the organisation data, or the text did not get into the editor by pasting (for example by dragging with the mouse). Enter the value and click **Fill placeholders**.

**The AI used its own placeholders such as `[Company name]`.** They are not replaced automatically, because ISMS Builder only knows the four placeholders. Ask the AI to use exactly the placeholders from the copied text, or replace those places by hand.

**Who may do this?** The dialog and the direct way from role *Content Owner* (the same permission as creating a document). **Fill placeholders** and the automatic replacement when pasting from role *Editor*.

**Can I choose the title freely?** Not for the draft. After pasting the text you can change the title field in the editor as usual.

**Does this apply to the mobile app as well?** There the direct connection does not exist. Handing over to an AI app through the Android share menu is planned.
