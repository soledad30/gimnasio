import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent } from 'react'
import { Banknote, Clock, HardDrive, MapPin, QrCode, Save, Share2, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { configuracionApi } from '@/api/services'
import { getErrorMessage } from '@/api/client'
import type { ConfiguracionOrganizacion } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function norm(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

function normFloat(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function normInt(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function timeInputValue(raw?: string | null, hourFallback?: number | null): string {
  if (raw?.trim()) {
    const parts = raw.trim().split(':')
    const h = String(Number(parts[0] || 0)).padStart(2, '0')
    const m = String(Number(parts[1] || 0)).padStart(2, '0')
    const s = String(Number(parts[2] || 0)).padStart(2, '0')
    return `${h}:${m}:${s}`
  }
  if (hourFallback != null) {
    return `${String(hourFallback).padStart(2, '0')}:00:00`
  }
  return '07:00:00'
}

function toHhMmSs(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const parts = s.split(':')
  const h = String(Number(parts[0] || 0)).padStart(2, '0')
  const m = String(Number(parts[1] || 0)).padStart(2, '0')
  const sec = String(Number(parts[2] || 0)).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

function timeToSeconds(t: string): number {
  const [h, m, s] = t.split(':').map((x) => Number(x) || 0)
  return h * 3600 + m * 60 + s
}

export function ConfiguracionPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['config-organizacion'],
    queryFn: () => configuracionApi.getOrganizacion().then((r) => r.data),
  })

  const saveMut = useMutation({
    mutationFn: (body: Partial<ConfiguracionOrganizacion>) =>
      configuracionApi.updateOrganizacion(body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-organizacion'] })
      qc.invalidateQueries({ queryKey: ['config-organizacion-public'] })
      qc.invalidateQueries({ queryKey: ['horarios-config'] })
      toast.success('Configuración actualizada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const openT = toHhMmSs(fd.get('gym_open_time'))
    const closeT = toHhMmSs(fd.get('gym_close_time'))
    if (openT && closeT && timeToSeconds(closeT) <= timeToSeconds(openT)) {
      toast.error('La hora de cierre debe ser mayor que la de apertura')
      return
    }
    const dias = normInt(fd.get('dias_ventana_inscripcion'))
    if (dias != null && (dias < 1 || dias > 31)) {
      toast.error('Los días de inscripción deben estar entre 1 y 31')
      return
    }
    const precioAct = normFloat(fd.get('precio_inscripcion_actividad'))
    const precioSala = normFloat(fd.get('precio_inscripcion_sala_maquinas'))
    const capAct = normInt(fd.get('capacidad_sala_actividad'))
    const capSala = normInt(fd.get('capacidad_sala_maquinas'))
    const horasQr = normInt(fd.get('horas_validez_qr_pago'))
    if (precioAct != null && precioAct < 0) {
      toast.error('El precio de actividad no puede ser negativo')
      return
    }
    if (precioSala != null && precioSala < 0) {
      toast.error('El precio de sala de máquinas no puede ser negativo')
      return
    }
    if (capAct != null && (capAct < 1 || capAct > 500)) {
      toast.error('La capacidad de sala de actividad debe estar entre 1 y 500')
      return
    }
    if (capSala != null && (capSala < 1 || capSala > 500)) {
      toast.error('La capacidad de sala de máquinas debe estar entre 1 y 500')
      return
    }
    if (horasQr != null && (horasQr < 1 || horasQr > 168)) {
      toast.error('Las horas de validez del QR deben estar entre 1 y 168')
      return
    }
    saveMut.mutate({
      nombre_organizacion: norm(fd.get('nombre_organizacion')),
      ubicacion: norm(fd.get('ubicacion')),
      telefono_contacto: norm(fd.get('telefono_contacto')),
      email_contacto: norm(fd.get('email_contacto')),
      sitio_web: norm(fd.get('sitio_web')),
      facebook: norm(fd.get('facebook')),
      instagram: norm(fd.get('instagram')),
      whatsapp: norm(fd.get('whatsapp')),
      tiktok: norm(fd.get('tiktok')),
      youtube: norm(fd.get('youtube')),
      banco_nombre: norm(fd.get('banco_nombre')),
      banco_cuenta: norm(fd.get('banco_cuenta')),
      banco_titular: norm(fd.get('banco_titular')),
      qr_pago_contenido: norm(fd.get('qr_pago_contenido')),
      gym_open_time: openT,
      gym_close_time: closeT,
      dias_ventana_inscripcion: dias,
      precio_inscripcion_actividad: precioAct,
      precio_inscripcion_sala_maquinas: precioSala,
      capacidad_sala_actividad: capAct,
      capacidad_sala_maquinas: capSala,
      horas_validez_qr_pago: horasQr,
      backup_root: norm(fd.get('backup_root')),
      backup_drive_path: norm(fd.get('backup_drive_path')),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
       
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Organización
              </CardTitle>
             
             </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre_organizacion">Nombre</Label>
                <Input
                  id="nombre_organizacion"
                  name="nombre_organizacion"
                  defaultValue={data.nombre_organizacion ?? ''}
                  placeholder="UAGRM-GYM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ubicacion">Ubicación / Dirección</Label>
                <Input
                  id="ubicacion"
                  name="ubicacion"
                  defaultValue={data.ubicacion ?? ''}
                  placeholder="Av. …, Ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono_contacto">Teléfono de contacto</Label>
                <Input
                  id="telefono_contacto"
                  name="telefono_contacto"
                  defaultValue={data.telefono_contacto ?? ''}
                  placeholder="70000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_contacto">Email de contacto</Label>
                <Input
                  id="email_contacto"
                  name="email_contacto"
                  type="email"
                  defaultValue={data.email_contacto ?? ''}
                  placeholder="contacto@…"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Redes sociales
              </CardTitle>
              
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sitio_web">Sitio web</Label>
                <Input id="sitio_web" name="sitio_web" defaultValue={data.sitio_web ?? ''} placeholder="https://…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={data.whatsapp ?? ''} placeholder="+591…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  name="facebook"
                  defaultValue={data.facebook ?? ''}
                  placeholder="https://facebook.com/…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  defaultValue={data.instagram ?? ''}
                  placeholder="https://instagram.com/…"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  name="tiktok"
                  defaultValue={data.tiktok ?? ''}
                  placeholder="https://tiktok.com/@…"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  name="youtube"
                  defaultValue={data.youtube ?? ''}
                  placeholder="https://youtube.com/@… o https://youtube.com/channel/…"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Métodos de cobro
              </CardTitle>
              
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="banco_nombre">Banco</Label>
                <Input
                  id="banco_nombre"
                  name="banco_nombre"
                  defaultValue={data.banco_nombre ?? ''}
                  placeholder="Banco Unión / Bisa / …"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banco_cuenta">Nº de cuenta</Label>
                <Input
                  id="banco_cuenta"
                  name="banco_cuenta"
                  defaultValue={data.banco_cuenta ?? ''}
                  placeholder="0000-0000…"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="banco_titular">Titular de la cuenta</Label>
                <Input
                  id="banco_titular"
                  name="banco_titular"
                  defaultValue={data.banco_titular ?? ''}
                  placeholder="Nombre del titular"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="qr_pago_contenido" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Contenido del QR Simple
                </Label>
                <Input
                  id="qr_pago_contenido"
                  name="qr_pago_contenido"
                  defaultValue={data.qr_pago_contenido ?? ''}
                  placeholder="Cadena EMV del QR Simple generado en tu banco o Yape"
                />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    <strong>Cómo obtenerlo:</strong> en la app de tu banco o Yape, crea un QR de
                    cobro (QR Simple) y copia el contenido/cadena que genera — suele empezar con
                    números o texto largo tipo EMV.
                  </p>
                  <p>
                    Ese código se muestra a los estudiantes al pagar. Cada inscripción lleva una{' '}
                    <strong>referencia única</strong> para que recepción identifique el pago. No
                    requiere Stripe ni pasarela internacional.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Inscripciones y precios
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="precio_inscripcion_actividad">Precio actividad (Bs.)</Label>
                <Input
                  id="precio_inscripcion_actividad"
                  name="precio_inscripcion_actividad"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={data.precio_inscripcion_actividad ?? 50}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_inscripcion_sala_maquinas">Precio sala máquinas (Bs.)</Label>
                <Input
                  id="precio_inscripcion_sala_maquinas"
                  name="precio_inscripcion_sala_maquinas"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={data.precio_inscripcion_sala_maquinas ?? 80}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dias_ventana_inscripcion">Días de inscripción</Label>
                <Input
                  id="dias_ventana_inscripcion"
                  name="dias_ventana_inscripcion"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={data.dias_ventana_inscripcion ?? 5}
                  required
                />
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacidad_sala_actividad">Capacidad sala actividad</Label>
                <Input
                  id="capacidad_sala_actividad"
                  name="capacidad_sala_actividad"
                  type="number"
                  min={1}
                  max={500}
                  defaultValue={data.capacidad_sala_actividad ?? 20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacidad_sala_maquinas">Capacidad sala máquinas</Label>
                <Input
                  id="capacidad_sala_maquinas"
                  name="capacidad_sala_maquinas"
                  type="number"
                  min={1}
                  max={500}
                  defaultValue={data.capacidad_sala_maquinas ?? 30}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horas_validez_qr_pago">Validez QR de pago (horas)</Label>
                <Input
                  id="horas_validez_qr_pago"
                  name="horas_validez_qr_pago"
                  type="number"
                  min={1}
                  max={168}
                  defaultValue={data.horas_validez_qr_pago ?? 24}
                  required
                />
                
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Respaldos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="backup_drive_path">Carpeta de Google Drive</Label>
                <Input
                  id="backup_drive_path"
                  name="backup_drive_path"
                  defaultValue={data.backup_drive_path ?? ''}
                  placeholder="G:\Mi unidad\Backups\UAGRM-GYM o C:\Users\...\Google Drive\..."
                />
                
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="backup_root">Carpeta local de respaldos (opcional)</Label>
                <Input
                  id="backup_root"
                  name="backup_root"
                  defaultValue={data.backup_root ?? ''}
                  placeholder="C:\backups\gimnasio o /var/backups/gimnasio"
                />
                
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Reglas operativas
              </CardTitle>
              
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gym_open_time">Apertura</Label>
                <Input
                  id="gym_open_time"
                  name="gym_open_time"
                  type="time"
                  step={1}
                  defaultValue={timeInputValue(data.gym_open_time, data.gym_open_hour ?? 7)}
                  required
                />
                <p className="text-xs text-muted-foreground">Formato HH:MM:SS</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gym_close_time">Cierre</Label>
                <Input
                  id="gym_close_time"
                  name="gym_close_time"
                  type="time"
                  step={1}
                  defaultValue={timeInputValue(data.gym_close_time, data.gym_close_hour ?? 19)}
                  required
                />
                <p className="text-xs text-muted-foreground">Formato HH:MM:SS</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Última actualización: {data.updated_at ? new Date(data.updated_at).toLocaleString() : '—'}
            </p>
            <Button type="submit" disabled={saveMut.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Guardar configuración
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
