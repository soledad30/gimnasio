import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { rutinasApi } from '@/api/services'
import type { RutinaEjercicioDetalle } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  rutinaId: number
  ejercicio: RutinaEjercicioDetalle
  onSuccess?: () => void
}

export function RegistroProgresoDialog({
  open,
  onOpenChange,
  rutinaId,
  ejercicio,
  onSuccess,
}: Props) {
  const [series, setSeries] = useState(String(ejercicio.series ?? ''))
  const [reps, setReps] = useState('')
  const [peso, setPeso] = useState('')
  const [dificultad, setDificultad] = useState('3')
  const [notas, setNotas] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      rutinasApi.registrarProgreso({
        rutina_id: rutinaId,
        ejercicio_id: ejercicio.ejercicio_id,
        series_completadas: series ? Number(series) : undefined,
        repeticiones_logradas: reps || undefined,
        peso_kg: peso ? Number(peso) : undefined,
        dificultad_percibida: dificultad ? Number(dificultad) : undefined,
        notas: notas || undefined,
      }),
    onSuccess: () => {
      toast.success('Progreso registrado')
      onOpenChange(false)
      setReps('')
      setPeso('')
      setNotas('')
      onSuccess?.()
    },
    onError: () => toast.error('No se pudo registrar el progreso'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar progreso</DialogTitle>
          <DialogDescription>{ejercicio.nombre}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="series">Series completadas</Label>
            <Input
              id="series"
              type="number"
              min={0}
              max={20}
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder={String(ejercicio.series ?? 3)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="reps">Repeticiones por serie</Label>
            <Input
              id="reps"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={ejercicio.repeticiones ?? '12,10,8'}
            />
            <p className="text-xs text-muted-foreground">Separá con comas, ej. 12,10,8</p>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="peso">Peso (kg, opcional)</Label>
            <Input
              id="peso"
              type="number"
              min={0}
              step={0.5}
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="dificultad">Dificultad percibida (1–5)</Label>
            <Input
              id="dificultad"
              type="number"
              min={1}
              max={5}
              value={dificultad}
              onChange={(e) => setDificultad(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
