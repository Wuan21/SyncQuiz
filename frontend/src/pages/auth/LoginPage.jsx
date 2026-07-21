import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { login, syncUser } from '../../api/auth.api'
import useAuthStore from '../../store/useAuthStore'
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth'

const isCognitoEnabled = !!(
  import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_AWS_COGNITO_CLIENT_ID
)

export default function LoginPage() {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const loginSuccess = useAuthStore((s) => s.loginSuccess)
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)

  const onSubmit = async (data) => {
    try {
      if (isCognitoEnabled) {
        try { await signOut() } catch (_) {}
        try {
          await signIn({ username: data.email, password: data.password })
        } catch (authErr) {
          if (authErr?.message?.includes('already a signed in user')) {
            await signOut()
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('CognitoIdentityServiceProvider')) {
                localStorage.removeItem(key)
              }
            })
            await signIn({ username: data.email, password: data.password })
          } else { throw authErr }
        }
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString()
        if (token) { localStorage.setItem('accessToken', token) }
        const user = await syncUser()
        loginSuccess(user)
        navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
      } else {
        const res = await login(data)
        loginSuccess(res)
        navigate(res?.user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
      }
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || t('common.error'))
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] bg-[hsl(var(--color-primary))]/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] bg-[hsl(var(--color-accent))]/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 sq-animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-accent))] flex items-center justify-center shadow-xl mb-4">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold sq-text-gradient">SyncQuiz</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('auth.loginHeader')}</p>
        </div>

        <div className="sq-card sq-animate-fade-up">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="sq-form-group">
              <label className="sq-label">{t('auth.email')}</label>
              <input
                {...register('email', { required: t('auth.requiredEmail') })}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="sq-input"
              />
              {errors.email && <p className="sq-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="sq-form-group">
              <label className="sq-label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  {...register('password', { required: t('auth.requiredPassword') })}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="sq-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="sq-error">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="sq-btn sq-btn-primary w-full py-3 mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('auth.signingIn')}
                </>
              ) : t('auth.signInBtn')}
            </button>
          </form>

          <hr className="sq-divider my-5" />

          <p className="text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary font-semibold hover:text-[hsl(var(--color-primary-light))] transition-colors">
              {t('auth.signUpFree')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
