# ISMS Builder – C4 Architecture Diagrams

Diagrams follow the [C4 model](https://c4model.com/). Rendered with Mermaid.

---

## Level 1 – System Context

Who uses the system and what external systems does it interact with?

```mermaid
C4Context
  title System Context – ISMS Builder

  Person(admin, "Administrator", "Manages users, org settings, modules, audit log")
  Person(ciso, "CISO / ISB", "Manages risks, incidents, SoA, security goals")
  Person(dpo, "Data Protection Officer", "Manages GDPR, DSAR, VVT, DSFA")
  Person(editor, "Policy Author / Dept. Head", "Creates and reviews templates, training")
  Person(auditor, "Auditor / Revision", "Read-only access to all modules, exports reports")
  Person(public, "External Reporter", "Submits public security incident reports (no login)")

  System(isms, "ISMS Builder", "Web-based ISMS platform: policy management, risk register, SoA, GDPR, BCM, governance, assets, training")

  System_Ext(browser, "Web Browser", "Chrome, Firefox, Safari — renders the SPA")
  System_Ext(authenticator, "TOTP Authenticator App", "Google Authenticator, Aegis — for 2FA")
  System_Ext(email, "Email System (planned)", "Nodemailer — escalation alerts, DSAR reminders")

  Rel(admin, isms, "Configures", "HTTPS")
  Rel(ciso, isms, "Operates", "HTTPS")
  Rel(dpo, isms, "Operates", "HTTPS")
  Rel(editor, isms, "Authors content", "HTTPS")
  Rel(auditor, isms, "Reviews & exports", "HTTPS")
  Rel(public, isms, "Reports incidents", "HTTPS (no auth)")
  Rel(isms, browser, "Serves SPA", "HTTPS")
  Rel(authenticator, isms, "Provides TOTP codes", "Manual input")
  Rel(isms, email, "Sends notifications (planned)", "SMTP/TLS")
```

---

## Level 2 – Container

What are the main deployable units?

```mermaid
C4Container
  title Container Diagram – ISMS Builder

  Person(user, "User (any role)", "Browser-based access")

  Container_Boundary(server, "ISMS Builder Server") {
    Container(spa, "Single-Page Application", "Vanilla JS, HTML, CSS", "Atlassian Dark Theme SPA — all modules rendered client-side")
    Container(api, "REST API", "Node.js / Express", "17 route modules, JWT auth with server-side sessions (one per account), RBAC, multer file uploads")
    Container(auth, "Auth Module", "JWT + bcryptjs + TOTP", "Cookie-based sessions, 2FA enforcement, role ranks")
  }

  Container_Boundary(data, "Data Layer") {
    ContainerDb(json, "JSON File Store", "JSON files in data/", "Default persistence — one file per module")
    ContainerDb(sqlite, "SQLite Store", "data/isms.db", "Alternative backend via STORAGE_BACKEND=sqlite")
    ContainerDb(files, "File Storage", "data/*-files/", "PDF/DOCX/XLSX uploads — governance, BCM, guidance, legal, templates")
  }

  Rel(user, spa, "Uses", "HTTPS")
  Rel(spa, api, "API calls", "HTTPS / JSON")
  Rel(api, auth, "Authenticates every request")
  Rel(api, json, "Reads/writes", "fs — synchronous JSON")
  Rel(api, sqlite, "Reads/writes", "better-sqlite3 (optional)")
  Rel(api, files, "Stores uploaded files", "multer / fs")
```

---

## Level 3 – Component (API Server)

What are the internal building blocks of the API server?

```mermaid
C4Component
  title Component Diagram – API Server (server/)

  Container_Boundary(api, "Express API Server") {

    Component(idx, "index.js", "Express app setup", "Mounts all routers, serves UI with auth guard, starts HTTPS/HTTP")

    Component_Boundary(routes, "server/routes/ — Express Routers") {
      Component(r_auth, "auth.js", "Router", "Login, logout, whoami, /me/password, 2FA setup/verify/disable")
      Component(r_tmpl, "templates.js", "Router", "Template CRUD, versioning, lifecycle, hierarchy, attachments, entities")
      Component(r_soa, "soa.js", "Router", "SoA controls, frameworks, crossmap, bidirectional template links")
      Component(r_risk, "risks.js", "Router", "Risk register, treatments, calendar events")
      Component(r_goal, "goals.js", "Router", "Security objectives, KPI tracking")
      Component(r_asset, "assets.js", "Router", "Asset inventory, classification, EoL tracking")
      Component(r_gov, "governance.js", "Router", "Management reviews, actions, meetings, document uploads")
      Component(r_bcm, "bcm.js", "Router", "BIA, continuity plans, exercises, document uploads")
      Component(r_cal, "calendar.js", "Router", "Aggregated calendar events from all modules")
      Component(r_guid, "guidance.js", "Router", "Guidance documents, PDF/DOCX upload")
      Component(r_gdpr, "gdpr.js", "Router", "VVT, AV, DSFA, TOMs, DSAR, incidents, DSB upload")
      Component(r_rep, "reports.js", "Router", "Compliance, framework, gap, matrix, review, CSV export")
      Component(r_leg, "legal.js", "Router", "Contracts, NDAs, privacy policies, file attachments")
      Component(r_train, "training.js", "Router", "Training records, completion tracking")
      Component(r_adm, "admin.js", "Router", "Users, org settings, modules, lists, audit log, dashboard, maintenance")
      Component(r_pub, "public.js", "Router", "Public incident reporting (no auth), entity list")
      Component(r_trash, "trash.js", "Router", "Soft-delete trash, permanent delete, restore, full JSON export")
    }

    Component_Boundary(stores, "server/db/ — Data Stores") {
      Component(s_json, "jsonStore.js", "Store", "Template persistence (JSON)")
      Component(s_sqlite, "sqliteStore.js", "Store", "Template persistence (SQLite, same API)")
      Component(s_soa, "soaStore.js", "Store", "313 SoA controls, all frameworks, seed + merge")
      Component(s_risk, "riskStore.js", "Store", "Risks + treatments, soft-delete")
      Component(s_gdpr, "gdprStore.js", "Store", "9 GDPR sub-modules")
      Component(s_gov, "governanceStore.js", "Store", "Reviews, actions, meetings")
      Component(s_bcm, "bcmStore.js", "Store", "BIA, plans, exercises")
      Component(s_other, "…Store.js ×9", "Stores", "goals, assets, training, legal, guidance, audit, org, lists, publicIncident")
    }

    Component(authmod, "auth.js", "Middleware", "requireAuth (JWT cookie), authorize (role rank), signToken")
    Component(rbac, "rbacStore.js", "Store", "Users, passwords (bcrypt), TOTP secrets, role management")
    Component(storage, "storage.js", "Facade", "Selects json or sqlite backend via STORAGE_BACKEND env var")
    Component(rep, "reports.js", "Logic", "Compliance matrix, gap analysis, review cycles, CSV builder")
  }

  Rel(idx, r_auth, "app.use()")
  Rel(idx, r_tmpl, "app.use()")
  Rel(idx, r_soa, "app.use()")
  Rel(idx, r_adm, "app.use()")
  Rel(r_auth, authmod, "uses")
  Rel(r_auth, rbac, "verifyPassword, setPasswordHash, confirmTotpVerified")
  Rel(r_tmpl, storage, "getTemplate, createTemplate, updateTemplate")
  Rel(r_soa, s_soa, "getControl, updateControl")
  Rel(r_gov, s_gov, "getReviews, createReview, …")
  Rel(r_bcm, s_bcm, "getBia, createPlan, …")
  Rel(r_rep, rep, "generateReport")
  Rel(storage, s_json, "json backend")
  Rel(storage, s_sqlite, "sqlite backend")
```

---

## Deployment View

```mermaid
graph TD
  subgraph Host["Linux Server / Docker Container"]
    node["Node.js Process\n(npm start)"]
    ssl["SSL Termination\n(built-in https.createServer\nor reverse proxy)"]
    data[("data/ directory\nJSON + uploaded files")]
  end
  browser["Browser\n(SPA)"] -->|HTTPS :3000| ssl
  ssl --> node
  node <--> data
```

Deployment options:
- **Direct**: `node server/index.js` — SSL via `SSL_CERT_FILE` + `SSL_KEY_FILE` in `.env`
- **Docker**: `docker compose up -d --build`; optional `mariadb`/`postgres` services via Compose profiles (`--profile mariadb`/`--profile postgres`, see #42) for "app container + DB container" setups
- **Reverse proxy**: nginx/Caddy/Traefik in front, app on HTTP internally
