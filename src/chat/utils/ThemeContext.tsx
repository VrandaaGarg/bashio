import { createContext, useContext } from 'react';
import { THEMES, type Theme } from './themes.js';

const ThemeContext = createContext<Theme>(THEMES[0]);

export const ThemeProvider = ThemeContext.Provider;

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
