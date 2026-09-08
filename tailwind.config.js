/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Named for what yields at them, because the header's shrink order is the
      // point: the title shortens at `title`, the last two nav items fold at
      // `nav`. Tailwind's defaults cannot express this -- the definition of done
      // requires 1024px to be a *folded* width, which `lg` (>=1024) cannot be.
      // Both control `display` on elements no `xl:` rule touches, so the
      // append-after-defaults cascade order does not bite.
      screens: {
        nav: "1080px",
        title: "1200px",
      },
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
      },
      backgroundColor: {
        // Main background colors
        primary: 'var(--surface-page-bg)',
        secondary: 'var(--surface-sunken-bg)',
        accent: 'var(--state-selected)',
        
        // UI element backgrounds
        card: 'var(--surface-card-bg)',
        header: 'var(--surface-chrome-bg)',
        footer: 'var(--surface-footer-bg)',
        error: 'var(--danger-bg)',
        input: 'var(--field-bg)',
        'form-disabled': 'var(--field-disabled-bg)',
        
        // Status backgrounds for components
        'status-general': 'var(--status-general)',
        'status-active': 'var(--status-active)',
        'status-completed': 'var(--status-completed)',
        'status-failed': 'var(--status-failed)',
        'status-unknown': 'var(--status-unknown)',
        
        // Button backgrounds
        'button-primary': 'var(--action-primary-bg)',
        'button-secondary': 'var(--action-secondary-bg)',
        'button-link': 'var(--action-link-bg)',
        'button-outline': 'var(--action-outline-bg)',
        'button-ghost': 'var(--action-ghost-bg)',
        'delete-button': 'var(--danger-delete-bg)',
      },
      textColor: {
        primary: 'var(--surface-page-on)',
        secondary: 'var(--surface-page-on-muted)',
        accent: 'var(--color-emphasis)',
        heading: 'var(--color-heading)',
        
        // Form text colors
        label: 'var(--field-label-text)',
        helper: 'var(--field-helper-text)',
        error: 'var(--field-error-text)',
        success: 'var(--field-success-text)',
        placeholder: 'var(--field-placeholder)',
        
        // Status text colors
        'status-text': 'var(--status-on)',
        
        // Button text colors
        'button-primary': 'var(--action-primary-text)',
        'button-secondary': 'var(--action-secondary-text)',
        'button-link': 'var(--action-link-text)',
        'button-outline': 'var(--action-outline-text)',
        'button-ghost': 'var(--action-ghost-text)',
        'delete-button': 'var(--danger-delete-text)',
      },
      borderColor: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        card: 'var(--surface-card-border)',
        
        // Input borders
        input: 'var(--field-border)',
        'input-focus': 'var(--field-border-focus)',
        'input-error': 'var(--field-error-border)',
        'input-success': 'var(--field-success-border)',
        
        // Button borders
        'button-outline': 'var(--action-outline-border)',
        
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
        focus: 'var(--field-ring-focus)',
        error: 'var(--field-error-ring)',
        success: 'var(--field-success-ring)',
      },
      outlineColor: {
        focus: 'var(--field-border-focus)',
      },
      // NOTE: hover is a Tailwind *variant*, not a colour namespace, so there is
      // no `hoverColors` theme key — a block here generated zero utilities and had
      // zero consumers. The --hover-* / --*-hover variables it listed are alive and
      // applied directly in themes/css/components.css (e.g. .button-primary:hover).
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}