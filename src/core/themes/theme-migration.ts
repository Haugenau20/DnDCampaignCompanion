// src/core/themes/theme-migration.ts
//
// What a stored theme preference resolves to, when the theme it names is gone.
//
// This lives in its own module rather than in `ThemeContext`, where it started,
// for a mechanical reason worth keeping: `ThemeContext` is mocked by every
// suite that renders a component calling `useTheme`, so a pure helper exported
// from it is `undefined` inside those tests -- silently, since a missing mock
// export throws only when called. `SessionManager`'s suite found that
// immediately. A resolver nobody has a reason to mock cannot be mocked away.

import { themes } from './definitions';
import { ThemeName } from './types';

/**
 * Theme names that no longer exist, and what a stored preference for one
 * resolves to now.
 *
 * A retired theme cannot simply be dropped: somebody has the string in
 * `localStorage` under the theme key, or in `users/{uid}.preferences.theme`,
 * and after the theme is deleted that string names nothing. Resolving it in one
 * place -- rather than letting each reader fall back to its own default --
 * makes the answer a stated decision rather than an accident of which lookup
 * ran first.
 *
 * `medieval` was retired in Phase 11 (D40) and resolves to `light`: it was a
 * warm parchment theme, so light is the nearer of the two survivors.
 */
const RETIRED_THEMES: Record<string, ThemeName> = {
  medieval: 'light',
};

/**
 * Resolve a stored theme name to one that exists, or `null` if it cannot be.
 *
 * Returns the name unchanged when it is a live theme, the replacement when it
 * names a retired one, and `null` for anything else -- an absent key, or a
 * value no version of this app ever wrote.
 */
export const resolveThemeName = (stored: string | null | undefined): ThemeName | null => {
  if (!stored) return null;
  if (themes[stored as ThemeName]) return stored as ThemeName;
  return RETIRED_THEMES[stored] ?? null;
};
