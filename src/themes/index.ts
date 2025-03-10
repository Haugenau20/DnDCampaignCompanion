// src/themes/index.ts
import { Theme } from '../types/theme';
import { darkTheme } from './darkTheme';
import { medievalTheme } from './medievalTheme';
import { lightTheme } from './lightTheme';

// Export all themes in a record for easy access
export const themes: Record<Theme['name'], Theme> = {
  light: lightTheme,
  dark: darkTheme,
  medieval: medievalTheme,
  // Add new themes here as they are created
};

// You can also export individual themes if needed
export { darkTheme, medievalTheme, lightTheme };