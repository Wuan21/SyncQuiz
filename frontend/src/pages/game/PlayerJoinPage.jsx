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
  const { register, handleSubmit } = useForm({
    defaultValues: { pin: pinParam || '', nickname: '' },
  })
  const [avatarIdx, setAvatarIdx] = useState(0)
  const [joining, setJoining] = useState(false)

  const onSubmit = async ({ pin, nickname, teamName }) => {
    if (joining) return
    const cleanPin = String(pin || '').trim()
    const cleanNick = String(nickname || '').trim()

    if (!cleanPin || !cleanNick) {
      toast.dismiss()
      return toast.error('Vui lòng nhập PIN và Nickname')
    }

    setJoining(true)
    toast.dismiss()

    try {
      // Step 1: Validate session via REST API
      const session = await getSessionByPin(cleanPin)
      if (session.status === 'finished' || session.status === 'ended') {
        setJoining(false)
        return toast.error('Phòng chơi đã kết thúc')
      }

      // Step 2: Connect Socket.IO
      const sock = connect() || socket || useSocketStore.getState().socket
      if (!sock) {
        setJoining(false)
        return toast.error('Không thể kết nối đến máy chủ WebSocket')
      }

      const joinPayload = {
        pin: cleanPin,
        nickname: cleanNick,
        avatarIndex: avatarIdx,
        teamName: teamName?.trim() || null,
      }

      // Step 3: Join game via Socket.IO with callback acknowledgment
      sock.emit('player:join', joinPayload, (response) => {
        if (response && !response.success) {
          setJoining(false)
          const code = response.code
          toast.dismiss()
          if (code === 'GAME_NOT_FOUND') toast.error('Không tìm thấy phòng chơi với mã PIN này')
          else if (code === 'GAME_ENDED') toast.error('Phòng chơi đã kết thúc')
          else if (code === 'NICKNAME_TAKEN') toast.error('Nickname này đã có người sử dụng')
          else toast.error(response.message || 'Không thể tham gia game')
        }
      })

      const handleJoined = (res) => {
        sock.off('error', handleError)
        setJoining(false)
        navigate(`/play/${cleanPin}?nickname=${encodeURIComponent(cleanNick)}`)
      }

      const handleError = (err) => {
        sock.off('player:joined', handleJoined)
        setJoining(false)
        const code = err?.code
        const msg = typeof err === 'string' ? err : err?.message
        toast.dismiss()
        if (code === 'GAME_NOT_FOUND') toast.error('Không tìm thấy phòng chơi với mã PIN này')
        else if (code === 'GAME_ENDED') toast.error('Phòng chơi đã kết thúc')
        else if (code === 'NICKNAME_TAKEN') toast.error('Nickname này đã có người sử dụng')
        else toast.error(msg || 'Không thể tham gia phòng chơi')
      }

      sock.once('player:joined', handleJoined)
      sock.once('error', handleError)
    } catch (err) {
      setJoining(false)
      toast.dismiss()
      const code = err.response?.data?.code
      const msg = err.response?.data?.message || err.message
      if (code === 'GAME_NOT_FOUND' || err.response?.status === 404) {
        toast.error('Không tìm thấy phòng chơi với mã PIN này')
      } else if (code === 'GAME_ENDED' || err.response?.status === 410) {
        toast.error('Phòng chơi đã kết thúc')
      } else {
        toast.error(msg || 'Không thể kiểm tra mã PIN')
      }
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

            <button type="submit" disabled={joining} className="btn-primary w-full py-3.5 text-base">
              {joining ? 'Đang vào...' : 'Vào game 🚀'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
