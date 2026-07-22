import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ChevronRight,
  Dumbbell,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { rutinasApi } from '@/api/services'
import {
  EjercicioRutinaDialog,
  useEjercicioRutinaDialog,
} from '@/components/rutinas/EjercicioRutinaDialog'
import { RegistroProgresoDialog } from '@/components/rutinas/RegistroProgresoDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AjusteEjercicioRecomendado, RutinaEjercicioDetalle } from '@/types'

const OBJETIVOS: Record<string, string> = {
  abdomen: 'Abdomen / core',
  hipertrofia: 'Hipertrofia',
  fuerza: 'Fuerza',
  resistencia: 'Resistencia',
  perdida_peso: 'Pérdida de peso',
  flexibilidad: 'Flexibilidad',
  general: 'General',
}

const NIVEL_LABEL: Record<string, string> = {
  bajo: 'Bajo',
  moderado: 'Moderado',
  alto: 'Alto',
}

function AccionIcon({ accion }: { accion: string }) {
  if (accion === 'intensificar') return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (accion === 'reducir') return <TrendingDown className="h-4 w-4 text-amber-500" />
  return <Activity className="h-4 w-4 text-muted-foreground" />
}

function AjusteCard({ ajuste }: { ajuste: AjusteEjercicioRecomendado }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{ajuste.nombre}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ajuste.motivo}</p>
        </div>
        <AccionIcon accion={ajuste.accion} />
      </div>
      {(ajuste.series_sugerida || ajuste.repeticiones_sugerida) && (
        <p className="mt-2 text-sm">
          Sugerido:{' '}
          <span className="font-medium">
            {ajuste.series_sugerida ?? ajuste.series_actual} series ×{' '}
            {ajuste.repeticiones_sugerida ?? ajuste.repeticiones_actual}
          </span>
          {ajuste.peso_sugerido_kg != null && (
            <span className="text-muted-foreground"> · ~{ajuste.peso_sugerido_kg} kg</span>
          )}
        </p>
      )}
    </div>
  )
}

export function StudentRutinasPage() {
  const qc = useQueryClient()
  const dialog = useEjercicioRutinaDialog()
  const [progresoEj, setProgresoEj] = useState<{
    rutinaId: number
    ejercicio: RutinaEjercicioDetalle
  } | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['mis-rutinas'],
    queryFn: () => rutinasApi.mis().then((r) => r.data),
  })

  const { data: recomendaciones, isLoading: loadingRec } = useQuery({
    queryKey: ['mis-recomendaciones-rutina'],
    queryFn: () => rutinasApi.misRecomendaciones().then((r) => r.data),
  })

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mi rutina</h1>
        <p className="text-sm text-muted-foreground">
          Consulta tu plan y recibe sugerencias según tu historial de entrenamiento.
        </p>
      </div>

      {loadingRec ? (
        <Skeleton className="mb-6 h-40 w-full" />
      ) : recomendaciones ? (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Recomendaciones personalizadas
            </CardTitle>
            <CardDescription>{recomendaciones.mensaje_general}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Actividad: {NIVEL_LABEL[recomendaciones.resumen.nivel_actividad] ?? recomendaciones.resumen.nivel_actividad}
              </Badge>
              <Badge variant="outline">
                {recomendaciones.resumen.accesos_ultimo_periodo} visitas /{' '}
                {recomendaciones.resumen.dias_analizados} días
              </Badge>
              {recomendaciones.resumen.cumplimiento_promedio != null && (
                <Badge variant="outline">
                  Cumplimiento: {recomendaciones.resumen.cumplimiento_promedio}%
                </Badge>
              )}
            </div>
            {recomendaciones.ajustes.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {recomendaciones.ajustes.slice(0, 4).map((a) => (
                  <AjusteCard key={a.ejercicio_id} ajuste={a} />
                ))}
              </div>
            )}
            {recomendaciones.plantillas_sugeridas.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Rutinas sugeridas para ti</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {recomendaciones.plantillas_sugeridas.map((p) => (
                    <li key={p.id}>
                      {p.nombre} — {OBJETIVOS[p.objetivo ?? ''] ?? p.objetivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Dumbbell className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">Aún no tienes rutinas asignadas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta con un instructor del gimnasio para que te asigne un plan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {data.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{r.nombre}</CardTitle>
                    {r.objetivo && (
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {OBJETIVOS[r.objetivo] ?? r.objetivo}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">{r.ejercicios?.length ?? 0} ejercicios</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {r.ejercicios && r.ejercicios.length > 0 ? (
                  <ol className="space-y-3">
                    {r.ejercicios.map((ej, idx) => (
                      <li key={ej.ejercicio_id}>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => dialog.openEjercicio(ej, r.id)}
                            className="flex min-w-0 flex-1 items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{ej.nombre}</p>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {ej.grupo_muscular && <span>{ej.grupo_muscular}</span>}
                                {ej.series && ej.repeticiones && (
                                  <span className="font-medium text-foreground">
                                    {ej.series} series × {ej.repeticiones}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 self-center"
                            onClick={() => setProgresoEj({ rutinaId: r.id, ejercicio: ej })}
                          >
                            Registrar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin ejercicios en esta rutina</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EjercicioRutinaDialog
        ejercicio={dialog.ejercicio}
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        onRegistrar={
          dialog.rutinaId && dialog.ejercicio
            ? () =>
                setProgresoEj({
                  rutinaId: dialog.rutinaId!,
                  ejercicio: dialog.ejercicio!,
                })
            : undefined
        }
      />

      {progresoEj && (
        <RegistroProgresoDialog
          open={!!progresoEj}
          onOpenChange={(open) => {
            if (!open) setProgresoEj(null)
          }}
          rutinaId={progresoEj.rutinaId}
          ejercicio={progresoEj.ejercicio}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['mis-recomendaciones-rutina'] })
          }}
        />
      )}
    </>
  )
}
