#!/usr/bin/env bash
# Daily PostgreSQL backup with a 14-day retention window.
# Intended to run via cron on the VPS, e.g.:
#   0 3 * * * /opt/woocommerce-telegram-price-bot/scripts/backup.sh >> /var/log/wc-bot-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/woocommerce-telegram-price-bot}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-woocommerce-telegram-price-bot-postgres-1}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-woocommerce_price_bot}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILENAME"

echo "Backup written to ${FILENAME}"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "Removed backups older than ${RETENTION_DAYS} days"
