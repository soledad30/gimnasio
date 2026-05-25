# GymPro — Frontend (React)

Panel web para el sistema de gestión del gimnasio. Conecta con el backend FastAPI en `gimnasio_back`.

## Requisitos

- Node.js 18+
- Backend corriendo en `http://127.0.0.1:8000`

## Instalación

```bash
cd gimnasio_front
npm install
cp .env.example .env
npm run dev
```

Abre http://localhost:5173

## Credenciales de prueba (admin)

- Email: `admin@gympro.com`
- Password: `admin123`

## UI (shadcn/ui + Tailwind)

- **Tailwind CSS** — utilidades y tema oscuro “gym” (verde + acento naranja)
- **shadcn/ui** — componentes en `src/components/ui/` (Button, Card, Dialog, Table…)
- **Lucide React** — iconos en sidebar y KPIs
- **Sonner** — notificaciones toast

Pantallas ya migradas al nuevo diseño: **Login**, **Layout/sidebar**, **Dashboard**, **Estudiantes**.  
El resto usa estilos de compatibilidad en `index.css` hasta migrarlas.

Añadir más componentes shadcn:

```bash
npx shadcn@latest add dropdown-menu
```

## Estructura

```
gimnasio_front/
├── src/
│   ├── api/              # Cliente HTTP y servicios
│   ├── components/
│   │   ├── ui/           # shadcn (Button, Card, Dialog…)
│   │   └── layout/       # AppSidebar
│   ├── context/          # Autenticación JWT
│   ├── lib/utils.ts      # cn() para clases Tailwind
│   ├── pages/
│   │   ├── admin/
│   │   └── student/
│   └── routes/
├── components.json       # Config shadcn
└── vite.config.ts        # Proxy /api → backend
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con hot reload |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa del build |
