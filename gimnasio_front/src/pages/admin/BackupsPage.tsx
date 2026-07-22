import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileArchive,
  HardDrive,
  Image,
  Loader2,
  Shield,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { backupsApi } from '@/api/services'
import { getErrorMessage } from '@/api/client'
import type { BackupCreateRequest, BackupInfo } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadBlob } from '@/lib/download'
import { cn } from '@/lib/utils'

const DEFAULT_BACKUP_OPTIONS: BackupCreateRequest = {
  include_database: true,
  include_uploads: true,
}

function buildBackupSteps(options: BackupCreateRequest) {
  const steps: { id: number; label: string; icon: typeof Database }[] = []
  let id = 1
  if (options.include_database) {
    steps.push({ id: id++, label: 'Exportando base de datos', icon: Database })
  }
  if (options.include_uploads) {
    steps.push({ id: id++, label: 'Incluyendo fotos y documentos', icon: Image })
  }
  steps.push({ id: id++, label: 'Comprimiendo archivo ZIP', icon: Archive })
  steps.push({ id: id++, label: 'Guardando en el servidor', icon: HardDrive })
  return steps
}

function backupContentLabel(row: BackupInfo) {
  if (row.include_database && row.include_uploads) return 'BD + archivos'
  if (row.include_database) return 'Solo base de datos'
  return 'Solo archivos'
}

