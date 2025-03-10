// src/utils/theme-utils.ts
import { ThemeName } from '../types/theme';

/**
 * Determines if the current theme is the D&D theme
 * @param themeName - Current theme name
 * @returns boolean indicating if D&D theme is active
 */
export const ismedievalTheme = (themeName: ThemeName): boolean => {
  return themeName === 'medieval';
};

/**
 * Generates theme-specific class names based on current theme
 * @param themeName - Current theme name
 * @param componentName - Component name for specific styling 
 * @returns String of class names to apply
 */
export const getThemeClasses = (
  themeName: ThemeName,
  componentName: 'card' | 'button' | 'input' | 'typography' | 'layout' | 'navigation'
): string => {
  if (themeName === 'medieval') {
    switch (componentName) {
      case 'card':
        return 'medieval-card';
      case 'button':
        return 'medieval-button';
      case 'input':
        return 'medieval-input';
      case 'typography':
        return 'medieval-typography';
      case 'layout':
        return 'medieval-theme';
      case 'navigation':
        return 'medieval-navigation';
      default:
        return '';
    }
  }
  
  // Add other theme-specific classes as needed
//   if (themeName === 'cyberpunk') {
    // Future cyberpunk theme styles
//   }
  
  return '';
};

/**
 * Combines component variant styles with theme-specific styles
 * @param themeName - Current theme name
 * @param baseStyles - Base component styles
 * @param themeStyles - Theme-specific styles to apply conditionally
 * @returns Combined class string
 */
export const combineThemeStyles = (
  themeName: ThemeName,
  baseStyles: string,
  themeStyles: Partial<Record<ThemeName, string>>
): string => {
  const themeSpecificStyles = themeStyles[themeName] || '';
  return `${baseStyles} ${themeSpecificStyles}`.trim();
};

/**
 * Applies D&D theme specific decorations to elements
 * @param element - Element type to decorate
 * @returns CSS class for the decoration
 */
export const getMedievalDecoration = (
  element: 'heading' | 'card' | 'divider' | 'section'
): string => {
  switch (element) {
    case 'heading':
      return 'medieval-heading';
    case 'card':
      return 'medieval-card';
    case 'divider':
      return 'medieval-divider';
    case 'section':
      return 'medieval-section';
    default:
      return '';
  }
};