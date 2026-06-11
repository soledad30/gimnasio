from typing import AsyncGenerator, Optional



from fastapi import Depends, HTTPException, status

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.ext.asyncio import AsyncSession



from app.core.roles import is_admin, is_staff

from app.core.security import decode_token

from app.db.session import AsyncSessionLocal



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")





async def get_db() -> AsyncGenerator[AsyncSession, None]:

    async with AsyncSessionLocal() as session:

        try:

            yield session

        finally:

            await session.close()





async def get_current_usuario(

    token: str = Depends(oauth2_scheme),

    db: AsyncSession = Depends(get_db),

):

    from app.services.usuario_service import UsuarioService

    payload = decode_token(token)

    user_id: Optional[str] = payload.get("sub")

    if not user_id:

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user = await UsuarioService(db).get_by_id(int(user_id))

    if not user:

        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not user.activo:

        raise HTTPException(status_code=400, detail="Usuario inactivo")

    return user





async def get_current_admin(current_user=Depends(get_current_usuario)):

    if not is_admin(current_user):

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Se requieren permisos de administrador",

        )

    return current_user





async def get_current_staff(current_user=Depends(get_current_usuario)):

    if not is_staff(current_user):

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Se requieren permisos de personal autorizado",

        )

    return current_user





async def get_current_instructor_profile(

    current_user=Depends(get_current_usuario),

    db: AsyncSession = Depends(get_db),

):

    from sqlalchemy import select

    from sqlalchemy.orm import selectinload

    from app.models.instructor import Instructor



    result = await db.execute(

        select(Instructor)

        .options(selectinload(Instructor.usuario))

        .where(Instructor.usuario_id == current_user.id)

    )

    instructor = result.scalar_one_or_none()

    if not instructor and not is_admin(current_user):

        raise HTTPException(status_code=403, detail="Solo para instructores")

    if not instructor:

        raise HTTPException(status_code=404, detail="Perfil de instructor no encontrado")

    return instructor





async def get_current_estudiante(

    current_user=Depends(get_current_usuario),

    db: AsyncSession = Depends(get_db),

):

    from sqlalchemy import select

    from app.models.estudiante import Estudiante



    if is_admin(current_user) or current_user.rol == "recepcion":

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo para estudiantes")

    result = await db.execute(

        select(Estudiante).where(Estudiante.usuario_id == current_user.id)

    )

    estudiante = result.scalar_one_or_none()

    if not estudiante:

        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

    return estudiante