function formatFecha(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatFechaCorta(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'long' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function BackupProgressDialog({
  open,
  options,
}: {
  open: boolean
  options: BackupCreateRequest
}) {
  const [step, setStep] = useState(0)
  const steps = useMemo(() => buildBackupSteps(options), [options])

  useEffect(() => {
    if (!open) {
      setStep(0)
      return
    }
    const timer = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s))
    }, 1800)
    return () => clearInterval(timer)
  }, [open, steps.length])

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Generando respaldo
          </DialogTitle>
          <DialogDescription>
            No cierres esta ventana. El proceso puede tardar unos segundos según el tamaño de los
            datos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {steps.map((item, index) => {
            const done = index < step
            const active = index === step
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  done && 'border-primary/30 bg-primary/5',
                  active && 'border-primary/50 bg-primary/10',
                  !done && !active && 'border-border opacity-50'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className={cn('text-sm', active && 'font-medium')}>{item.label}</span>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BackupRow({
  row,
  downloading,
  disabled,
  onDownload,
  onDelete,
}: {
  row: BackupInfo
  downloading: boolean
  disabled: boolean
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileArchive className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.filename}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {formatFecha(row.created_at)}
            </span>
            <span>·</span>
            <span>{row.size_mb} MB</span>
            {row.created_by && (
              <>
                <span>·</span>
                <span>{row.created_by}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge variant="outline" className="text-[11px]">
              {backupContentLabel(row)}
            </Badge>
            {row.drive_copied ? (
              <Badge variant="success" className="gap-1 text-[11px]">
                <Cloud className="h-3 w-3" />
                En Google Drive
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
                <CloudOff className="h-3 w-3" />
                Solo en servidor
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={downloading || disabled}
          onClick={onDownload}
          className="flex-1 sm:flex-none"
        >
          {downloading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          Descargar
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          disabled={disabled}
          onClick={onDelete}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function BackupsPage() {
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [backupOptions, setBackupOptions] = useState<BackupCreateRequest>(DEFAULT_BACKUP_OPTIONS)
  const [activeOptions, setActiveOptions] = useState<BackupCreateRequest>(DEFAULT_BACKUP_OPTIONS)
  const [deleteFile, setDeleteFile] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const openCreateDialog = () => {
    setBackupOptions(DEFAULT_BACKUP_OPTIONS)
    setConfirmOpen(true)
  }

  const toggleOption = (key: keyof BackupCreateRequest) => {
    setBackupOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (!next.include_database && !next.include_uploads) return prev
      return next
    })
  }

  const canCreate = backupOptions.include_database || backupOptions.include_uploads

  const { data = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => backupsApi.list().then((r) => r.data),
  })

  const stats = useMemo(() => {
    const totalMb = data.reduce((acc, b) => acc + b.size_mb, 0)
    const driveCount = data.filter((b) => b.drive_copied).length
    const latest = data[0] ?? null
    return {
      count: data.length,
      totalMb: Math.round(totalMb * 100) / 100,
      driveCount,
      latest,
    }
  }, [data])

  const createMut = useMutation({
    mutationFn: (options: BackupCreateRequest) => backupsApi.create(options).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['backups'] })
      setConfirmOpen(false)
      toast.success(res.message || 'Respaldo creado correctamente', {
        description: res.drive_copied
          ? 'Copiado al servidor y a Google Drive'
          : 'Disponible para descargar desde el historial',
      })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (filename: string) => backupsApi.delete(filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backups'] })
      setDeleteFile(null)
      toast.success('Respaldo eliminado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const handleDownload = async (row: BackupInfo) => {
    setDownloading(row.filename)
    try {
      const { data: blob } = await backupsApi.download(row.filename)
      downloadBlob(blob, row.filename)
      toast.success('Descarga iniciada')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Respaldos</h1>
        
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total respaldos</CardTitle>
            <Archive className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <p className="text-3xl font-bold text-primary">{stats.count}</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Último respaldo</CardTitle>
            <CalendarClock className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : stats.latest ? (
              <p className="text-sm font-semibold leading-tight">
                {formatFechaCorta(stats.latest.created_at)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin respaldos</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Espacio usado</CardTitle>
            <HardDrive className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-3xl font-bold text-violet-500">{stats.totalMb} MB</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Google Drive</CardTitle>
            <Cloud className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <p className="text-3xl font-bold text-amber-500">{stats.driveCount}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hero CTA */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <CardContent className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Nuevo respaldo del sistema</h2>
                <p className="text-sm text-muted-foreground">
                  Recomendado cada 3 meses · Incluye todo lo esencial
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Database, label: 'Base de datos' },
                { icon: Image, label: 'Fotos y fichas' },
                { icon: FileArchive, label: 'Archivo ZIP' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <Button
            size="lg"
            className="h-12 shrink-0 px-8 text-base shadow-lg shadow-primary/20"
            disabled={createMut.isPending}
            onClick={openCreateDialog}
          >
            {createMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <Archive className="mr-2 h-5 w-5" />
                Generar respaldo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <Cloud className="h-4 w-4" />
        <AlertDescription>
          Los respaldos se guardan en el servidor. Podés <strong>descargarlos</strong> para subirlos
          manualmente a tu Drive empresarial, o configurar la copia automática en el servidor (Google
          Drive para escritorio).
        </AlertDescription>
      </Alert>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de respaldos</CardTitle>
          <CardDescription>
            {data.length === 0
              ? 'Todavía no hay respaldos registrados.'
              : `${data.length} archivo(s) disponible(s) en el servidor`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <FileArchive className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No hay respaldos todavía</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Creá el primer respaldo para proteger estudiantes, pagos, accesos y archivos del
                gimnasio.
              </p>
              <Button className="mt-6" onClick={openCreateDialog}>
                <Archive className="mr-2 h-4 w-4" />
                Crear primer respaldo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((row) => (
                <BackupRow
                  key={row.filename}
                  row={row}
                  downloading={downloading === row.filename}
                  disabled={createMut.isPending}
                  onDownload={() => handleDownload(row)}
                  onDelete={() => setDeleteFile(row.filename)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmar creación */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setBackupOptions(DEFAULT_BACKUP_OPTIONS)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Generar nuevo respaldo?</DialogTitle>
            
          </DialogHeader>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => toggleOption('include_database')}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                backupOptions.include_database
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                  backupOptions.include_database
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                )}
              >
                {backupOptions.include_database && <CheckCircle2 className="h-3.5 w-3.5" />}
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <Database className="h-4 w-4 text-primary" />
                  Base de datos
                </p>
                <p className="text-sm text-muted-foreground">
                  Estudiantes, pagos, accesos, inscripciones y datos del sistema.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => toggleOption('include_uploads')}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                backupOptions.include_uploads
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                  backupOptions.include_uploads
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                )}
              >
                {backupOptions.include_uploads && <CheckCircle2 className="h-3.5 w-3.5" />}
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <Image className="h-4 w-4 text-primary" />
                  Fotos y documentos
                </p>
                <p className="text-sm text-muted-foreground">
                  Imágenes de máquinas, instructores, ejercicios y fichas en PDF.
                </p>
              </div>
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Debe quedar al menos una opción seleccionada.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setActiveOptions(backupOptions)
                createMut.mutate(backupOptions)
              }}
              disabled={createMut.isPending || !canCreate}
            >
              {createMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              Confirmar y generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackupProgressDialog open={createMut.isPending} options={activeOptions} />

      <DeleteConfirmDialog
        open={!!deleteFile}
        onOpenChange={(open) => !open && setDeleteFile(null)}
        title="Eliminar respaldo"
        description={`¿Eliminar ${deleteFile}? Esta acción no se puede deshacer.`}
        onConfirm={() => deleteFile && deleteMut.mutate(deleteFile)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
