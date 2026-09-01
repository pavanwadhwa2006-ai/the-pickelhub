import { createContext } from 'react';

export const THEMES = {
  CLASSIC_DARK: 'classic-dark',
  GARDEN_LIGHT: 'garden-light',
};

export const ThemeContext = createContext(null);

export default ThemeContext;
