import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, BookOpen, Compass, LogOut, Menu, X, TrendingUp, ClipboardList, Users } from 'lucide-react'
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
    <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Zap className="text-violet-400" size={24} />
          <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
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
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/20 text-violet-300'
                      : 'text-white/50 hover:text-white hover:bg-white/8'
                  }`
                }
              >
                <Icon size={15} />
                {t(`nav.${key}`)}
              </NavLink>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button 
            onClick={toggleLanguage} 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span className="text-sm">🌐</span>
            <span>{i18n.language === 'vi' ? 'VI' : 'EN'}</span>
          </button>

          {user ? (
            <>
              <Link to="/join" className="hidden md:block btn-primary text-sm py-2">
                {t('nav.joinGame')}
              </Link>
              <div className="flex items-center gap-2">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.email}`}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full bg-violet-700"
                />
                <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors" title={t('nav.logout')}>
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary text-sm py-2 px-4">{t('nav.login')}</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">{t('nav.signup')}</Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button className="md:hidden text-white/70" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && user && (
        <div className="md:hidden border-t border-white/10 bg-gray-950 px-4 py-3 flex flex-col gap-1">
          {navLinks.map(({ to, key, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-violet-600 text-white' : 'text-white/70'
                }`
              }
            >
              <Icon size={16} /> {t(`nav.${key}`)}
            </NavLink>
          ))}
          <Link to="/join" onClick={() => setOpen(false)} className="btn-primary text-sm mt-2 text-center">
            {t('nav.joinGame')}
          </Link>
        </div>
      )}
    </nav>
  )
}
