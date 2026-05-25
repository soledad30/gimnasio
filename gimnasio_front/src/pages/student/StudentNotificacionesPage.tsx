import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificacionesApi } from '../../api/services'

export function StudentNotificacionesPage() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['mis-notificaciones'],
    queryFn: () => notificacionesApi.mis().then((r) => r.data),
  })
  const leerMut = useMutation({
    mutationFn: (id: number) => notificacionesApi.marcarLeida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-notificaciones'] }),
  })

  return (
    <>
      <h1 className="page-title">Notificaciones</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {isLoading && <p>Cargando…</p>}
        {!isLoading && data.length === 0 && <p className="card">No hay notificaciones.</p>}
        {data.map((n) => (
          <article key={n.id} className="card" style={{ opacity: n.leida ? 0.7 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ marginBottom: '0.35rem' }}>{n.titulo}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{n.mensaje}</p>
                <small style={{ color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</small>
              </div>
              {!n.leida && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => leerMut.mutate(n.id)}>Marcar leída</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
