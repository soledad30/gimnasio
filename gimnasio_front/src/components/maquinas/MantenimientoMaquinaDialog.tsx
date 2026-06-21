import { FormEvent, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { maquinasApi } from '@/api/services'
import type { Maquina, MantenimientoChecklistSeccion } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  maquina: Maquina | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MantenimientoMaquinaDialog({ maquina, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tipos, setTipos] = useState<{ value: string; label: string }[]>([])
  const [checklist, setChecklist] = useState<MantenimientoChecklistSeccion[]>([])

  useEffect(() => {
    if (!open || !maquina) return
    setLoading(true)
    maquinasApi
      .plantillaMantenimiento(maquina.id)
      .then((r) => {
        setTipos(r.data.tipos)
        setChecklist(r.data.secciones)
      })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [open, maquina])

  const toggleItem = (seccionIdx: number, itemIdx: number) => {
    setChecklist((prev) =>
      prev.map((sec, si) =>
        si !== seccionIdx
          ? sec
          : {
              ...sec,
              items: sec.items.map((item, ii) =>
                ii !== itemIdx ? item : { ...item, completado: !item.completado }
              ),
            }
      )
    )
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!maquina) return
    const fd = new FormData(e.currentTarget)
    setSubmitting(true)
    try {
      await maquinasApi.registrarMantenimiento(maquina.id, {
        tipo: fd.get('tipo') as string,
        responsable: (fd.get('responsable') as string) || null,
        observaciones: (fd.get('observaciones') as string) || null,
        checklist,
        fecha_realizado: (fd.get('fecha_realizado') as string) || hoyISO(),
        resultado: fd.get('resultado') as string,
        marcar_disponible: fd.get('resultado') === 'ok',
      })
      toast.success('Mantenimiento registrado')
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const totalItems = checklist.reduce((n, s) => n + s.items.length, 0)
  const completados = checklist.reduce(
    (n, s) => n + s.items.filter((i) => i.completado).length,
    0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formulario de mantenimiento</DialogTitle>
          {maquina && (
            <p className="text-sm text-muted-foreground">
              {maquina.nombre}
              {maquina.codigo ? ` · ${maquina.codigo}` : ''}
              {maquina.categoria ? ` · ${maquina.categoria}` : ''}
              {maquina.anios_vida_util ? ` · ${maquina.anios_vida_util} años vida útil` : ''}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form id="mant-form" onSubmit={onSubmit} className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Plan basado en ISO 55000 — limpieza, lubricación, revisión preventiva y correctiva
              según categoría del equipo.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de mantenimiento</Label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  defaultValue="preventivo"
                  className={selectClassName}
                  aria-label="Tipo de mantenimiento"
                >
                  {tipos.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_realizado">Fecha</Label>
                <Input id="fecha_realizado" name="fecha_realizado" type="date" defaultValue={hoyISO()} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input id="responsable" name="responsable" placeholder="Nombre del técnico o encargado" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Checklist del plan</Label>
              <Badge variant="secondary">
                {completados}/{totalItems} tareas
              </Badge>
            </div>

            <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-border/60 p-3">
              {checklist.map((seccion, si) => (
                <div key={seccion.titulo} className="space-y-2">
                  <p className="text-sm font-medium">{seccion.titulo}</p>
                  <ul className="space-y-2">
                    {seccion.items.map((item, ii) => (
                      <li key={item.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                            item.completado
                              ? 'border-primary/40 bg-primary/10'
                              : 'border-border hover:bg-muted/40'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={item.completado}
                            onChange={() => toggleItem(si, ii)}
                            className="mt-0.5 h-4 w-4 rounded border-input"
                          />
                          <span>{item.texto}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Input
                id="observaciones"
                name="observaciones"
                placeholder="Repuestos usados, fallas detectadas, recomendaciones..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado</Label>
              <select
                id="resultado"
                name="resultado"
                defaultValue="ok"
                className={selectClassName}
                aria-label="Resultado del mantenimiento"
              >
                <option value="ok">Equipo en condiciones — marcar disponible</option>
                <option value="pendiente">Pendiente — seguir en mantenimiento</option>
                <option value="requiere_repuesto">Requiere repuesto — fuera de servicio</option>
              </select>
            </div>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="mant-form" disabled={loading || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar mantenimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
