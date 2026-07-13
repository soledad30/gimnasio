/**
 * Captura pantallas del dashboard y reportes para documentación.
 * Uso: node scripts/capture_dashboard_screenshots.mjs
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../../docs/assets/screenshots')
const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:8000/api/v1'
const ADMIN_EMAIL = 'admin@gympro.com'
const ADMIN_PASSWORD = 'admin123'

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('#email', ADMIN_EMAIL)
  await page.fill('#password', ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL(/\/admin/, { timeout: 15000 })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-BO',
  })
  const page = await context.newPage()

  try {
    await login(page)

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await page.screenshot({
      path: path.join(OUT_DIR, 'gympro-dashboard-tiempo-real.png'),
      fullPage: true,
    })

    await page.goto(`${BASE_URL}/admin/reportes`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(4000)
    await page.screenshot({
      path: path.join(OUT_DIR, 'gympro-reportes-graficos.png'),
      fullPage: true,
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({
      path: path.join(OUT_DIR, 'gympro-reportes-kpis.png'),
      fullPage: false,
    })

    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    if (!token) throw new Error('No se obtuvo access_token')

    const now = new Date()
    const fechaFin = now.toISOString().slice(0, 10)
    const fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    const res = await fetch(
      `${API_URL}/reportes/export/accesos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`Export CSV falló: ${res.status}`)
    const csvText = await res.text()
    await writeFile(path.join(OUT_DIR, 'gympro-export-accesos.csv'), csvText, 'utf8')

    const exportCard = page.locator('text=Exportar CSV').first().locator('xpath=ancestor::div[contains(@class,"rounded")]').first()
    await exportCard.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await exportCard.screenshot({
      path: path.join(OUT_DIR, 'gympro-exportar-csv-ui.png'),
    })

    const previewHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Segoe UI,Arial,sans-serif;margin:24px;background:#f8fafc}
      h1{font-size:18px;color:#0f172a;margin-bottom:12px}
      .meta{color:#64748b;font-size:13px;margin-bottom:16px}
      pre{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;overflow:auto;font-size:12px;line-height:1.5;max-height:80vh}
    </style></head><body>
      <h1>GymPro — Exportación CSV de accesos</h1>
      <p class="meta">Período: ${fechaInicio} a ${fechaFin} · Archivo: gympro-export-accesos.csv</p>
      <pre>${csvText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 5000)}</pre>
    </body></html>`
    const previewPath = path.join(OUT_DIR, '_csv_preview.html')
    await writeFile(previewPath, previewHtml, 'utf8')
    await page.goto(`file:///${previewPath.replace(/\\/g, '/')}`)
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(OUT_DIR, 'gympro-export-accesos-csv.png'),
      fullPage: true,
    })

    console.log('OK:', OUT_DIR)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
