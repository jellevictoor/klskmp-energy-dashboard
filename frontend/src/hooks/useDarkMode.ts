import { useEffect } from 'react'

/**
 * Hook that automatically applies dark mode based on system preference
 * Uses the prefers-color-scheme media query to detect system theme
 */
export function useDarkMode() {
  useEffect(() => {
    // Check if the browser supports the media query
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Function to update the dark mode class
    const updateDarkMode = (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Set initial dark mode based on system preference
    updateDarkMode(mediaQuery)

    // Listen for changes to system preference
    mediaQuery.addEventListener('change', updateDarkMode)

    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', updateDarkMode)
    }
  }, [])
}
