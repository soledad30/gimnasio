import { ImageIcon } from 'lucide-react'
import { getMediaUrl } from '@/api/client'
import { cn } from '@/lib/utils'

export function MaquinaFoto({
  nombre,
  fotourl,
  className,
}: {
  nombre: string
  fotourl?: string | null
  className?: string
}) {
  const src = getMediaUrl(fotourl)

  if (src) {
    return (
      <img
        src={src}
        alt={nombre}
        className={cn('max-w-full rounded-lg object-cover object-center', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground',
        className
      )}
    >
      <ImageIcon className="h-8 w-8 opacity-50" />
      <span className="text-xs">Sin foto</span>
    </div>
  )
}
