from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_usuario
from app.core.roles import resolve_rol
from app.core.security import create_access_token, create_refresh_token, decode_token
from sqlalchemy import select

from app.models.estudiante import Estudiante
from app.models.instructor import Instructor
from app.schemas.auth import PerfilResponse, RegisterRequest, Token, TokenRefresh
from app.schemas.estudiante import EstudianteCreate
from app.schemas.usuario import UsuarioResponse
from app.services.estudiante_service import EstudianteService
from app.services.usuario_service import UsuarioService

router = APIRouter()


@router.post("/register", response_model=Token, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    estudiante = await EstudianteService(db).create_estudiante(
        EstudianteCreate(**data.model_dump())
    )
    user = await UsuarioService(db).get_by_id(estudiante.usuario_id)
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    service = UsuarioService(db)
    user = await service.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=Token)
async def refresh(body: TokenRefresh, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de refresco inválido")
    user = await UsuarioService(db).get_by_id(int(payload["sub"]))
    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Usuario no válido")
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UsuarioResponse)
async def me(current_user=Depends(get_current_usuario)):
    return current_user


@router.get("/perfil", response_model=PerfilResponse)
async def perfil(current_user=Depends(get_current_usuario), db: AsyncSession = Depends(get_db)):
    est = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current_user.id))
    estudiante = est.scalar_one_or_none()
    inst = await db.execute(select(Instructor).where(Instructor.usuario_id == current_user.id))
    instructor = inst.scalar_one_or_none()

    rol = resolve_rol(
        current_user,
        tiene_instructor=instructor is not None,
        tiene_estudiante=estudiante is not None,
    )

    return PerfilResponse(
        usuario=current_user,
        rol=rol,
        estudiante_id=estudiante.id if estudiante else None,
        instructor_id=instructor.id if instructor else None,
    )
