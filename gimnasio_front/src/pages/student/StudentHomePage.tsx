import { useAuth } from '../../context/AuthContext'

export function StudentHomePage() {
  const { user } = useAuth()
  return (
    <>
      <h1 className="page-title">Hola, {user?.nombre}</h1>
      <div className="card">
        <p>Bienvenido al portal del gimnasio. Desde aquí puedes reservar clases, ver notificaciones y consultar actividades disponibles.</p>
      </div>
    </>
  )
}
