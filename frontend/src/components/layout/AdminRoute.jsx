import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'

/**
 * Protects admin routes. Redirects to /dashboard if not authenticated.
 * Redirects to /dashboard if authenticated but not admin.
 * Does NOT use localStorage role — relies on the user object from the store
 * which was fetched/verified from the backend after login.
 */
export default function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!accessToken && !user) {
    return <Navigate to="/login" replace />
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
