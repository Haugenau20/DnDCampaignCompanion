// src/themes/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, ThemeName, ThemeContextState } from './types';
import { themes } from './definitions';

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

  // Apply CSS variables based on the theme
  const applyThemeToCssVariables = (theme: Theme, root: HTMLElement) => {
    // Core Colors
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    
    // Background Colors
    root.style.setProperty('--bg-primary', theme.colors.background.primary);
    root.style.setProperty('--bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--bg-accent', theme.colors.background.accent);
    
    // Text Colors
    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--text-accent', theme.colors.text.accent);
    
    // Card Colors
    root.style.setProperty('--card-bg', theme.colors.card.background);
    root.style.setProperty('--card-border', theme.colors.card.border);
    
    // Status Colors
    root.style.setProperty('--status-general', theme.colors.ui.statusGeneral);
    root.style.setProperty('--status-active', theme.colors.ui.statusActive);
    root.style.setProperty('--status-completed', theme.colors.ui.statusCompleted);
    root.style.setProperty('--status-failed', theme.colors.ui.statusFailed);
    root.style.setProperty('--status-unknown', theme.colors.ui.statusUnknown);
    root.style.setProperty('--status-text', theme.colors.ui.statusText);
    
    // UI Element Colors
    root.style.setProperty('--header-bg', theme.colors.ui.headerBackground);
    root.style.setProperty('--footer-bg', theme.colors.ui.footerBackground);
    root.style.setProperty('--heading-color', theme.colors.ui.heading);
    root.style.setProperty('--hover-light', theme.colors.ui.hoverLight);
    root.style.setProperty('--hover-medium', theme.colors.ui.hoverMedium);
    root.style.setProperty('--icon-bg', theme.colors.ui.iconBackground);
    root.style.setProperty('--icon-border', theme.colors.ui.iconBorder);
    
    // Form Element Colors
    root.style.setProperty('--input-bg', theme.colors.ui.inputBackground);
    root.style.setProperty('--input-placeholder', theme.colors.ui.inputPlaceholder);
    root.style.setProperty('--input-border', theme.colors.ui.inputBorder);
    root.style.setProperty('--input-border-focus', theme.colors.ui.inputBorderFocus);
    root.style.setProperty('--input-ring-focus', theme.colors.ui.inputRingFocus);
    root.style.setProperty('--input-error-border', theme.colors.ui.inputErrorBorder);
    root.style.setProperty('--input-error-focus', theme.colors.ui.inputErrorFocus);
    root.style.setProperty('--input-error-ring', theme.colors.ui.inputErrorRing);
    root.style.setProperty('--input-success-border', theme.colors.ui.inputSuccessBorder);
    root.style.setProperty('--input-success-focus', theme.colors.ui.inputSuccessFocus);
    root.style.setProperty('--input-success-ring', theme.colors.ui.inputSuccessRing);
    root.style.setProperty('--form-disabled-bg', theme.colors.ui.formDisabledBg);
    root.style.setProperty('--form-label-text', theme.colors.ui.formLabelText);
    root.style.setProperty('--form-helper-text', theme.colors.ui.formHelperText);
    root.style.setProperty('--form-error-text', theme.colors.ui.formErrorText);
    root.style.setProperty('--form-success-text', theme.colors.ui.formSuccessText);
    
    // Button Colors
    root.style.setProperty('--button-primary-bg', theme.colors.button.primary.background);
    root.style.setProperty('--button-primary-text', theme.colors.button.primary.text);
    root.style.setProperty('--button-primary-hover', theme.colors.button.primary.hover);
    root.style.setProperty('--button-secondary-bg', theme.colors.button.secondary.background);
    root.style.setProperty('--button-secondary-text', theme.colors.button.secondary.text);
    root.style.setProperty('--button-secondary-hover', theme.colors.button.secondary.hover);
    root.style.setProperty('--button-link-bg', theme.colors.button.link.background);
    root.style.setProperty('--button-link-text', theme.colors.button.link.text);
    root.style.setProperty('--button-link-hover', theme.colors.button.link.hover);
    root.style.setProperty('--button-outline-bg', theme.colors.button.outline.background);
    root.style.setProperty('--button-outline-text', theme.colors.button.outline.text);
    root.style.setProperty('--button-outline-hover', theme.colors.button.outline.hover);
    root.style.setProperty('--button-outline-border', theme.colors.button.outline.border);
    root.style.setProperty('--button-ghost-bg', theme.colors.button.ghost.background);
    root.style.setProperty('--button-ghost-text', theme.colors.button.ghost.text);
    root.style.setProperty('--button-ghost-hover', theme.colors.button.ghost.hover);
    
    // Error and Danger Colors
    root.style.setProperty('--error-bg', theme.colors.ui.errorBackground);
    root.style.setProperty('--delete-button-bg', theme.colors.ui.deleteButtonBackground);
    root.style.setProperty('--delete-button-text', theme.colors.ui.deleteButtonText);
    root.style.setProperty('--delete-button-hover', theme.colors.ui.deleteButtonHover);
    
    // Location Type Colors
    root.style.setProperty('--location-type-region', theme.colors.primary);
    root.style.setProperty('--location-type-city', theme.colors.secondary);
    root.style.setProperty('--location-type-town', theme.colors.accent);
    root.style.setProperty('--location-type-village', theme.colors.accent);
    root.style.setProperty('--location-type-dungeon', theme.colors.ui.statusFailed);
    root.style.setProperty('--location-type-landmark', theme.colors.ui.statusActive);
    root.style.setProperty('--location-type-building', theme.colors.ui.statusGeneral);
    root.style.setProperty('--location-type-poi', theme.colors.ui.statusCompleted);
    
    // Spinner Colors
    root.style.setProperty('--spinner-border', theme.colors.ui.inputBorder);
    root.style.setProperty('--spinner-active', theme.colors.primary);
    
    // Journal Specific Colors
    root.style.setProperty('--journal-leather', theme.colors.ui.journalLeather);
    root.style.setProperty('--journal-binding', theme.colors.ui.journalBinding);
    root.style.setProperty('--journal-stitch', theme.colors.ui.journalStitch);
    root.style.setProperty('--journal-page-shadow', theme.colors.ui.journalPageShadow);
    root.style.setProperty('--journal-section-divider', theme.colors.ui.journalSectionDivider);
    root.style.setProperty('--journal-character-card-bg', theme.colors.ui.journalCharacterCardBg);
    root.style.setProperty('--journal-character-card-hover', theme.colors.ui.journalCharacterCardHover);
    root.style.setProperty('--journal-quest-item-bg', theme.colors.ui.journalQuestItemBg);
    root.style.setProperty('--journal-quest-item-hover', theme.colors.ui.journalQuestItemHover);
    root.style.setProperty('--journal-activity-hover', theme.colors.ui.journalActivityHover);
    root.style.setProperty('--journal-notes-area', theme.colors.ui.journalNotesArea);
    
    // Book Viewer Colors
    root.style.setProperty('--book-bg', theme.colors.card.background);
    root.style.setProperty('--book-header-bg', theme.colors.background.secondary);
    root.style.setProperty('--book-nav-bg', theme.colors.background.secondary);
    root.style.setProperty('--book-content-bg', theme.colors.card.background);
    root.style.setProperty('--book-pagination-bg', theme.colors.background.secondary);
    
    // Fonts
    root.style.setProperty('--font-primary', theme.fonts.primary);
    root.style.setProperty('--font-secondary', theme.fonts.secondary);
    root.style.setProperty('--font-heading', theme.fonts.heading);
    
    // Border Styles
    root.style.setProperty('--border-radius-sm', theme.borders.radius.sm);
    root.style.setProperty('--border-radius-md', theme.borders.radius.md);
    root.style.setProperty('--border-radius-lg', theme.borders.radius.lg);
    root.style.setProperty('--border-width-sm', theme.borders.width.sm);
    root.style.setProperty('--border-width-md', theme.borders.width.md);
    root.style.setProperty('--border-width-lg', theme.borders.width.lg);
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