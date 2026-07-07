import { Amplify } from 'aws-amplify'
import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth'

let configured = false

export function configureCognito() {
  if (configured) return

  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
  const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID

  if (!userPoolId || !userPoolClientId) {
    console.warn('Cognito is not fully configured. Missing VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_CLIENT_ID.')
    return
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  })

  configured = true
}

configureCognito()

export async function registerWithCognito({ email, password, fullName }) {
  return signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name: fullName,
      },
    },
  })
}

export async function confirmCognitoSignUp({ email, code }) {
  return confirmSignUp({
    username: email,
    confirmationCode: code,
  })
}

export async function resendCognitoConfirmation(email) {
  return resendSignUpCode({ username: email })
}

export async function loginWithCognito({ email, password }) {
  return signIn({
    username: email,
    password,
  })
}

export async function logoutFromCognito() {
  return signOut()
}

export async function getAccessToken(options) {
  const session = await fetchAuthSession(options)
  return session.tokens?.accessToken?.toString() || null
}

export async function getIdToken(options) {
  const session = await fetchAuthSession(options)
  return session.tokens?.idToken?.toString() || null
}

export async function hasActiveSession() {
  try {
    const token = await getIdToken()
    return Boolean(token)
  } catch {
    return false
  }
}

export async function getCurrentCognitoUser() {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}
