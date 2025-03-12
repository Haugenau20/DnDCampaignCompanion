// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, ThemeName, ThemeContextState } from '../types/theme';
import { themes } from '../themes';

// Import theme-specific CSS
import '../styles/themes/medieval-theme.css';
import '../styles/themes/light-theme.css';
import '../styles/themes/dark-theme.css';

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
  
  // Separate function to apply theme to DOM
  const applyThemeToDOM = (theme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.name);
      
      // Update CSS variables
      const root = document.documentElement;
      
      // Set theme name as data attribute for global styling
      root.dataset.theme = theme.name;
      
      // Set theme class on body to enable theme-specific selectors
      document.body.className = '';
      document.body.classList.add(`${theme.name}-theme`);
      
      // Apply all theme values to CSS variables
      applyThemeToCssVariables(theme, root);
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  };

  // Separate function to apply theme values to CSS variables for readability
  const applyThemeToCssVariables = (theme: Theme, root: HTMLElement) => {
    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value);
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects like background, text, etc.
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (typeof subValue === 'string') {
            root.style.setProperty(`--color-${key}-${subKey}`, subValue);
          } else if (typeof subValue === 'object' && subValue !== null) {
            // Handle deeper nesting if needed (like button variants)
            Object.entries(subValue).forEach(([deepKey, deepValue]) => {
              if (typeof deepValue === 'string') {
                root.style.setProperty(`--color-${key}-${subKey}-${deepKey}`, deepValue);
              }
            });
          }
        });
      }
    });
    
    // Fonts
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value);
    });
    
    // Borders
    Object.entries(theme.borders).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (typeof subValue === 'string') {
            root.style.setProperty(`--border-${key}-${subKey}`, subValue);
          }
        });
      }
    });
  };

  const setTheme = (themeName: ThemeName) => {
    try {
      setCurrentTheme(themes[themeName] || defaultTheme);
    } catch (error) {
      console.error('Error setting theme:', error);
      setCurrentTheme(defaultTheme);
    }
  };

  // Create context value with guaranteed theme
  const contextValue = {
    theme: currentTheme || defaultTheme, // Ensure theme is never undefined
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
  
  // If context is somehow unavailable, return default
  if (!context) {
    console.warn('Theme context not available, using default');
    return { 
      theme: defaultTheme, 
      setTheme: () => {} 
    };
  }
  
  // Ensure theme is never undefined
  return {
    ...context,
    theme: context.theme || defaultTheme
  };
};