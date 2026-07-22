import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMe, logout as apiLogout, syncUser } from '../api/auth.api'

const isCognitoEnabled = !!(
  import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_AWS_COGNITO_CLIENT_ID
)

// Cache Cognito auth module
let cachedCognitoAuth = null
let cognitoImportPromise = null

async function getCognitoAuth() {
  if (cachedCognitoAuth) return cachedCognitoAuth
  if (cognitoImportPromise) return cognitoImportPromise

  cognitoImportPromise = import('aws-amplify/auth')
    .then((module) => {
      cachedCognitoAuth = module
      return module
    })
    .catch(() => null)

  return cognitoImportPromise
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken || '')
        localStorage.setItem('refreshToken', refreshToken || '')
        set({ accessToken, refreshToken })
      },

      setUser: (user) => {
        if (!user) return
        set({ user })
      },

      loginSuccess: (data) => {
        if (!data) return

        if (!isCognitoEnabled) {
          const user = data.user || data.data?.user || data
          const accessToken = data.accessToken || data.data?.accessToken || null
          const refreshToken = data.refreshToken || data.data?.refreshToken || null

          if (accessToken) localStorage.setItem('accessToken', accessToken)
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken)

          set({ user, accessToken, refreshToken })
          return
        }

        set({ user: data })
      },

      logout: async () => {
        if (isCognitoEnabled) {
          try {
            const { signOut } = await getCognitoAuth()
            if (signOut) await signOut()
          } catch (_) {}
        } else {
          try { await apiLogout() } catch (_) {}
        }
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('auth')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      loadUser: async () => {
        // Prevent duplicate loading
        if (get().isLoading) return
        if (isCognitoEnabled && !import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID) return

        set({ isLoading: true })
        try {
          if (isCognitoEnabled) {
            const { fetchAuthSession } = await getCognitoAuth()
            if (!fetchAuthSession) {
              set({ user: null, accessToken: null, refreshToken: null })
              return
            }

            const session = await fetchAuthSession()
            const token =
              session.tokens?.idToken?.toString() ||
              session.tokens?.accessToken?.toString()

            if (!token) {
              set({ user: null, accessToken: null, refreshToken: null })
              return
            }
            localStorage.setItem('accessToken', token)

            const user = await syncUser()
            set({ user, accessToken: token })
          } else {
            // For non-Cognito, only load if we have a token
            const token = localStorage.getItem('accessToken')
            if (!token) {
              set({ user: null, accessToken: null, refreshToken: null })
              return
            }

            const user = await getMe()
            set({ user })
          }
        } catch (_) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('auth')
          set({ user: null, accessToken: null, refreshToken: null })
        } finally {
          set({ isLoading: false })
        }
      },

      isAuthenticated: () => !!get().user,
    }),
    {
      name: 'auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
    },
  ),
)

export default useAuthStore
