# Module: Assets (Information Assets)

> The asset register is the foundation of every ISMS — ISO 27001 Annex A.5.9 requires
> a complete inventory of all information-processing assets.

---

## What is an Asset?

An asset (information asset) is anything of value to the organisation that needs
to be protected: software, hardware, data, people, processes, facilities.

Typical asset categories:
- **Hardware** — servers, laptops, network equipment
- **Software** — operating systems, applications, SaaS
- **Data** — databases, backup media, configuration data
- **People** — staff in key roles
- **Processes** — critical business processes
- **Facilities** — data centres, office buildings

---

## Roles and Permissions

| Action | Minimum role |
|---|---|
| View assets | `reader` |
| Create and edit assets | `editor` |
| Delete / restore assets | `admin` |

---

## Creating an Asset

**Assets → "+ New Asset"**

Fields:
- **Name** — unique identifier (e.g. "Production Database Server")
- **Type** — e.g. Server, SaaS Application, Database. The list is grouped by category (Hardware, Software, Data, Services, Facilities) and can be customised — see below.
- **Owner** — who is responsible?
- **Department / Organisational unit**
- **Classification** — confidentiality: `public` / `internal` / `confidential` / `secret`
- **Criticality** — `low` / `medium` / `high` / `critical`
- **Description** — what is the asset, where is it located?
- **Linked risks** — which risks affect this asset?

---

## Customising asset types

**Administration → Lists → Asset Types** (administrators only)

The types that ship with the application are a starting point, not a fixed list. They can be
renamed, extended and removed; every type belongs to one of the five categories.

Two safeguards apply:

- **A type still in use cannot be removed.** The system names the type and how many assets are
  affected. Reassign them first, then delete.
- **The type is validated when an asset is saved.** An unknown type is rejected, so that a typo
  does not end up in the data as a type of its own.

Existing assets keep their type even if it later disappears from the list; in the form it appears
under "Unknown type" so that it is not silently lost while editing.

**Reset** restores the shipped defaults.

### Setting protection goals per type

Each type can define confidentiality, integrity, availability and authenticity (levels 1–4).
Assets of that type inherit those values without anyone having to maintain them individually.

Three rules matter here:

- **The default applies per goal.** A "Database" type can set confidentiality to 4 alone;
  integrity and availability then remain with the individual asset.
- **The link persists.** Correcting the default on the type later applies immediately to every
  asset that has not overridden it — it is not a one-off starting value.
- **Deviating is possible:** the asset form has a "Set protection goals independently of the
  type" switch. While it is off, the four fields are locked and show the type's value.

**Changing the type in the form:** When you change the type in the asset form, the four protection fields show the new type's defaults immediately — no need to save and reopen. This applies as long as "Set protection goals independently of the type" is not ticked; if the switch is on, your own values stay untouched. If the new type has no defaults, the fields are freely editable (the switch is hidden). For a new asset, the defaults of the preselected type apply as soon as the form opens.

**Important interaction with dependencies:** inheritance by the maximum principle still sits
above the type default. If an asset with a high protection requirement depends on another, that
other asset is raised — even where its value was deliberately lowered by an override. This is
intended: a server running a critical application is no less worth protecting than the
application itself. The form then shows which asset raises the value.

---

### Languages: what is translated and what is not

This is a deliberate design decision, not a gap:

- **The 24 shipped types are translated into all interface languages** (DE/EN/FR/NL) and appear
  in whichever language each user has selected.
- **A type you create yourself is not translated.** It appears to every user exactly as it was
  entered. The application cannot invent a translation for a term it does not know.
- **Renaming a shipped type also drops its translation.** From that point the text you entered
  applies — otherwise your rename would be silently overwritten in other languages.

If you have a multilingual workforce and add your own types, agree on one language for type
names — usually the corporate language. Resetting to the defaults restores the translations.

---

## Classification and Criticality

**Classification** describes the protection requirement regarding confidentiality:

| Level | Meaning |
|---|---|
| `public` | Publicly accessible, no harm if disclosed |
| `internal` | Internal use only, limited impact |
| `confidential` | Confidential, significant impact |
| `secret` | Strictly confidential, severe impact |

**Criticality** describes the impact on business operations if the asset is
unavailable or compromised.

---

## Linking to Risks

In the risk form (section "Links" → **Affected assets, asset types and suppliers**) a risk can be linked to individual **assets**, whole **asset types (classes)** and **suppliers**. The picker has a search box; double-click adds an entry, clicking the chip removes it. A risk linked to an asset type applies to all assets of that type.

In the asset form (when editing), the **Linked risks** section lists all risks with level and status — both directly linked ones and those that apply through the asset type (marked "via asset type"). The risk detail view lists the linked assets, types and suppliers by name.
This makes the **risk exposure** of an asset transparent.

---

## Dashboard

The asset overview shows:
- Total number of assets by type
- Distribution by classification and criticality
- Assets without an owner (action required)

---

## Audit Note

ISO 27001 A.5.9 requires a maintained asset inventory with owner assignments.
A.5.10 requires a policy on acceptable use. A.5.12 requires information classification.
All three requirements are covered by the asset module together with an appropriate policy.

Recommendation: review the asset register annually and update it immediately whenever
there are significant changes to the IT landscape.
