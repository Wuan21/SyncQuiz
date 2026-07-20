import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/useAuthStore'
import { updateProfile, changePassword } from '../../api/users.api'
import { User, Settings, Lock } from 'lucide-react'

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
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Hồ sơ cá nhân</h1>
      
      <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 font-semibold transition-colors ${activeTab === 'profile' ? 'text-violet-400' : 'text-white/50 hover:text-white/80'}`}
        >
          <User size={18} /> Thông tin
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 font-semibold transition-colors ${activeTab === 'security' ? 'text-violet-400' : 'text-white/50 hover:text-white/80'}`}
        >
          <Lock size={18} /> Bảo mật
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <form onSubmit={handleProfile(onUpdateProfile)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
              <input type="text" value={user.email} disabled className="input-field opacity-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Vai trò</label>
              <input type="text" value={user.role.toUpperCase()} disabled className="input-field opacity-50 cursor-not-allowed font-bold text-violet-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Tên hiển thị</label>
              <input {...registerProfile('fullName')} className="input-field" placeholder="Nhập tên của bạn" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">URL Ảnh đại diện</label>
              <input {...registerProfile('avatarUrl')} className="input-field" placeholder="https://..." />
            </div>
            <button type="submit" className="btn-primary w-full">Lưu thay đổi</button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <form onSubmit={handlePassword(onChangePassword)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Mật khẩu hiện tại</label>
              <input type="password" {...registerPassword('currentPassword', { required: true })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Mật khẩu mới</label>
              <input type="password" {...registerPassword('newPassword', { required: true, minLength: 8 })} className="input-field" />
              {pwdErrors.newPassword && <span className="text-red-400 text-sm mt-1">Mật khẩu ít nhất 8 ký tự</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Xác nhận mật khẩu mới</label>
              <input type="password" {...registerPassword('confirmPassword', { required: true })} className="input-field" />
            </div>
            <button type="submit" className="btn-primary w-full">Đổi mật khẩu</button>
          </form>
        </div>
      )}
    </div>
  )
}
