import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { actividadesApi, reservasApi } from '../../api/services'
import { Modal } from '../../components/Modal'

export function StudentReservasPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['mis-reservas'],
    queryFn: () => reservasApi.mis().then((r) => r.data),
  })
  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => actividadesApi.list().then((r) => r.data),
  })
  const createMut = useMutation({
    mutationFn: reservasApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mis-reservas'] }); setOpen(false) },
  })
  const cancelMut = useMutation({
    mutationFn: (id: number) => reservasApi.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-reservas'] }),
  })

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title" style={{ margin: 0 }}>Mis reservas</h1>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>+ Reservar clase</button>
      </div>
      <div className="card table-wrap">
        {isLoading ? <p>Cargando…</p> : reservas.length === 0 ? <p>No tienes reservas.</p> : (
          <table>
            <thead><tr><th>Actividad</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id}>
                  <td>{r.actividad_id}</td>
                  <td>{r.fecha}</td>
                  <td>{r.estado === 1 ? 'Activa' : 'Cancelada'}</td>
                  <td>
                    {r.estado === 1 && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancelMut.mutate(r.id)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && (
        <Modal title="Nueva reserva" onClose={() => setOpen(false)}>
          <form onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            createMut.mutate({ actividad_id: Number(fd.get('actividad_id')), fecha: fd.get('fecha') as string })
          }}>
            <div className="form-group">
              <label>Actividad</label>
              <select name="actividad_id" className="input" required>
                <option value="">Seleccionar…</option>
                {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Fecha</label><input name="fecha" type="date" className="input" required /></div>
            <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Reservar</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
