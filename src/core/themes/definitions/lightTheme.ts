// src/core/themes/definitions/lightTheme.ts
import { Theme } from '../types';

/**
 * Light theme.
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
export const lightTheme: Theme = {
  name: 'light',
  tokens: {
    color: {
      primary: '#2563EB', // Strong blue for primary elements
      secondary: '#1E40AF', // Deep, rich blue for contrast
      accent: '#3B82F6', // Bright sky blue for highlights
      emphasis: '#2563EB', // Vivid blue for emphasized text
      heading: '#0F172A', // Deep navy for strong headings
    },
    surface: {
      page: {
        bg: '#F7F9FC', // Soft, neutral background with a hint of blue
        on: '#0F172A', // Deep navy for readability
        // Slate rather than blue-900: subtext in blue competed with links and
        // primary actions for the same "this is interactive" signal.
        onMuted: '#5A6B87', // Muted slate for subtext
        border: '#E4E9F2',
        hover: '#D6E4F5',
        selected: '#93C5FD',
      },
      card: {
        bg: '#FFFFFF', // Clean white for modern cards
        on: '#0F172A',
        onMuted: '#5A6B87',
        // A saturated blue hairline on white reads as an interactive outline, which
        // made every card look selected. Structure should be quieter than action.
        border: '#E4E9F2', // Neutral hairline for structure
        hover: '#D6E4F5',
        selected: '#93C5FD',
      },
      sunken: {
        bg: '#EBF0F7', // Light blue-gray for contrast sections
        on: '#0F172A',
        onMuted: '#5A6B87',
        border: '#E4E9F2',
        hover: '#D6E4F5',
        selected: '#93C5FD',
      },
      chrome: {
        // The frame. Deep and near-neutral so value contrast lives in the
        // chrome while the surfaces you scan every session stay quiet. Its ink
        // is the page's own ground, which is what ties the band to the paper it
        // sits above rather than making it a separate visual system.
        bg: '#171A21',
        on: '#F7F9FC',
        onMuted: '#9AA4B5',
        border: '#2A2F3A',
        // Overlays rather than opaque tints: on a dark band the feedback has to
        // lighten, where on the light page it has to darken.
        hover: 'rgba(255, 255, 255, 0.08)',
        selected: 'rgba(255, 255, 255, 0.14)',
      
      },
      band: {
        bg: '#EBF0F7',
        on: '#0F172A',
        onMuted: '#5A6B87',
        border: '#E4E9F2',
        hover: '#D6E4F5',
        selected: '#93C5FD',
      },
    },
    status: {
      general: '#2563EB', // Strong blue for general status
      active: '#3B82F6', // Bright blue for active state
      completed: '#16A34A', // Strong green for success
      failed: '#DC2626', // Bold red for errors
      unknown: '#e1b737', // Golden yellow for unknown status
      on: '#FFFFFF', // White text for status indicators
    },
    state: {
      hoverLight: '#D6E4F5', // Light blue for hover effects
      hoverMedium: '#93C5FD', // Stronger blue hover effect
      selected: '#E4EBF5', // Subtle blue tint for slight emphasis
    },
    icon: {
      bg: '#D6E4F5', // Soft blue for icons
      border: '#93C5FD', // Subtle blue-gray for icon borders
    },
    field: {
      // Input styling
      bg: '#ffffff', // Clean white for input background
      placeholder: '#9ca3af', // Neutral gray for placeholder text
      border: '#d1d5db', // Light gray for input border
      borderFocus: '#3b82f6', // Bright blue for focused input border
      ringFocus: 'rgba(59, 130, 246, 0.5)', // Semi-transparent blue focus ring
      // Error states
      errorBorder: '#ef4444', // Bold red for error border
      errorFocus: '#ef4444', // Bold red for focused error border
      errorRing: 'rgba(239, 68, 68, 0.5)', // Semi-transparent red focus ring
      // Success states
      successBorder: '#10b981', // Strong green for success border
      successFocus: '#10b981', // Strong green for focused success border
      successRing: 'rgba(16, 185, 129, 0.5)', // Semi-transparent green focus ring
      // Form element states
      disabledBg: '#f3f4f6', // Light gray for disabled form background
      labelText: '#111827', // Dark gray for form labels
      helperText: '#6b7280', // Neutral gray for helper text
      errorText: '#ef4444', // Bold red for error text
      successText: '#10b981', // Strong green for success text
    },
    action: {
      primary: {
        bg: '#2563EB', // Vibrant blue buttons
        text: '#FFFFFF', // White text for contrast
        hover: '#1D4ED8', // Deeper blue on hover
      },
      secondary: {
        bg: '#1E40AF', // Deep blue secondary buttons
        text: '#FFFFFF', // White text for contrast
        hover: '#1E3A8A', // Even deeper blue on hover
      },
      link: {
        bg: 'transparent', // Transparent background for links
        text: '#2563EB', // Blue links
        hover: '#1D4ED8', // Deeper blue on hover
      },
      outline: {
        bg: 'transparent', // Transparent background for outline buttons
        text: '#1E40AF', // Bold secondary blue
        hover: '#E5EDF8', // Soft blue hover effect
        border: '#93C5FD', // Subtle blue border
      },
      ghost: {
        bg: 'transparent', // Transparent background for ghost buttons
        text: '#1E40AF', // Deep blue text
        hover: '#D6E4F5', // Light blue on hover
      },
    },
    danger: {
      // Error handling and danger zones
      bg: 'transparent', // Transparent background for errors
      deleteBg: 'transparent', // Transparent background for delete buttons
      deleteText: '#DC2626', // Bold red text for delete buttons
      deleteHover: 'rgba(239, 68, 68, 0.1)', // Very light red for hover
    },
    journal: {
      // Journal specific colors
      leather: '#A67C52', // Warm brown for journal leather
      binding: '#7D5A3C', // Dark brown for journal binding
      stitch: '#D9C5A9', // Light beige for stitching
      pageShadow: 'rgba(0, 0, 0, 0.05)', // Subtle shadow for pages
      sectionDivider: 'rgba(0, 0, 0, 0.1)', // Light gray for section dividers
      characterCardBg: 'rgba(0, 0, 0, 0.02)', // Very light gray for character card background
      characterCardHover: 'rgba(0, 0, 0, 0.04)', // Slightly darker gray for hover
      questItemBg: 'rgba(0, 0, 0, 0.01)', // Almost transparent gray for quest item background
      questItemHover: 'rgba(0, 0, 0, 0.03)', // Slightly darker gray for hover
      activityHover: 'rgba(0, 0, 0, 0.02)', // Very light gray for activity hover
      notesArea: 'rgba(0, 0, 0, 0.03)', // Slightly darker gray for notes area
    },
    font: {
      primary: 'Inter, sans-serif', // Modern sans-serif for primary text
      secondary: 'system-ui, sans-serif', // System default sans-serif for secondary text
      // A serif here is what makes --font-heading mean something. Setting it to Inter
      // made the token identical to `primary`, so headings and body were one typeface
      // at four sizes and nothing led the page.
      heading: 'Newsreader, Georgia, serif', // Serif for headings
    },
    border: {
      radius: {
        sm: '0.25rem', // Small border radius
        md: '0.375rem', // Medium border radius
        lg: '0.5rem', // Large border radius
      },
      width: {
        sm: '1px', // Thin border width
        md: '2px', // Medium border width
        lg: '4px', // Thick border width
      },
    },
    locationType: {
      region: '#2563EB', // Strong blue for primary elements
      city: '#1E40AF', // Deep, rich blue for contrast
      town: '#3B82F6', // Bright sky blue for highlights
      village: '#3B82F6', // Bright sky blue for highlights
      dungeon: '#DC2626', // Bold red for errors
      landmark: '#3B82F6', // Bright blue for active state
      building: '#2563EB', // Strong blue for general status
      poi: '#16A34A', // Strong green for success
    },
  },
};
