# Module: Mobile App (Android) & Sync

> The Android app is a standalone, offline-capable variant of ISMS Builder. It keeps its own data set on the
> phone and synchronises it with the main system on demand — over Wi-Fi or via a file.

---

## What the app does

- **Works offline:** the app ships the user interface and the server logic (risk scoring, asset types, versioning, status transitions). No server is needed.
- **Modules:** documents/templates, SoA (Statement of Applicability), risks, assets, audit findings and guidance. All other modules (e.g. GDPR, BCM, suppliers, administration) are not part of the app.
- **Local user:** on the device you work as administrator of your own data. The permissions on the main system apply only during synchronisation.
- **Phone and tablet:** the interface adapts (portrait and landscape; in landscape the sidebar stays visible). There are no settings for password, 2FA and roles locally; the language is chosen in the sync panel under *Interface language*.
- **Not available:** file uploads/attachments, WebDAV publishing, AI features, PDF download from the server.

## Requirements on the main system

- ISMS Builder **version 1.75 or later** (sync protocol 1, shown as `syncProtocol` by `GET /api/version`).
- `STORAGE_BACKEND=json` (default). With sqlite, mariadb or postgres the sync endpoints answer `501`.
- **HTTPS:** the server must be reachable via `https://` (set-up: `scripts/setup-ssl.sh`, section *SSL/TLS set-up*). The address entered in the app must be listed in the certificate.
- **Versions:** the app has its **own version number** and is independent of the main system. They are compatible when the sync protocol matches (currently 1) and the server is at least version 1.75. The app shows version and compatibility under *Check server* and *Info & requirements*.
- A user account. Its role decides what the app may transfer:

| Module | Read | Write (push) |
|---|---|---|
| Documents/templates, SoA, assets | `reader` and up | `editor` and up |
| Risks, audit findings | `reader` and up | `auditor` / `contentowner` and up |
| Guidance | `reader` and up (by the document's `minRole`) | read-only |

## Certificate on the phone

With a publicly trusted certificate (e.g. Let's Encrypt) nothing needs to be done. With an **own or self-signed certificate** the phone has to trust it:

1. When creating it with `scripts/setup-ssl.sh`, enter the name or IP used in the app under *additional names/IP addresses* (e.g. `192.168.1.20`). If the address is not in the certificate, the app refuses the connection.
2. Copy `ssl/cert.pem` to the phone (USB, Nextcloud, e-mail).
3. On the phone: *Settings → Security → Encryption & credentials → Install a certificate → CA certificate* (the path differs by manufacturer). Android warns about third-party certificates; here it is your own certificate.
4. In the app choose *Check server*: if the server version appears, the phone trusts the certificate.

Error messages: *Server not reachable* → check address, port, Wi-Fi/VPN and the server firewall. *Certificate … not trusted* → steps 1–3.

## Synchronising over Wi-Fi

1. Tap the sync button at the bottom right of the app.
2. Enter the server address (e.g. `https://isms.example.org:3000`), user and password (with 2FA enabled the app shows a field for the code). **The password is not stored.**
3. **Sync now.** The app first sends local changes (push) and then fetches everything that is new on the server (pull). The first sync downloads the complete base data set.

Rules:

- **Changes only:** only what changed since the last sync is transferred.
- **Server time:** the server assigns `updatedAt` when it accepts a record. A wrong phone clock does not disturb the sync.
- **Conflicts:** if a record was changed on the server after the phone fetched it, it is **not overwritten**. It appears in the app under *Resolve conflicts*, showing the differing fields. Per record you choose *Keep my version* (sent on the next sync) or *Take server version*.
- **Deleting:** deleting on the phone puts the record in the main system's trash. *Delete permanently* on the phone is transferred there as a deleted record as well; it does not remove the record from the main system.
- **Rejected:** if the role is missing for a module, the app reports it as *rejected*; local changes are not lost.

## Synchronising via file

For devices without a network connection to the main system:

- **Export everything** — a complete backup of the app data (app to app, or archive).
- **Export changes only** — a file with the locally changed records. Import it on the main system:

  ```bash
  node scripts/sync-import.js http://localhost:3000 admin isms-mobile-changes-2026-10-18.json
  ```

  The password comes from the environment variable `ISMS_SYNC_PASSWORD` or a prompt. The same conflict rule applies as for the Wi-Fi sync; exit code `3` means conflicts or rejected records.
- **Import file** — accepts an app bundle or an export of the main system (*Admin → Export*). The app first shows a **preview** (new / updated / unchanged / conflicts). Locally changed records are never silently overwritten. The main system's export contains only the modules it provides itself (e.g. templates, SoA, risks, guidance); assets and findings arrive through the Wi-Fi sync.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/sync/pull?since=<ISO>&modules=a,b` | Changes since `since`, including deleted records. The response carries `serverTime` for the next pull. |
| POST | `/sync/push` | `{ protocolVersion, changes: { <module>: [records with baseUpdatedAt] } }` — response: `accepted`, `conflicts`, `rejected`. |

Modules: `templates`, `soa`, `risks`, `assets`, `findings`, `guidance`. Described in `docs/architecture/openapi.yaml`.

## Security

- The transfer is **encrypted only (HTTPS)**. The app rejects unencrypted `http://`. Outside your own Wi-Fi the server should additionally be reachable over a VPN or reverse proxy.
- The data sits in the app's protected storage on the device but is **not additionally encrypted**. A device lock and Android device encryption are mandatory.
- The session is valid for the sync only and is not stored.

## Limits

- JSON backend only; attachments are not synchronised.
- Conflicts are resolved per record, not per field.
- Records permanently deleted on the main system do not reach the phone.
- The app contains the server logic of the version it was built from. After a server update, rebuild the app too (`npm run build:www` in the `isms-builder-mobile` project).
