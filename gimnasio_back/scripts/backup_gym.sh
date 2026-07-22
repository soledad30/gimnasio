#!/usr/bin/env bash
# Backup trimestral: PostgreSQL (pg_dump) + uploads/ → ZIP (Linux/macOS)
# Uso: ./scripts/backup_gym.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
UPLOADS_DIR="$PROJECT_ROOT/uploads"

read_env() {
  local key="$1"
  local default="${2:-}"
  if [[ -f "$ENV_FILE" ]]; then
    local val
    val="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)"
    if [[ -n "$val" ]]; then
      echo "$val"
      return
    fi
  fi
  echo "$default"
}

BACKUP_ROOT="${BACKUP_ROOT:-$(read_env BACKUP_ROOT "$HOME/Backups/gimnasio")}"
DRIVE_COPY_PATH="${BACKUP_DRIVE_PATH:-$(read_env BACKUP_DRIVE_PATH "")}"
KEEP_LAST="${KEEP_LAST:-4}"

PG_HOST="$(read_env POSTGRES_HOST localhost)"
PG_PORT="$(read_env POSTGRES_PORT 5432)"
PG_DB="$(read_env POSTGRES_DB gymdb)"
PG_USER="$(read_env POSTGRES_USER gymuser)"
PG_PASSWORD="$(read_env POSTGRES_PASSWORD "")"

if [[ -z "$PG_PASSWORD" ]]; then
  echo "POSTGRES_PASSWORD no definido en $ENV_FILE" >&2
  exit 1
fi

command -v pg_dump >/dev/null || { echo "pg_dump no encontrado" >&2; exit 1; }
command -v zip >/dev/null || { echo "zip no encontrado" >&2; exit 1; }

TIMESTAMP="$(date +%Y-%m-%d_%H%M)"
WORK_DIR="$(mktemp -d)"
ZIP_NAME="gym_backup_${TIMESTAMP}.zip"
ZIP_PATH="$BACKUP_ROOT/$ZIP_NAME"

mkdir -p "$BACKUP_ROOT"

echo "==> Backup GymPro ($TIMESTAMP)"
export PGPASSWORD="$PG_PASSWORD"
pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -F c -f "$WORK_DIR/gymdb.dump"
unset PGPASSWORD

if [[ -d "$UPLOADS_DIR" ]]; then
  cp -a "$UPLOADS_DIR" "$WORK_DIR/uploads"
fi

cat > "$WORK_DIR/manifest.json" <<EOF
{
  "created_at": "$(date -Iseconds)",
  "postgres_host": "$PG_HOST",
  "postgres_db": "$PG_DB",
  "restore_hint": "Ver gimnasio_back/scripts/BACKUP.md"
}
EOF

(cd "$WORK_DIR" && zip -rq "$ZIP_PATH" .)
rm -rf "$WORK_DIR"

echo "    ZIP listo : $ZIP_PATH"

if [[ -n "$DRIVE_COPY_PATH" ]]; then
  mkdir -p "$DRIVE_COPY_PATH"
  cp -f "$ZIP_PATH" "$DRIVE_COPY_PATH/$ZIP_NAME"
  echo "    Copiado a : $DRIVE_COPY_PATH/$ZIP_NAME"
fi

mapfile -t archives < <(ls -1t "$BACKUP_ROOT"/gym_backup_*.zip 2>/dev/null || true)
if ((${#archives[@]} > KEEP_LAST)); then
  for ((i = KEEP_LAST; i < ${#archives[@]}; i++)); do
    rm -f "${archives[$i]}"
    echo "    Eliminado : $(basename "${archives[$i]}")"
  done
fi

echo "==> Backup completado."
