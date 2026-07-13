import { FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, instructoresApi, usuariosApi } from '@/api/services'
import { DetailGrid } from '@/components/crud/DetailGrid'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import type { Estudiante, Instructor } from '@/types'

// Nota: por requerimiento, en “Mi perfil” NO se muestran rol, estado ni código de acceso/QR.

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MiPerfilDialog({ open, onOpenChange }: Props) {
  const { user, perfil, isAdmin, reload } = useAuth()
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null)
  const [instructor, setInstructor] = useState<Instructor | null>(null)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setNombre(user.nombre ?? '')
    setTelefono(user.telefono ?? '')
    setPasswordActual('')
    setPasswordNueva('')
    setEstudiante(null)
    setInstructor(null)

    let cancelled = false
    const load = async () => {
      setLoadingExtra(true)
      try {
        const tasks: Promise<void>[] = []
        if (perfil?.estudiante_id) {
          const estId = perfil.estudiante_id
          tasks.push(
            estudiantesApi.get(estId).then((r) => {
              if (!cancelled) setEstudiante(r.data)
            })
          )
        }
        if (perfil?.instructor_id) {
          const instId = perfil.instructor_id
          tasks.push(
            instructoresApi.get(instId).then((r) => {
              if (!cancelled) setInstructor(r.data)
            })
          )
        }
        await Promise.all(tasks)
      } catch {
        if (!cancelled) toast.error('No se pudo cargar el detalle del perfil')
      } finally {
        if (!cancelled) setLoadingExtra(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, user, perfil?.estudiante_id, perfil?.instructor_id])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const body: { nombre?: string; telefono?: string | null } = {
        telefono: telefono.trim() ? telefono.trim() : null,
      }
      if (isAdmin) {
        const nom = nombre.trim()
        if (!nom) {
          toast.error('El nombre no puede quedar vacío')
          return
        }
        body.nombre = nom
      }

      await usuariosApi.updateMe(body)

      if (passwordActual.trim() || passwordNueva.trim()) {
        if (!passwordActual.trim() || !passwordNueva.trim()) {
          toast.error('Para cambiar contraseña llena ambos campos')
          return
        }
        if (passwordNueva.trim().length < 8) {
          toast.error('La contraseña nueva debe tener al menos 8 caracteres')
          return
        }
        await usuariosApi.cambiarPasswordMe({
          password_actual: passwordActual,
          password_nueva: passwordNueva,
        })
      }

      await reload()
      toast.success('Perfil actualizado')
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const baseItems = [
    { label: 'Nombre', value: user?.nombre },
    { label: 'Correo', value: user?.email },
    { label: 'Teléfono', value: user?.telefono || '—' },
    {
      label: 'Alta en el sistema',
      value: user?.created_at ? new Date(user.created_at).toLocaleString() : '—',
    },
  ]

  const estudianteItems = estudiante
    ? [
        { label: 'Registro universitario', value: estudiante.registro_univercotario || '—' },
        { label: 'Carrera', value: estudiante.carrera || '—' },
        { label: 'Cédula / CS', value: estudiante.cs || '—' },
        { label: 'NFC', value: estudiante.nfc_uid || 'Sin NFC' },
        {
          label: 'Membresía',
          value:
            estudiante.fechainicio_membresia && estudiante.fechafin_membresia
              ? `${estudiante.fechainicio_membresia} → ${estudiante.fechafin_membresia}`
              : 'Sin fechas',
        },
      ]
    : []

  const instructorItems = instructor
    ? [
        {
          label: 'Especialidades',
          value: instructor.especialidades?.length
            ? instructor.especialidades.join(', ')
            : 'Sin especialidades',
        },
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mi perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Información de la cuenta</p>
            {loadingExtra ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <DetailGrid items={[...baseItems, ...estudianteItems, ...instructorItems]} />
            )}
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Los datos de cuenta (nombre, rol, registro, etc.) solo los puede modificar un
                administrador. Tú puedes actualizar tu teléfono y tu contraseña.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Datos que puedes actualizar</p>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="mi-nombre">Nombre</Label>
                <Input
                  id="mi-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="mi-telefono">Teléfono</Label>
              <Input
                id="mi-telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="70000000"
              />
            </div>
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-sm font-medium">Cambiar contraseña</p>
              <div className="space-y-2">
                <Label htmlFor="pass-actual">Contraseña actual</Label>
                <Input
                  id="pass-actual"
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass-nueva">Contraseña nueva</Label>
                <Input
                  id="pass-nueva"
                  type="password"
                  minLength={8}
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cerrar
            </Button>
            <Button type="submit" disabled={saving}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
