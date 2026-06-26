import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/useAuthStore'

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

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser)
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (accessToken) loadUser()
  }, []) // eslint-disable-line

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join" element={<PlayerJoinPage />} />
        <Route path="/join/:pin" element={<PlayerJoinPage />} />
        <Route path="/play/:pin" element={<PlayerGamePage />} />

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
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
