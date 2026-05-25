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
        <Button type="button" variant="secondary" size="sm" onClick={onView}>
          <Eye className="h-4 w-4 shrink-0" />
          Ver
        </Button>
      )}
      {onEdit && (
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 shrink-0" />
          Editar
        </Button>
      )}
      {onDelete && (
        <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 shrink-0" />
          Eliminar
        </Button>
      )}
    </div>
  )
}
