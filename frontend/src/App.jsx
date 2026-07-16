import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/useAuthStore'

// BUG-03 fix: when Cognito is enabled, token lives in Amplify session (not Zustand)
// so we must call loadUser unconditionally on mount in that case
const isCognitoEnabled = !!(import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID && import.meta.env.VITE_AWS_COGNITO_CLIENT_ID)

import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import QuizListPage from './pages/quiz/QuizListPage'
import QuizEditorPage from './pages/quiz/QuizEditorPage'
import HostLobbyPage from './pages/game/HostLobbyPage'
import HostGamePage from './pages/game/HostGamePage'
import PlayerJoinPage from './pages/game/PlayerJoinPage'
import PlayerGamePage from './pages/game/PlayerGamePage'
import ResultsPage from './pages/game/ResultsPage'
import ExplorePage from './pages/ExplorePage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import HomeworkPage from './pages/homework/HomeworkPage'
import ClassroomListPage from './pages/classroom/ClassroomListPage'
import TakeHomeworkPage from './pages/homework/TakeHomeworkPage'

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser)
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    // When Cognito is enabled, token lives in Amplify (not Zustand store),
    // so we always call loadUser on mount to restore session.
    // When using local auth, only call if we have a stored token.
    if (isCognitoEnabled || accessToken) loadUser()
  }, []) // eslint-disable-line

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join" element={<PlayerJoinPage />} />
        <Route path="/join/:pin" element={<PlayerJoinPage />} />
        <Route path="/play/:pin" element={<PlayerGamePage />} />
        
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
            <Route path="/homework" element={<HomeworkPage />} />
            <Route path="/classrooms" element={<ClassroomListPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
