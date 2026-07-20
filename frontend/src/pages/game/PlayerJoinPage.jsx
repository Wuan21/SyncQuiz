import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { joinSession } from '../../api/game.api'
import { socket, connectSocket } from '../../store/useSocketStore'

const AVATARS = ['😀', '🐶', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀']

function normalizePin(value) {
  return String(value ?? '').replace(/\s+/g, '').trim()
}

function showJoinError(error) {
  const code = error?.response?.data?.code ?? error?.code
  const message = error?.response?.data?.message ?? error?.message

  switch (code) {
    case 'GAME_NOT_FOUND':
      toast.error('Không tìm thấy phòng chơi với mã PIN này')
      return
    case 'INVALID_PIN':
      toast.error('Mã PIN không hợp lệ')
      return
    case 'GAME_EXPIRED':
      toast.error('Phòng chơi đã hết hạn')
      return
    case 'GAME_ENDED':
      toast.error('Phòng chơi đã kết thúc')
      return
    case 'GAME_ALREADY_STARTED':
      toast.error('Game đã bắt đầu')
      return
    case 'NICKNAME_TAKEN':
      toast.error('Nickname này đã có người sử dụng')
      return
    case 'NICKNAME_REQUIRED':
      toast.error('Vui lòng nhập nickname')
      return
    case 'SOCKET_CONNECTION_TIMEOUT':
    case 'SOCKET_CONNECTION_FAILED':
    case 'SOCKET_ATTACH_TIMEOUT':
      toast.error('Không thể kết nối với máy chủ realtime')
      return
    case 'PLAYER_ATTACH_FAILED':
    case 'PLAYER_NOT_FOUND':
      toast.error('Không thể kết nối người chơi với phòng')
      return
    default:
      toast.error(message || 'Không thể tham gia game')
  }
}

export default function PlayerJoinPage() {
  const { pin: pinParam } = useParams()
  const navigate = useNavigate()
  const { register, handleSubmit } = useForm({
    defaultValues: { pin: pinParam || '', nickname: '', teamName: '' },
  })
  const [avatarIdx, setAvatarIdx] = useState(0)
  const [isJoining, setIsJoining] = useState(false)

  async function joinGame({ pin, nickname, teamName }) {
    const normalizedPin = normalizePin(pin)
    const cleanNick = String(nickname ?? '').trim()
    const cleanTeam = String(teamName ?? '').trim()
    const avatar = AVATARS[avatarIdx]

    // Step 1: REST join
    const response = await joinSession({
      pin: normalizedPin,
      nickname: cleanNick,
      teamName: cleanTeam,
      avatar,
    })

    const { gameId, playerId } = response.data

    // Step 2: Connect Socket.IO
    await connectSocket()

    // Step 3: Emit player:attach-game with acknowledgment
    await new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(
          Object.assign(new Error('Socket attach timeout'), {
            code: 'SOCKET_ATTACH_TIMEOUT',
          }),
        )
      }, 15000)

      socket.emit(
        'player:attach-game',
        { gameId, playerId, pin: normalizedPin },
        (result) => {
          window.clearTimeout(timeoutId)
          if (!result?.success) {
            reject(result)
            return
          }
          resolve(result)
        },
      )
    })

    // Step 4: Save session and navigate
    sessionStorage.setItem(
      'syncquiz-player-session',
      JSON.stringify({
        gameId,
        playerId,
        pin: normalizedPin,
        nickname: cleanNick,
        teamName: cleanTeam,
        avatar,
      }),
    )

    navigate(`/play/${gameId}/lobby`)
  }

  async function onSubmit(data) {
    if (isJoining) return
    const cleanPin = normalizePin(data.pin)
    const cleanNick = String(data.nickname ?? '').trim()

    if (!cleanPin || !cleanNick) {
      toast.error('Vui lòng nhập PIN và Nickname')
      return
    }

    setIsJoining(true)
    toast.dismiss()

    try {
      await joinGame(data)
    } catch (error) {
      showJoinError(error)
    } finally {
      setIsJoining(false)
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

            <button type="submit" disabled={isJoining} className="btn-primary w-full py-3.5 text-base">
              {isJoining ? 'Đang vào...' : 'Vào game 🚀'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
