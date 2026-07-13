import type { ReactNode } from 'react'
import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, Dumbbell, Globe, Loader2, Mail, MapPin, Phone } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { configuracionApi } from '@/api/services'
import { homePathForRol, useAuth } from '@/context/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

function asHref(url?: string | null): string | null {
  if (!url?.trim()) return null
  const t = url.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('+') || /^\d+$/.test(t.replace(/\s/g, ''))) {
    return `https://wa.me/${t.replace(/[^\d+]/g, '').replace('+', '')}`
  }
  return `https://${t}`
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string | null
  label: string
  children: ReactNode
}) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </a>
  )
}

function SvgIcon({
  className,
  path,
}: {
  className?: string
  path: string
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
  )
}

const ICON_FACEBOOK =
  'M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4z'
const ICON_INSTAGRAM =
  'M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10 2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10zm-5 3a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 7zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm4.5-.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z'
const ICON_TIKTOK =
  'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.28a8.27 8.27 0 0 0 4.84 1.56V7.39a4.85 4.85 0 0 1-1.08-.7z'
const ICON_YOUTUBE =
  'M10 15V9l5.2 3L10 15zm12-3c0-2.4-.2-4.1-.5-5.1a2.7 2.7 0 0 0-1.9-1.9C18.6 4.7 12 4.7 12 4.7s-6.6 0-7.6.3A2.7 2.7 0 0 0 2.5 6.9C2.2 7.9 2 9.6 2 12s.2 4.1.5 5.1a2.7 2.7 0 0 0 1.9 1.9c1 .3 7.6.3 7.6.3s6.6 0 7.6-.3a2.7 2.7 0 0 0 1.9-1.9c.3-1 .5-2.7.5-5.1z'

export function LoginPage() {
  const { login, user, loading, homePath } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: org } = useQuery({
    queryKey: ['config-organizacion-public'],
    queryFn: () => configuracionApi.getOrganizacion().then((r) => r.data),
    staleTime: 60_000,
    retry: false,
  })

  if (!loading && user) return <Navigate to={homePath} replace />

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

  const nombre = org?.nombre_organizacion?.trim() || 'UAGRM-GYM'
  const formatHm = (raw?: string | null, hourFb?: number | null) => {
    if (raw?.trim()) {
      const [h, m] = raw.trim().split(':')
      return `${String(Number(h) || 0).padStart(2, '0')}:${String(Number(m) || 0).padStart(2, '0')}`
    }
    return `${String(hourFb ?? 7).padStart(2, '0')}:00`
  }
  const openLabel = formatHm(org?.gym_open_time, org?.gym_open_hour ?? 7)
  const closeLabel = formatHm(org?.gym_close_time, org?.gym_close_hour ?? 19)
  const dias = org?.dias_ventana_inscripcion ?? 5

  const redes = [
    { href: asHref(org?.sitio_web), label: 'Sitio web', icon: <Globe className="h-4 w-4" /> },
    {
      href: asHref(org?.facebook),
      label: 'Facebook',
      icon: <SvgIcon className="h-4 w-4" path={ICON_FACEBOOK} />,
    },
    {
      href: asHref(org?.instagram),
      label: 'Instagram',
      icon: <SvgIcon className="h-4 w-4" path={ICON_INSTAGRAM} />,
    },
    {
      href: asHref(org?.tiktok),
      label: 'TikTok',
      icon: <SvgIcon className="h-4 w-4" path={ICON_TIKTOK} />,
    },
    {
      href: asHref(org?.youtube),
      label: 'YouTube',
      icon: <SvgIcon className="h-4 w-4" path={ICON_YOUTUBE} />,
    },
    { href: asHref(org?.whatsapp), label: 'WhatsApp', icon: <Phone className="h-4 w-4" /> },
  ].filter((r) => r.href)

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle variant="icon" />
      </div>
      <div className="relative hidden overflow-hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold text-foreground">
            {nombre.includes('-') ? (
              <>
                {nombre.split('-')[0]}
                <span className="text-primary">-{nombre.split('-').slice(1).join('-')}</span>
              </>
            ) : (
              <>
                {nombre}
                <span className="text-primary" />
              </>
            )}
          </span>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <img
              src="/branding/logo-gimnasio-uagrm.png"
              alt="Gimnasio Universitario U.A.G.R.M."
              className="h-36 w-auto max-w-[280px] rounded-lg object-contain shadow-md"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-semibold leading-tight">
              Gestiona tu gimnasio con control total
            </h2>
            <p className="max-w-md text-muted-foreground">
              Membresías, acceso NFC, rutinas, clases y reportes en un solo panel profesional.
            </p>
          </div>

          <div className="max-w-md space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
            {org?.ubicacion && (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{org.ubicacion}</span>
              </p>
            )}
            {org?.telefono_contacto && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>{org.telefono_contacto}</span>
              </p>
            )}
            {org?.email_contacto && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>{org.email_contacto}</span>
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Horario {openLabel} – {closeLabel} · Inscripciones: últimos {dias} días del mes
              </span>
            </p>

            {redes.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {redes.map((r) => (
                  <SocialLink key={r.label} href={r.href} label={r.label}>
                    {r.icon}
                  </SocialLink>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">© {nombre} — Sistema de gestión</p>
      </div>

      <div className="flex items-center justify-center p-6 gym-gradient">
        <Card className="w-full max-w-md border-border/60 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>
              {loading ? 'Verificando sesión…' : 'Ingresa tus credenciales de acceso'}
            </CardDescription>
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
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
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
