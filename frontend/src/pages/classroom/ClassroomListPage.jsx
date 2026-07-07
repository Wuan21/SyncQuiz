import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, UserPlus, Users, Trash2, X, Clipboard, Check, Calendar, ArrowRight, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { getClassrooms, createClassroom, joinClassroom, deleteClassroom } from '../../api/advanced.api'

export default function ClassroomListPage() {
  const [activeTab, setActiveTab] = useState('taught') // 'taught' | 'joined'
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [openJoinModal, setOpenJoinModal] = useState(false)
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' })
  const [joinCode, setJoinCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const [expandedClassroom, setExpandedClassroom] = useState(null) // ID of taught classroom to show students

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['classrooms'],
    queryFn: getClassrooms,
  })

  // Mutations
  const createMut = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      toast.success('Tạo lớp học mới thành công!')
      refetch()
      setOpenCreateModal(false)
      setNewClassroom({ name: '', description: '' })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi tạo lớp học')
    },
  })

  const joinMut = useMutation({
    mutationFn: joinClassroom,
    onSuccess: () => {
      toast.success('Tham gia lớp học thành công!')
      refetch()
      setOpenJoinModal(false)
      setJoinCode('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Mã lớp học không hợp lệ hoặc bạn đã tham gia lớp này')
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      toast.success('Đã xóa lớp học thành công')
      refetch()
      if (expandedClassroom) setExpandedClassroom(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi xóa lớp học')
    },
  })

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Đã sao chép mã lớp!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa lớp học này không? Tất cả dữ liệu liên quan sẽ bị xóa.')) {
      deleteMut.mutate(id)
    }
  }

  const taughtList = data?.taught || []
  const joinedList = data?.joined || []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="text-violet-400" /> Lớp học
          </h1>
          <p className="text-white/50 mt-1">Quản lý lớp học bạn giảng dạy hoặc tham gia học tập</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenJoinModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <UserPlus size={16} /> Tham gia lớp
          </button>
          <button
            onClick={() => setOpenCreateModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Tạo lớp mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6">
        <button
          onClick={() => { setActiveTab('taught'); setExpandedClassroom(null); }}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 relative -mb-[2px] ${
            activeTab === 'taught'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Lớp tôi giảng dạy ({taughtList.length})
        </button>
        <button
          onClick={() => { setActiveTab('joined'); setExpandedClassroom(null); }}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 relative -mb-[2px] ${
            activeTab === 'joined'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Lớp tôi tham gia ({joinedList.length})
        </button>
      </div>

      {isLoading && <div className="text-center text-white/40 py-16">Đang tải danh sách lớp học...</div>}

      {!isLoading && activeTab === 'taught' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class List */}
          <div className="lg:col-span-2 space-y-4">
            {taughtList.length === 0 ? (
              <div className="card text-center py-16 text-white/40">
                <Users size={48} className="mx-auto text-white/20 mb-4" />
                <p>Bạn chưa tạo lớp học nào.</p>
                <button
                  onClick={() => setOpenCreateModal(true)}
                  className="btn-primary mt-4 text-sm inline-block"
                >
                  Tạo lớp đầu tiên của bạn
                </button>
              </div>
            ) : (
              taughtList.map((cls) => (
                <div
                  key={cls.id}
                  className={`card border cursor-pointer transition-all ${
                    expandedClassroom?.id === cls.id
                      ? 'border-violet-500/50 bg-violet-600/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => setExpandedClassroom(cls)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{cls.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/20">
                          Giáo viên
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mt-1 line-clamp-2">{cls.description || 'Không có mô tả.'}</p>
                      
                      <div className="flex flex-wrap gap-4 mt-4 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {cls.students?.length || 0} học sinh
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> Tạo ngày {new Date(cls.createdAt).toLocaleDateString('vi')}
                        </span>
                      </div>
                    </div>

                      <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono">
                        <span className="text-white/40 text-xs uppercase tracking-wider mr-1">PIN:</span>
                        <span className="text-violet-400 font-bold tracking-wider">{cls.code}</span>
                        <button
                          onClick={() => copyToClipboard(cls.code)}
                          className="text-white/40 hover:text-white transition-colors ml-1"
                        >
                          {copiedCode === cls.code ? <Check size={14} className="text-green-400" /> : <Clipboard size={14} />}
                        </button>
                      </div>

                      <Link
                        to={`/classrooms/${cls.id}/gradebook`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-violet-600/15 text-violet-300 border border-violet-500/20 hover:bg-violet-600/25 transition-all"
                      >
                        Xem bảng điểm
                      </Link>

                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                        title="Xóa lớp học"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Student details for selected class */}
          <div className="lg:col-span-1">
            {expandedClassroom ? (
              <div className="card sticky top-20 border-violet-500/30">
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div>
                    <h4 className="font-bold text-base truncate max-w-[200px]">{expandedClassroom.name}</h4>
                    <p className="text-xs text-white/40 mt-0.5">Danh sách học sinh</p>
                  </div>
                  <button
                    onClick={() => setExpandedClassroom(null)}
                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {expandedClassroom.students?.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">
                    <User size={32} className="mx-auto opacity-20 mb-2" />
                    Chưa có học sinh nào tham gia.<br />Chia sẻ mã PIN <span className="text-violet-400 font-bold font-mono">{expandedClassroom.code}</span> để học sinh tham gia!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {expandedClassroom.students?.map((std) => (
                      <div key={std._id} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-xl p-3">
                        <img
                          src={std.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${std.email}`}
                          alt={std.fullName}
                          className="w-9 h-9 rounded-full bg-violet-800 object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate leading-snug">{std.fullName}</p>
                          <p className="text-xs text-white/40 truncate mt-0.5">{std.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card border-dashed border-white/10 flex flex-col items-center justify-center text-center py-16 text-white/30">
                <ArrowRight size={24} className="animate-pulse text-violet-400 mb-2 rotate-90 lg:rotate-0" />
                <p className="text-sm">Bấm vào một lớp học để xem danh sách học sinh tham gia</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && activeTab === 'joined' && (
        <div className="space-y-4 max-w-3xl">
          {joinedList.length === 0 ? (
            <div className="card text-center py-16 text-white/40">
              <UserPlus size={48} className="mx-auto text-white/20 mb-4" />
              <p>Bạn chưa tham gia lớp học nào.</p>
              <button
                onClick={() => setOpenJoinModal(true)}
                className="btn-primary mt-4 text-sm inline-block"
              >
                Nhập mã tham gia lớp học
              </button>
            </div>
          ) : (
            joinedList.map((cls) => (
              <div key={cls.id} className="card border border-white/10 hover:border-white/20 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{cls.name}</h3>
                    <p className="text-white/60 text-sm mt-1">{cls.description || 'Không có mô tả.'}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-violet-400" /> Giáo viên: {cls.teacherId?.fullName || 'Ẩn danh'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {cls.students?.length || 0} học sinh cùng lớp
                      </span>
                    </div>
                  </div>

                  <span className="badge bg-green-500/20 text-green-400 border border-green-500/20 w-fit shrink-0">
                    Đã tham gia
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {openCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-bold text-lg">Tạo lớp học mới</h2>
              <button
                onClick={() => setOpenCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (newClassroom.name.trim()) createMut.mutate(newClassroom)
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Tên lớp học <span className="text-red-400">*</span></label>
                <input
                  required
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Lớp 10A1 - Vật Lý, Nhóm học tập..."
                  className="input text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Mô tả (tùy chọn)</label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Nhập thông tin giới thiệu ngắn về lớp học của bạn..."
                  rows={3}
                  className="input text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenCreateModal(false)}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newClassroom.name.trim() || createMut.isPending}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1"
                >
                  {createMut.isPending ? 'Đang tạo...' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN MODAL */}
      {openJoinModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-bold text-lg">Tham gia lớp học</h2>
              <button
                onClick={() => setOpenJoinModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (joinCode.trim().length === 6) joinMut.mutate(joinCode)
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2 text-center">Nhập mã PIN lớp học gồm 6 ký tự</label>
                <input
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="VD: ABCD12"
                  className="input text-center text-xl font-bold tracking-widest uppercase py-3.5 focus:border-violet-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenJoinModal(false)}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={joinCode.trim().length !== 6 || joinMut.isPending}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1"
                >
                  {joinMut.isPending ? 'Đang xác nhận...' : 'Tham gia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
