import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { Copy, KeyRound, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { usuariosApi } from '@/api/services'
import type { UsuarioAdmin } from '@/types'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
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
import { useAuth } from '@/context/AuthContext'

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'recepcion', label: 'Recepción' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'estudiante', label: 'Estudiante' },
] as const

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function rolBadge(rol: string) {
  if (rol === 'admin') return <Badge variant="default">Admin</Badge>
  if (rol === 'recepcion') return <Badge className="bg-cyan-600 hover:bg-cyan-600">Recepción</Badge>
  if (rol === 'instructor') return <Badge variant="secondary">Instructor</Badge>
  return <Badge variant="outline">Estudiante</Badge>
}

export function UsuariosPage() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const [openCreate, setOpenCreate] = useState(false)
  const [editUser, setEditUser] = useState<UsuarioAdmin | null>(null)
  const [resetUser, setResetUser] = useState<UsuarioAdmin | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroActivo, setFiltroActivo] = useState<'' | 'true' | 'false'>('')

  const queryParams = useMemo(() => {
    const p: { rol?: string; activo?: boolean } = {}
    if (filtroRol) p.rol = filtroRol
    if (filtroActivo === 'true') p.activo = true
    if (filtroActivo === 'false') p.activo = false
    return p
  }, [filtroRol, filtroActivo])

  const { data = [], isLoading } = useQuery({
    queryKey: ['usuarios', queryParams],
    queryFn: () => usuariosApi.list(queryParams).then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['usuarios'] })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => usuariosApi.create(body),
    onSuccess: () => {
      invalidate()
      setOpenCreate(false)
      toast.success('Usuario creado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      usuariosApi.update(id, body),
    onSuccess: () => {
      invalidate()
      setEditUser(null)
      toast.success('Usuario actualizado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const resetMut = useMutation({
    mutationFn: ({
      id,
      password_nueva,
      generar_temporal,
    }: {
      id: number
      password_nueva?: string
      generar_temporal: boolean
    }) => usuariosApi.resetPassword(id, { password_nueva, generar_temporal }),
    onSuccess: (res) => {
      setTempPassword(res.data.password_temporal ?? null)
      toast.success(res.data.mensaje)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    createMut.mutate({
      nombre: fd.get('nombre'),
      email: fd.get('email'),
      telefono: fd.get('telefono') || undefined,
      password: fd.get('password'),
      rol: fd.get('rol') || 'recepcion',
    })
  }

  const onEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editUser) return
    const fd = new FormData(e.currentTarget)
    updateMut.mutate({
      id: editUser.id,
      body: {
        nombre: fd.get('nombre'),
        telefono: fd.get('telefono') || null,
        activo: fd.get('activo') === 'true',
        rol: fd.get('rol'),
      },
    })
  }

  const onReset = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resetUser) return
    const fd = new FormData(e.currentTarget)
    const modo = fd.get('modo')
    resetMut.mutate({
      id: resetUser.id,
      generar_temporal: modo === 'temporal',
      password_nueva: modo === 'manual' ? String(fd.get('password_nueva') || '') : undefined,
    })
  }

  const copyPassword = async () => {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    toast.success('Contraseña copiada')
  }

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description="Gestiona cuentas, roles, acceso y contraseñas del personal"
        onCreate={() => setOpenCreate(true)}
        createLabel="Nuevo usuario"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Cuentas del sistema
          </CardTitle>
          <CardDescription>{data.length} usuario(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Filtrar por rol"
              className={selectClassName + ' w-auto min-w-[160px]'}
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
            >
              <option value="">Todos los roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por estado"
              className={selectClassName + ' w-auto min-w-[140px]'}
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value as '' | 'true' | 'false')}
            >
              <option value="">Activos e inactivos</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>
          </div>

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay usuarios con esos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nombre}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{rolBadge(u.rol_efectivo)}</TableCell>
                      <TableCell>
                        {u.activo ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="destructive">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.estudiante_id && `Estudiante #${u.estudiante_id}`}
                        {u.instructor_id && `Instructor #${u.instructor_id}`}
                        {!u.estudiante_id && !u.instructor_id && '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          onEdit={() => setEditUser(u)}
                          extra={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetUser(u)
                                setTempPassword(null)
                              }}
                            >
                              <KeyRound className="h-4 w-4 shrink-0" />
                              Clave
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <select id="rol" name="rol" className={selectClassName} defaultValue="recepcion">
                <option value="recepcion">Recepción</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña inicial</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={onEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input id="edit-nombre" name="nombre" defaultValue={editUser.nombre} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editUser.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  name="telefono"
                  defaultValue={editUser.telefono ?? ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rol">Rol</Label>
                <select
                  id="edit-rol"
                  name="rol"
                  className={selectClassName}
                  defaultValue={editUser.rol_efectivo}
                  disabled={editUser.id === currentUser?.id}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {editUser.id === currentUser?.id && (
                  <p className="text-xs text-muted-foreground">
                    No puedes cambiar tu propio rol desde aquí.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activo">Estado</Label>
                <select
                  id="edit-activo"
                  name="activo"
                  className={selectClassName}
                  defaultValue={editUser.activo ? 'true' : 'false'}
                  disabled={editUser.id === currentUser?.id}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMut.isPending}>
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resetUser}
        onOpenChange={(v) => {
          if (!v) {
            setResetUser(null)
            setTempPassword(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
          </DialogHeader>
          {resetUser && (
            <>
              <p className="text-sm text-muted-foreground">
                Usuario: <strong>{resetUser.nombre}</strong> ({resetUser.email})
              </p>
              {tempPassword ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium">Contraseña temporal generada:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-lg">
                      {tempPassword}
                    </code>
                    <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Compártela con el usuario. Debería cambiarla al iniciar sesión.
                  </p>
                  <DialogFooter className="mt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setResetUser(null)
                        setTempPassword(null)
                      }}
                    >
                      Listo
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={onReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="modo">Método</Label>
                    <select id="modo" name="modo" className={selectClassName} defaultValue="temporal">
                      <option value="temporal">Generar contraseña temporal</option>
                      <option value="manual">Establecer contraseña manual</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password_nueva">Nueva contraseña (solo manual)</Label>
                    <Input
                      id="password_nueva"
                      name="password_nueva"
                      type="password"
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setResetUser(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={resetMut.isPending}>
                      Restablecer
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
