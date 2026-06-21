import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Loader2, Mail, Phone } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { authApi } from '@/api/services'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Metodo = 'email' | 'telefono'

export function ForgotPasswordPage() {
  const [metodo, setMetodo] = useState<Metodo>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const { data } = await authApi.forgotPassword({ email })
      setSuccess(data.mensaje)
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
            UAGRM<span className="text-primary">-GYM</span>
          </span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">Recupera tu acceso</h2>
          <p className="max-w-md text-muted-foreground">
            Te enviaremos una contraseña temporal a tu correo registrado.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© UAGRM-GYM — Sistema de gestión</p>
      </div>
      <div className="flex items-center justify-center p-6 gym-gradient">
        <Card className="w-full max-w-md border-border/60 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Restablecer contraseña</CardTitle>
            <CardDescription>Elige cómo quieres recuperar tu cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMetodo('email')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  metodo === 'email'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Mail className="h-4 w-4" />
                Correo
              </button>
              <button
                type="button"
                disabled
                title="Próximamente"
                className="relative flex cursor-not-allowed items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/60"
              >
                <Phone className="h-4 w-4" />
                Teléfono
                <span className="absolute -right-1 -top-2 rounded bg-muted-foreground/20 px-1.5 text-[10px]">
                  Próximamente
                </span>
              </button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 border-primary/30 bg-primary/5">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Enviando…' : 'Enviar contraseña temporal'}
                </Button>
              </form>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
