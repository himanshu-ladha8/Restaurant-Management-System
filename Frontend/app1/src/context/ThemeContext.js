import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const defaultThemeValue = {
  mode: 'light',
  toggleMode: () => {},
  isDark: false,
  isLight: true,
};

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  return context ?? defaultThemeValue;
};

export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage or default to 'light'
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const value = {
    mode,
    toggleMode,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

