import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RowActionsProps = {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  extra?: React.ReactNode
}

export function RowActions({ onView, onEdit, onDelete, extra }: RowActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {extra}
      {onView && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={onView}
          title="Ver"
          aria-label="Ver"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {onEdit && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          title="Editar"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={onDelete}
          title="Eliminar"
          aria-label="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
