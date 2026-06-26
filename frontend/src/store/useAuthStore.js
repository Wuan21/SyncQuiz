import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMe, logout as apiLogout } from '../api/auth.api'

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
        const { user, accessToken, refreshToken } = data
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ user, accessToken, refreshToken })
      },

      logout: async () => {
        try { await apiLogout() } catch (_) {}
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      loadUser: async () => {
        set({ isLoading: true })
        try {
          const user = await getMe()
          set({ user })
        } catch (_) {
          set({ user: null })
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
