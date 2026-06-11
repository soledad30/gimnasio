from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import func, select

from app.core.dependencies import get_current_admin, get_current_instructor_profile, get_current_usuario, get_db
from app.models.actividad import Actividad
from app.models.reserva import Reserva
from app.models.rutina import Rutina
from app.constants.especialidades import ESPECIALIDADES_COACH
from app.core.uploads import save_image_upload
from app.schemas.instructor import InstructorCreate, InstructorUpdate, InstructorResponse
from app.services.instructor_service import InstructorService, parse_especialidades, to_instructor_response

router = APIRouter()


@router.get("/especialidades/catalogo")
async def catalogo_especialidades(_=Depends(get_current_usuario)):
    return ESPECIALIDADES_COACH


@router.post("/upload-foto")
async def subir_foto_instructor(
    file: UploadFile = File(...),
    _=Depends(get_current_admin),
):
    fotourl = await save_image_upload(file, "instructores")
    return {"fotourl": fotourl}


@router.post("/", response_model=InstructorResponse, status_code=201)
async def crear_instructor(data: InstructorCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    inst = await InstructorService(db).create_instructor(data)
    loaded = await InstructorService(db).get_loaded(inst.id)
    return to_instructor_response(loaded)


@router.get("/", response_model=List[InstructorResponse])
async def listar_instructores(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    items = await InstructorService(db).get_all_loaded(skip=skip, limit=limit)
    return [to_instructor_response(i) for i in items]


@router.get("/mi-perfil", response_model=InstructorResponse)
async def mi_perfil_instructor(
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    loaded = await InstructorService(db).get_loaded(instructor.id)
    return to_instructor_response(loaded)


@router.get("/mi-panel")
async def mi_panel_instructor(
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    rutinas = await db.scalar(
        select(func.count(Rutina.id)).where(Rutina.instructor_id == instructor.id)
    ) or 0
    actividades = await db.scalar(
        select(func.count(Actividad.id)).where(Actividad.instructor_id == instructor.id)
    ) or 0
    act_ids = select(Actividad.id).where(Actividad.instructor_id == instructor.id)
    reservas = await db.scalar(
        select(func.count(Reserva.id)).where(
            Reserva.actividad_id.in_(act_ids),
            Reserva.estado == 1,
        )
    ) or 0
    return {
        "instructor_id": instructor.id,
        "nombre": instructor.nombre,
        "especialidades": parse_especialidades(instructor.especialidad),
        "rutinas_asignadas": rutinas,
        "actividades_a_cargo": actividades,
        "reservas_activas": reservas,
    }


@router.get("/{instructor_id}", response_model=InstructorResponse)
async def obtener_instructor(instructor_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    inst = await InstructorService(db).get_loaded(instructor_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")
    return to_instructor_response(inst)


@router.patch("/{instructor_id}", response_model=InstructorResponse)
async def actualizar_instructor(instructor_id: int, data: InstructorUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    inst = await InstructorService(db).update_instructor(instructor_id, data)
    return to_instructor_response(inst)


@router.delete("/{instructor_id}", status_code=204)
async def eliminar_instructor(instructor_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if not await InstructorService(db).delete(instructor_id):
        raise HTTPException(status_code=404, detail="Instructor no encontrado")
