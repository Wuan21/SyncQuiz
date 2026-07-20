import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { login, syncUser } from '../../api/auth.api'
import useAuthStore from '../../store/useAuthStore'
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth'

const isCognitoEnabled = !!(import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID && import.meta.env.VITE_AWS_COGNITO_CLIENT_ID)

export default function LoginPage() {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const loginSuccess = useAuthStore((s) => s.loginSuccess)
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    try {
      if (isCognitoEnabled) {
        // Clear any stale session before signing in
        try { await signOut() } catch (_) {}
        await signIn({ username: data.email, password: data.password })
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString()
        if (token) {
          localStorage.setItem('accessToken', token)
        }
        const user = await syncUser()
        loginSuccess(user)
      } else {
        const res = await login(data)
        loginSuccess(res)
      }
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || t('common.error'))
    }
  }


  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="text-violet-400" size={32} />
          <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            SyncQuiz
          </span>
        </div>

        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-6">{t('auth.loginHeader')}</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">{t('auth.email')}</label>
              <input
                {...register('email', { required: t('auth.requiredEmail') })}
                type="email"
                placeholder="you@example.com"
                className="input"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">{t('auth.password')}</label>
              <input
                {...register('password', { required: t('auth.requiredPassword') })}
                type="password"
                placeholder="••••••••"
                className="input"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
              {isSubmitting ? t('auth.signingIn') : t('auth.signInBtn')}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-4">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-violet-400 hover:underline">{t('auth.signUpFree')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
