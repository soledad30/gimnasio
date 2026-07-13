import { useState } from 'react'
import { Info, MapPin, Wrench } from 'lucide-react'
import type { RutinaEjercicioDetalle } from '@/types'
import { EjercicioMedia } from '@/components/ejercicios/EjercicioMedia'
import { MaquinaFoto } from '@/components/maquinas/MaquinaFoto'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  ejercicio: RutinaEjercicioDetalle | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EjercicioRutinaDialog({ ejercicio, open, onOpenChange }: Props) {
  if (!ejercicio) return null

  const tieneMaquina = ejercicio.con_maquina && (ejercicio.maquina_nombre || ejercicio.maquina_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ejercicio.nombre}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            {ejercicio.grupo_muscular && <span>{ejercicio.grupo_muscular}</span>}
            {ejercicio.series && ejercicio.repeticiones && (
              <Badge variant="secondary">
                {ejercicio.series} series × {ejercicio.repeticiones}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <EjercicioMedia
            nombre={ejercicio.nombre}
            fotourl={ejercicio.fotourl}
            videourl={ejercicio.videourl}
          />

          {ejercicio.descripcion ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-primary" />
                Cómo hacerlo
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {ejercicio.descripcion}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin instrucciones escritas. Revisa el video o consulta a tu instructor.
            </p>
          )}

          {tieneMaquina ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4 text-primary" />
                Máquina a utilizar
              </p>
              <div className="flex gap-3">
                <MaquinaFoto
                  nombre={ejercicio.maquina_nombre ?? 'Máquina'}
                  fotourl={ejercicio.maquina_fotourl}
                  className="h-24 w-24 shrink-0"
                />
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-semibold">{ejercicio.maquina_nombre}</p>
                  {ejercicio.maquina_codigo && (
                    <p className="font-mono text-xs text-muted-foreground">
                      Código: {ejercicio.maquina_codigo}
                    </p>
                  )}
                  {ejercicio.maquina_ubicacion && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {ejercicio.maquina_ubicacion}
                    </p>
                  )}
                  {ejercicio.maquina_descripcion && (
                    <p className="text-xs text-muted-foreground">{ejercicio.maquina_descripcion}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Ejercicio libre / sin máquina específica. Usa el área de piso o peso corporal según
              indique tu instructor.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useEjercicioRutinaDialog() {
  const [ejercicio, setEjercicio] = useState<RutinaEjercicioDetalle | null>(null)

  return {
    ejercicio,
    open: ejercicio !== null,
    openEjercicio: setEjercicio,
    close: () => setEjercicio(null),
    onOpenChange: (open: boolean) => {
      if (!open) setEjercicio(null)
    },
  }
}
