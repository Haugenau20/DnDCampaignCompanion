// src/core/themes/definitions/darkTheme.ts
import { Theme } from '../types';

/**
 * Dark theme.
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
export const darkTheme: Theme = {
  name: 'dark',
  tokens: {
    color: {
      primary: '#8AB4F8', // Soft blue for primary elements
      secondary: '#BB86FC', // Muted purple for secondary elements
      accent: '#F28B82', // Soft red for accents
      emphasis: '#F28B82', // Soft red for important highlights
      heading: '#FFFFFF', // White for headings
    },
    surface: {
      page: {
        bg: '#1E1E2E', // Deep grayish-blue (not pure black)
        on: '#E0E0E0', // Soft off-white for primary text
        onMuted: '#B0B0B0', // Muted gray for secondary text
        border: '#3B3B52',
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(255, 255, 255, 0.1)',
      },
      card: {
        bg: '#252538', // Dark but not black for cards
        on: '#E0E0E0',
        onMuted: '#B0B0B0',
        border: '#3B3B52', // Subtle border for definition
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(255, 255, 255, 0.1)',
      },
      sunken: {
        bg: '#2A2A3C', // Slightly lighter grayish-blue
        on: '#E0E0E0',
        onMuted: '#B0B0B0',
        border: '#3B3B52',
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(255, 255, 255, 0.1)',
      },
      chrome: {
        bg: '#222222', // Slightly lighter than main background for headers
        on: '#E0E0E0',
        onMuted: '#B0B0B0',
        border: '#3B3B52',
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(255, 255, 255, 0.1)',
      },
      band: {
        bg: '#2A2A3C',
        on: '#E0E0E0',
        onMuted: '#B0B0B0',
        border: '#3B3B52',
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(255, 255, 255, 0.1)',
      },
    },
    status: {
      general: '#8AB4F8', // Soft blue for general status
      active: '#8AB4F8', // Soft blue for active status
      completed: '#3FB950', // Green for completed status, light enough to read as a word (D56)
      failed: '#F87171', // Red for failed status, light enough to read as a word (D56)
      unknown: '#deaf21', // Yellowish-gold for unknown status
      on: '#121212', // Near black for status text on light backgrounds
    },
    state: {
      hoverLight: 'rgba(255, 255, 255, 0.05)', // Subtle hover effect with low opacity
      hoverMedium: 'rgba(255, 255, 255, 0.1)', // Slightly stronger hover effect with medium opacity
      selected: '#3B3B52', // Complementary shade for contrast
    },
    icon: {
      bg: '#3F4A5D', // Brighter background for icons
      border: '#323A47', // Subtle border for icons
    },
    field: {
      bg: '#2a2a2a', // Dark gray for input background
      placeholder: '#6b7280', // Muted gray for placeholder text
      border: '#82829A', // Medium gray for input border
      borderFocus: '#60a5fa', // Bright blue for focused input border
      ringFocus: 'rgba(59, 130, 246, 0.5)', // Semi-transparent blue for focus ring
      errorBorder: '#ef4444', // Bright red for error border
      errorFocus: '#ef4444', // Bright red for focused error border
      errorRing: 'rgba(239, 68, 68, 0.5)', // Semi-transparent red for error focus ring
      successBorder: '#10b981', // Bright green for success border
      successFocus: '#10b981', // Bright green for focused success border
      successRing: 'rgba(16, 185, 129, 0.5)', // Semi-transparent green for success focus ring
      disabledBg: '#374151', // Dark gray for disabled form background
      labelText: '#d1d5db', // Light gray for form label text
      helperText: '#9ca3af', // Muted gray for helper text
      errorText: '#f87171', // Soft red for error text
      successText: '#34d399', // Bright green for success text
    },
    action: {
      primary: {
        bg: '#8AB4F8', // Soft blue for primary button background
        text: '#1E1E2E', // Deep grayish-blue for button text
        hover: '#729DE3', // Slightly darker blue for hover state
      },
      secondary: {
        bg: '#BB86FC', // Muted purple for secondary button background
        text: '#1E1E2E', // Deep grayish-blue for button text
        hover: '#9E6EDC', // Slightly darker purple for hover state
      },
      link: {
        bg: 'transparent', // Transparent background for links
        text: '#8AB4F8', // Soft blue for link text
        hover: '#A0C4FF', // Lighter blue for hover state
      },
      outline: {
        bg: 'transparent', // Transparent background for outline buttons
        text: '#E0E0E0', // Soft off-white for button text
        hover: '#3B3B52', // Complementary shade for hover state
        border: '#8285A3', // Subtle border for outline buttons
      },
      ghost: {
        bg: 'transparent', // Transparent background for ghost buttons
        text: '#B0B0B0', // Muted gray for button text
        hover: '#3D3D5C', // Slightly darker gray for hover state
      },
    },
    danger: {
      bg: 'transparent', // Transparent background for error states
      deleteBg: 'transparent', // Transparent background for delete buttons
      deleteText: '#F87171', // Soft red for delete button text
      deleteHover: '#3B3B52', // Complementary shade for hover state
    },
    font: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', // Clean sans-serif for primary text
      secondary: 'system-ui, sans-serif', // System default sans-serif for secondary text
      heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', // Clean sans-serif for headings
    },
    border: {
      radius: {
        sm: '0.25rem', // Small border radius for subtle rounding
        md: '0.375rem', // Medium border radius for moderate rounding
        lg: '0.5rem', // Large border radius for significant rounding
      },
      width: {
        sm: '1px', // Thin border width for subtle outlines
        md: '2px', // Medium border width for moderate outlines
        lg: '4px', // Thick border width for strong outlines
      },
    },
    // Eight hues at one OKLCH lightness and chroma, hue angle the only
    // variable. Order is the contract: a mark's hue comes from its index.
    entityPalette: [
      '#68413E',
      '#60482B',
      '#4C512D',
      '#315643',
      '#22565B',
      '#354F6A',
      '#4F4768',
      '#614157',
    ],
    entityInk: '#E8ECF2',
  },
};
