import { ImageIcon, Play } from 'lucide-react'
import { getMediaUrl } from '@/api/client'
import { cn } from '@/lib/utils'

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
  } catch {
    return null
  }
  return null
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url)
}

export function EjercicioMedia({
  nombre,
  fotourl,
  videourl,
  className,
  compact,
}: {
  nombre: string
  fotourl?: string | null
  videourl?: string | null
  className?: string
  compact?: boolean
}) {
  const embed = videourl ? youtubeEmbedUrl(videourl) : null
  const foto = getMediaUrl(fotourl)

  if (embed) {
    return (
      <div className={cn('overflow-hidden rounded-lg bg-black', className)}>
        <iframe
          title={`Video: ${nombre}`}
          src={embed}
          className={cn('w-full border-0', compact ? 'h-full min-h-[120px]' : 'aspect-video')}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (videourl && isDirectVideo(videourl)) {
    const src = getMediaUrl(videourl) ?? videourl
    return (
      <div className={cn('overflow-hidden rounded-lg bg-black', className)}>
        <video
          src={src}
          controls
          className={cn('w-full object-cover', compact ? 'h-full min-h-[120px]' : 'aspect-video')}
        >
          <track kind="captions" />
        </video>
      </div>
    )
  }

  if (videourl) {
    return (
      <a
        href={videourl}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20',
          compact ? 'min-h-[120px] p-3' : 'aspect-video p-4',
          className
        )}
      >
        <Play className="h-8 w-8" />
        <span className="text-xs font-medium">Ver video demostrativo</span>
      </a>
    )
  }

  if (foto) {
    return (
      <img
        src={foto}
        alt={nombre}
        className={cn('rounded-lg object-cover', compact ? 'h-full min-h-[120px] w-full' : 'aspect-video w-full', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground',
        compact ? 'min-h-[120px]' : 'aspect-video',
        className
      )}
    >
      <ImageIcon className="h-8 w-8 opacity-50" />
      <span className="text-xs">Sin foto ni video</span>
    </div>
  )
}
