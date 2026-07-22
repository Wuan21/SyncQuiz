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
      retry: 1,
      staleTime: 60_000,
      gcTime: 300_000,
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
