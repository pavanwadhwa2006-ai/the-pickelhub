/**
 * ThemeProvider Component
 *
 * Provides theme management across "Classic dark" (default) and "Garden light".
 * Persists user preference in localStorage and synchronizes data-theme attribute on document root.
 */

import { useState, useEffect } from 'react';
import { ThemeContext, THEMES } from './themeConstants';

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('picklehub_theme');
      if (savedTheme === THEMES.GARDEN_LIGHT || savedTheme === THEMES.CLASSIC_DARK) {
        return savedTheme;
      }
    } catch {
      // Ignore localStorage errors
    }
    return THEMES.CLASSIC_DARK;
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('picklehub_theme', theme);
    } catch {
      // Ignore localStorage errors
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.GARDEN_LIGHT || newTheme === THEMES.CLASSIC_DARK) {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: theme === THEMES.CLASSIC_DARK }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
