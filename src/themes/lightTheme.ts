// src/themes/lightTheme.ts
import { Theme } from '../types/theme';

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
          text: '#FFFFFF',
          hover: '#1D4ED8', // Deeper blue on hover
        },
        secondary: {
          background: '#1E40AF', // Deep blue secondary buttons
          text: '#FFFFFF',
          hover: '#1E3A8A', // Even deeper blue on hover
        },
        link: {
          background: 'transparent',
          text: '#2563EB', // Blue links
          hover: '#1D4ED8',
        },
        outline: {
          background: 'transparent',
          text: '#1E40AF', // Bold secondary blue
          hover: '#E5EDF8', // Soft blue hover effect
          border: '#93C5FD',
        },
        ghost: {
          background: 'transparent',
          text: '#1E40AF',
          hover: '#D6E4F5', // Light blue on hover
        },
      },
      ui: {
        heading: '#FFFFFF', // Deep navy for strong headings
        statusGeneral: '#2563EB',
        statusActive: '#3B82F6', // Bright blue for active state
        statusCompleted: '#16A34A', // Strong green for success
        statusFailed: '#DC2626', // Bold red for errors
        statusUnknown: '#e1b737',
        statusText: '#FFFFFF', // White text for status indicators
        headerBackground: '#3B82F6', // **Stronger, more vibrant blue header**
        footerBackground: '#E5EDF8', // Soft blue-gray footer for balance
        hoverLight: '#D6E4F5', // Light blue for hover effects
        hoverMedium: '#93C5FD', // Stronger blue hover effect
        iconBackground: '#D6E4F5', // Soft blue for icons
        iconBorder: '#93C5FD', // Subtle blue-gray for icon borders

        // Input styling
        inputBackground: '#ffffff',
        inputPlaceholder: '#9ca3af',
        inputBorder: '#d1d5db',
        inputBorderFocus: '#3b82f6',
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
        formDisabledBg: '#f3f4f6',
        formLabelText: '#111827',
        formHelperText: '#6b7280',
        formErrorText: '#ef4444',
        formSuccessText: '#10b981',

        // Error handling and danger zones
        errorBackground: 'transparent', // Soft red background with low opacity
        deleteButtonBackground: 'transparent',
        deleteButtonText: '#DC2626', // Bold red text
        deleteButtonHover: 'rgba(239, 68, 68, 0.1)', // Very light red for hover
      }
    },
    fonts: {
      primary: 'Inter, sans-serif',
      secondary: 'system-ui, sans-serif',
      heading: 'Inter, sans-serif',
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