import { useState, useEffect } from 'react';
import { ThemeContext } from './ThemeContextValue';

export function ThemeProvider({ children }) {
  const [theme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-theme', theme);
    root.style.backgroundColor = '#F5F5F5';
    window.localStorage.removeItem('bigkas-theme');
  }, [theme]);

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
