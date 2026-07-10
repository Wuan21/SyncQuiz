import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMe, logout as apiLogout, syncUser } from '../api/auth.api'
import { fetchAuthSession, signOut } from 'aws-amplify/auth'

const isCognitoEnabled = !!(import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID && import.meta.env.VITE_AWS_COGNITO_CLIENT_ID)

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ accessToken, refreshToken })
      },

      setUser: (user) => set({ user }),

      loginSuccess: (data) => {
        if (!isCognitoEnabled) {
          const { user, accessToken, refreshToken } = data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, refreshToken })
          return
        }
        set({ user: data })
      },

      logout: async () => {
        if (isCognitoEnabled) {
          try {
            await signOut()
          } catch (_) {}
        } else {
          try { await apiLogout() } catch (_) {}
        }
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      loadUser: async () => {
        set({ isLoading: true })
        try {
          if (isCognitoEnabled) {
            const session = await fetchAuthSession()
            const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString()
            if (!token) {
              set({ user: null, accessToken: null, refreshToken: null })
              return
            }
            localStorage.setItem('accessToken', token)
            const user = await syncUser()
            set({ user, accessToken: token })
          } else {
            const user = await getMe()
            set({ user })
          }
        } catch (_) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          set({ user: null, accessToken: null, refreshToken: null })
        } finally {
          set({ isLoading: false })
        }
      },

      isAuthenticated: () => !!get().user,
    }),
    {
      name: 'auth',
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
)

export default useAuthStore
