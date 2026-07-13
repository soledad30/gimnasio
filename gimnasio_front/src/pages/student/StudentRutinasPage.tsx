import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Dumbbell, Target } from 'lucide-react'
import { rutinasApi } from '@/api/services'
import {
  EjercicioRutinaDialog,
  useEjercicioRutinaDialog,
} from '@/components/rutinas/EjercicioRutinaDialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const OBJETIVOS: Record<string, string> = {
  abdomen: 'Abdomen / core',
  hipertrofia: 'Hipertrofia',
  fuerza: 'Fuerza',
  resistencia: 'Resistencia',
  perdida_peso: 'Pérdida de peso',
  flexibilidad: 'Flexibilidad',
  general: 'General',
}

export function StudentRutinasPage() {
  const dialog = useEjercicioRutinaDialog()

  const { data = [], isLoading } = useQuery({
    queryKey: ['mis-rutinas'],
    queryFn: () => rutinasApi.mis().then((r) => r.data),
  })

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mi rutina</h1>
        
      </div>

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
                        <button
                          type="button"
                          onClick={() => dialog.openEjercicio(ej)}
                          className="flex w-full items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
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
                            {(ej.descripcion || ej.videourl || ej.fotourl) && (
                              <p className="mt-1 text-xs text-primary">Ver instrucciones</p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge variant="outline">
                              {ej.con_maquina ? ej.maquina_nombre || 'Máquina' : 'Sin máquina'}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
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
      />
    </>
  )
}
