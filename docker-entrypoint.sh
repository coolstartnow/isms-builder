#!/bin/sh
# ISMS Builder – Docker Entrypoint
# Stellt sicher, dass alle benötigten Datenverzeichnisse vorhanden sind,
# bevor der Server gestartet wird (wichtig bei Bind-Mount auf leerem Host-Verzeichnis)
set -e

mkdir -p \
  /app/data/gdpr/files \
  /app/data/guidance/files \
  /app/data/template-files \
  /app/data/legal/files

# Demo-Bundles (de/en/fr/nl.json) aus dem Image ins (ggf. leere, bind-
# gemountete) data/-Verzeichnis nachziehen, falls dort noch keine liegen —
# sonst schlaegt "Demo-Sprache waehlen" beim Erstlogin fehl (Bug seit V1.40.0,
# s. .dockerignore). Nur kopieren, niemals ueberschreiben: ein Betreiber, der
# eigene/angepasste Bundles ins data/-Verzeichnis gelegt hat, behaelt diese.
if [ -d /app/demo-bundles-seed ] && [ ! -d /app/data/demo-bundles ]; then
  cp -r /app/demo-bundles-seed /app/data/demo-bundles
fi

# Läuft als root (s. Dockerfile): chownt data/ (bind-gemountet, ggf. fremder
# Owner auf dem Host) auf den unprivilegierten isms-User und wechselt dann
# per su-exec dorthin, bevor der Node-Prozess startet.
chown -R isms:isms /app/data

exec su-exec isms node server/index.js
