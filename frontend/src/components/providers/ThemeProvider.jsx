import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // 1. Check localStorage
    const stored = localStorage.getItem('syncquiz-theme')
    if (stored === 'light' || stored === 'dark') return stored
    // 2. Check system preference
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    // 3. Default to dark
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('syncquiz-theme', theme)
  }, [theme])

  // Listen for system preference changes
  useEffect(() => {
    const stored = localStorage.getItem('syncquiz-theme')
    if (stored) return // User has explicitly set a preference
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e) => setThemeState(e.matches ? 'light' : 'dark')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  const setTheme = (t) => setThemeState(t)

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
