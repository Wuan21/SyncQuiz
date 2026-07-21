import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Users, BookOpen, Zap, Activity,
  Search, ChevronLeft, ChevronRight,
  Shield, Trash2, UserX, UserCheck,
  BarChart3, Clock, RotateCcw, EyeOff, Eye,
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  getAdminStats, getAdminUsers, updateAdminUserRole,
  toggleAdminUserStatus, deleteAdminUser,
  getAdminQuizzes, deleteAdminQuiz, restoreAdminQuiz,
  getAdminSessions, getAdminHomework, endAdminSession,
} from '../../api/admin.api'
import { SkeletonStat } from '../../components/ui/Skeleton'
import { ConfirmModal } from '../../components/ui/Modal'

function StatCard({ icon: Icon, label, value, colorClass }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sq-stat"
    >
      <div className={`sq-stat-icon ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="sq-stat-value">{value ?? '—'}</p>
        <p className="sq-stat-label">{label}</p>
      </div>
    </motion.div>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-5">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="sq-btn sq-btn-secondary sq-btn-sm p-2 disabled:opacity-30"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-white/40 px-2">
        Trang {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="sq-btn sq-btn-secondary sq-btn-sm p-2 disabled:opacity-30"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

function UsersTab() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, page, roleFilter],
    queryFn: () => getAdminUsers({ search: search || undefined, page, limit: 15, role: roleFilter || undefined }),
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => updateAdminUserRole(id, { role }),
    onSuccess: () => { qc.invalidateQueries(['admin', 'users']); toast.success(t('admin.roleUpdated')) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }) => toggleAdminUserStatus(id, { isActive }),
    onSuccess: () => { qc.invalidateQueries(['admin', 'users']); toast.success(t('admin.statusUpdated')) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => { qc.invalidateQueries(['admin', 'users']); toast.success(t('admin.userDeleted')) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('admin.searchPlaceholder')} className="sq-input pl-9" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="sq-select py-2 text-sm" style={{ width: 'auto', minWidth: '140px' }}>
          <option value="">Tất cả vai trò</option>
          <option value="admin">{t('admin.admin')}</option>
          <option value="host">{t('admin.host')}</option>
          <option value="player">{t('admin.player')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-white/40">{t('common.loading')}</div>
      ) : (
        <>
          <div className="sq-card p-0 overflow-hidden">
            <div className="sq-table-wrap">
              <table className="sq-table">
                <thead>
                  <tr>
                    <th className="p-3 font-medium">{t('admin.user')}</th>
                    <th className="p-3 font-medium">{t('admin.role')}</th>
                    <th className="p-3 font-medium">{t('admin.status')}</th>
                    <th className="p-3 font-medium">{t('admin.joined')}</th>
                    <th className="p-3 font-medium text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-white/25">Không có người dùng nào</td></tr>
                  ) : (
                    data?.data?.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <p className="font-medium text-sm">{user.fullName}</p>
                          <p className="text-white/35 text-xs">{user.email}</p>
                        </td>
                        <td>
                          <select
                            value={user.role}
                            onChange={(e) => roleMut.mutate({ id: user.id, role: e.target.value })}
                            className="sq-select text-xs py-1.5" style={{ width: 'auto' }}
                          >
                            <option value="player">{t('admin.player')}</option>
                            <option value="host">{t('admin.host')}</option>
                            <option value="admin">{t('admin.admin')}</option>
                          </select>
                        </td>
                        <td>
                          <span className={`sq-badge ${user.isActive ? 'sq-badge-success' : 'sq-badge-danger'}`}>
                            {user.isActive ? t('admin.active') : t('admin.inactive')}
                          </span>
                        </td>
                        <td className="text-white/35 text-xs">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi') : '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => statusMut.mutate({ id: user.id, isActive: !user.isActive })}
                              className="sq-btn sq-btn-ghost sq-btn-sm px-2 text-white/40 hover:text-white"
                              title={user.isActive ? t('admin.deactivate') : t('admin.activate')}
                            >
                              {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: user.id, name: user.fullName })}
                              className="sq-btn sq-btn-ghost sq-btn-sm px-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                              title={t('common.delete')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); setDeleteTarget(null) }}
        title="Xóa người dùng?"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.name}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="danger"
      />
    </div>
  )
}

function QuizzesTab() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [visibilityFilter, setVisibilityFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quizzes', search, page, visibilityFilter, showDeleted],
    queryFn: () => getAdminQuizzes({ search: search || undefined, page, limit: 15, visibility: visibilityFilter || undefined, isDeleted: showDeleted ? 'true' : undefined }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAdminQuiz,
    onSuccess: () => { qc.invalidateQueries(['admin', 'quizzes']); toast.success(t('admin.quizDeleted')) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const restoreMut = useMutation({
    mutationFn: restoreAdminQuiz,
    onSuccess: () => { qc.invalidateQueries(['admin', 'quizzes']); toast.success(t('admin.quizRestored')) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('admin.searchQuizzes')} className="sq-input pl-9" />
        </div>
        <select value={visibilityFilter} onChange={(e) => { setVisibilityFilter(e.target.value); setPage(1) }}
          className="sq-select py-2 text-sm" style={{ width: 'auto', minWidth: '140px' }}>
          <option value="">Tất cả</option>
          <option value="public">{t('admin.public')}</option>
          <option value="private">{t('admin.private')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1) }}
            className="accent-violet-500 w-4 h-4" />
          Đã xóa
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-white/40">{t('common.loading')}</div>
      ) : (
        <>
          <div className="sq-card p-0 overflow-hidden">
            <div className="sq-table-wrap">
              <table className="sq-table">
                <thead>
                  <tr>
                    <th className="p-3 font-medium">{t('admin.quiz')}</th>
                    <th className="p-3 font-medium">{t('admin.owner')}</th>
                    <th className="p-3 font-medium">{t('admin.visibility')}</th>
                    <th className="p-3 font-medium">{t('admin.plays')}</th>
                    <th className="p-3 font-medium">{t('admin.created')}</th>
                    <th className="p-3 font-medium text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-white/25">Không có quiz nào</td></tr>
                  ) : (
                    data?.data?.map((quiz) => (
                      <tr key={quiz.id}>
                        <td>
                          <p className={`font-medium text-sm truncate max-w-[200px] ${quiz.isDeleted ? 'text-red-400/50' : ''}`}>
                            {quiz.title}
                          </p>
                        </td>
                        <td>
                          <p className="text-white/45 text-xs">{quiz.ownerName || '—'}</p>
                          <p className="text-white/25 text-xs truncate max-w-[140px]">{quiz.ownerEmail || ''}</p>
                        </td>
                        <td>
                          <span className={`sq-badge ${quiz.visibility === 'public' ? 'sq-badge-success' : 'sq-badge-muted'}`}>
                            {quiz.visibility === 'public' ? t('admin.public') : t('admin.private')}
                          </span>
                          {quiz.isDeleted && <span className="sq-badge sq-badge-danger ml-1">Đã xóa</span>}
                        </td>
                        <td className="text-white/45">{quiz.totalPlays}</td>
                        <td className="text-white/35 text-xs">
                          {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('vi') : '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            {quiz.isDeleted ? (
                              <button onClick={() => restoreMut.mutate(quiz.id)}
                                className="sq-btn sq-btn-ghost sq-btn-sm px-2 text-green-400/50 hover:text-green-400"
                                title={t('admin.restore')}>
                                <RotateCcw size={14} />
                              </button>
                            ) : (
                              <button onClick={() => setDeleteTarget({ id: quiz.id, title: quiz.title })}
                                className="sq-btn sq-btn-ghost sq-btn-sm px-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                                title={t('common.delete')}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); setDeleteTarget(null) }}
        title="Xóa quiz?"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.title}" không?`}
        confirmText="Xóa"
        variant="danger"
      />
    </div>
  )
}

