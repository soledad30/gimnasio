# Backup trimestral: PostgreSQL (pg_dump) + carpeta uploads/ → ZIP
# Uso:
#   .\scripts\backup_gym.ps1
#   .\scripts\backup_gym.ps1 -DriveCopyPath "G:\Mi unidad\Backups-Gimnasio"
#   .\scripts\backup_gym.ps1 -BackupRoot "D:\Backups\gimnasio" -KeepLast 4

param(
    [string]$BackupRoot = "",
    [string]$DriveCopyPath = "",
    [int]$KeepLast = 4
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectRoot ".env"
$UploadsDir = Join-Path $ProjectRoot "uploads"

function Get-EnvValue {
    param([string]$Key, [string]$Default = "")
    if (-not (Test-Path $EnvFile)) { return $Default }
    foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
            $value = $Matches[1].Trim().Trim('"').Trim("'")
            if ($value) { return $value }
        }
    }
    return $Default
}

function Find-PgDump {
    $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($version in @(17, 16, 15, 14)) {
        $candidate = "C:\Program Files\PostgreSQL\$version\bin\pg_dump.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    throw "No se encontró pg_dump. Instalá PostgreSQL o agregá su carpeta bin al PATH."
}

if (-not $BackupRoot) {
    $BackupRoot = Get-EnvValue "BACKUP_ROOT" "$(Join-Path $env:USERPROFILE 'Documents\Backups\gimnasio')"
}
if (-not $DriveCopyPath) {
    $DriveCopyPath = Get-EnvValue "BACKUP_DRIVE_PATH" ""
}

$pgHost = Get-EnvValue "POSTGRES_HOST" "localhost"
$pgPort = Get-EnvValue "POSTGRES_PORT" "5432"
$pgDb = Get-EnvValue "POSTGRES_DB" "gymdb"
$pgUser = Get-EnvValue "POSTGRES_USER" "gymuser"
$pgPassword = Get-EnvValue "POSTGRES_PASSWORD" ""

if (-not $pgPassword) {
    throw "POSTGRES_PASSWORD no está definido en $EnvFile"
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$workDir = Join-Path $env:TEMP "gym_backup_$timestamp"
$zipName = "gym_backup_$timestamp.zip"
$zipPath = Join-Path $BackupRoot $zipName

New-Item -ItemType Directory -Force -Path $workDir | Out-Null
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

Write-Host "==> Backup GymPro ($timestamp)"
Write-Host "    Origen BD : $pgUser@$pgHost`:$pgPort/$pgDb"
Write-Host "    Destino   : $zipPath"

$pgDump = Find-PgDump
$dumpFile = Join-Path $workDir "gymdb.dump"
$env:PGPASSWORD = $pgPassword

try {
    & $pgDump -h $pgHost -p $pgPort -U $pgUser -d $pgDb -F c -f $dumpFile
    if ($LASTEXITCODE -ne 0) { throw "pg_dump falló con código $LASTEXITCODE" }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

if (Test-Path $UploadsDir) {
    Copy-Item -Recurse -Force $UploadsDir (Join-Path $workDir "uploads")
    Write-Host "    uploads/  : incluido"
} else {
    Write-Host "    uploads/  : carpeta no existe, se omite"
}

@{
    created_at = (Get-Date).ToString("o")
    postgres_host = $pgHost
    postgres_db = $pgDb
    postgres_user = $pgUser
    project_root = $ProjectRoot
    restore_hint = "Ver gimnasio_back/scripts/BACKUP.md"
} | ConvertTo-Json | Set-Content -Path (Join-Path $workDir "manifest.json") -Encoding UTF8

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $workDir "*") -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -Recurse -Force $workDir

$zipSizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "    ZIP listo : $zipSizeMb MB"

if ($DriveCopyPath) {
    New-Item -ItemType Directory -Force -Path $DriveCopyPath | Out-Null
    $driveDest = Join-Path $DriveCopyPath $zipName
    Copy-Item -Force $zipPath $driveDest
    Write-Host "    Copiado a : $driveDest"
}

$existing = Get-ChildItem -Path $BackupRoot -Filter "gym_backup_*.zip" |
    Sort-Object LastWriteTime -Descending
if ($existing.Count -gt $KeepLast) {
    $toDelete = $existing | Select-Object -Skip $KeepLast
    foreach ($old in $toDelete) {
        Remove-Item -Force $old.FullName
        Write-Host "    Eliminado : $($old.Name) (retención: $KeepLast)"
    }
}

Write-Host "==> Backup completado."
