import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/useAuthStore'

export default function ConfirmSignUpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const confirmSignUp = useAuthStore((s) => s.confirmSignUp)
  const resendConfirmationCode = useAuthStore((s) => s.resendConfirmationCode)
  const pendingConfirmationEmail = useAuthStore((s) => s.pendingConfirmationEmail)

  const initialEmail = location.state?.email || pendingConfirmationEmail || ''
  const initialPassword = location.state?.password || ''

  const { register, handleSubmit, getValues, formState: { isSubmitting } } = useForm({
    defaultValues: {
      email: initialEmail,
      code: '',
      password: initialPassword,
    },
  })

  const onSubmit = async ({ email, code, password }) => {
    try {
      await confirmSignUp({ email, code, password })
      toast.success('Xac nhan tai khoan thanh cong')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Khong the xac nhan tai khoan')
    }
  }

  const handleResend = async () => {
    const email = getValues('email')
    if (!email) {
      toast.error('Nhap email de gui lai ma xac nhan')
      return
    }

    try {
      await resendConfirmationCode(email)
      toast.success('Da gui lai ma xac nhan')
    } catch (err) {
      toast.error(err.message || 'Khong the gui lai ma')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="text-violet-400" size={32} />
          <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            SyncQuiz
          </span>
        </div>

        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-3">Xac nhan tai khoan</h1>
          <p className="text-center text-white/50 text-sm mb-6">
            Nhap ma xac nhan AWS Cognito da gui toi email cua ban.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Email</label>
              <input
                {...register('email', { required: true })}
                type="email"
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Ma xac nhan</label>
              <input
                {...register('code', { required: true })}
                className="input"
                placeholder="123456"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Mat khau</label>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="Nhap lai mat khau de dang nhap tu dong"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
              {isSubmitting ? 'Dang xac nhan...' : 'Xac nhan tai khoan'}
            </button>
          </form>

          <button onClick={handleResend} className="btn-secondary w-full mt-3">
            Gui lai ma xac nhan
          </button>

          <p className="text-center text-white/50 text-sm mt-4">
            <Link to="/login" className="text-violet-400 hover:underline">Quay lai dang nhap</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
