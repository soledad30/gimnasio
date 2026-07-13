import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  className?: string
  /** compact: solo icono; full: icono + texto */
  variant?: 'icon' | 'full'
}

export function ThemeToggle({ className, variant = 'full' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('h-9 w-9 shrink-0', className)}
        onClick={toggleTheme}
        aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        title={isDark ? 'Tema claro (día)' : 'Tema oscuro (noche)'}
      >
        {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('w-full justify-start', className)}
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
    >
      {isDark ? <Sun className="mr-2 h-4 w-4 text-amber-500" /> : <Moon className="mr-2 h-4 w-4" />}
      {isDark ? 'Tema claro' : 'Tema oscuro'}
    </Button>
  )
}
