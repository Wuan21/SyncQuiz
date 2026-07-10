import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Amplify } from 'aws-amplify'
import './index.css'
import './i18n'
import App from './App.jsx'

const userPoolId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID

if (userPoolId && userPoolClientId) {
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
} else {
  console.warn('[Amplify] Cognito env variables not found. Using local authentication fallback.')
}


const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e1b4b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
