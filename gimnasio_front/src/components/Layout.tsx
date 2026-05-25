import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/AppSidebar'

export function Layout({ variant }: { variant: 'admin' | 'student' }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar variant={variant} />
      <main className="pl-64">
        <div className="mx-auto max-w-6xl p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
