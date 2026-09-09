// src/core/themes/definitions/medievalTheme.ts
import { Theme } from '../types';

/**
 * Medieval theme.
 *
 * Tokens are grouped by role; variable names derive from the path -- see
 * ../token-variables.ts. Values are unchanged from the flat definition this
 * replaced, and the rename is recorded in
 * ../__tests__/token-rename-map.json.
 *
 * The surface `on` / `onMuted` / `border` roles are new. They repeat the
 * theme's existing ink and hairline values, because Phase 1 changes nothing
 * visually; Phase 2 is where a surface's ink starts to differ from the page's.
 */
export const medievalTheme: Theme = {
  name: 'medieval',
  tokens: {
    color: {
      // Rich, parchment-like colors with medieval feel
      primary: '#8B0000', // Deep red for primary actions
      secondary: '#483C32', // Warm brown for secondary elements
      accent: '#DAA520', // Golden accent for highlights
      emphasis: '#8B0000', // Deep red for accent text
      heading: '#2C1810', // Deep brown for headings
    },
    surface: {
      page: {
        bg: '#FDF5E6', // Old parchment color
        on: '#2C1810', // Deep brown for primary text
        onMuted: '#483C32', // Warm brown for secondary text
        border: '#8B4513',
        hover: 'rgba(139, 69, 19, 0.05)',
        selected: 'rgba(139, 69, 19, 0.1)',
      },
      card: {
        bg: '#FFF8DC', // Light parchment for cards
        on: '#2C1810',
        onMuted: '#483C32',
        border: '#8B4513', // Saddle brown for borders
        hover: 'rgba(139, 69, 19, 0.05)',
        selected: 'rgba(139, 69, 19, 0.1)',
      },
      sunken: {
        bg: '#F5E6D3', // Slightly darker parchment
        on: '#2C1810',
        onMuted: '#483C32',
        border: '#8B4513',
        hover: 'rgba(139, 69, 19, 0.05)',
        selected: 'rgba(139, 69, 19, 0.1)',
      },
      chrome: {
        bg: '#F5E6D3', // Slightly darker parchment for header
        on: '#2C1810',
        onMuted: '#483C32',
        border: '#8B4513',
        hover: 'rgba(139, 69, 19, 0.05)',
        selected: 'rgba(139, 69, 19, 0.1)',
      },
      band: {
        bg: '#F5E6D3',
        on: '#2C1810',
        onMuted: '#483C32',
        border: '#8B4513',
        hover: 'rgba(139, 69, 19, 0.05)',
        selected: 'rgba(139, 69, 19, 0.1)',
      },
    },
    status: {
      general: '#1147bb',
      active: '#1147bb',
      completed: '#006400', // Deep green for completed status
      failed: '#8B0000', // Deep red for failed status
      unknown: '#DAA520',
      on: '#FDF5E6', // Light parchment for status text
    },
    state: {
      hoverLight: 'rgba(139, 69, 19, 0.05)', // Light brown hover
      hoverMedium: 'rgba(139, 69, 19, 0.1)', // Medium brown hover
      selected: '#FFE4B5', // Muted gold for accent backgrounds
    },
    icon: {
      bg: '#F5E6D3', // Slightly darker parchment for icons
      border: '#8B4513', // Saddle brown for icon borders
    },
    field: {
      // Input styling
      bg: '#FFF9ED', // Parchment color
      placeholder: '#94785C', // Faded ink color
      border: '#967E5F', // Aged parchment border
      borderFocus: '#8B5A2B', // Rich brown
      ringFocus: 'rgba(139, 90, 43, 0.5)', // Semi-transparent brown
      // Error states
      errorBorder: '#9B2C2C', // Dark red
      errorFocus: '#9B2C2C',
      errorRing: 'rgba(155, 44, 44, 0.5)', // Semi-transparent red
      // Success states
      successBorder: '#2F855A', // Forest green
      successFocus: '#2F855A',
      successRing: 'rgba(47, 133, 90, 0.5)', // Semi-transparent green
      // Form element states
      disabledBg: '#E8DFD0', // Muted parchment
      labelText: '#5D4037', // Dark brown ink
      helperText: '#7D6F63', // Faded ink
      errorText: '#9B2C2C', // Dark red
      successText: '#2F855A', // Forest green
    },
    action: {
      primary: {
        bg: '#E8D0AA',
        text: '#2C1810',
        hover: '#DABB8D',
      },
      secondary: {
        bg: '#483C32',
        text: '#FDF5E6',
        hover: '#32281E',
      },
      link: {
        bg: 'transparent',
        text: '#8B0000',
        hover: '#5D0000',
      },
      outline: {
        bg: 'transparent',
        text: '#2C1810',
        hover: '#F5E6D3',
        border: '#8B4513',
      },
      ghost: {
        bg: 'transparent',
        text: '#2C1810',
        hover: '#F5E6D3',
      },
    },
    danger: {
      // New UI properties for error handling and danger zones
      bg: 'transparent', // Dark red background with low opacity
      deleteBg: 'transparent',
      deleteText: '#9B2C2C', // Deep red for medieval theme
      deleteHover: 'rgba(155, 44, 44, 0.1)', // Very light deep red for hover
    },
    font: {
      // Using more readable fonts while maintaining medieval feel
      primary: 'Crimson Text, serif', // More readable serif font
      secondary: 'Gentium Book Basic, serif', // Alternative readable serif
      heading: 'MedievalSharp, cursive', // Decorative font for headings only
    },
    border: {
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
    // Eight hues at one OKLCH lightness and chroma, hue angle the only
    // variable. Order is the contract: a mark's hue comes from its index.
    entityPalette: [
      '#EDC6C2',
      '#E5CDB2',
      '#CFD5B4',
      '#B9DBC7',
      '#AFDADF',
      '#BBD4EE',
      '#D3CCEC',
      '#E6C6DA',
    ],
    entityInk: '#2C1810',
  },
};
