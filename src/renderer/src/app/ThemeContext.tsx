import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

function getInitial(): Theme {
  const s = localStorage.getItem('theme') as Theme | null
  if (s === 'dark' || s === 'light') return s
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

interface ThemeCtx { theme: Theme; toggle: () => void }
const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
