import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Users, BookOpen, Zap, Activity,
  Search, ChevronLeft, ChevronRight,
  Shield, Trash2, UserX, UserCheck,
  BarChart3, Clock, RotateCcw, EyeOff, Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAdminStats, getAdminUsers, updateAdminUserRole,
  toggleAdminUserStatus, deleteAdminUser,
  getAdminQuizzes, deleteAdminQuiz, restoreAdminQuiz,
  getAdminSessions, getAdminHomework, endAdminSession,
} from '../../api/admin.api'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="btn-secondary p-2 disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-white/50">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="btn-secondary p-2 disabled:opacity-30"
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
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, page, roleFilter],
    queryFn: () =>
      getAdminUsers({
        search: search || undefined,
        page,
        limit: 15,
        role: roleFilter || undefined,
      }),
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => updateAdminUserRole(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries(['admin', 'users'])
      toast.success(t('admin.roleUpdated'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }) => toggleAdminUserStatus(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries(['admin', 'users'])
      toast.success(t('admin.statusUpdated'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      qc.invalidateQueries(['admin', 'users'])
      toast.success(t('admin.userDeleted'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('admin.searchPlaceholder')}
            className="input pl-9 w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="select py-2 text-sm"
        >
          <option value="">{t('admin.allRoles')}</option>
          <option value="admin">{t('admin.admin')}</option>
          <option value="host">{t('admin.host')}</option>
          <option value="player">{t('admin.player')}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-white/40">{t('common.loading')}</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40 text-xs">
                  <th className="p-3 font-medium">{t('admin.user')}</th>
                  <th className="p-3 font-medium">{t('admin.role')}</th>
                  <th className="p-3 font-medium">{t('admin.status')}</th>
                  <th className="p-3 font-medium">{t('admin.joined')}</th>
                  <th className="p-3 font-medium text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/30">
                      {t('admin.noUsers')}
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="p-3">
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-white/40 text-xs">{user.email}</p>
                      </td>
                      <td className="p-3">
                        <select
                          value={user.role}
                          onChange={(e) => roleMut.mutate({ id: user.id, role: e.target.value })}
                          className="select text-xs py-1 w-auto"
                        >
                          <option value="player">{t('admin.player')}</option>
                          <option value="host">{t('admin.host')}</option>
                          <option value="admin">{t('admin.admin')}</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.isActive ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </td>
                      <td className="p-3 text-white/40 text-xs">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi') : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => statusMut.mutate({ id: user.id, isActive: !user.isActive })}
                            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            title={user.isActive ? t('admin.deactivate') : t('admin.activate')}
                          >
                            {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(t('common.confirmDelete'))) {
                                deleteMut.mutate(user.id)
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
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
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}
    </div>
  )
}

function QuizzesTab() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [visibilityFilter, setVisibilityFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quizzes', search, page, visibilityFilter, showDeleted],
    queryFn: () =>
      getAdminQuizzes({
        search: search || undefined,
        page,
        limit: 15,
        visibility: visibilityFilter || undefined,
        isDeleted: showDeleted ? 'true' : undefined,
      }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAdminQuiz,
    onSuccess: () => {
      qc.invalidateQueries(['admin', 'quizzes'])
      toast.success(t('admin.quizDeleted'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const restoreMut = useMutation({
    mutationFn: restoreAdminQuiz,
    onSuccess: () => {
      qc.invalidateQueries(['admin', 'quizzes'])
      toast.success(t('admin.quizRestored'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('admin.searchQuizzes')}
            className="input pl-9 w-full"
          />
        </div>
        <select
          value={visibilityFilter}
          onChange={(e) => { setVisibilityFilter(e.target.value); setPage(1) }}
          className="select py-2 text-sm"
        >
          <option value="">{t('admin.allVisibility')}</option>
          <option value="public">{t('admin.public')}</option>
          <option value="private">{t('admin.private')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => { setShowDeleted(e.target.checked); setPage(1) }}
            className="accent-violet-500"
          />
          {t('admin.showDeleted')}
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-white/40">{t('common.loading')}</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40 text-xs">
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
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/30">
                      {t('admin.noQuizzes')}
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((quiz) => (
                    <tr key={quiz.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="p-3">
                        <p className={`font-medium truncate max-w-[200px] ${quiz.isDeleted ? 'text-red-400/60' : ''}`}>
                          {quiz.title}
                        </p>
                      </td>
                      <td className="p-3 text-white/50 text-xs">
                        <p>{quiz.ownerName || '—'}</p>
                        <p className="truncate max-w-[150px]">{quiz.ownerEmail || ''}</p>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          quiz.visibility === 'public'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/10 text-white/40'
                        }`}>
                          {quiz.visibility === 'public' ? t('admin.public') : t('admin.private')}
                        </span>
                      </td>
                      <td className="p-3 text-white/50">{quiz.totalPlays}</td>
                      <td className="p-3 text-white/40 text-xs">
                        {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('vi') : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          {quiz.isDeleted ? (
                            <button
                              onClick={() => restoreMut.mutate(quiz.id)}
                              className="p-1.5 rounded hover:bg-green-500/20 text-white/40 hover:text-green-400 transition-colors"
                              title={t('admin.restore')}
                            >
                              <RotateCcw size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (window.confirm(t('common.confirmDelete'))) {
                                  deleteMut.mutate(quiz.id)
                                }
                              }}
                              className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                              title={t('common.delete')}
                            >
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
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}
    </div>
  )
}

function SessionsTab() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sessions', page],
    queryFn: () => getAdminSessions({ page, limit: 15 }),
  })

  const endMut = useMutation({
    mutationFn: endAdminSession,
    onSuccess: () => {
      qc.invalidateQueries(['admin', 'sessions'])
      toast.success(t('admin.sessionEnded'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  return (
    <div>
      {isLoading ? (
        <div className="text-center py-12 text-white/40">{t('common.loading')}</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40 text-xs">
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
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/30">
                      {t('admin.noSessions')}
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="p-3 font-mono font-bold">{s.pin}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          s.status === 'finished' || s.status === 'ended'
                            ? 'bg-green-500/20 text-green-400'
                            : s.status === 'active'
                            ? 'bg-blue-500/20 text-blue-400'
                            : s.status === 'paused'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-white/10 text-white/40'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-white/50">{s.playerCount}</td>
                      <td className="p-3 text-white/40 text-xs">{s.hostName || s.hostEmail || '—'}</td>
                      <td className="p-3 text-white/40 text-xs">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi') : '—'}
                      </td>
                      <td className="p-3 text-right">
                        {(s.status === 'waiting' || s.status === 'active' || s.status === 'paused') && (
                          <button
                            onClick={() => {
                              if (window.confirm(t('admin.confirmEndSession'))) {
                                endMut.mutate(s.id)
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                            title={t('admin.endSession')}
                          >
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
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}
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
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40 text-xs">
                  <th className="p-3 font-medium">{t('admin.title')}</th>
                  <th className="p-3 font-medium">{t('admin.teacher')}</th>
                  <th className="p-3 font-medium">{t('admin.status')}</th>
                  <th className="p-3 font-medium">{t('admin.dueDate')}</th>
                  <th className="p-3 font-medium">{t('admin.created')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/30">
                      {t('admin.noHomework')}
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((h) => (
                    <tr key={h.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="p-3 font-medium truncate max-w-[200px]">{h.title}</td>
                      <td className="p-3 text-white/40 text-xs">{h.teacherName || h.teacherEmail || '—'}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          h.status === 'closed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="p-3 text-white/40 text-xs">
                        {h.dueDate ? new Date(h.dueDate).toLocaleDateString('vi') : '—'}
                      </td>
                      <td className="p-3 text-white/40 text-xs">
                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString('vi') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data?.totalPages || 1} onPage={setPage} />
        </>
      )}
    </div>
  )
}

function OverviewTab({ stats }) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label={t('admin.totalUsers')} value={stats?.userCount} color="bg-violet-600/20 text-violet-400" />
        <StatCard icon={UserCheck} label={t('admin.activeUsers')} value={stats?.activeUsers} color="bg-green-600/20 text-green-400" />
        <StatCard icon={UserX} label={t('admin.lockedUsers')} value={stats?.lockedUsers} color="bg-red-600/20 text-red-400" />
        <StatCard icon={BookOpen} label={t('admin.totalQuizzes')} value={stats?.quizCount} color="bg-pink-600/20 text-pink-400" />
        <StatCard icon={Eye} label={t('admin.publishedQuizzes')} value={stats?.publishedQuizzes} color="bg-emerald-600/20 text-emerald-400" />
        <StatCard icon={EyeOff} label={t('admin.draftQuizzes')} value={stats?.draftQuizzes} color="bg-orange-600/20 text-orange-400" />
        <StatCard icon={Zap} label={t('admin.totalSessions')} value={stats?.sessionCount} color="bg-blue-600/20 text-blue-400" />
        <StatCard icon={Activity} label={t('admin.activeSessions')} value={stats?.activeSessions} color="bg-green-600/20 text-green-400" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('admin.totalPlayers')} value={stats?.totalPlayers} color="bg-indigo-600/20 text-indigo-400" />
        <StatCard icon={Users} label={t('admin.newUsers30d')} value={stats?.newUsersLast30Days} color="bg-violet-600/20 text-violet-400" />
        <StatCard icon={BookOpen} label={t('admin.newQuizzes30d')} value={stats?.newQuizzesLast30Days} color="bg-pink-600/20 text-pink-400" />
        <StatCard icon={Zap} label={t('admin.newSessions30d')} value={stats?.newSessionsLast30Days} color="bg-blue-600/20 text-blue-400" />
      </div>
    </>
  )
}

export default function AdminPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('overview')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
  })

  const TABS = [
    { id: 'overview', label: t('admin.overview'), icon: BarChart3 },
    { id: 'users', label: t('admin.users'), icon: Users },
    { id: 'quizzes', label: t('admin.quizzes'), icon: BookOpen },
    { id: 'sessions', label: t('admin.sessions'), icon: Zap },
    { id: 'homework', label: t('admin.homework'), icon: Clock },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield size={28} className="text-red-400" />
        <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            <Icon size={15} /> {label}
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
