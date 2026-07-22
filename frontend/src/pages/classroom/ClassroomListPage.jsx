import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, UserPlus, Users, Trash2, X, Clipboard, Check, Calendar, ArrowRight, User } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import { getClassrooms, createClassroom, joinClassroom, deleteClassroom } from '../../api/advanced.api'

export default function ClassroomListPage() {
  const [activeTab, setActiveTab] = useState('taught') // 'taught' | 'joined'
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [openJoinModal, setOpenJoinModal] = useState(false)
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' })
  const [joinCode, setJoinCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const [expandedClassroom, setExpandedClassroom] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['classrooms'],
    queryFn: getClassrooms,
  })

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
    <div className="sq-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="sq-page-title flex items-center gap-2">
            <Users className="sq-text-primary-light" /> Lớp học
          </h1>
          <p className="sq-page-subtitle">Quản lý lớp học bạn giảng dạy hoặc tham gia học tập</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenJoinModal(true)}
            className="sq-btn sq-btn-secondary flex items-center gap-2 text-sm"
          >
            <UserPlus size={16} /> Tham gia lớp
          </button>
          <button
            onClick={() => setOpenCreateModal(true)}
            className="sq-btn sq-btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Tạo lớp mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sq-tabs mb-6">
        <button
          onClick={() => { setActiveTab('taught'); setExpandedClassroom(null); }}
          className={`sq-tab ${activeTab === 'taught' ? 'active' : ''}`}
        >
          Lớp tôi giảng dạy ({taughtList.length})
        </button>
        <button
          onClick={() => { setActiveTab('joined'); setExpandedClassroom(null); }}
          className={`sq-tab ${activeTab === 'joined' ? 'active' : ''}`}
        >
          Lớp tôi tham gia ({joinedList.length})
        </button>
      </div>

      {isLoading && <div className="text-center sq-text-muted py-16">Đang tải danh sách lớp học...</div>}

      {!isLoading && activeTab === 'taught' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class List */}
          <div className="lg:col-span-2 space-y-4">
            {taughtList.length === 0 ? (
              <div className="sq-card text-center py-16 sq-text-muted">
                <Users size={48} className="mx-auto sq-text-subtle opacity-50 mb-4" />
                <p>Bạn chưa tạo lớp học nào.</p>
                <button
                  onClick={() => setOpenCreateModal(true)}
                  className="sq-btn sq-btn-primary mt-4 text-sm"
                >
                  Tạo lớp đầu tiên của bạn
                </button>
              </div>
            ) : (
              taughtList.map((cls) => (
                <div
                  key={cls.id}
                  className={`sq-card sq-border cursor-pointer transition-all ${
                    expandedClassroom?.id === cls.id
                      ? 'sq-border-primary sq-bg-primary-soft'
                      : ''
                  }`}
                  onClick={() => setExpandedClassroom(cls)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg sq-text-foreground">{cls.name}</h3>
                        <span className="sq-badge sq-badge-primary">
                          Giáo viên
                        </span>
                      </div>
                      <p className="sq-text-muted text-sm mt-1 line-clamp-2">{cls.description || 'Không có mô tả.'}</p>

                      <div className="flex flex-wrap gap-4 mt-4 text-xs sq-text-subtle">
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {cls.students?.length || 0} học sinh
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> Tạo ngày {new Date(cls.createdAt).toLocaleDateString('vi')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 sq-bg-surface sq-border rounded-lg px-2.5 py-1.5 font-mono">
                        <span className="sq-text-subtle text-xs uppercase tracking-wider mr-1">PIN:</span>
                        <span className="sq-text-primary font-bold tracking-wider">{cls.code}</span>
                        <button
                          onClick={() => copyToClipboard(cls.code)}
                          className="sq-text-muted hover:sq-text-foreground transition-colors ml-1"
                        >
                          {copiedCode === cls.code ? <Check size={14} className="sq-text-success" /> : <Clipboard size={14} />}
                        </button>
                      </div>

                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="sq-btn sq-btn-ghost sq-btn-sm sq-text-danger opacity-70 hover:opacity-100 hover:sq-bg-danger-soft"
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
              <div className="sq-card sticky top-20 sq-border-primary">
                <div className="flex items-center justify-between pb-4 sq-border-b mb-4">
                  <div>
                    <h4 className="font-bold text-base truncate max-w-[200px] sq-text-foreground">{expandedClassroom.name}</h4>
                    <p className="text-xs sq-text-subtle mt-0.5">Danh sách học sinh</p>
                  </div>
                  <button
                    onClick={() => setExpandedClassroom(null)}
                    className="w-7 h-7 rounded-full sq-bg-surface hover:sq-bg-surface-2 flex items-center justify-center sq-text-muted hover:sq-text-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {expandedClassroom.students?.length === 0 ? (
                  <div className="text-center py-8 sq-text-subtle text-sm">
                    <User size={32} className="mx-auto opacity-50 mb-2" />
                    Chưa có học sinh nào tham gia.<br />Chia sẻ mã PIN <span className="sq-text-primary font-bold font-mono">{expandedClassroom.code}</span> để học sinh tham gia!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {expandedClassroom.students?.map((std) => (
                      <div key={std._id} className="flex items-center gap-3 sq-bg-surface sq-border rounded-xl p-3">
                        <img
                          src={std.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${std.email}`}
                          alt={std.fullName}
                          className="w-9 h-9 rounded-full sq-bg-primary-soft object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate leading-snug sq-text-foreground">{std.fullName}</p>
                          <p className="text-xs sq-text-subtle truncate mt-0.5">{std.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="sq-card border-dashed sq-border flex flex-col items-center justify-center text-center py-16 sq-text-subtle">
                <ArrowRight size={24} className="animate-pulse sq-text-primary mb-2 rotate-90 lg:rotate-0" />
                <p className="text-sm">Bấm vào một lớp học để xem danh sách học sinh tham gia</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && activeTab === 'joined' && (
        <div className="space-y-4 max-w-3xl">
          {joinedList.length === 0 ? (
            <div className="sq-card text-center py-16 sq-text-muted">
              <UserPlus size={48} className="mx-auto sq-text-subtle opacity-50 mb-4" />
              <p>Bạn chưa tham gia lớp học nào.</p>
              <button
                onClick={() => setOpenJoinModal(true)}
                className="sq-btn sq-btn-primary mt-4 text-sm"
              >
                Nhập mã tham gia lớp học
              </button>
            </div>
          ) : (
            joinedList.map((cls) => (
              <div key={cls.id} className="sq-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg sq-text-foreground">{cls.name}</h3>
                    <p className="sq-text-muted text-sm mt-1">{cls.description || 'Không có mô tả.'}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs sq-text-subtle">
                      <span className="flex items-center gap-1">
                        <User size={12} className="sq-text-primary-light" /> Giáo viên: {cls.teacherId?.fullName || 'Ẩn danh'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {cls.students?.length || 0} học sinh cùng lớp
                      </span>
                    </div>
                  </div>

                  <span className="sq-badge sq-badge-success w-fit shrink-0">
                    <Check size={12} /> Đã tham gia
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal open={openCreateModal} onClose={() => setOpenCreateModal(false)} title="Tạo lớp học mới" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newClassroom.name.trim()) createMut.mutate(newClassroom)
          }}
          className="space-y-4"
        >
          <Input
            label="Tên lớp học"
            required
            value={newClassroom.name}
            onChange={(e) => setNewClassroom((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="VD: Lớp 10A1 - Vật Lý, Nhóm học tập..."
            autoFocus
          />
          <Textarea
            label="Mô tả (tùy chọn)"
            value={newClassroom.description}
            onChange={(e) => setNewClassroom((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Nhập thông tin giới thiệu ngắn về lớp học của bạn..."
            rows={3}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenCreateModal(false)}
              className="sq-btn sq-btn-secondary flex-1 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!newClassroom.name.trim() || createMut.isPending}
              className="sq-btn sq-btn-primary flex-1 py-2 text-sm"
            >
              {createMut.isPending ? 'Đang tạo...' : 'Tạo lớp'}
            </button>
          </div>
        </form>
      </Modal>

      {/* JOIN MODAL */}
      <Modal open={openJoinModal} onClose={() => setOpenJoinModal(false)} title="Tham gia lớp học" size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (joinCode.trim().length === 6) joinMut.mutate(joinCode)
          }}
          className="space-y-4"
        >
          <div>
            <label className="sq-label text-center block">Nhập mã PIN lớp học gồm 6 ký tự</label>
            <input
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="VD: ABCD12"
              className="sq-input text-center text-xl font-bold tracking-widest uppercase py-3.5 mt-2"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenJoinModal(false)}
              className="sq-btn sq-btn-secondary flex-1 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={joinCode.trim().length !== 6 || joinMut.isPending}
              className="sq-btn sq-btn-primary flex-1 py-2 text-sm"
            >
              {joinMut.isPending ? 'Đang xác nhận...' : 'Tham gia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}