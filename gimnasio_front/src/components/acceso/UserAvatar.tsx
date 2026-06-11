import { cn } from '@/lib/utils'

export function UserAvatar({
  nombre,
  src,
  className,
}: {
  nombre?: string | null
  src?: string | null
  className?: string
}) {
  const initials = (nombre ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  if (src) {
    return (
      <img
        src={src}
        alt={nombre ?? 'Perfil'}
        className={cn('h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-border', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary ring-2 ring-border',
        className
      )}
    >
      {initials || '?'}
    </div>
  )
}
