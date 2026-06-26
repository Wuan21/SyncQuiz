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

  const onSubmit = async ({ pin, nickname }) => {
    try {
      const session = await getSessionByPin(pin)
      if (session.status !== 'waiting') return toast.error('Game already started or ended')

      connect()
      setTimeout(() => {
        socket?.emit('player:join', { pin, nickname: nickname.trim(), avatarIndex: avatarIdx })
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
          <h2 className="text-xl font-bold text-center mb-6">Join a Game</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Game PIN</label>
              <input
                {...register('pin', { required: 'PIN is required', pattern: { value: /^\d{6}$/, message: '6-digit PIN' } })}
                placeholder="000000"
                maxLength={6}
                className="input text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Nickname</label>
              <input
                {...register('nickname', { required: 'Nickname is required', maxLength: { value: 20, message: 'Max 20 chars' } })}
                placeholder="Your cool name"
                className="input"
              />
            </div>

            {/* Avatar picker */}
            <div>
              <label className="block text-sm text-white/60 mb-2">Pick Avatar</label>
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

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-lg py-3">
              {isSubmitting ? 'Joining...' : 'Join Game 🚀'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
