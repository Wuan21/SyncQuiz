import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { register as apiRegister } from '../../api/auth.api'
import useAuthStore from '../../store/useAuthStore'

const isCognitoEnabled = !!(
  import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID &&
  import.meta.env.VITE_AWS_COGNITO_CLIENT_ID
)

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const loginSuccess = useAuthStore((s) => s.loginSuccess)
  const navigate = useNavigate()

  const [step, setStep] = useState('signup')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpUsername, setSignUpUsername] = useState('')
  const [code, setCode] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (data) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      if (isCognitoEnabled) {
        const { signUp } = await import('aws-amplify/auth')
        setSignUpEmail(data.email)
        const safeUsername = data.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now()
        setSignUpUsername(safeUsername)
        const signUpResult = await signUp({
          username: safeUsername,
          password: data.password,
          options: {
            userAttributes: {
              email: data.email,
              name: data.fullName,
              phone_number: data.phone,
            }
          }
        })

        if (signUpResult.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          setStep('confirm')
          toast.success(t('auth.verificationSent'))
        } else {
          toast.success(t('auth.signupSuccess'))
          navigate('/login')
        }
      } else {
        const res = await apiRegister({ email: data.email, password: data.password, fullName: data.fullName })
        loginSuccess(res)
        toast.success(t('auth.signupSuccess'))
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!code) return toast.error('Please enter the verification code')
    setIsConfirming(true)
    try {
      const { confirmSignUp } = await import('aws-amplify/auth')
      await confirmSignUp({ username: signUpUsername, confirmationCode: code })
      toast.success(t('auth.verificationSuccess'))
      navigate('/login')
    } catch (err) {
      toast.error(err.message || t('common.error'))
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="min-h-screen sq-bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 sq-bg-primary-soft rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 sq-bg-accent-soft rounded-full blur-3xl opacity-60" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 sq-animate-fade-in">
          <div className="w-14 h-14 rounded-2xl sq-bg-gradient-primary flex items-center justify-center shadow-xl mb-4">
            <Zap size={26} className="sq-text-white" />
          </div>
          <h1 className="text-2xl font-bold sq-text-gradient">SyncQuiz</h1>
          <p className="sq-text-muted text-sm mt-1">
            {step === 'signup' ? t('auth.signupHeader') : 'Verify Account'}
          </p>
        </div>

        <div className="sq-card sq-animate-fade-up">
          {step === 'signup' ? (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Full name */}
                <div className="sq-form-group">
                  <label className="sq-label">{t('auth.fullName')}</label>
                  <input
                    {...register('fullName', {
                      required: t('auth.requiredName'),
                      maxLength: { value: 100, message: 'Max 100 characters' }
                    })}
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    className="sq-input"
                  />
                  {errors.fullName && <p className="sq-error">{errors.fullName.message}</p>}
                </div>

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

                {/* Phone */}
                <div className="sq-form-group">
                  <label className="sq-label">Số điện thoại</label>
                  <input
                    {...register('phone', {
                      required: 'Vui lòng nhập số điện thoại',
                      pattern: {
                        value: /^\+[1-9]\d{7,14}$/,
                        message: 'Định dạng quốc tế, ví dụ: +84912345678'
                      }
                    })}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+84912345678"
                    className="sq-input"
                  />
                  {errors.phone && <p className="sq-error">{errors.phone.message}</p>}
                </div>

                {/* Password */}
                <div className="sq-form-group">
                  <label className="sq-label">{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      {...register('password', {
                        required: t('auth.requiredPassword'),
                        minLength: { value: 8, message: 'Min 8 characters' }
                      })}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min 8 characters"
                      className="sq-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 sq-text-muted hover:sq-text-foreground transition-colors"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="sq-error">{errors.password.message}</p>}
                </div>

                {/* Confirm password */}
                <div className="sq-form-group">
                  <label className="sq-label">{t('auth.confirmPassword')}</label>
                  <div className="relative">
                    <input
                      {...register('confirm', {
                        required: t('auth.requiredConfirmPassword'),
                        validate: (v) => v === watch('password') || t('auth.passwordMismatch'),
                      })}
                      type={showConfirmPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="sq-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 sq-text-muted hover:sq-text-foreground transition-colors"
                      aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="sq-error">{errors.confirm.message}</p>}
                </div>

                <button type="submit" disabled={isLoading} className="sq-btn sq-btn-primary w-full py-3 mt-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('auth.signingUp')}
                    </>
                  ) : (
                    t('auth.signUpBtn')
                  )}
                </button>
              </form>

              <div className="sq-divider my-5" />

              <p className="text-center text-sm sq-text-muted">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login" className="sq-text-primary font-medium hover:sq-text-primary-light transition-colors">
                  {t('auth.logInLink')}
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full sq-bg-primary-soft flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📧</span>
                </div>
                <p className="text-sm sq-text-muted">
                  Nhập mã xác minh đã gửi đến <strong className="sq-text-foreground">{signUpEmail}</strong>
                </p>
              </div>

              <form onSubmit={handleConfirm} className="space-y-4">
                <div className="sq-form-group">
                  <label className="sq-label">Mã xác minh</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6 chữ số"
                    className="sq-input text-center text-xl tracking-[0.3em] font-mono"
                    maxLength={10}
                    required
                  />
                </div>

                <button type="submit" disabled={isConfirming} className="sq-btn sq-btn-primary w-full py-3 mt-2">
                  {isConfirming ? (
                    <>
                      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang xác minh...
                    </>
                  ) : (
                    'Xác minh email'
                  )}
                </button>
              </form>

              <button
                onClick={() => setStep('signup')}
                className="text-center text-sm sq-text-primary hover:sq-text-primary-light w-full mt-4 block transition-colors"
              >
                ← Quay lại đăng ký
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}