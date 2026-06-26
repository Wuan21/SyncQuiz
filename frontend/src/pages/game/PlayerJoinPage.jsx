import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSessionByPin } from '../../api/game.api'
import useSocketStore from '../../store/useSocketStore'

const AVATARS = ['😀', '🐶', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀']

export default function PlayerJoinPage() {
  const { pin: pinParam } = useParams()
  const navigate = useNavigate()
  const { socket, connect } = useSocketStore()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { pin: pinParam || '', nickname: '' },
  })
  const [avatarIdx, setAvatarIdx] = useState(0)

  const onSubmit = async ({ pin, nickname, teamName }) => {
    try {
      const session = await getSessionByPin(pin)
      if (session.status !== 'waiting') return toast.error('Game already started or ended')

      connect()
      setTimeout(() => {
        socket?.emit('player:join', { pin, nickname: nickname.trim(), avatarIndex: avatarIdx, teamName: teamName?.trim() || null })
        socket?.once('player:joined', () => navigate(`/play/${pin}?nickname=${encodeURIComponent(nickname)}`))
        socket?.once('error', ({ message }) => toast.error(message))
      }, 300)
    } catch {
      toast.error('Game not found — check the PIN')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="text-violet-400" size={32} />
          <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            SyncQuiz
          </span>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-center mb-1">Tham gia game</h2>
          <p className="text-white/40 text-sm text-center mb-6">Nhập mã PIN từ host để vào</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* PIN */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Mã PIN <span className="text-red-400">*</span></label>
              <input
                {...register('pin', { required: 'Nhập PIN', pattern: { value: /^\d{6}$/, message: 'PIN gồm 6 chữ số' } })}
                placeholder="_ _ _ _ _ _"
                maxLength={6}
                inputMode="numeric"
                className="input text-center text-3xl font-mono tracking-[0.5em] py-4"
                autoFocus
              />
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Nickname <span className="text-red-400">*</span></label>
              <input
                {...register('nickname', { required: 'Nhập nickname', maxLength: { value: 20, message: 'Tối đa 20 ký tự' } })}
                placeholder="Tên của bạn"
                className="input"
              />
            </div>

            {/* Team (optional) */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">
                Tên nhóm <span className="text-white/30 font-normal">(tùy chọn)</span>
              </label>
              <input
                {...register('teamName')}
                placeholder="VD: Team Alpha"
                className="input"
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Chọn avatar</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarIdx(i)}
                    className={`text-2xl p-2 rounded-xl transition-all ${i === avatarIdx ? 'bg-violet-600 scale-110' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 text-base">
              {isSubmitting ? 'Đang vào...' : 'Vào game 🚀'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
