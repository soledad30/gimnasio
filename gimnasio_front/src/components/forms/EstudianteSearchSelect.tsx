import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import type { Estudiante } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function hoyISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Membresía vigente según fechas del estudiante. */
export function membresiaActiva(e: Estudiante): boolean {
  if (!e.fechainicio_membresia || !e.fechafin_membresia) return false
  const hoy = hoyISO()
  return e.fechainicio_membresia <= hoy && e.fechafin_membresia >= hoy
}

function normalizar(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function coincide(e: Estudiante, term: string): boolean {
  const q = normalizar(term)
  if (!q) return true

  const activo = membresiaActiva(e)
  if (q === 'activo' || q === 'activa') return activo
  if (q === 'inactivo' || q === 'inactiva' || q === 'vencido' || q === 'vencida') return !activo

  const campos = [
    e.nombre,
    e.registro_univercotario,
    e.cs,
    e.email,
    e.telefono,
    e.carrera,
    activo ? 'activo' : 'inactivo',
  ]
  return campos.some((c) => c && normalizar(c).includes(q))
}

function etiquetaSecundaria(e: Estudiante) {
  const partes: string[] = []
  if (e.registro_univercotario) partes.push(`Reg. ${e.registro_univercotario}`)
  if (e.cs) partes.push(`CI ${e.cs}`)
  return partes.join(' · ') || e.email
}

type EstudianteSearchSelectProps = {
  id?: string
  name?: string
  label?: string
  estudiantes: Estudiante[]
  required?: boolean
  value?: number | null
  defaultValue?: number | null
  onChange?: (id: number | null) => void
  className?: string
  placeholder?: string
}

export function EstudianteSearchSelect({
  id = 'estudiante_id',
  name = 'estudiante_id',
  label = 'Estudiante',
  estudiantes,
  required,
  value,
  defaultValue = null,
  onChange,
  className,
  placeholder = 'Buscar por nombre, registro, CI o activo…',
}: EstudianteSearchSelectProps) {
  const controlled = value !== undefined
  const [interno, setInterno] = useState<number | null>(defaultValue ?? null)
  const seleccionadoId = controlled ? (value ?? null) : interno

  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const seleccionado = useMemo(
    () => estudiantes.find((e) => e.id === seleccionadoId) ?? null,
    [estudiantes, seleccionadoId]
  )

  const filtrados = useMemo(
    () => estudiantes.filter((e) => coincide(e, busqueda)),
    [estudiantes, busqueda]
  )

  const setSeleccion = (id: number | null) => {
    if (!controlled) setInterno(id)
    onChange?.(id)
  }

  useEffect(() => {
    if (!abierto) return
    const onDoc = (ev: MouseEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [abierto])

  useEffect(() => {
    if (abierto) {
      setBusqueda('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [abierto])

  return (
    <div className={cn('space-y-2', className)} ref={rootRef}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <input
        type="hidden"
        name={name}
        value={seleccionadoId ?? ''}
        required={required}
      />
      <div className="relative">
        <Button
          type="button"
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          aria-label={label}
          className="h-auto min-h-10 w-full justify-between px-3 py-2 font-normal"
          onClick={() => setAbierto((v) => !v)}
        >
          {seleccionado ? (
            <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
              <span className="truncate font-medium">{seleccionado.nombre}</span>
              <span className="truncate text-xs text-muted-foreground">
                {etiquetaSecundaria(seleccionado)}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar estudiante…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {abierto && (
          <div className="absolute z-[100] mt-1 w-full overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-2 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={placeholder}
                className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                aria-label="Buscar estudiante"
                title="Buscar estudiante"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtrados.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Sin coincidencias
                </p>
              ) : (
                filtrados.map((e) => {
                  const activo = membresiaActiva(e)
                  const selected = e.id === seleccionadoId
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                        selected && 'bg-accent/60'
                      )}
                      onClick={() => {
                        setSeleccion(e.id)
                        setAbierto(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          selected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{e.nombre}</span>
                          <Badge
                            variant={activo ? 'success' : 'outline'}
                            className="shrink-0 text-[10px]"
                          >
                            {activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {etiquetaSecundaria(e)}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            <p className="border-t border-border px-2 py-1.5 text-[10px] text-muted-foreground">
              Busca por nombre, registro, CI o escribe activo / inactivo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
