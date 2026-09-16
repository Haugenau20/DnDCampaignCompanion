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
        // Only `accent` survives, and only because `ring-accent` is generated
        // from here rather than from `borderColor`. A ring is a boundary, so
        // it takes the edge. `primary` and `secondary` are gone: every
        // utility they generated was already shadowed by the more specific
        // `textColor` / `backgroundColor` / `borderColor` entries below.
        accent: 'var(--accent-edge)',
      },
      backgroundColor: {
        // Main background colors
        primary: 'var(--surface-page-bg)',
        secondary: 'var(--surface-sunken-bg)',
        // A selected row's ground belongs to the surface it sits on -- a global
        // hover grey is what the pair model forbids (token model section 2).
        accent: 'var(--surface-card-selected)',
        
        // UI element backgrounds
        card: 'var(--surface-card-bg)',
        header: 'var(--surface-chrome-bg)',
        footer: 'var(--surface-chrome-bg)',
        'chrome-border': 'var(--surface-chrome-border)',
        error: 'var(--danger-bg)',
        input: 'var(--field-bg)',
        'form-disabled': 'var(--field-disabled-bg)',
        
        // Domain state, named after meaning. The `status-*` family these
        // replace was named after appearance, which is what let a location
        // borrow the quest scale and render "visited" as a win condition.
        // Schema section 3 is the mapping table.
        'outcome-active': 'var(--accent-fill)',
        'outcome-succeeded': 'var(--outcome-succeeded)',
        'outcome-failed': 'var(--outcome-failed-fill)',
        'valence-0': 'var(--valence-0-fill)',
        'valence-1': 'var(--valence-1-fill)',
        'valence-2': 'var(--valence-2-fill)',
        'valence-3': 'var(--valence-3-fill)',
        'valence-4': 'var(--valence-4-fill)',
        'knowledge-0': 'var(--knowledge-0)',
        'knowledge-1': 'var(--knowledge-1)',
        'knowledge-2': 'var(--knowledge-2)',
        // Presence carries no hue: a death is a fact, not an error. These are
        // the ink ramp, so the segments differ by value rather than colour.
        'presence-present': 'var(--surface-page-on)',
        'presence-absent': 'var(--surface-page-on-muted)',
        'accent-fill': 'var(--accent-fill)',
        
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
        
        // Ink on a filled failure. `status-on` is retired with `status.*`.
        'outcome-failed-on': 'var(--outcome-failed-on)',
        
        // Button text colors
        'button-primary': 'var(--action-primary-text)',
        'button-secondary': 'var(--action-secondary-text)',
        'button-link': 'var(--action-link-text)',
        'button-outline': 'var(--action-outline-text)',
        'button-ghost': 'var(--action-ghost-text)',
        'delete-button': 'var(--danger-delete-text)',
      },
      borderColor: {
        accent: 'var(--accent-edge)',
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