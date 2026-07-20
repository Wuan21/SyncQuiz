import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { register as apiRegister } from '../../api/auth.api'
import useAuthStore from '../../store/useAuthStore'
import { signUp, confirmSignUp } from 'aws-amplify/auth'

const isCognitoEnabled = !!(import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID && import.meta.env.VITE_AWS_COGNITO_CLIENT_ID)

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const loginSuccess = useAuthStore((s) => s.loginSuccess)
  const navigate = useNavigate()

  const [step, setStep] = useState('signup') // 'signup' | 'confirm'
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpUsername, setSignUpUsername] = useState('')
  const [code, setCode] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  const onSubmit = async (data) => {
    try {
      if (isCognitoEnabled) {
        setSignUpEmail(data.email)
        // Username cannot be email format when user pool has email alias enabled
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
          toast.success(t('auth.verificationSent', 'Verification code sent to your email!'))
        } else {
          toast.success(t('auth.signupSuccess', 'Account created!'))
          navigate('/login')
        }
      } else {
        const res = await apiRegister({ email: data.email, password: data.password, fullName: data.fullName })
        loginSuccess(res)
        toast.success(t('auth.signupSuccess', 'Account created!'))
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || t('common.error'))
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!code) return toast.error('Please enter the verification code')
    setIsConfirming(true)
    try {
      await confirmSignUp({ username: signUpUsername, confirmationCode: code })
      toast.success(t('auth.verificationSuccess', 'Verification successful! You can now log in.'))
      navigate('/login')
    } catch (err) {
      toast.error(err.message || t('common.error'))
    } finally {
      setIsConfirming(false)
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
          {step === 'signup' ? (
            <>
              <h1 className="text-2xl font-bold text-center mb-6">{t('auth.signupHeader')}</h1>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">{t('auth.fullName')}</label>
                  <input
                    {...register('fullName', { required: t('auth.requiredName'), maxLength: { value: 100, message: 'Max 100 chars' } })}
                    placeholder="Your name"
                    className="input"
                  />
                  {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
                </div>

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
                  <label className="block text-sm text-white/60 mb-1">Số điện thoại</label>
                  <input
                    {...register('phone', {
                      required: 'Vui lòng nhập số điện thoại',
                      pattern: {
                        value: /^\+[1-9]\d{7,14}$/,
                        message: 'Định dạng quốc tế, ví dụ: +84912345678'
                      }
                    })}
                    type="tel"
                    placeholder="+84912345678"
                    className="input"
                  />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">{t('auth.password')}</label>
                  <input
                    {...register('password', { required: t('auth.requiredPassword'), minLength: { value: 8, message: 'Min 8 characters' } })}
                    type="password"
                    placeholder="Min 8 characters"
                    className="input"
                  />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">{t('auth.confirmPassword')}</label>
                  <input
                    {...register('confirm', {
                      required: t('auth.requiredConfirmPassword'),
                      validate: (v) => v === watch('password') || t('auth.passwordMismatch'),
                    })}
                    type="password"
                    placeholder="••••••••"
                    className="input"
                  />
                  {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
                  {isSubmitting ? t('auth.signingUp') : t('auth.signUpBtn')}
                </button>
              </form>

              <p className="text-center text-white/50 text-sm mt-4">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-violet-400 hover:underline">{t('auth.logInLink')}</Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Verify Account</h1>
              <p className="text-sm text-center text-white/60 mb-6">
                Please enter the verification code sent to <strong>{signUpEmail}</strong>.
              </p>

              <form onSubmit={handleConfirm} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Verification Code</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="input text-center text-lg tracking-widest font-mono"
                    maxLength={10}
                    required
                  />
                </div>

                <button type="submit" disabled={isConfirming} className="btn-primary w-full mt-2">
                  {isConfirming ? 'Verifying...' : 'Verify Email'}
                </button>
              </form>

              <button
                onClick={() => setStep('signup')}
                className="text-center text-violet-400 hover:underline text-sm w-full mt-4 block"
              >
                Back to Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
