import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, BookOpen, Compass, LogOut, Menu, X,
  TrendingUp, ClipboardList, Users, Shield, Plus
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/useAuthStore'

const navLinks = [
  { to: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { to: '/quizzes', key: 'quizzes', icon: BookOpen },
  { to: '/explore', key: 'explore', icon: Compass },
  { to: '/classrooms', key: 'classrooms', icon: Users },
  { to: '/analytics', key: 'analytics', icon: TrendingUp },
  { to: '/homework', key: 'homework', icon: ClipboardList },
]

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logoutFn = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logoutFn()
    navigate('/login')
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(newLang)
    localStorage.setItem('lng', newLang)
  }

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/85 backdrop-blur-md border-b border-white/[0.07]">
      <div className="sq-container h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap size={16} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent font-bold tracking-tight">
            SyncQuiz
          </span>
        </Link>

        {/* Desktop links */}
        {user && (
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'text-white/45 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                <Icon size={15} />
                <span>{t(`nav.${key}`)}</span>
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-red-500/15 text-red-300'
                      : 'text-white/45 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                <Shield size={15} />
                <span>{t('nav.admin')}</span>
              </NavLink>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.05] transition-all"
            title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span>🌐</span>
            <span>{i18n.language === 'vi' ? 'VI' : 'EN'}</span>
          </button>

          {user ? (
            <>
              <Link
                to="/quizzes/new"
                className="hidden md:inline-flex items-center gap-1.5 sq-btn sq-btn-primary sq-btn-sm"
              >
                <Plus size={14} />
                <span>{t('dashboard.createQuizBtn')}</span>
              </Link>

              <div className="flex items-center gap-2">
                {/* Avatar */}
                <Link to="/profile" className="block shrink-0">
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.email}`}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-xl object-cover bg-violet-700 hover:ring-2 hover:ring-violet-400/50 transition-all"
                    title={t('nav.profile')}
                  />
                </Link>
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="sq-btn sq-btn-ghost sq-btn-icon text-white/35 hover:text-white/70"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="sq-btn sq-btn-secondary sq-btn-sm px-3">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="sq-btn sq-btn-primary sq-btn-sm px-3">
                {t('nav.signup')}
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden sq-btn sq-btn-ghost sq-btn-icon text-white/50"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && user && (
        <div className="md:hidden border-t border-white/[0.07] bg-gray-950/95 backdrop-blur-md">
          <div className="sq-container py-3 flex flex-col gap-1">
            {navLinks.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                <Icon size={17} />
                <span>{t(`nav.${key}`)}</span>
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-red-500/15 text-red-300'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                <Shield size={17} />
                <span>{t('nav.admin')}</span>
              </NavLink>
            )}
            <Link
              to="/quizzes/new"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 sq-btn sq-btn-primary"
            >
              <Plus size={16} />
              {t('dashboard.createQuizBtn')}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
