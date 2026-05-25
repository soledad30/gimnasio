type DetailItem = { label: string; value: React.ReactNode }

export function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm font-medium">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
