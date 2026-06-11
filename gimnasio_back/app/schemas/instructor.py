from datetime import datetime

from typing import List, Optional



from pydantic import BaseModel, EmailStr, field_validator



from app.constants.especialidades import ESPECIALIDADES_COACH





def _validar_lista_especialidades(v: List[str]) -> List[str]:

    invalid = [x for x in v if x not in ESPECIALIDADES_COACH]

    if invalid:

        raise ValueError(f"Especialidades no válidas: {', '.join(invalid)}")

    return list(dict.fromkeys(v))





class InstructorCreate(BaseModel):

    nombre: str

    email: EmailStr

    telefono: Optional[str] = None

    password: str

    especialidades: List[str] = []

    fotourl: Optional[str] = None



    @field_validator("especialidades")

    @classmethod

    def validar_especialidades(cls, v: List[str]) -> List[str]:

        return _validar_lista_especialidades(v)





class InstructorUpdate(BaseModel):

    nombre: Optional[str] = None

    especialidades: Optional[List[str]] = None

    telefono: Optional[str] = None

    fotourl: Optional[str] = None



    @field_validator("especialidades")

    @classmethod

    def validar_especialidades(cls, v: Optional[List[str]]) -> Optional[List[str]]:

        if v is None:

            return v

        return _validar_lista_especialidades(v)





class InstructorResponse(BaseModel):

    id: int

    usuario_id: int

    nombre: str

    email: Optional[str] = None

    telefono: Optional[str] = None

    especialidades: List[str] = []

    fotourl: Optional[str] = None

    created_at: datetime



    class Config:

        from_attributes = True


