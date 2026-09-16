// src/core/themes/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, ThemeName, ThemeContextState } from './types';
import { themes } from './definitions';
import { applyTokens, TokenTree } from './token-variables';
import { resolveThemeName } from './theme-migration';

// Import CSS files for the new theme system
import './css/variables.css';
import './css/components.css';
import './css/theme-effects.css';

// Default theme that will always be available
export const defaultTheme = themes.light;

// Create context with guaranteed default values
const ThemeContext = createContext<ThemeContextState>({
  theme: defaultTheme,
  setTheme: () => {} // No-op function as default
});

/**
 * The word in this key is historical and deliberately kept.
 *
 * It predates the theme it was named after: `medieval` was retired in Phase 11
 * (D40) and the key still says so. Renaming it would orphan every stored
 * preference in every browser -- including `light` and `dark`, which are the
 * ones anybody actually has -- so the name stays and the migration below deals
 * with the value instead.
 */
const THEME_STORAGE_KEY = 'medieval-companion-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with the theme from localStorage if available, defaultTheme otherwise
  const savedThemeName = localStorage.getItem(THEME_STORAGE_KEY);
  const resolvedThemeName = resolveThemeName(savedThemeName);
  const initialTheme = resolvedThemeName
    ? themes[resolvedThemeName]
    : defaultTheme;
    
  // Initialize with saved theme right away to prevent flashing
  const [currentTheme, setCurrentTheme] = useState<Theme>(initialTheme);
  
  // Apply saved theme immediately on component mount.
  //
  // This is also what completes a retired-theme migration: `applyThemeToDOM`
  // writes the theme's own name back to storage, so a stored `medieval` is
  // replaced by the `light` it resolved to on this first render and every
  // later visit reads a live name directly. The resolution happens once rather
  // than on every load.
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, []);

  // Update localStorage and CSS variables when theme changes
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);
  
  // Apply theme to DOM
  const applyThemeToDOM = (theme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.name);
      
      // Get the root element
      const root = document.documentElement;
      
      // Set theme name as data attribute for theme-specific styles
      root.dataset.theme = theme.name;

      // Tell the browser which way up the theme is, so it paints the controls
      // this stylesheet cannot reach: a `<select>`'s popup list, scrollbars,
      // the focus ring on a native control, a date picker. With this unset the
      // browser assumes light and paints a white popup with dark text over a
      // dark page, which is R22's defect exactly.
      //
      // It is set here, beside `data-theme`, because the document element has
      // one owner (see variables.css's header) -- and as a property rather than
      // a `[data-theme=...]` CSS rule, which is what design language section
      // 12.8 says a missing piece of the surface model looks like. The value is
      // the theme's own `scheme` token, not an inference from its name.
      root.style.colorScheme = theme.tokens.scheme;

      // Apply all theme values to CSS variables
      applyThemeToCssVariables(theme, root);
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  };

  /**
   * Apply the theme's tokens as CSS custom properties.
   *
   * This used to be ~95 hand-written setProperty calls -- a positional map
   * that had to be edited in lockstep with the theme objects, and silently
   * dropped any token nobody remembered to add. Names are now derived from
   * token paths, so the two cannot drift: see token-variables.ts.
   */
  const applyThemeToCssVariables = (theme: Theme, root: HTMLElement) => {
    applyTokens(theme.tokens as unknown as TokenTree, root);
  };

  const setTheme = (themeName: ThemeName) => {
    setCurrentTheme(themes[themeName] || defaultTheme);
  };

  // Create context value with guaranteed theme
  const contextValue = {
    theme: currentTheme || defaultTheme,
    setTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Use the theme context with guaranteed fallback to default theme
 * This hook will never return undefined, protecting components from errors
 */
export const useTheme = (): ThemeContextState => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    console.warn('Theme context not available, using default');
    return { 
      theme: defaultTheme, 
      setTheme: () => {} 
    };
  }
  
  return context;
};