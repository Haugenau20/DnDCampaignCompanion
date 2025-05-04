// src/themes/lightTheme.ts
import { Theme } from '../types';

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#2563EB', // Strong blue for primary elements
    secondary: '#1E40AF', // Deep, rich blue for contrast
    accent: '#3B82F6', // Bright sky blue for highlights
    background: {
      primary: '#F8FAFD', // Soft, neutral background with a hint of blue
      secondary: '#E5EDF8', // Light blue-gray for contrast sections
      accent: '#D6E4F5', // Subtle blue tint for slight emphasis
    },
    text: {
      primary: '#0F172A', // Deep navy for readability
      secondary: '#1E3A8A', // Bold blue for subtext
      accent: '#2563EB', // Vivid blue for emphasized text
    },
    card: {
      background: '#FFFFFF', // Clean white for modern cards
      border: '#93C5FD', // Soft blue border for subtle depth
    },
    button: {
      primary: {
        background: '#2563EB', // Vibrant blue buttons
        text: '#FFFFFF', // White text for contrast
        hover: '#1D4ED8', // Deeper blue on hover
      },
      secondary: {
        background: '#1E40AF', // Deep blue secondary buttons
        text: '#FFFFFF', // White text for contrast
        hover: '#1E3A8A', // Even deeper blue on hover
      },
      link: {
        background: 'transparent', // Transparent background for links
        text: '#2563EB', // Blue links
        hover: '#1D4ED8', // Deeper blue on hover
      },
      outline: {
        background: 'transparent', // Transparent background for outline buttons
        text: '#1E40AF', // Bold secondary blue
        hover: '#E5EDF8', // Soft blue hover effect
        border: '#93C5FD', // Subtle blue border
      },
      ghost: {
        background: 'transparent', // Transparent background for ghost buttons
        text: '#1E40AF', // Deep blue text
        hover: '#D6E4F5', // Light blue on hover
      },
    },
    ui: {
      heading: '#0F172A', // Deep navy for strong headings
      statusGeneral: '#2563EB', // Strong blue for general status
      statusActive: '#3B82F6', // Bright blue for active state
      statusCompleted: '#16A34A', // Strong green for success
      statusFailed: '#DC2626', // Bold red for errors
      statusUnknown: '#e1b737', // Golden yellow for unknown status
      statusText: '#FFFFFF', // White text for status indicators
      headerBackground: '#3B82F6', // Stronger, more vibrant blue header
      footerBackground: '#E5EDF8', // Soft blue-gray footer for balance
      hoverLight: '#D6E4F5', // Light blue for hover effects
      hoverMedium: '#93C5FD', // Stronger blue hover effect
      iconBackground: '#D6E4F5', // Soft blue for icons
      iconBorder: '#93C5FD', // Subtle blue-gray for icon borders

      // Input styling
      inputBackground: '#ffffff', // Clean white for input background
      inputPlaceholder: '#9ca3af', // Neutral gray for placeholder text
      inputBorder: '#d1d5db', // Light gray for input border
      inputBorderFocus: '#3b82f6', // Bright blue for focused input border
      inputRingFocus: 'rgba(59, 130, 246, 0.5)', // Semi-transparent blue focus ring
      
      // Error states
      inputErrorBorder: '#ef4444', // Bold red for error border
      inputErrorFocus: '#ef4444', // Bold red for focused error border
      inputErrorRing: 'rgba(239, 68, 68, 0.5)', // Semi-transparent red focus ring
      
      // Success states
      inputSuccessBorder: '#10b981', // Strong green for success border
      inputSuccessFocus: '#10b981', // Strong green for focused success border
      inputSuccessRing: 'rgba(16, 185, 129, 0.5)', // Semi-transparent green focus ring
      
      // Form element states
      formDisabledBg: '#f3f4f6', // Light gray for disabled form background
      formLabelText: '#111827', // Dark gray for form labels
      formHelperText: '#6b7280', // Neutral gray for helper text
      formErrorText: '#ef4444', // Bold red for error text
      formSuccessText: '#10b981', // Strong green for success text

      // Error handling and danger zones
      errorBackground: 'transparent', // Transparent background for errors
      deleteButtonBackground: 'transparent', // Transparent background for delete buttons
      deleteButtonText: '#DC2626', // Bold red text for delete buttons
      deleteButtonHover: 'rgba(239, 68, 68, 0.1)', // Very light red for hover
      
      // Journal specific colors
      journalLeather: '#A67C52', // Warm brown for journal leather
      journalBinding: '#7D5A3C', // Dark brown for journal binding
      journalStitch: '#D9C5A9', // Light beige for stitching
      journalPageShadow: 'rgba(0, 0, 0, 0.05)', // Subtle shadow for pages
      journalSectionDivider: 'rgba(0, 0, 0, 0.1)', // Light gray for section dividers
      journalCharacterCardBg: 'rgba(0, 0, 0, 0.02)', // Very light gray for character card background
      journalCharacterCardHover: 'rgba(0, 0, 0, 0.04)', // Slightly darker gray for hover
      journalQuestItemBg: 'rgba(0, 0, 0, 0.01)', // Almost transparent gray for quest item background
      journalQuestItemHover: 'rgba(0, 0, 0, 0.03)', // Slightly darker gray for hover
      journalActivityHover: 'rgba(0, 0, 0, 0.02)', // Very light gray for activity hover
      journalNotesArea: 'rgba(0, 0, 0, 0.03)', // Slightly darker gray for notes area
    }
  },
  fonts: {
    primary: 'Inter, sans-serif', // Modern sans-serif for primary text
    secondary: 'system-ui, sans-serif', // System default sans-serif for secondary text
    heading: 'Inter, sans-serif', // Modern sans-serif for headings
  },
  borders: {
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
  };  