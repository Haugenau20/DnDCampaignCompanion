// src/themes/darkTheme.ts
import { Theme } from '../types/theme';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#8AB4F8', // Soft blue for primary elements
    secondary: '#BB86FC', // Muted purple for secondary elements
    accent: '#F28B82', // Soft red for accents
    background: {
      primary: '#1E1E2E', // Deep grayish-blue (not pure black)
      secondary: '#2A2A3C', // Slightly lighter grayish-blue
      accent: '#3B3B52', // Complementary shade for contrast
    },
    text: {
      primary: '#E0E0E0', // Soft off-white for primary text
      secondary: '#B0B0B0', // Muted gray for secondary text
      accent: '#F28B82', // Accent color for important highlights
    },
    card: {
      background: '#252538', // Dark but not black for cards
      border: '#3B3B52', // Subtle border for definition
    },
    button: {
      primary: {
        background: '#8AB4F8',
        text: '#1E1E2E',
        hover: '#729DE3',
      },
      secondary: {
        background: '#BB86FC',
        text: '#1E1E2E',
        hover: '#9E6EDC',
      },
      link: {
        background: 'transparent',
        text: '#8AB4F8',
        hover: '#A0C4FF',
      },
      outline: {
        background: 'transparent',
        text: '#E0E0E0',
        hover: '#3B3B52',
        border: '#3B3B52',
      },
      ghost: {
        background: 'transparent',
        text: '#B0B0B0',
        hover: '#3D3D5C',
      },
    },
    // New UI-specific colors to replace hardcoded values
    ui: {
      heading: '#FFFFFF', // White for headings
      statusGeneral: '#8AB4F8',
      statusActive: '#8AB4F8', // Soft gray for active status
      statusCompleted: '#12873d', // Deep green for completed status
      statusFailed: '#c52020', // Light gray for failed status
      statusUnknown: '#deaf21',
      statusText: '#121212', // Near black for status text on light backgrounds
      headerBackground: '#222222', // Slightly lighter than main bg for headers
      footerBackground: '#222222', // Match header for consistency
      hoverLight: 'rgba(255, 255, 255, 0.05)', // Subtle hover effect
      hoverMedium: 'rgba(255, 255, 255, 0.1)', // Slightly stronger hover effect
      iconBackground: '#3F4A5D', // Brighter background for icons
      iconBorder: '#323A47', // Border for icons

      // Input styling
      inputBackground: '#2a2a2a',
      inputPlaceholder: '#6b7280',
      inputBorder: '#4b5563',
      inputBorderFocus: '#60a5fa',
      inputRingFocus: 'rgba(59, 130, 246, 0.5)',
      
      // Error states
      inputErrorBorder: '#ef4444',
      inputErrorFocus: '#ef4444',
      inputErrorRing: 'rgba(239, 68, 68, 0.5)',
      
      // Success states
      inputSuccessBorder: '#10b981',
      inputSuccessFocus: '#10b981',
      inputSuccessRing: 'rgba(16, 185, 129, 0.5)',
      
      // Form element states
      formDisabledBg: '#374151',
      formLabelText: '#d1d5db',
      formHelperText: '#9ca3af',
      formErrorText: '#f87171',
      formSuccessText: '#34d399',

      // New UI properties for error handling and danger zones
      errorBackground: 'transparent', // Soft red background with low opacity
      deleteButtonBackground: 'transparent', // Same as secondary background
      deleteButtonText: '#F87171', // Soft red text
      deleteButtonHover: '#3B3B52', // Slightly lighter for hover state

      // Journal specific colors
      journalLeather: '#3D3D3D',
      journalBinding: '#2A2A2A',
      journalStitch: '#5D5D5D',
      journalPageShadow: 'rgba(0, 0, 0, 0.3)',
      journalSectionDivider: 'rgba(255, 255, 255, 0.1)',
      journalCharacterCardBg: 'rgba(255, 255, 255, 0.05)',
      journalCharacterCardHover: 'rgba(255, 255, 255, 0.08)',
      journalQuestItemBg: 'rgba(255, 255, 255, 0.02)',
      journalQuestItemHover: 'rgba(255, 255, 255, 0.05)',
      journalActivityHover: 'rgba(255, 255, 255, 0.03)',
      journalNotesArea: 'rgba(255, 255, 255, 0.05)',
    }
  },
  fonts: {
    primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    secondary: 'system-ui, sans-serif',
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  borders: {
    radius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
    },
    width: {
      sm: '1px',
      md: '2px',
      lg: '4px',
    },
  },
};