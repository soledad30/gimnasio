# Backup trimestral — GymPro

Respaldo de **PostgreSQL** + carpeta **`uploads/`** en un archivo ZIP. Frecuencia recomendada: **cada 3 meses** (enero, abril, julio, octubre).

## Desde el software (admin)

1. Iniciá sesión como **administrador**
2. Menú lateral → **Respaldos** (`/admin/backups`)
3. **Crear backup** → genera el ZIP en el servidor
4. **Descargar** → bajá el ZIP a tu PC o subilo a Drive empresarial
5. El historial muestra fecha, tamaño, quién lo creó y si se copió al Drive

## Qué incluye el ZIP

| Contenido | Descripción |
|-----------|-------------|
| `gymdb.dump` | Base de datos completa (estudiantes, pagos, accesos, embeddings faciales, etc.) |
| `uploads/` | Fotos y documentos subidos por la API |
| `manifest.json` | Fecha y metadatos del backup |

## Configuración rápida (Windows)

### 1. Variables opcionales en `.env`

```env
# Carpeta local donde se guardan los ZIP (por defecto: Documents\Backups\gimnasio)
BACKUP_ROOT=C:\Backups\gimnasio

# Carpeta de Google Drive empresarial (opcional, copia automática del ZIP)
BACKUP_DRIVE_PATH=G:\Mi unidad\Backups-Gimnasio
```

> La ruta de Drive suele ser `G:\Mi unidad\...` si tenés **Google Drive para escritorio** instalado. Creá la carpeta `Backups-Gimnasio` en tu Drive y copiá la ruta desde el Explorador de archivos.

### 2. Ejecutar manualmente

Desde `gimnasio_back/`:

```powershell
.\scripts\backup_gym.ps1
```

Con copia directa al Drive:

```powershell
.\scripts\backup_gym.ps1 -DriveCopyPath "G:\Mi unidad\Backups-Gimnasio"
```

El ZIP queda en `BACKUP_ROOT` (descargable desde ahí). Si configurás `BACKUP_DRIVE_PATH`, también se copia al Drive.

### 3. Programar cada 3 meses (Task Scheduler)

1. Abrí **Programador de tareas** → **Crear tarea básica**
2. Nombre: `GymPro Backup Trimestral`
3. Desencadenador: **Mensual** → día **1** → meses **enero, abril, julio, octubre** → hora **02:00**
4. Acción: **Iniciar un programa**
   - Programa: `powershell.exe`
   - Argumentos:

   ```
   -NoProfile -ExecutionPolicy Bypass -File "C:\ruta\completa\ginmasio\gimnasio_back\scripts\backup_gym.ps1"
   ```

5. Marcar **Ejecutar con los privilegios más altos** si PostgreSQL lo requiere
6. En **Condiciones**, desmarcar “Iniciar solo si el equipo está conectado a la corriente” si es una laptop

### 4. Retención

Por defecto se conservan los **últimos 4 ZIP** (~1 año con frecuencia trimestral). Cambiá con:

```powershell
.\scripts\backup_gym.ps1 -KeepLast 6
```

## Google Drive empresarial

Dos formas válidas (podés usar ambas):

1. **Automática**: `BACKUP_DRIVE_PATH` en `.env` → el script copia el ZIP al sincronizar Drive
2. **Manual**: después del backup, subí el ZIP desde `BACKUP_ROOT` a una carpeta compartida del Drive (útil si no tenés Drive para escritorio)

Recomendación: carpeta dedicada `Backups-Gimnasio` con acceso solo para administradores del gimnasio.

## Restaurar desde un ZIP

### 1. Descomprimir

```powershell
Expand-Archive -Path "C:\Backups\gimnasio\gym_backup_2026-01-01_0200.zip" -DestinationPath "C:\Temp\gym_restore"
```

### 2. Restaurar base de datos

Creá una BD de prueba primero (no sobrescribas producción sin verificar):

```powershell
$env:PGPASSWORD = "tu_password"
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -h localhost -U gymuser gymdb_restaurada
& "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" -h localhost -U gymuser -d gymdb_restaurada -c "C:\Temp\gym_restore\gymdb.dump"
```

Si todo está bien, repetí sobre `gymdb` en ventana de mantenimiento.

### 3. Restaurar archivos

```powershell
Copy-Item -Recurse -Force "C:\Temp\gym_restore\uploads\*" "C:\ruta\ginmasio\gimnasio_back\uploads\"
```

### 4. Verificar

- Login admin en el frontend
- Revisar estudiantes, pagos y una foto en `uploads/`
- Probar un acceso NFC o facial de prueba

## Checklist trimestral

- [ ] Ejecutar `backup_gym.ps1` (o confirmar que corrió la tarea programada)
- [ ] Verificar que el ZIP existe y pesa más de 0 MB
- [ ] Confirmar copia en Drive empresarial
- [ ] Una vez al año: probar restauración en `gymdb_restaurada`

## Linux / macOS

```bash
chmod +x scripts/backup_gym.sh
./scripts/backup_gym.sh
```

Programar con `cron` (día 1 de ene/abr/jul/oct a las 02:00):

```cron
0 2 1 1,4,7,10 * /ruta/ginmasio/gimnasio_back/scripts/backup_gym.sh
```
