import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, BookOpen, Compass, LogOut, Menu, X,
  TrendingUp, ClipboardList, Users, Shield, Plus, Sun, Moon
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/useAuthStore'
import { useTheme } from '../providers/ThemeProvider'

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
  const { theme, toggleTheme } = useTheme()

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
    <nav className="sticky top-0 z-50 sq-bg-overlay backdrop-blur-xl sq-border-b">
      <div className="sq-container h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl shrink-0 sq-text-foreground">
          <div className="w-9 h-9 rounded-xl sq-bg-gradient-primary flex items-center justify-center shadow-lg">
            <Zap size={17} className="sq-text-white" />
          </div>
          <span className="sq-text-gradient font-bold tracking-tight">SyncQuiz</span>
        </Link>

        {/* Desktop links */}
        {user && (
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `sq-nav-link ${isActive ? 'active' : ''}`
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
                  `sq-nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Shield size={15} />
                <span>{t('nav.admin')}</span>
              </NavLink>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1.5">

          {/* Language switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg sq-border sq-bg-surface text-xs font-semibold sq-text-muted hover:sq-bg-surface-2 transition-all"
            title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span>🌐</span>
            <span>{i18n.language === 'vi' ? 'VI' : 'EN'}</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="sq-theme-toggle"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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

              <div className="flex items-center gap-1.5">
                <Link to="/profile" className="block shrink-0">
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.email}`}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-xl object-cover sq-bg-surface sq-border hover:sq-border-primary transition-all"
                    title={t('nav.profile')}
                  />
                </Link>
                <button
                  onClick={handleLogout}
                  className="sq-btn sq-btn-ghost sq-btn-icon sq-text-muted hover:sq-text-foreground"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link to="/login" className="sq-btn sq-btn-secondary sq-btn-sm px-3">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="sq-btn sq-btn-primary sq-btn-sm px-3">
                {t('nav.signup')}
              </Link>
            </div>
          )}

          {/* Mobile menu */}
          <button
            className="md:hidden sq-btn sq-btn-ghost sq-btn-icon sq-text-muted hover:sq-text-foreground"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {open && user && (
        <div className="md:hidden sq-border-t sq-bg-overlay backdrop-blur-xl">
          <div className="sq-container py-3 flex flex-col gap-1">
            {navLinks.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `sq-nav-link ${isActive ? 'active' : ''}`
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
                  `sq-nav-link ${isActive ? 'active' : ''}`
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