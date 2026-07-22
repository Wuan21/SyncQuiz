import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './components/providers/ThemeProvider'
import './index.css'
import './i18n'
import App from './App.jsx'

const userPoolId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID

// Dynamic import aws-amplify only when Cognito is configured — saves ~1MB initial bundle
if (userPoolId && userPoolClientId) {
  import('aws-amplify').then(({ Amplify }) => {
    try {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId,
            signUpVerificationMethod: 'code',
          },
        },
      })
      console.log('[Amplify] AWS Cognito configured successfully.')
    } catch (err) {
      console.error('[Amplify] Configuration failed:', err)
    }
  }).catch((err) => {
    console.error('[Amplify] Dynamic import failed:', err)
  })
}

/* ── Prevent theme flash: set class on <html> before render ── */
const storedTheme = localStorage.getItem('syncquiz-theme')
const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
const initialTheme = storedTheme || (systemPrefersLight ? 'light' : 'dark')
document.documentElement.classList.add(initialTheme)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        // Retry network errors and 5xx up to 2 times
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 60_000,     // 1 minute
      gcTime: 300_000,       // 5 minutes garbage collection
      refetchOnWindowFocus: false, // Don't refetch on every window focus (saves server load)
      refetchOnReconnect: true,    // Refetch when coming back online
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--color-popover))',
              color: 'hsl(var(--color-popover-foreground))',
              border: '1px solid hsl(var(--color-border))',
              borderRadius: 'var(--radius)',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
