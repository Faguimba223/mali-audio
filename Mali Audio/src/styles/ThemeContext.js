import { createContext, useContext, useMemo, useState } from 'react';
import { darkColors, lightColors } from './colors';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const value = useMemo(() => ({
    colors: isDark ? darkColors : lightColors,
    isDark,
    toggleTheme: () => setIsDark((current) => !current),
  }), [isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme doit être utilisé dans ThemeProvider.');
  return context;
}