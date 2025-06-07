/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
      },
      backgroundColor: {
        // Main background colors
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        accent: 'var(--bg-accent)',
        
        // UI element backgrounds
        card: 'var(--card-bg)',
        header: 'var(--header-bg)',
        footer: 'var(--footer-bg)',
        error: 'var(--error-bg)',
        input: 'var(--input-bg)',
        'form-disabled': 'var(--form-disabled-bg)',
        
        // Status backgrounds for components
        'status-general': 'var(--status-general)',
        'status-active': 'var(--status-active)',
        'status-completed': 'var(--status-completed)',
        'status-failed': 'var(--status-failed)',
        'status-unknown': 'var(--status-unknown)',
        
        // Button backgrounds
        'button-primary': 'var(--button-primary-bg)',
        'button-secondary': 'var(--button-secondary-bg)',
        'button-link': 'var(--button-link-bg)',
        'button-outline': 'var(--button-outline-bg)',
        'button-ghost': 'var(--button-ghost-bg)',
        'delete-button': 'var(--delete-button-bg)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        accent: 'var(--text-accent)',
        heading: 'var(--heading-color)',
        
        // Form text colors
        label: 'var(--form-label-text)',
        helper: 'var(--form-helper-text)',
        error: 'var(--form-error-text)',
        success: 'var(--form-success-text)',
        placeholder: 'var(--input-placeholder)',
        
        // Status text colors
        'status-text': 'var(--status-text)',
        
        // Button text colors
        'button-primary': 'var(--button-primary-text)',
        'button-secondary': 'var(--button-secondary-text)',
        'button-link': 'var(--button-link-text)',
        'button-outline': 'var(--button-outline-text)',
        'button-ghost': 'var(--button-ghost-text)',
        'delete-button': 'var(--delete-button-text)',
      },
      borderColor: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        card: 'var(--card-border)',
        
        // Input borders
        input: 'var(--input-border)',
        'input-focus': 'var(--input-border-focus)',
        'input-error': 'var(--input-error-border)',
        'input-success': 'var(--input-success-border)',
        
        // Button borders
        'button-outline': 'var(--button-outline-border)',
        
        // Icon borders
        icon: 'var(--icon-border)',
      },
      fontFamily: {
        primary: 'var(--font-primary)',
        secondary: 'var(--font-secondary)',
        heading: 'var(--font-heading)',
      },
      borderRadius: {
        sm: 'var(--border-radius-sm)',
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
      },
      borderWidth: {
        sm: 'var(--border-width-sm)',
        md: 'var(--border-width-md)',
        lg: 'var(--border-width-lg)',
      },
      ringColor: {
        focus: 'var(--input-ring-focus)',
        error: 'var(--input-error-ring)',
        success: 'var(--input-success-ring)',
      },
      outlineColor: {
        focus: 'var(--input-border-focus)',
      },
      // Add hover colors
      hoverColors: {
        light: 'var(--hover-light)',
        medium: 'var(--hover-medium)',
        'button-primary': 'var(--button-primary-hover)',
        'button-secondary': 'var(--button-secondary-hover)',
        'button-link': 'var(--button-link-hover)',
        'button-outline': 'var(--button-outline-hover)',
        'button-ghost': 'var(--button-ghost-hover)',
        'delete-button': 'var(--delete-button-hover)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}