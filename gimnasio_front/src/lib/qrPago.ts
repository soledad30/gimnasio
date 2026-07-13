import type { ConfiguracionOrganizacion, Inscripcion } from '@/types'

export function resolveQrCobroPayload(
  org: Pick<ConfiguracionOrganizacion, 'qr_pago_contenido'> | null | undefined,
  ins: Pick<Inscripcion, 'qr_cobro' | 'qr_pago' | 'referencia_pago' | 'usa_qr_simple'>
): string {
  if (ins.qr_cobro?.trim()) return ins.qr_cobro.trim()
  if (org?.qr_pago_contenido?.trim()) return org.qr_pago_contenido.trim()
  return ins.qr_pago || ins.referencia_pago
}

export function tieneQrSimple(
  org: Pick<ConfiguracionOrganizacion, 'qr_pago_contenido'> | null | undefined,
  ins?: Pick<Inscripcion, 'usa_qr_simple'> | null
): boolean {
  if (ins?.usa_qr_simple) return true
  return Boolean(org?.qr_pago_contenido?.trim())
}

export function formatExpiraPago(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
