import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import useAuthStore from './store/useAuthStore'

// BUG-03 fix: when Cognito is enabled, token lives in Amplify session (not Zustand)
const isCognitoEnabled = !!(import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID && import.meta.env.VITE_AWS_COGNITO_CLIENT_ID)

import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AdminRoute from './components/layout/AdminRoute'

// Lazy-loaded pages — reduces initial bundle from ~1.3MB to ~300KB
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const QuizListPage = lazy(() => import('./pages/quiz/QuizListPage'))
const QuizEditorPage = lazy(() => import('./pages/quiz/QuizEditorPage'))
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'))
const ProfilePage = lazy(() => import('./pages/auth/ProfilePage'))
const HomeworkPage = lazy(() => import('./pages/homework/HomeworkPage'))
const TakeHomeworkPage = lazy(() => import('./pages/homework/TakeHomeworkPage'))
const ClassroomListPage = lazy(() => import('./pages/classroom/ClassroomListPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const FavoritesPage = lazy(() => import('./pages/favorites/FavoritesPage'))

// Game pages — eager loaded (user navigates to them immediately)
import HostLobbyPage from './pages/game/HostLobbyPage'
import HostGamePage from './pages/game/HostGamePage'
import PlayerJoinPage from './pages/game/PlayerJoinPage'
import PlayerGamePage from './pages/game/PlayerGamePage'
import ResultsPage from './pages/game/ResultsPage'

// Shared loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(225 42% 5%)' }}>
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'hsl(270 90% 58% / 0.3)', borderTopColor: 'hsl(270 90% 58%)' }} />
    </div>
  )
}

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser)
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (isCognitoEnabled || accessToken) loadUser()
  }, []) // eslint-disable-line

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join" element={<PlayerJoinPage />} />
          <Route path="/join/:pin" element={<PlayerJoinPage />} />
          <Route path="/play/:pin" element={<PlayerGamePage />} />
          <Route path="/play/:gameId/lobby" element={<PlayerGamePage />} />

          {/* Full-screen protected routes (no navbar) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/homework/:id/take" element={<TakeHomeworkPage />} />
          </Route>

          <Route element={<Layout />}>
            <Route path="/explore" element={<ExplorePage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/quizzes" element={<QuizListPage />} />
              <Route path="/quizzes/new" element={<QuizEditorPage />} />
              <Route path="/quizzes/:id/edit" element={<QuizEditorPage />} />
              <Route path="/host/:quizId" element={<HostLobbyPage />} />
              <Route path="/host/game/:pin" element={<HostGamePage />} />
              <Route path="/results/:sessionId" element={<ResultsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/homework" element={<HomeworkPage />} />
              <Route path="/classrooms" element={<ClassroomListPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
