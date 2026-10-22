# Module: Organisation & Company Logo

> This is where administrators define who the organisation is: name, responsibilities, languages, notifications,
> services and the **company logo**, which appears on the login page, policy PDFs and print views.

---

## Where do I find the settings?

**Admin → Organisation.** The area is visible to administrators only. Changes are applied with **Save** at the top right; the company logo, in contrast, is saved **immediately on upload**.

| Section | Content |
|---|---|
| **General Information** | Organisation name, abbreviation, logo text, **company logo**, ISMS scope |
| **Responsibilities** | CISO, data protection officer (GDPO) and ICS contact with name and e-mail |
| **Security Policies** | Enforce 2FA system-wide (sign-in without TOTP is then blocked) |
| **Language Configuration** | Enabled languages (DE, EN, FR, NL, HU) and default language of the login page |
| **E-Mail Notifications** | Global switch and the individual notification types |
| **SMTP Configuration** | Mail server for notifications and policy acknowledgements |
| **WebDAV Publish** | Store approved policies automatically in Nextcloud/ownCloud |
| **Menu Order** | Order of the sidebar menu items |
| **Organisational Units** | IT structure (CIO, group/central, local) used for responsibilities in all modules |

Passwords for SMTP and WebDAV are **write-only**: the server never shows them again, not even to administrators. An empty field leaves the stored password unchanged; there is a separate option to remove it.

---

## Company logo

The company logo gives official documents the look of your organisation.

### Uploading

1. **Admin → Organisation → General Information**, row **Company logo**.
2. Choose a file. It is saved immediately and shown as a preview.
3. To replace it, choose a new file; to remove it, click **Remove logo**.

| Rule | Value |
|---|---|
| Formats | **PNG** or **JPEG** |
| Size | at most **512 kB** and **4000 pixels** per side |
| Not allowed | SVG and any other format. SVG can contain scripts and is therefore deliberately rejected |

The file type is checked from the content of the file, not from the extension or what the browser claims. A **landscape logo with a transparent or white background** works best; up to about 840 × 400 pixels is enough for all outputs.

### Where the logo appears

| Place | Display |
|---|---|
| **Login page** | above the sign-in form, on a light tile (so dark logos stay readable) |
| **Policy PDF** | small at the top right of the first page, the title starts below it |
| **Print views** | top right in the print windows of reports, risk, finding and measure overviews, audit outputs and the document export |

Not affected: the app header and the mobile app. If there is no logo, all outputs stay as before, just without the picture.

Who may **see** the logo: everyone who can reach the login page (it shows it). Who may **change** it: administrators only; every change is recorded in the audit log.

### Demo and production

- In **demo mode** ISMS Builder ships with its own logo. It is set when the demo data is loaded, but only if no logo of your own exists.
- When you **switch to production** (Admin → Maintenance → Demo reset) the demo logo is removed. A logo you uploaded yourself stays.
- After that, ISMS Builder reminds you to **set the company logo**: in the result of the reset, in the notice on the login page, at the top of the dashboard (for administrators) and in the settings. The notice disappears as soon as a logo is uploaded.

### Backup

The logo is a file in the data directory (`org-logo.png` or `org-logo.jpg` with `org-logo.json`), independent of the chosen storage backend. It is **not** part of the JSON data export; a backup of the data directory contains it.

---

## Tips

- Upload the logo **before** the first policy PDF. PDFs that were already created do not change.
- If the logo looks blurry in the PDF, use a larger file (up to 4000 pixels) that is still at most 512 kB.
- After uploading, reload the page if an open browser tab still shows the old logo.
