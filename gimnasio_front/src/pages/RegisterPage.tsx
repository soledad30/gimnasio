import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Dumbbell, Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { homePathForRol, useAuth } from '@/context/AuthContext'
import { CarreraSelect } from '@/components/forms/CarreraSelect'
import { FaceCaptureField } from '@/components/forms/FaceCaptureField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function RegisterPage() {
  const { register, user, loading, homePath } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [faceEmbedding, setFaceEmbedding] = useState<number[]>()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gym-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (user) return <Navigate to={homePath} replace />

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const fd = new FormData(e.currentTarget)
    const password = String(fd.get('password') ?? '')
    const confirm = String(fd.get('confirm_password') ?? '')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSubmitting(true)
    try {
      const perfil = await register({
        nombre: String(fd.get('nombre') ?? ''),
        email: String(fd.get('email') ?? ''),
        password,
        telefono: String(fd.get('telefono') ?? '') || undefined,
        registro_univercotario: String(fd.get('registro_univercotario') ?? '') || undefined,
        carrera: String(fd.get('carrera') ?? '') || undefined,
        face_embedding: faceEmbedding,
      })
      navigate(homePathForRol(perfil.rol))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle variant="icon" />
      </div>
      <div className="relative hidden overflow-hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold text-foreground">
            UAGRM<span className="text-primary">-GYM</span>
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src="/branding/logo-gimnasio-uagrm.png"
              alt="Gimnasio Universitario U.A.G.R.M."
              className="h-36 w-auto max-w-[280px] rounded-lg object-contain shadow-md"
            />
          </div>
          <h2 className="text-3xl font-semibold leading-tight">Únete al gimnasio</h2>
          <p className="max-w-md text-muted-foreground">
            Crea tu cuenta de estudiante para reservar clases, ver rutinas y recibir notificaciones.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© UAGRM-GYM — Sistema de gestión</p>
      </div>
      <div className="flex items-center justify-center p-6 gym-gradient">
        <Card className="my-8 w-full max-w-md border-border/60 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Crear cuenta</CardTitle>
            <CardDescription>Regístrate como estudiante del gimnasio</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" name="nombre" required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono (opcional)</Label>
                <Input id="telefono" name="telefono" type="tel" autoComplete="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registro_univercotario">Registro universitario (opcional)</Label>
                <Input id="registro_univercotario" name="registro_univercotario" />
              </div>
              <CarreraSelect id="carrera" />
              <FaceCaptureField
                onEmbeddingChange={setFaceEmbedding}
                disabled={submitting}
              />
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Creando cuenta…' : 'Registrarse'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
