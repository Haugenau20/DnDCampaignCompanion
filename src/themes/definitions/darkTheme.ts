// src/themes/darkTheme.ts
import { Theme } from '../types';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#8AB4F8',   // Soft blue for primary elements
    secondary: '#BB86FC', // Muted purple for secondary elements
    accent: '#F28B82',    // Soft red for accents
    background: {
      primary: '#1E1E2E',   // Deep grayish-blue (not pure black)
      secondary: '#2A2A3C', // Slightly lighter grayish-blue
      accent: '#3B3B52',    // Complementary shade for contrast
    },
    text: {
      primary: '#E0E0E0',   // Soft off-white for primary text
      secondary: '#B0B0B0', // Muted gray for secondary text
      accent: '#F28B82',    // Soft red for important highlights
    },
    card: {
      background: '#252538',  // Dark but not black for cards
      border: '#3B3B52',      // Subtle border for definition
    },
    button: {
      primary: {
        background: '#8AB4F8',  // Soft blue for primary button background
        text: '#1E1E2E',        // Deep grayish-blue for button text
        hover: '#729DE3',       // Slightly darker blue for hover state
      },
      secondary: {
        background: '#BB86FC',  // Muted purple for secondary button background
        text: '#1E1E2E',        // Deep grayish-blue for button text
        hover: '#9E6EDC',       // Slightly darker purple for hover state
      },
      link: {
        background: 'transparent', // Transparent background for links
        text: '#8AB4F8',           // Soft blue for link text
        hover: '#A0C4FF',          // Lighter blue for hover state
      },
      outline: {
        background: 'transparent', // Transparent background for outline buttons
        text: '#E0E0E0',           // Soft off-white for button text
        hover: '#3B3B52',          // Complementary shade for hover state
        border: '#3B3B52',         // Subtle border for outline buttons
      },
      ghost: {
        background: 'transparent', // Transparent background for ghost buttons
        text: '#B0B0B0',           // Muted gray for button text
        hover: '#3D3D5C',          // Slightly darker gray for hover state
      },
    },
    ui: {
      heading: '#FFFFFF',           // White for headings
      statusGeneral: '#8AB4F8',     // Soft blue for general status
      statusActive: '#8AB4F8',      // Soft blue for active status
      statusCompleted: '#12873d',   // Deep green for completed status
      statusFailed: '#c52020',      // Bright red for failed status
      statusUnknown: '#deaf21',     // Yellowish-gold for unknown status
      statusText: '#121212',        // Near black for status text on light backgrounds
      headerBackground: '#222222',  // Slightly lighter than main background for headers
      footerBackground: '#222222',  // Match header for consistency
      hoverLight: 'rgba(255, 255, 255, 0.05)',  // Subtle hover effect with low opacity
      hoverMedium: 'rgba(255, 255, 255, 0.1)',  // Slightly stronger hover effect with medium opacity
      iconBackground: '#3F4A5D',    // Brighter background for icons
      iconBorder: '#323A47',        // Subtle border for icons

      inputBackground: '#2a2a2a',  // Dark gray for input background
      inputPlaceholder: '#6b7280', // Muted gray for placeholder text
      inputBorder: '#4b5563',      // Medium gray for input border
      inputBorderFocus: '#60a5fa', // Bright blue for focused input border
      inputRingFocus: 'rgba(59, 130, 246, 0.5)', // Semi-transparent blue for focus ring

      inputErrorBorder: '#ef4444', // Bright red for error border
      inputErrorFocus: '#ef4444',  // Bright red for focused error border
      inputErrorRing: 'rgba(239, 68, 68, 0.5)', // Semi-transparent red for error focus ring

      inputSuccessBorder: '#10b981', // Bright green for success border
      inputSuccessFocus: '#10b981',  // Bright green for focused success border
      inputSuccessRing: 'rgba(16, 185, 129, 0.5)', // Semi-transparent green for success focus ring

      formDisabledBg: '#374151',   // Dark gray for disabled form background
      formLabelText: '#d1d5db',    // Light gray for form label text
      formHelperText: '#9ca3af',   // Muted gray for helper text
      formErrorText: '#f87171',    // Soft red for error text
      formSuccessText: '#34d399',  // Bright green for success text

      errorBackground: 'transparent',         // Transparent background for error states
      deleteButtonBackground: 'transparent',  // Transparent background for delete buttons
      deleteButtonText: '#F87171',            // Soft red for delete button text
      deleteButtonHover: '#3B3B52',           // Complementary shade for hover state

      journalLeather: '#3D3D3D',      // Dark gray for journal leather
      journalBinding: '#2A2A2A',      // Slightly darker gray for journal binding
      journalStitch: '#5D5D5D',       // Medium gray for journal stitching
      journalPageShadow: 'rgba(0, 0, 0, 0.3)',                // Semi-transparent black for page shadow
      journalSectionDivider: 'rgba(255, 255, 255, 0.1)',      // Subtle white for section dividers
      journalCharacterCardBg: 'rgba(255, 255, 255, 0.05)',    // Very light white for character card background
      journalCharacterCardHover: 'rgba(255, 255, 255, 0.08)', // Slightly stronger white for hover state
      journalQuestItemBg: 'rgba(255, 255, 255, 0.02)',        // Very faint white for quest item background
      journalQuestItemHover: 'rgba(255, 255, 255, 0.05)',     // Slightly stronger white for hover state
      journalActivityHover: 'rgba(255, 255, 255, 0.03)',      // Subtle white for activity hover state
      journalNotesArea: 'rgba(255, 255, 255, 0.05)',          // Light white for notes area background
    }
  },
  fonts: {
    primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',  // Clean sans-serif for primary text
    secondary: 'system-ui, sans-serif',                                           // System default sans-serif for secondary text
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',  // Clean sans-serif for headings
  },
  borders: {
    radius: {
      sm: '0.25rem',  // Small border radius for subtle rounding
      md: '0.375rem', // Medium border radius for moderate rounding
      lg: '0.5rem',   // Large border radius for significant rounding
    },
    width: {
      sm: '1px', // Thin border width for subtle outlines
      md: '2px', // Medium border width for moderate outlines
      lg: '4px', // Thick border width for strong outlines
    },
  },
};
