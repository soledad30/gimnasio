import { CARRERAS_UAGRM, CARRERAS_UAGRM_GRUPOS } from '@/data/carrerasUagrm'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type CarreraSelectProps = {
  id: string
  name?: string
  label?: string
  defaultValue?: string | null
  required?: boolean
  className?: string
}

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function CarreraSelect({
  id,
  name = 'carrera',
  label = 'Carrera',
  defaultValue,
  required,
  className,
}: CarreraSelectProps) {
  const valor = defaultValue?.trim() ?? ''
  const enLista = valor && CARRERAS_UAGRM.includes(valor)

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={enLista ? valor : valor && !enLista ? valor : ''}
        className={selectClassName}
      >
        <option value="">{required ? 'Seleccionar carrera…' : 'Sin especificar'}</option>
        {CARRERAS_UAGRM_GRUPOS.map((grupo) => (
          <optgroup key={grupo.facultad} label={grupo.facultad}>
            {grupo.carreras.map((carrera) => (
              <option key={carrera} value={carrera}>
                {carrera}
              </option>
            ))}
          </optgroup>
        ))}
        {valor && !enLista ? (
          <option value={valor}>{valor} (registrada anteriormente)</option>
        ) : null}
      </select>
      <p className="text-xs text-muted-foreground">Carreras oficiales de la UAGRM, Santa Cruz.</p>
    </div>
  )
}
