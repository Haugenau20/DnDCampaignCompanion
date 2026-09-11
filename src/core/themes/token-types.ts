// src/core/themes/token-types.ts
// The nested token model. Variable names derive from token paths:
// `surface.card.onMuted` becomes `--surface-card-on-muted`.

/** A surface and the ink that goes on it. Every surface defines all six roles. */
export interface SurfacePair {
  bg: string;
  on: string;
  onMuted: string;
  border: string;
  hover: string;
  selected: string;
}

/** One button variant. `border` is present only where the variant draws one. */
export interface ActionPair {
  bg: string;
  text: string;
  hover: string;
  border?: string;
}

/** Which way up a theme is, for the browser's native controls. */
export type ColorSchemeToken = 'light' | 'dark';

export interface ThemeTokens {
  /** Sets `color-scheme` on the document element. */
  scheme: ColorSchemeToken;

  color: {
    primary: string;
    secondary: string;
    accent: string;
    emphasis: string;
    heading: string;
  };

  surface: {
    page: SurfacePair;
    card: SurfacePair;
    sunken: SurfacePair;
    chrome: SurfacePair;
    band: SurfacePair;
  };

  /** Quest and rumour state. */
  status: {
    general: string;
    active: string;
    completed: string;
    failed: string;
    unknown: string;
    on: string;
  };

  /** Feedback only -- never a resting background. */
  state: {
    hoverLight: string;
    hoverMedium: string;
    selected: string;
  };

  icon: {
    bg: string;
    border: string;
  };

  /** Form fields, including their validation states. */
  field: {
    bg: string;
    placeholder: string;
    border: string;
    borderFocus: string;
    ringFocus: string;
    errorBorder: string;
    errorFocus: string;
    errorRing: string;
    successBorder: string;
    successFocus: string;
    successRing: string;
    disabledBg: string;
    labelText: string;
    helperText: string;
    errorText: string;
    successText: string;
  };

  action: {
    primary: ActionPair;
    secondary: ActionPair;
    link: ActionPair;
    outline: ActionPair;
    ghost: ActionPair;
  };

  danger: {
    bg: string;
    deleteBg: string;
    deleteText: string;
    deleteHover: string;
  };

  font: {
    primary: string;
    secondary: string;
    heading: string;
  };

  border: {
    radius: { sm: string; md: string; lg: string };
    width: { sm: string; md: string; lg: string };
  };

  /** Ordered: a mark's hue comes from its index, so order is the contract. */
  entityPalette: string[];

  /** The single ink every palette entry is legible against. */
  entityInk: string;
}
