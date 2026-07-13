import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { AppRoutes } from '@/routes/AppRoutes'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster richColors position="top-right" theme={theme} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <ThemedToaster />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
