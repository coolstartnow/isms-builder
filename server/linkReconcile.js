// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Abgleich der Verknüpfung Dokument ↔ SoA-Control. Gespeichert wird sie an beiden Enden: am Dokument (`linkedControls`) und am Control
// (`linkedTemplates`). Die Oberfläche des SoA, der Gap-Bericht und der Mobile-Sync lesen die Seite des Controls. Die Routen pflegen beide Seiten,
// aber Daten, die von außen kommen (Demo-Bündel, Import, Wiederherstellung, Sync), können nur eine Seite füllen — dann zeigt das Control ein
// Dokument nicht an, das am Dokument als verknüpft steht (Issue #110, Demo-Bündel schrieb nur `linkedControls`).
// Ergänzt wird nur, was fehlt (Dokument → Control); nichts wird entfernt, Verknüpfungen auf unbekannte Controls bleiben unberührt.
// Läuft in seedAll() (Start, Demo-Import, Bündel laden, Reset) und ist idempotent. → Anzahl ergänzter Verknüpfungen
async function reconcileDocumentControlLinks() {
  const storage = require('./storage')
  const soaStore = require('./db/soaStore')
  const docs = (await storage.getTemplates?.({})) || []
  let added = 0
  for (const d of docs) {
    if (!d || d.deletedAt || !Array.isArray(d.linkedControls)) continue
    for (const cid of d.linkedControls) {
      if (typeof cid !== 'string') continue
      const c = await soaStore.getById(cid)
      if (!c || (Array.isArray(c.linkedTemplates) && c.linkedTemplates.includes(d.id))) continue
      await soaStore.addLinkedTemplate(cid, d.id)
      added++
    }
  }
  return added
}
module.exports = { reconcileDocumentControlLinks }
