import React, { createContext, useContext, useState, useEffect } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'system'
    const stored = localStorage.getItem('theme') as Theme | null
    return stored || 'system'
  })

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement

    // Remove existing dark class
    root.classList.remove('dark')

    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'system') {
      // Check system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const updateSystemTheme = (e: MediaQueryList | MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }

      // Set initial system preference
      updateSystemTheme(mediaQuery)

      // Listen for system preference changes
      mediaQuery.addEventListener('change', updateSystemTheme)

      return () => {
        mediaQuery.removeEventListener('change', updateSystemTheme)
      }
    }
    // If theme === 'light', we already removed the dark class above
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
