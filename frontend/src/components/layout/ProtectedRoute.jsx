import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (!initialized || isLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white/50">Dang xac thuc...</div>
  }

  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
