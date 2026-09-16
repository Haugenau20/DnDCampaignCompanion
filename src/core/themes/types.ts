// src/core/themes/types.ts
// Moved from src/types/theme.ts

import type { ThemeTokens } from './token-types';

/**
 * Available theme names
 */
export type ThemeName = 'light' | 'dark';

/**
 * The token tree lives in token-types.ts. It is re-exported here so `types`
 * stays the one import site for a theme's shape.
 */
export type {
  ThemeTokens,
  SurfacePair,
  ActionPair,
  OutcomePair,
  CueToken,
  ColorSchemeToken,
} from './token-types';

/**
 * Complete theme configuration
 */
export interface Theme {
  name: ThemeName;
  /**
   * Every value the theme contributes, as one nested tree. Variable names are
   * derived from token paths at apply time rather than listed by hand, so a
   * token cannot exist without its variable or a variable without its token.
   */
  tokens: ThemeTokens;
}

/**
 * Theme context state
 */
export interface ThemeContextState {
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
}