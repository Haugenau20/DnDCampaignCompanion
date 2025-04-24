// src/themes/medievalTheme.ts
import { Theme } from '../types';

export const medievalTheme: Theme = {
  name: 'medieval',
  colors: {
    // Rich, parchment-like colors with medieval feel
    primary: '#8B0000',      // Deep red for primary actions
    secondary: '#483C32',    // Warm brown for secondary elements
    accent: '#DAA520',       // Golden accent for highlights
    background: {
      primary: '#FDF5E6',    // Old parchment color
      secondary: '#F5E6D3',   // Slightly darker parchment
      accent: '#FFE4B5',     // Muted gold for accent backgrounds
    },
    text: {
      primary: '#2C1810',    // Deep brown for primary text
      secondary: '#483C32',   // Warm brown for secondary text
      accent: '#8B0000',     // Deep red for accent text
    },
    card: {
      background: '#FFF8DC',  // Light parchment for cards
      border: '#8B4513',     // Saddle brown for borders
    },
    button: {
      primary: {
        background: '#E8D0AA',
        text: '#2C1810',
        hover: '#DABB8D',
      },
      secondary: {
        background: '#483C32',
        text: '#FDF5E6',
        hover: '#32281E'
      },
      link: {
        background: 'transparent',
        text: '#8B0000',
        hover: '#5D0000'
      },
      outline: {
        background: 'transparent',
        text: '#2C1810',
        hover: '#F5E6D3',
        border: '#8B4513'
      },
      ghost: {
        background: 'transparent',
        text: '#2C1810',
        hover: '#F5E6D3'
      },
    },
    // Add UI-specific colors for the D&D theme
    ui: {
      heading: '#2C1810',     // Deep brown for headings
      statusGeneral: '#1147bb',
      statusActive: '#1147bb',
      statusCompleted: '#006400', // Deep green for completed status
      statusFailed: '#8B0000', // Deep red for failed status
      statusUnknown: '#DAA520',
      statusText: '#FDF5E6', // Light parchment for status text
      headerBackground: '#F5E6D3', // Slightly darker parchment for header
      footerBackground: '#F5E6D3', // Match header for consistency
      hoverLight: 'rgba(139, 69, 19, 0.05)', // Light brown hover
      hoverMedium: 'rgba(139, 69, 19, 0.1)', // Medium brown hover
      iconBackground: '#F5E6D3', // Slightly darker parchment for icons
      iconBorder: '#8B4513', // Saddle brown for icon borders

      // Input styling
      inputBackground: '#FFF9ED', // Parchment color
      inputPlaceholder: '#94785C', // Faded ink color
      inputBorder: '#B89F7D', // Aged parchment border
      inputBorderFocus: '#8B5A2B', // Rich brown
      inputRingFocus: 'rgba(139, 90, 43, 0.5)', // Semi-transparent brown
      
      // Error states
      inputErrorBorder: '#9B2C2C', // Dark red
      inputErrorFocus: '#9B2C2C',
      inputErrorRing: 'rgba(155, 44, 44, 0.5)', // Semi-transparent red
      
      // Success states
      inputSuccessBorder: '#2F855A', // Forest green
      inputSuccessFocus: '#2F855A',
      inputSuccessRing: 'rgba(47, 133, 90, 0.5)', // Semi-transparent green
      
      // Form element states
      formDisabledBg: '#E8DFD0', // Muted parchment
      formLabelText: '#5D4037', // Dark brown ink
      formHelperText: '#7D6F63', // Faded ink
      formErrorText: '#9B2C2C', // Dark red
      formSuccessText: '#2F855A', // Forest green

      // New UI properties for error handling and danger zones
      errorBackground: 'transparent', // Dark red background with low opacity
      deleteButtonBackground: 'transparent',
      deleteButtonText: '#9B2C2C', // Deep red for medieval theme
      deleteButtonHover: 'rgba(155, 44, 44, 0.1)', // Very light deep red for hover

       // Journal specific colors
      journalLeather: '#8B4513',
      journalBinding: '#5D3212',
      journalStitch: '#E6C9A8',
      journalPageShadow: 'rgba(0, 0, 0, 0.1)',
      journalSectionDivider: 'rgba(139, 69, 19, 0.2)',
      journalCharacterCardBg: 'rgba(231, 222, 204, 0.3)',
      journalCharacterCardHover: 'rgba(231, 222, 204, 0.5)',
      journalQuestItemBg: 'rgba(231, 222, 204, 0.1)',
      journalQuestItemHover: 'rgba(231, 222, 204, 0.3)',
      journalActivityHover: 'rgba(231, 222, 204, 0.2)',
      journalNotesArea: 'rgba(231, 222, 204, 0.3)',
    }
  },
  fonts: {
    // Using more readable fonts while maintaining medieval feel
    primary: 'Crimson Text, serif',        // More readable serif font
    secondary: 'Gentium Book Basic, serif', // Alternative readable serif
    heading: 'MedievalSharp, cursive',     // Decorative font for headings only
  },
  borders: {
    radius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
    },
    width: {
      sm: '2px',
      md: '3px',
      lg: '4px',
    },
  },
};