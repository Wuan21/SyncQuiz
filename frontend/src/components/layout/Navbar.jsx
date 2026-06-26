import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, BookOpen, Compass, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../store/useAuthStore'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/quizzes', label: 'My Quizzes', icon: BookOpen },
  { to: '/explore', label: 'Explore', icon: Compass },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logoutFn = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logoutFn()
    navigate('/login')
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
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/join" className="hidden md:block btn-primary text-sm py-2">
                Join Game
              </Link>
              <div className="flex items-center gap-2">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.email}`}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full bg-violet-700"
                />
                <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors" title="Logout">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary text-sm py-2 px-4">Log in</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">Sign up</Link>
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
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-violet-600 text-white' : 'text-white/70'
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
          <Link to="/join" onClick={() => setOpen(false)} className="btn-primary text-sm mt-2 text-center">
            Join Game
          </Link>
        </div>
      )}
    </nav>
  )
}
