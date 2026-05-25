import { useQuery } from '@tanstack/react-query'
import { actividadesApi } from '../../api/services'

export function StudentActividadesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => actividadesApi.list().then((r) => r.data),
  })

  return (
    <>
      <h1 className="page-title">Actividades disponibles</h1>
      <div className="card-grid">
        {isLoading && <p>Cargando…</p>}
        {data.map((a) => (
          <article key={a.id} className="card">
            <h3>{a.nombre}</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cupo: {a.capacidad} personas</p>
          </article>
        ))}
      </div>
    </>
  )
}
