// src/core/themes/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, ThemeName, ThemeContextState } from './types';
import { themes } from './definitions';
import { applyTokens, TokenTree } from './token-variables';

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

const THEME_STORAGE_KEY = 'medieval-companion-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with the theme from localStorage if available, defaultTheme otherwise
  const savedThemeName = localStorage.getItem(THEME_STORAGE_KEY);
  const initialTheme = savedThemeName && themes[savedThemeName as ThemeName] 
    ? themes[savedThemeName as ThemeName] 
    : defaultTheme;
    
  // Initialize with saved theme right away to prevent flashing
  const [currentTheme, setCurrentTheme] = useState<Theme>(initialTheme);
  
  // Apply saved theme immediately on component mount
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