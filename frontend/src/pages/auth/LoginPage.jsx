import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/useAuthStore'

export default function LoginPage() {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    try {
      await login(data)
      navigate('/dashboard')
    } catch (err) {
      const message = err.message || err.response?.data?.message || t('common.error')
      if (message.includes('UserNotConfirmedException')) {
        toast.error('Tai khoan chua duoc xac nhan. Vui long nhap ma xac nhan.')
        navigate('/confirm-signup', { state: { email: data.email, password: data.password } })
        return
      }
      toast.error(message)
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
