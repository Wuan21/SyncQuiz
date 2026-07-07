import { create } from 'zustand'
import { getMe, logout as apiLogout } from '../api/auth.api'
import {
  confirmCognitoSignUp,
  getCurrentCognitoUser,
  hasActiveSession,
  getIdToken,
  loginWithCognito,
  logoutFromCognito,
  registerWithCognito,
  resendCognitoConfirmation,
} from '../lib/cognito'

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  initialized: false,
  pendingConfirmationEmail: null,

  setUser: (user) => set({ user }),
  setPendingConfirmationEmail: (email) => set({ pendingConfirmationEmail: email }),

  loadUser: async () => {
    set({ isLoading: true })
    try {
      const sessionExists = await hasActiveSession()
      if (!sessionExists) {
        set({ user: null, accessToken: null, initialized: true })
        return
      }

      const [user, accessToken] = await Promise.all([getMe(), getIdToken()])
      set({ user, accessToken, initialized: true })
    } catch (_) {
      set({ user: null, accessToken: null, initialized: true })
    } finally {
      set({ isLoading: false })
    }
  },

  login: async ({ email, password }) => {
    const result = await loginWithCognito({ email, password })
    if (result.nextStep?.signInStep && result.nextStep.signInStep !== 'DONE') {
      throw new Error(`Unsupported Cognito sign-in step: ${result.nextStep.signInStep}`)
    }

    await get().loadUser()
    return get().user
  },

  register: async ({ email, password, fullName }) => {
    const result = await registerWithCognito({ email, password, fullName })
    set({ pendingConfirmationEmail: email })

    if (result.nextStep?.signUpStep === 'DONE') {
      await get().login({ email, password })
      set({ pendingConfirmationEmail: null })
      return { status: 'authenticated' }
    }

    return {
      status: result.nextStep?.signUpStep || 'CONFIRM_SIGN_UP',
      email,
    }
  },

  confirmSignUp: async ({ email, code, password }) => {
    await confirmCognitoSignUp({ email, code })
    set({ pendingConfirmationEmail: null })
    if (password) {
      await get().login({ email, password })
      return { status: 'authenticated' }
    }
    return { status: 'confirmed' }
  },

  resendConfirmationCode: async (email) => resendCognitoConfirmation(email),

  logout: async () => {
    try { await apiLogout() } catch (_) {}
    try { await logoutFromCognito() } catch (_) {}
    set({ user: null, accessToken: null, pendingConfirmationEmail: null, initialized: true })
  },

  refreshSessionState: async () => {
    const accessToken = await getIdToken({ forceRefresh: true })
    set({ accessToken: accessToken || null })
    return accessToken
  },

  isAuthenticated: () => !!get().user,
  hasSession: async () => {
    const user = await getCurrentCognitoUser()
    return Boolean(user)
  },
}))

export default useAuthStore
