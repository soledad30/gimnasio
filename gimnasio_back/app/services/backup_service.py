"""Respaldo de PostgreSQL + uploads/ en ZIP (admin y scripts)."""

from __future__ import annotations

import asyncio
import json
import os
import platform
import re
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException

from app.core.config import settings
from app.core.uploads import UPLOADS_ROOT
from app.schemas.backup import BackupCreateRequest, BackupCreateResponse, BackupInfo

BACKUP_FILENAME_RE = re.compile(r"^gym_backup_\d{4}-\d{2}-\d{2}_\d{4}\.zip$")
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _default_backup_root() -> Path:
    return Path.home() / "Documents" / "Backups" / "gimnasio"


def get_backup_root() -> Path:
    raw = (settings.BACKUP_ROOT or "").strip()
    return Path(raw) if raw else _default_backup_root()


def get_drive_copy_path() -> Path | None:
    raw = (settings.BACKUP_DRIVE_PATH or "").strip()
    return Path(raw) if raw else None


def _find_pg_dump() -> str:
    found = shutil.which("pg_dump")
    if found:
        return found
    if platform.system() == "Windows":
        for version in (17, 16, 15, 14):
            candidate = Path(f"C:/Program Files/PostgreSQL/{version}/bin/pg_dump.exe")
            if candidate.exists():
                return str(candidate)
    raise FileNotFoundError(
        "No se encontró pg_dump. Instalá PostgreSQL o agregá su carpeta bin al PATH."
    )


def _validate_filename(filename: str) -> str:
    if not BACKUP_FILENAME_RE.match(filename):
        raise HTTPException(status_code=400, detail="Nombre de backup inválido")
    return filename


def _read_manifest_from_zip(zip_path: Path) -> dict:
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            if "manifest.json" not in zf.namelist():
                return {}
            return json.loads(zf.read("manifest.json").decode("utf-8"))
    except (OSError, json.JSONDecodeError, KeyError):
        return {}


def _backup_info_from_file(path: Path) -> BackupInfo:
    stat = path.stat()
    manifest = _read_manifest_from_zip(path)
    created_raw = manifest.get("created_at")
    if created_raw:
        try:
            created_at = datetime.fromisoformat(str(created_raw).replace("Z", "+00:00"))
        except ValueError:
            created_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
    else:
        created_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

    size_bytes = stat.st_size
    return BackupInfo(
        filename=path.name,
        created_at=created_at,
        size_bytes=size_bytes,
        size_mb=round(size_bytes / (1024 * 1024), 2),
        postgres_db=manifest.get("postgres_db"),
        created_by=manifest.get("created_by"),
        drive_copied=bool(manifest.get("drive_copied")),
        include_database=manifest.get("include_database", _zip_has_dump(path)),
        include_uploads=manifest.get("include_uploads", _zip_has_uploads(path)),
    )


def _zip_has_dump(zip_path: Path) -> bool:
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            return "gymdb.dump" in zf.namelist()
    except OSError:
        return True


def _zip_has_uploads(zip_path: Path) -> bool:
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            return any(n.startswith("uploads/") for n in zf.namelist())
    except OSError:
        return True


def _apply_retention(backup_root: Path, keep_last: int) -> None:
    files = sorted(
        backup_root.glob("gym_backup_*.zip"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for old in files[keep_last:]:
        old.unlink(missing_ok=True)


def _create_backup_sync(
    created_by: str | None = None,
    *,
    include_database: bool = True,
    include_uploads: bool = True,
) -> BackupCreateResponse:
    if not include_database and not include_uploads:
        raise HTTPException(
            status_code=400,
            detail="Seleccioná al menos base de datos o archivos",
        )

    backup_root = get_backup_root()
    backup_root.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    zip_name = f"gym_backup_{timestamp}.zip"
    zip_path = backup_root / zip_name

    if zip_path.exists():
        raise HTTPException(status_code=409, detail="Ya existe un backup con ese nombre. Intentá de nuevo.")

    with tempfile.TemporaryDirectory(prefix="gym_backup_") as tmp:
        work_dir = Path(tmp)
        dump_file = work_dir / "gymdb.dump"

        if include_database:
            pg_dump = _find_pg_dump()
            env = os.environ.copy()
            env["PGPASSWORD"] = settings.POSTGRES_PASSWORD
            result = subprocess.run(
                [
                    pg_dump,
                    "-h",
                    settings.POSTGRES_HOST,
                    "-p",
                    str(settings.POSTGRES_PORT),
                    "-U",
                    settings.POSTGRES_USER,
                    "-d",
                    settings.POSTGRES_DB,
                    "-F",
                    "c",
                    "-f",
                    str(dump_file),
                ],
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "pg_dump falló").strip()
                raise HTTPException(status_code=500, detail=f"Error al exportar la base de datos: {detail}")

        if include_uploads and UPLOADS_ROOT.exists():
            shutil.copytree(UPLOADS_ROOT, work_dir / "uploads")

        drive_path = get_drive_copy_path()
        manifest = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "postgres_host": settings.POSTGRES_HOST,
            "postgres_db": settings.POSTGRES_DB if include_database else None,
            "postgres_user": settings.POSTGRES_USER if include_database else None,
            "created_by": created_by,
            "drive_copied": False,
            "include_database": include_database,
            "include_uploads": include_uploads,
            "restore_hint": "Ver gimnasio_back/scripts/BACKUP.md",
        }

        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            if include_database and dump_file.exists():
                zf.write(dump_file, "gymdb.dump")
            uploads_dir = work_dir / "uploads"
            if include_uploads and uploads_dir.exists():
                for file_path in uploads_dir.rglob("*"):
                    if file_path.is_file():
                        zf.write(file_path, str(Path("uploads") / file_path.relative_to(uploads_dir)))
            zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))

        if drive_path:
            drive_path.mkdir(parents=True, exist_ok=True)
            shutil.copy2(zip_path, drive_path / zip_name)
            manifest["drive_copied"] = True
            with zipfile.ZipFile(zip_path, "a") as zf:
                zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))

    keep_last = max(1, settings.BACKUP_KEEP_LAST)
    _apply_retention(backup_root, keep_last)

    info = _backup_info_from_file(zip_path)
    return BackupCreateResponse(
        **info.model_dump(),
        message="Backup creado correctamente",
    )


class BackupService:
    def list_backups(self) -> list[BackupInfo]:
        backup_root = get_backup_root()
        if not backup_root.exists():
            return []
        files = sorted(
            backup_root.glob("gym_backup_*.zip"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        return [_backup_info_from_file(path) for path in files]

    async def create_backup(
        self,
        created_by: str | None = None,
        *,
        include_database: bool = True,
        include_uploads: bool = True,
    ) -> BackupCreateResponse:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            lambda: _create_backup_sync(
                created_by,
                include_database=include_database,
                include_uploads=include_uploads,
            ),
        )

    def get_backup_path(self, filename: str) -> Path:
        safe_name = _validate_filename(filename)
        path = get_backup_root() / safe_name
        if not path.is_file():
            raise HTTPException(status_code=404, detail="Backup no encontrado")
        return path

    def delete_backup(self, filename: str) -> None:
        path = self.get_backup_path(filename)
        path.unlink(missing_ok=False)
