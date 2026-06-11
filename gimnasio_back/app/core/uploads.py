import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

UPLOADS_ROOT = Path(__file__).resolve().parents[2] / "uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


def ensure_upload_dirs() -> None:
    (UPLOADS_ROOT / "maquinas").mkdir(parents=True, exist_ok=True)
    (UPLOADS_ROOT / "instructores").mkdir(parents=True, exist_ok=True)
    (UPLOADS_ROOT / "ejercicios").mkdir(parents=True, exist_ok=True)


async def save_image_upload(file: UploadFile, subfolder: str) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG, WEBP o GIF")

    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }[file.content_type]

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 5 MB")

    ensure_upload_dirs()
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_ROOT / subfolder / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
    return f"/uploads/{subfolder}/{filename}"
