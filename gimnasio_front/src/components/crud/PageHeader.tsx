import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PageHeaderProps = {
  title: string
  description?: string
  onCreate?: () => void
  createLabel?: string
}

export function PageHeader({ title, description, onCreate, createLabel = 'Nuevo' }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {onCreate && (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {createLabel}
        </Button>
      )}
    </div>
  )
}
