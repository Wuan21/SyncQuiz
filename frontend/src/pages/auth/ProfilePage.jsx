import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/useAuthStore'
import { updateProfile, changePassword } from '../../api/users.api'
import { User, Lock } from 'lucide-react'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const loadUser = useAuthStore((s) => s.loadUser)

  const [activeTab, setActiveTab] = useState('profile')

  const { register: registerProfile, handleSubmit: handleProfile, reset: resetProfile } = useForm()
  const { register: registerPassword, handleSubmit: handlePassword, reset: resetPassword, formState: { errors: pwdErrors } } = useForm()

  useEffect(() => {
    if (user) {
      resetProfile({
        fullName: user.fullName || '',
        avatarUrl: user.avatarUrl || ''
      })
    }
  }, [user, resetProfile])

  const onUpdateProfile = async (data) => {
    try {
      await updateProfile(data)
      await loadUser()
      toast.success('Cập nhật hồ sơ thành công')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      return toast.error('Mật khẩu mới không khớp')
    }
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      toast.success('Đổi mật khẩu thành công')
      resetPassword()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  if (!user) return null

  return (
    <div className="sq-page">
      <h1 className="sq-page-title mb-6">Hồ sơ cá nhân</h1>

      <div className="flex gap-4 mb-6 sq-border-b pb-4">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 font-semibold transition-colors ${
            activeTab === 'profile' ? 'sq-text-primary' : 'sq-text-muted hover:sq-text-foreground'
          }`}
        >
          <User size={18} /> Thông tin
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 font-semibold transition-colors ${
            activeTab === 'security' ? 'sq-text-primary' : 'sq-text-muted hover:sq-text-foreground'
          }`}
        >
          <Lock size={18} /> Bảo mật
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="sq-card">
          <form onSubmit={handleProfile(onUpdateProfile)} className="space-y-6">
            <div>
              <label className="sq-label">Email</label>
              <input type="text" value={user.email} disabled className="sq-input opacity-50 cursor-not-allowed mt-1" />
            </div>
            <div>
              <label className="sq-label">Vai trò</label>
              <input type="text" value={user.role.toUpperCase()} disabled className="sq-input opacity-50 cursor-not-allowed font-bold sq-text-primary mt-1" />
            </div>
            <div>
              <label className="sq-label">Tên hiển thị</label>
              <input {...registerProfile('fullName')} className="sq-input mt-1" placeholder="Nhập tên của bạn" required />
            </div>
            <div>
              <label className="sq-label">URL Ảnh đại diện</label>
              <input {...registerProfile('avatarUrl')} className="sq-input mt-1" placeholder="https://..." />
            </div>
            <button type="submit" className="sq-btn sq-btn-primary w-full">Lưu thay đổi</button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="sq-card">
          <form onSubmit={handlePassword(onChangePassword)} className="space-y-6">
            <div>
              <label className="sq-label">Mật khẩu hiện tại</label>
              <input type="password" {...registerPassword('currentPassword', { required: true })} className="sq-input mt-1" />
            </div>
            <div>
              <label className="sq-label">Mật khẩu mới</label>
              <input type="password" {...registerPassword('newPassword', { required: true, minLength: 8 })} className="sq-input mt-1" />
              {pwdErrors.newPassword && <span className="sq-error">Mật khẩu ít nhất 8 ký tự</span>}
            </div>
            <div>
              <label className="sq-label">Xác nhận mật khẩu mới</label>
              <input type="password" {...registerPassword('confirmPassword', { required: true })} className="sq-input mt-1" />
            </div>
            <button type="submit" className="sq-btn sq-btn-primary w-full">Đổi mật khẩu</button>
          </form>
        </div>
      )}
    </div>
  )
}