import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { joinSession } from '../../api/game.api'
import { socket, connectSocket } from '../../store/useSocketStore'

const AVATARS = ['😀', '🦊', '🐱', '🐸', '🦄', '🐙', '🦋', '🎃', '🚀', '🐼']

function normalizePin(value) {
  return String(value ?? '').replace(/\s+/g, '').trim()
}

function showJoinError(error) {
  const code = error?.response?.data?.code ?? error?.code
  const message = error?.response?.data?.message ?? error?.message

  switch (code) {
    case 'GAME_NOT_FOUND': toast.error('Không tìm thấy phòng chơi với mã PIN này'); return
    case 'INVALID_PIN': toast.error('Mã PIN không hợp lệ'); return
    case 'GAME_EXPIRED': toast.error('Phòng chơi đã hết hạn'); return
    case 'GAME_ENDED': toast.error('Phòng chơi đã kết thúc'); return
    case 'GAME_ALREADY_STARTED': toast.error('Game đã bắt đầu'); return
    case 'NICKNAME_TAKEN': toast.error('Nickname này đã có người sử dụng'); return
    case 'NICKNAME_REQUIRED': toast.error('Vui lòng nhập nickname'); return
    case 'SOCKET_CONNECTION_TIMEOUT':
    case 'SOCKET_CONNECTION_FAILED':
    case 'SOCKET_ATTACH_TIMEOUT':
      toast.error('Không thể kết nối với máy chủ realtime'); return
    case 'PLAYER_ATTACH_FAILED':
    case 'PLAYER_NOT_FOUND':
      toast.error('Không thể kết nối người chơi với phòng'); return
    default: toast.error(message || 'Không thể tham gia game')
  }
}

export default function PlayerJoinPage() {
  const { pin: pinParam } = useParams()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { pin: pinParam || '', nickname: '', teamName: '' },
  })
  const [avatarIdx, setAvatarIdx] = useState(0)
  const [isJoining, setIsJoining] = useState(false)

  async function joinGame({ pin, nickname, teamName }) {
    const normalizedPin = normalizePin(pin)
    const cleanNick = String(nickname ?? '').trim()
    const cleanTeam = String(teamName ?? '').trim()
    const avatar = AVATARS[avatarIdx]

    const response = await joinSession({ pin: normalizedPin, nickname: cleanNick, teamName: cleanTeam, avatar })
    const { gameId, playerId } = response.data

    await connectSocket()

    await new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(Object.assign(new Error('Socket attach timeout'), { code: 'SOCKET_ATTACH_TIMEOUT' }))
      }, 15000)
      socket.emit('player:attach-game', { gameId, playerId, pin: normalizedPin }, (result) => {
        window.clearTimeout(timeoutId)
        if (!result?.success) { reject(result); return }
        resolve(result)
      })
    })

    sessionStorage.setItem('syncquiz-player-session', JSON.stringify({
      gameId, playerId, pin: normalizedPin, nickname: cleanNick, teamName: cleanTeam, avatar,
    }))

    navigate(`/play/${gameId}/lobby`)
  }

  async function onSubmit(data) {
    if (isJoining) return
    const cleanPin = normalizePin(data.pin)
    const cleanNick = String(data.nickname ?? '').trim()
    if (!cleanPin || !cleanNick) { toast.error('Vui lòng nhập PIN và Nickname'); return }
    setIsJoining(true)
    toast.dismiss()
    try { await joinGame(data) }
    catch (error) { showJoinError(error) }
    finally { setIsJoining(false) }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-xl shadow-violet-500/25 mb-3">
            <Zap size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold sq-gradient">SyncQuiz</span>
          <p className="text-white/40 text-sm mt-1">Tham gia game</p>
        </div>

        <div className="sq-card sq-animate-fade-up">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* PIN — most prominent */}
            <div className="sq-form-group">
              <label className="sq-label">Mã PIN <span className="text-red-400">*</span></label>
              <input
                {...register('pin', {
                  required: 'Nhập mã PIN',
                  pattern: { value: /^\d{6}$/, message: 'PIN gồm 6 chữ số' }
                })}
                placeholder="_ _ _ _ _ _"
                maxLength={6}
                inputMode="numeric"
                autoComplete="off"
                className="sq-input text-center text-3xl font-mono tracking-[0.35em] py-4"
                autoFocus
              />
              {errors.pin && <p className="sq-error">{errors.pin.message}</p>}
            </div>

            {/* Nickname */}
            <div className="sq-form-group">
              <label className="sq-label">Nickname <span className="text-red-400">*</span></label>
              <input
                {...register('nickname', {
                  required: 'Nhập nickname',
                  maxLength: { value: 20, message: 'Tối đa 20 ký tự' }
                })}
                placeholder="Tên hiển thị của bạn"
                className="sq-input"
                autoComplete="off"
              />
              {errors.nickname && <p className="sq-error">{errors.nickname.message}</p>}
            </div>

            {/* Team (optional) */}
            <div className="sq-form-group">
              <label className="sq-label">Tên nhóm <span className="text-white/25 font-normal">(tùy chọn)</span></label>
              <input
                {...register('teamName')}
                placeholder="VD: Team Alpha"
                className="sq-input"
              />
            </div>

            {/* Avatar */}
            <div className="sq-form-group">
              <label className="sq-label">Chọn avatar</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarIdx(i)}
                    className={`text-2xl p-2 rounded-xl transition-all duration-200 ${
                      i === avatarIdx
                        ? 'bg-violet-500/30 ring-2 ring-violet-400 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="sq-btn sq-btn-primary w-full py-3.5 text-base mt-2"
            >
              {isJoining ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang kết nối...
                </>
              ) : (
                <>
                  Vào game <span className="ml-1">→</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
