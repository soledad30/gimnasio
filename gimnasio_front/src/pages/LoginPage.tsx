import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Dumbbell, Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { homePathForRol, useAuth } from '@/context/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const { login, user, loading, homePath } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gym-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (user) return <Navigate to={homePath} replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const perfil = await login(email, password)
      navigate(homePathForRol(perfil.rol))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold">
            Gym<span className="text-primary">Pro</span>
          </span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            Gestiona tu gimnasio con control total
          </h2>
          <p className="max-w-md text-muted-foreground">
            Membresías, acceso NFC, rutinas, clases y reportes en un solo panel profesional.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© GymPro — Sistema de gestión</p>
      </div>
      <div className="flex items-center justify-center p-6 gym-gradient">
        <Card className="w-full max-w-md border-border/60 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales de acceso</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Entrando…' : 'Iniciar sesión'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Regístrate
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
