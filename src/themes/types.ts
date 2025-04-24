// src/themes/types.ts
// Moved from src/types/theme.ts

/**
 * Available theme names
 */
export type ThemeName = 'light' | 'medieval' | 'dark';

/**
 * Theme colors configuration
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: {
    primary: string;
    secondary: string;
    accent: string;
  };
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
  card: {
    background: string;
    border: string;
  };
  button: {
    primary: {
      background: string;
      text: string;
      hover: string;
    };
    secondary: {
      background: string;
      text: string;
      hover: string;
    };
    link: {
      background: string;
      text: string;
      hover: string;
    };
    outline: {
      background: string;
      text: string;
      hover: string;
      border: string;
    };
    ghost: {
      background: string;
      text: string;
      hover: string;
    };
  };
  // Adding specific UI element colors
  ui: {
    // Headers and bright elements
    heading: string;
    // Status indicators
    statusGeneral: string;
    statusActive: string;
    statusCompleted: string;
    statusFailed: string;
    statusUnknown: string;
    statusText: string;
    // Navigation and layout
    headerBackground: string;
    footerBackground: string;
    // Hover effects
    hoverLight: string;
    hoverMedium: string;
    // Icon styling
    iconBackground: string;
    iconBorder: string;
    // Input styling
    inputBackground: string;
    inputPlaceholder: string;
    inputBorder: string;
    inputBorderFocus: string;
    inputRingFocus: string;
    
    // Error states
    inputErrorBorder: string;
    inputErrorFocus: string;
    inputErrorRing: string;
    
    // Success states
    inputSuccessBorder: string;
    inputSuccessFocus: string;
    inputSuccessRing: string;
    
    // Form element states
    formDisabledBg: string;
    formLabelText: string;
    formHelperText: string;
    formErrorText: string;
    formSuccessText: string;

    // Error handling and danger zones
    errorBackground: string;
    deleteButtonBackground: string; 
    deleteButtonText: string;
    deleteButtonHover: string;

    // Journal specific colors
    journalLeather: string;
    journalBinding: string;
    journalStitch: string;
    journalPageShadow: string;
    journalSectionDivider: string;
    journalCharacterCardBg: string;
    journalCharacterCardHover: string;
    journalQuestItemBg: string;
    journalQuestItemHover: string;
    journalActivityHover: string;
    journalNotesArea: string;
  };
}

/**
 * Font configuration for a theme
 */
export interface ThemeFonts {
  primary: string;
  secondary: string;
  heading: string;
}

/**
 * Border styles for a theme
 */
export interface ThemeBorders {
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  width: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Decorative styles for a theme
 */
export interface DecorativeElements {
  cardBorder: string;
  headingDecoration: string;
}

/**
 * Complete theme configuration
 */
export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
  fonts: ThemeFonts;
  borders: ThemeBorders;
  decorative?: DecorativeElements;
}

/**
 * Theme context state
 */
export interface ThemeContextState {
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
}