function SessionsTab() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [endTarget, setEndTarget] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sessions', page],
    queryFn: () => getAdminSessions({ page, limit: 15 }),
  })

  const endMut = useMutation({
    mutationFn: endAdminSession,
    onSuccess: () => { qc.invalidateQueries(['admin', 'sessions']); toast.success(t('admin.sessionEnded')) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const statusVariant = (status) => {
    if (status === 'finished' || status === 'ended') return 'sq-badge-success'
    if (status === 'active') return 'sq-badge-primary'
    if (status === 'paused') return 'sq-badge-warning'
    return 'sq-badge-muted'
  }

  return (
    <div>
      {isLoading ? (
        <div className="text-center py-12 text-white/40">{t('common.loading')}</div>
      ) : (
        <>
          <div className="sq-card p-0 overflow-hidden">
            <div className="sq-table-wrap">
              <table className="sq-table">
                <thead>
                  <tr>
                    <th className="p-3 font-medium">PIN</th>
                    <th className="p-3 font-medium">{t('admin.status')}</th>
                    <th className="p-3 font-medium">{t('admin.players')}</th>
                    <th className="p-3 font-medium">{t('admin.host')}</th>
                    <th className="p-3 font-medium">{t('admin.created')}</th>
                    <th className="p-3 font-medium text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-white/25">Không có session nào</td></tr>
                  ) : (
                    data?.data?.map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono font-bold">{s.pin}</td>
                        <td><span className={`sq-badge ${statusVariant(s.status)}`}>{s.status}</span></td>
                        <td className="text-white/45">{s.playerCount}</td>
                        <td className="text-white/35 text-xs">{s.hostName || s.hostEmail || '—'}</td>
                        <td className="text-white/35 text-xs">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi') : '—'}</td>
                        <td className="text-right">
                          {(s.status === 'waiting' || s.status === 'active' || s.status === 'paused') && (
                            <button onClick={() => setEndTarget({ id: s.id, pin: s.pin })}
                              className="sq-btn sq-btn-ghost sq-btn-sm px-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                              title={t('admin.endSession')}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}

      <ConfirmModal
        open={!!endTarget}
        onClose={() => setEndTarget(null)}
        onConfirm={() => { if (endTarget) endMut.mutate(endTarget.id); setEndTarget(null) }}
        title="Kết thúc session?"
        message={`Kết thúc session PIN ${endTarget?.pin}? Người chơi sẽ bị ngắt kết nối.`}
        confirmText="Kết thúc"
        variant="danger"
      />
    </div>
  )
}

function HomeworkTab() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'homework', page],
    queryFn: () => getAdminHomework({ page, limit: 15 }),
  })

  return (
    <div>
      {isLoading ? (
        <div className="text-center py-12 text-white/40">{t('common.loading')}</div>
      ) : (
        <>
          <div className="sq-card p-0 overflow-hidden">
            <div className="sq-table-wrap">
              <table className="sq-table">
                <thead>
                  <tr>
                    <th className="p-3 font-medium">{t('admin.title')}</th>
                    <th className="p-3 font-medium">{t('admin.teacher')}</th>
                    <th className="p-3 font-medium">{t('admin.status')}</th>
                    <th className="p-3 font-medium">{t('admin.dueDate')}</th>
                    <th className="p-3 font-medium">{t('admin.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-white/25">Không có bài tập nào</td></tr>
                  ) : (
                    data?.data?.map((h) => (
                      <tr key={h.id}>
                        <td className="font-medium text-sm truncate max-w-[200px]">{h.title}</td>
                        <td className="text-white/35 text-xs">{h.teacherName || h.teacherEmail || '—'}</td>
                        <td><span className={`sq-badge ${h.status === 'closed' ? 'sq-badge-danger' : 'sq-badge-success'}`}>{h.status}</span></td>
                        <td className="text-white/35 text-xs">{h.dueDate ? new Date(h.dueDate).toLocaleDateString('vi') : '—'}</td>
                        <td className="text-white/35 text-xs">{h.createdAt ? new Date(h.createdAt).toLocaleDateString('vi') : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}
    </div>
  )
}

function OverviewTab({ stats }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Users} label={t('admin.totalUsers')} value={stats?.userCount} colorClass="bg-violet-500/15 text-violet-400" />
        <StatCard icon={UserCheck} label={t('admin.activeUsers')} value={stats?.activeUsers} colorClass="bg-green-500/15 text-green-400" />
        <StatCard icon={UserX} label={t('admin.lockedUsers')} value={stats?.lockedUsers} colorClass="bg-red-500/15 text-red-400" />
        <StatCard icon={BookOpen} label={t('admin.totalQuizzes')} value={stats?.quizCount} colorClass="bg-pink-500/15 text-pink-400" />
        <StatCard icon={Eye} label={t('admin.publishedQuizzes')} value={stats?.publishedQuizzes} colorClass="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={EyeOff} label={t('admin.draftQuizzes')} value={stats?.draftQuizzes} colorClass="bg-orange-500/15 text-orange-400" />
        <StatCard icon={Zap} label={t('admin.totalSessions')} value={stats?.sessionCount} colorClass="bg-blue-500/15 text-blue-400" />
        <StatCard icon={Activity} label={t('admin.activeSessions')} value={stats?.activeSessions} colorClass="bg-green-500/15 text-green-400" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label={t('admin.newUsers30d')} value={stats?.newUsersLast30Days} colorClass="bg-indigo-500/15 text-indigo-400" />
        <StatCard icon={BookOpen} label={t('admin.newQuizzes30d')} value={stats?.newQuizzesLast30Days} colorClass="bg-violet-500/15 text-violet-400" />
        <StatCard icon={Zap} label={t('admin.newSessions30d')} value={stats?.newSessionsLast30Days} colorClass="bg-pink-500/15 text-pink-400" />
        <StatCard icon={Users} label={t('admin.totalPlayers')} value={stats?.totalPlayers} colorClass="bg-cyan-500/15 text-cyan-400" />
      </div>
    </>
  )
}

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'quizzes', label: 'Quiz', icon: BookOpen },
  { id: 'sessions', label: 'Sessions', icon: Zap },
  { id: 'homework', label: 'Bài tập', icon: Clock },
]

export default function AdminPage() {
  const [tab, setTab] = useState('overview')
  const { t } = useTranslation()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
  })

  return (
    <div className="sq-page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center">
          <Shield size={22} className="text-red-400" />
        </div>
        <div>
          <h1 className="sq-page-title">{t('admin.title')}</h1>
          <p className="sq-page-subtitle">Quản lý hệ thống SyncQuiz</p>
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="sq-tabs mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`sq-tab ${tab === id ? 'active' : ''}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab stats={statsLoading ? null : stats} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'quizzes' && <QuizzesTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'homework' && <HomeworkTab />}
    </div>
  )
}
