# Module: Data Protection Impact Assessment (DPIA)

> A DPIA describes a planned processing, assesses its risks for the people concerned and defines measures. The **controller prepares it themselves**, the **data protection officer (DPO) reviews** it and gives an opinion. ISMS Builder provides templates, a pre-check, a review workflow and a print view. Everything else about the module is in the guide “Module: GDPR (Data Protection)”.

> **Note:** All templates and the pre-check are practice-oriented but must be **carefully adapted to your own company**. They are **not legal advice** and must not be understood as such; they replace neither the assessment of your individual case nor the review by the DPO. You check the national lists of the supervisory authorities yourself.

---

## Who does what?

| Role | Task |
|---|---|
| Business unit / controller (from role **Content Owner**) | performs the pre-check, chooses the template, fills in the DPIA and submits it for review |
| **DPO** (account with the function *DPO* or administrator) | reviews the DPIA and enters the **opinion** |
| Responsible management (Content Owner) | takes the **decision**, justifies it and approves the DPIA |

The DPO is **not the author**. Only accounts with the function *DPO* and administrators can enter an opinion; the server records the person and date.

**Demo:** The demo set contains two separate accounts without administrator rights for this: **carla** (`carla@security.example` / `carlapass`) with the CISO function and **dana** (`dana@privacy.example` / `danapass`) with the DPO function. Test the review workflow: prepare the DPIA with **carla**, enter the opinion with **dana**, approve with **carla**. **carla** may not enter the opinion.

---

## Procedure in six steps

1. **GDPR → DPIA → Pre-check: is a DPIA needed?** Tick what applies to your processing (see below). The result is saved with the DPIA.
2. **Continue with template**, or at any time **Use template**: choose the type of processing. The form is pre-filled.
3. **Fill in:** description (purpose, data subjects, data categories, recipients, storage location, periods), necessity and proportionality, existing measures, the **risks with their measures** and the **residual risk**. Likelihood and impact (1 to 5) in the templates are suggestions: review and change them. Measures go one per line under the risk.
4. Set the status **Review**. The DPO reads the DPIA.
5. **DPO opinion:** the DPO sets **DPO consulted** and enters the **opinion**.
6. **Decision and approval:** choose the decision (proceed, modify, reject) and justify it, then set the status **Approved**.

Afterwards: print or file with **PDF** (company logo in the header, DPO opinion with person and date, approval) and review the DPIA whenever the processing changes.

---

## Pre-check: is a DPIA needed?

The pre-check first asks about the **cases in Art. 35(3) GDPR**. If one applies, a DPIA is required:

- Systematic and extensive evaluation of personal aspects of natural persons based on automated processing, including profiling, with decisions that produce legal effects or similarly significantly affect them
- Large-scale processing of special categories of personal data (Art. 9) or of data relating to criminal convictions and offences (Art. 10)
- Systematic monitoring of a publicly accessible area on a large scale

Then the **nine criteria of guideline WP 248** of the European data protection authorities. If **two or more** apply, a DPIA is usually necessary:

1. Evaluation or scoring (including profiling and prediction)
2. Automated decisions with legal or similarly significant effect
3. Systematic monitoring of people
4. Sensitive or highly personal data (e.g. health, biometrics, finances, location)
5. Large-scale processing (many people, large volume of data, wide area or long duration)
6. Matching or combining of data sets from different sources
7. Data of vulnerable persons (e.g. employees, children, patients)
8. Use of new or innovative technology (e.g. AI, biometrics, internet of things)
9. The processing prevents people from exercising a right or using a service or contract

**Result:**

- A DPIA is required (Art. 35(3) GDPR).
- A DPIA is probably required (two or more criteria of guideline WP 248 apply). If you do without one, you must document the reasons.
- A DPIA is not mandatory. Document the result of this check and check the lists of your country’s supervisory authority.

You check the lists of your country’s supervisory authority that name cases in which a DPIA is or is not required yourself. If you do without a DPIA, document the reasons, for example in an archived record.

---

## The templates

The template creates the description outline, legal bases, typical risks with measures and suggested values. It contains no company data except the placeholder `{{COMPANY_NAME}}`, which is filled from the organisation data (Admin → Organisation). Offered types of processing:

- **HR software in the cloud (personnel administration and payroll)**: Personnel administration, payroll and staff development with cloud-based HR software.
- **Video surveillance**: Protection of property and people, investigation of offences in defined areas.
- **Employee monitoring and tracking (working time, location, performance)**: Time recording, vehicle or device tracking, usage and performance analysis.
- **AI service with personal data (e.g. assistant, chatbot, analysis)**: Use of an AI service to support tasks in which personal data may be processed.
- **Profiling and scoring of customers**: Assessment of customers (creditworthiness, purchase behaviour, segmentation) based on automated processing.
- **Health data (workplace reintegration management, occupational physician)**: Handling of employees’ health data, for example return to work after illness and occupational health surveillance.
- **Biometric access control and time recording**: Access to rooms or systems or time recording using fingerprint, face or other biometric features.
- **Whistleblowing system (reporting channel)**: Receiving, reviewing and handling reports of violations through an internal or external reporting channel.
- **Applicant management (optionally with AI pre-selection)**: Receiving, selecting and managing applications, possibly with automated pre-selection.

What you have to add: the concrete details of **your** processing (recipients, providers, storage location, periods, legal basis in the individual case), the review of the suggested risks and values and the measures you have actually implemented.

---

## Approval rules

| Rule | Effect |
|---|---|
| New DPIA | cannot be approved straight away |
| Opinion | only *DPO* function or administrator; person and date are recorded |
| Approval | only with **DPO consulted** and an entered opinion, a **decision** and, for **high or critical residual risk**, a **justification** or the tick **Consultation of the supervisory authority required** |
| Approval stamp | person and date are set by the server; it is removed when the status is reset |
| Audit log | creation, changes and status changes are logged |

DPIAs that were already approved in earlier versions remain valid; the rules apply at the next status change.

**Error messages:** “Approval requires the opinion of the data protection officer” (opinion missing), “Approval requires a decision”, “With a high residual risk …” (add a justification or tick the consultation of the supervisory authority), “Only the data protection officer or an administrator may enter the DPO opinion”.

---

## Print view

**PDF** (in the list and in the form) opens a print view with company logo, description, necessity, risk table with measures, residual risk, DPO opinion, decision and approval. In the print dialog you can save as PDF.
