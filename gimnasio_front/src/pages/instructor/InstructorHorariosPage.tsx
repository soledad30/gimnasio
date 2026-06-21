import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { horariosApi, salasApi } from '@/api/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  VIGENCIA_LABELS,
  VIGENCIA_TIPOS,
  inicioMesDefault,
} from '@/constants/vigencia'

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function esTurnoManana(horaInicio: string) {
  return Number(horaInicio.slice(0, 2)) < 13
}

export function InstructorHorariosPage() {
  const qc = useQueryClient()
  const [fecha, setFecha] = useState(hoyISO())

  const { data: config } = useQuery({
    queryKey: ['horarios-config'],
    queryFn: () => horariosApi.config().then((r) => r.data),
  })

  const { data: salas = [] } = useQuery({
    queryKey: ['salas'],
    queryFn: () => salasApi.list().then((r) => r.data),
  })

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['mis-asignaciones', fecha],
    queryFn: () => horariosApi.misAsignaciones(fecha).then((r) => r.data),
  })

  const salaMaquinas = salas.find((s) => s.tipo === 'maquinas')
  const turnosCoach = config?.turnos_coach ?? []

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => horariosApi.miTurnoCoach(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-asignaciones', fecha] })
      qc.invalidateQueries({ queryKey: ['staffing', fecha] })
      toast.success('Turno registrado en sala de máquinas')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!salaMaquinas) return
    const fd = new FormData(e.currentTarget)
    createMut.mutate({
      instructor_id: 0,
      sala_id: salaMaquinas.id,
      turno: fd.get('turno'),
      vigencia_tipo: (fd.get('vigencia_tipo') as string) || 'mes',
      vigencia_inicio: (fd.get('vigencia_inicio') as string) || inicioMesDefault(),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis turnos — sala de máquinas</h1>
        <p className="text-muted-foreground">
          Turno mañana {turnosCoach[0]?.hora_inicio ?? '07:00'}–{turnosCoach[0]?.hora_fin ?? '13:00'}{' '}
          · Turno tarde {turnosCoach[1]?.hora_inicio ?? '13:00'}–{turnosCoach[1]?.hora_fin ?? '19:00'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar turno</CardTitle>
          <CardDescription>
            Elige mañana o tarde y el periodo de vigencia (mes, trimestre, semestre o anual).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="consulta_fecha">Consultar fecha</Label>
              <Input
                id="consulta_fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="min-w-[220px] space-y-2">
              <Label htmlFor="turno">Turno</Label>
              <select
                id="turno"
                name="turno"
                required
                className={selectClassName}
                aria-label="Turno"
              >
                <option value="">Seleccionar...</option>
                {turnosCoach.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.hora_inicio} – {t.hora_fin})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] space-y-2">
              <Label htmlFor="vigencia_tipo">Vigencia</Label>
              <select
                id="vigencia_tipo"
                name="vigencia_tipo"
                defaultValue="mes"
                className={selectClassName}
                aria-label="Vigencia"
              >
                {VIGENCIA_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {VIGENCIA_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vigencia_inicio">Inicio del periodo</Label>
              <Input
                id="vigencia_inicio"
                name="vigencia_inicio"
                type="date"
                defaultValue={inicioMesDefault()}
                required
                className="w-44"
              />
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar turno
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis turnos vigentes — {fecha}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {asignaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes turno vigente en esta fecha (ni heredado de un periodo anterior).
            </p>
          ) : (
            asignaciones.map((a) => (
              <Badge key={a.id} variant="outline">
                {esTurnoManana(a.hora_inicio) ? 'Mañana' : 'Tarde'} · entrada {a.hora_inicio} · salida{' '}
                {a.hora_fin}
                {a.vigencia_label ? ` · ${a.vigencia_label}` : ''}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
