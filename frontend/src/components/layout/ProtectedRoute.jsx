import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import { useEffect } from 'react'

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isLoading = useAuthStore((s) => s.isLoading)
  const loadUser = useAuthStore((s) => s.loadUser)

  // Trigger auth check on protected route mount
  useEffect(() => {
    if (!user && accessToken && !isLoading) {
      loadUser()
    }
  }, [user, accessToken, isLoading, loadUser])

  // Show nothing while auth is being determined
  if (!accessToken && !user && !isLoading) {
    return <Navigate to="/login" replace />
  }

  // If we have token but no user yet, still show content (loadUser will run)
  // This prevents blank pages while auth hydrates
  return <Outlet />
}
