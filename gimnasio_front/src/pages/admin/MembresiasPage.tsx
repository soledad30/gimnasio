import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, membresiasApi } from '@/api/services'
import type { Membresia } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
import { EstudianteSearchSelect } from '@/components/forms/EstudianteSearchSelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PLANES = [
  { tipo: 'mensual', duracion: 30, precio: 150 },
  { tipo: 'trimestral', duracion: 90, precio: 400 },
  { tipo: 'semestral', duracion: 180, precio: 750 },
  { tipo: 'anual', duracion: 365, precio: 1400 },
]

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function hoyLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function primerDiaMesISO(fecha = hoyLocalISO()) {
  return `${fecha.slice(0, 7)}-01`
}

function sumarDiasISO(fechaISO: string, dias: number) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + dias)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function etiquetaMes(fechaISO: string) {
  const [y, m] = fechaISO.split('-').map(Number)
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${meses[(m || 1) - 1]} ${y}`
}

function estadoMembresia(m: Membresia) {
  if (!m.fecha_inicio || !m.fecha_fin) return 'sin fecha'
  const hoy = hoyLocalISO()
  if (m.fecha_inicio <= hoy && m.fecha_fin >= hoy) return 'activa'
  if (m.fecha_fin < hoy) return 'vencida'
  return 'pendiente'
}

export function MembresiasPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [estudianteId, setEstudianteId] = useState<number | null>(null)
  const [plan, setPlan] = useState('mensual')
  const [precio, setPrecio] = useState('150')
  const [duracion, setDuracion] = useState('30')
  const [fechaInicio, setFechaInicio] = useState(primerDiaMesISO())
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['membresias'],
    queryFn: () => membresiasApi.list().then((r) => r.data),
  })

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
  })

  const existente = useMemo(
    () => (estudianteId ? data.find((m) => m.estudiante_id === estudianteId) : undefined),
    [data, estudianteId]
  )
  const esRenovacion = Boolean(existente)

  useEffect(() => {
    if (!open) return
    const p = PLANES.find((x) => x.tipo === plan) ?? PLANES[0]
    setPrecio(String(p.precio))
    setDuracion(String(p.duracion))
  }, [plan, open])

  const fechaFinEstimada = useMemo(
    () => sumarDiasISO(fechaInicio || hoyLocalISO(), Number(duracion) || 30),
    [fechaInicio, duracion]
  )

  const resetForm = () => {
    setEstudianteId(null)
    setPlan('mensual')
    setPrecio('150')
    setDuracion('30')
    setFechaInicio(primerDiaMesISO())
  }

  const openAsignar = () => {
    resetForm()
    setOpen(true)
  }

  const openRenovar = (m: Membresia) => {
    setEstudianteId(m.estudiante_id)
    const planConocido = PLANES.some((p) => p.tipo === m.tipo)
    setPlan(planConocido ? m.tipo : 'mensual')
    const p = PLANES.find((x) => x.tipo === (planConocido ? m.tipo : 'mensual'))
    setPrecio(String(m.precio ?? p?.precio ?? 150))
    setDuracion(String(m.duracion ?? p?.duracion ?? 30))
    // Si está vencida, por defecto el 1 del mes actual; si no, hoy
    const hoy = hoyLocalISO()
    if (m.fecha_fin && m.fecha_fin < hoy) {
      setFechaInicio(primerDiaMesISO())
    } else {
      setFechaInicio(hoy)
    }
    setOpen(true)
  }

  const createMut = useMutation({
    mutationFn: (body: {
      estudiante_id: number
      tipo: string
      precio: number
      duracion: number
      fecha_inicio: string
    }) => membresiasApi.create(body),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['membresias'] })
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
      setOpen(false)
      resetForm()
      const yaTenia = data.some((m) => m.estudiante_id === vars.estudiante_id)
      toast.success(
        yaTenia
          ? `Membresía renovada desde ${vars.fecha_inicio} — acceso sala de máquinas (QR / NFC)`
          : `Membresía asignada desde ${vars.fecha_inicio} — acceso sala de máquinas (QR / NFC)`
      )
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => membresiasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membresias'] })
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
      setDeleteId(null)
      toast.success('Membresía eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!estudianteId) {
      toast.error('Selecciona un estudiante')
      return
    }
    if (!fechaInicio) {
      toast.error('Indica desde qué fecha se registra el pago')
      return
    }
    const planDef = PLANES.find((p) => p.tipo === plan)
    createMut.mutate({
      estudiante_id: estudianteId,
      tipo: plan,
      precio: Number(precio || planDef?.precio),
      duracion: Number(duracion || planDef?.duracion),
      fecha_inicio: fechaInicio,
    })
  }

  const activas = data.filter((m) => estadoMembresia(m) === 'activa').length
  const vencidas = data.filter((m) => estadoMembresia(m) === 'vencida').length

  return (
    <>
      <PageHeader
        title="Membresías"
        description="Solo sala de máquinas: al asignar o renovar se habilita QR, NFC y registro de ingreso. No cubre sala de actividades."
        onCreate={openAsignar}
        createLabel="Asignar / renovar"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Listado de membresías</CardTitle>
          <CardDescription>
            {data.length} registro(s) · {activas} activa(s) · {vencidas} vencida(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay membresías. Asigna la primera.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((m) => {
                    const estado = estadoMembresia(m)
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.registro_universitario ? (
                            <span>
                              <span className="font-mono text-muted-foreground">
                                {m.registro_universitario}
                              </span>
                              {' · '}
                              {m.estudiante_nombre ?? `#${m.estudiante_id}`}
                            </span>
                          ) : (
                            m.estudiante_nombre ?? `#${m.estudiante_id}`
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{m.tipo}</TableCell>
                        <TableCell>Bs. {m.precio}</TableCell>
                        <TableCell className="text-sm">
                          {m.fecha_inicio && m.fecha_fin
                            ? `${m.fecha_inicio} → ${m.fecha_fin}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              estado === 'activa'
                                ? 'success'
                                : estado === 'vencida'
                                  ? 'destructive'
                                  : 'outline'
                            }
                          >
                            {estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions
                            onEdit={() => openRenovar(m)}
                            onDelete={() => setDeleteId(m.id)}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) resetForm()
        }}
      >
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>
              {esRenovacion ? 'Renovar membresía (sala de máquinas)' : 'Asignar membresía (sala de máquinas)'}
            </DialogTitle>
          </DialogHeader>
          <form id="mem-form" onSubmit={onSubmit} className="space-y-4 overflow-visible">
            <EstudianteSearchSelect
              estudiantes={estudiantes}
              value={estudianteId}
              onChange={setEstudianteId}
              required
            />
            {existente && (
              <p className="text-xs text-muted-foreground">
                Este estudiante ya tiene un plan de máquinas ({existente.tipo}
                {existente.fecha_fin ? `, hasta ${existente.fecha_fin}` : ''}). Como admin puedes
                registrar el pago desde la fecha que indiques (aunque la ventana del estudiante ya
                haya cerrado). No incluye sala de actividades.
              </p>
            )}
            {!existente && estudianteId && (
              <p className="text-xs text-muted-foreground">
                Solo habilita ingreso a sala de máquinas (QR / NFC). Elige desde qué fecha/mes se
                registra el pago. Las clases se gestionan en Reservas → inscripción de actividad.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Desde qué fecha se registra el pago</Label>
              <Input
                id="fecha_inicio"
                name="fecha_inicio"
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFechaInicio(primerDiaMesISO())}
                >
                  1er día de este mes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFechaInicio(hoyLocalISO())}
                >
                  Hoy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const d = new Date()
                    d.setMonth(d.getMonth() + 1, 1)
                    const y = d.getFullYear()
                    const m = String(d.getMonth() + 1).padStart(2, '0')
                    setFechaInicio(`${y}-${m}-01`)
                  }}
                >
                  1er día del mes siguiente
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mes de pago: <strong>{etiquetaMes(fechaInicio || hoyLocalISO())}</strong>
                {' · '}
                Vigencia estimada: {fechaInicio || '—'} → {fechaFinEstimada}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                name="plan"
                required
                aria-label="Plan"
                className={selectClassName}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                {PLANES.map((p) => (
                  <option key={p.tipo} value={p.tipo}>
                    {p.tipo} — {p.duracion} días — Bs. {p.precio}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (Bs.)</Label>
                <Input
                  id="precio"
                  name="precio"
                  type="number"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duracion">Duración (días)</Label>
                <Input
                  id="duracion"
                  name="duracion"
                  type="number"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="mem-form" disabled={createMut.isPending}>
              {esRenovacion ? 'Renovar' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar membresía"
        description="Se quitará el plan de sala de máquinas y el acceso NFC/QR por membresía. Si tiene inscripción de actividad pagada, podrá seguir entrando a clases."
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </>
  )
}
