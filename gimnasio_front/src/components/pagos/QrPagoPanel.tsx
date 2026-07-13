import { Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import type { ConfiguracionOrganizacion, Inscripcion } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatExpiraPago,
  resolveQrCobroPayload,
  tieneQrSimple,
} from '@/lib/qrPago'

type Props = {
  ins: Inscripcion
  org?: ConfiguracionOrganizacion | null
  qrSize?: number
  showInstructions?: boolean
  variant?: 'student' | 'staff'
}

export function QrPagoPanel({
  ins,
  org,
  qrSize = 180,
  showInstructions = true,
  variant = 'student',
}: Props) {
  const qrPayload = resolveQrCobroPayload(org, ins)
  const esQrSimple = tieneQrSimple(org, ins)
  const expiraTxt = formatExpiraPago(ins.pago_expira_en)

  const copyText = (text: string, msg: string) => {
    navigator.clipboard.writeText(text)
    toast.success(msg)
  }

  const bancoLinea =
    org?.banco_nombre && org?.banco_cuenta
      ? `${org.banco_nombre} — ${org.banco_cuenta}${org.banco_titular ? ` (${org.banco_titular})` : ''}`
      : null

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <div className="space-y-1">
        <p className="text-2xl font-bold">Bs. {ins.monto}</p>
        {esQrSimple && (
          <Badge variant="secondary" className="text-xs">
            QR Simple · Bolivia
          </Badge>
        )}
      </div>

      {ins.qr_vigente ? (
        qrPayload ? (
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <QRCodeSVG value={qrPayload} size={qrSize} level="M" includeMargin />
          </div>
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
            {variant === 'staff'
              ? 'Falta el contenido del QR. Configúralo en Configuración → Métodos de cobro.'
              : 'El gimnasio aún no configuró el QR de cobro. Usa transferencia o consulta en recepción.'}
          </p>
        )
      ) : (
        <p className="rounded-md border px-4 py-8 text-sm text-muted-foreground">
          El método de pago expiró. Solicita uno nuevo desde la app.
        </p>
      )}

      <div className="w-full space-y-3 text-left text-sm">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Referencia de inscripción</p>
          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <span className="font-mono text-sm">{ins.referencia_pago}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => copyText(ins.referencia_pago, 'Referencia copiada')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {bancoLinea && (
          <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs">
            <p className="font-medium">Transferencia alternativa</p>
            <p className="mt-1 text-muted-foreground">{bancoLinea}</p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => copyText(bancoLinea, 'Datos bancarios copiados')}
            >
              Copiar datos
            </Button>
          </div>
        )}

        {expiraTxt && (
          <p className="text-xs text-muted-foreground">
            {ins.qr_vigente ? `Vigente hasta ${expiraTxt}` : `Expiró el ${expiraTxt}`}
          </p>
        )}

        {showInstructions && ins.qr_vigente && (
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            {esQrSimple ? (
              <>
                <li>Abre Yape, banca móvil o la app de tu banco.</li>
                <li>Escanea el QR Simple y paga exactamente Bs. {ins.monto}.</li>
                <li>
                  En el detalle del pago escribe la referencia{' '}
                  <strong className="font-mono">{ins.referencia_pago}</strong> o muéstrala en
                  recepción.
                </li>
                <li>Recepción confirmará tu pago y activará la inscripción.</li>
              </>
            ) : (
              <>
                <li>Usa el código QR o la referencia para identificar tu pago.</li>
                <li>Acércate a recepción con el comprobante.</li>
              </>
            )}
          </ol>
        )}
      </div>
    </div>
  )
}
