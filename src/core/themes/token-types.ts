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

/**
 * A shape carried alongside a hue, so nothing is encoded by colour alone.
 *
 * `none` is not filler. It is what lets a theme turn a cue off and still
 * declare one, which is the difference between an enum and a boolean.
 */
export type CueToken = 'hatch' | 'strike' | 'none';

/** A thing that concluded. Valenced, deliberately and only here. */
export interface OutcomePair {
  succeeded: string;
  /**
   * Two values, because on a dark ground one cannot serve both roles: a red
   * that clears 4.5:1 as text is necessarily pale, and a pale red is pink.
   * `ink` is the word "Failed" and owes AA; `fill` paints bars and hatching
   * and owes 3:1, so it stays a proper deep red.
   */
  failed: { ink: string; fill: string };
}

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

  /**
   * Quest and rumour state. **Retired in 12-3**, with its consumers.
   *
   * Named after appearance rather than meaning, which is the defect and not a
   * tidiness complaint: `status.completed` existed, was green, and was
   * therefore available for a location to borrow -- which is how "visited"
   * came to render green and a progress bar came to run red-to-green as though
   * exploring a place were a win condition. `outcome` and `knowledge` below
   * are the replacement, and they arrive first so nothing is ever broken.
   */
  status: {
    general: string;
    active: string;
    completed: string;
    failed: string;
    unknown: string;
    on: string;
  };

  /**
   * A thing that concluded, and the only scale in this model that is valenced.
   *
   * Red and green are pre-attentive and cannot be opted out of: a red thing
   * reads as bad whether or not that was the intent. So valence is spent only
   * where the domain actually has it -- a quest succeeds or fails -- and every
   * other distinction takes `knowledge` instead.
   */
  outcome: OutcomePair;

  /**
   * How much the party knows. An ordered ladder, not a verdict.
   *
   * Position is the meaning, so this is an array rather than a record: a step
   * named `visited` would tie a ladder that locations *and* rumours use to one
   * of them. Contrast against the ground rises monotonically with the index,
   * in both modes, so the ladder survives greyscale and colour blindness as a
   * value ramp rather than a hue difference.
   */
  knowledge: string[];

  /**
   * The shape half of a state, because nothing is encoded by colour alone.
   *
   * Not decoration. The accent and `outcome.failed` sit 40 degrees apart on a
   * warm palette -- the closest pair in the schema -- and these are what make
   * that safe under deuteranopia and in greyscale. 12-4 gives them consumers.
   */
  cue: {
    /** Applied to `outcome.failed`: a hatched fill rather than a solid bar. */
    failure: CueToken;
    /** A rule through the label: a deceased NPC, a false rumour. */
    negation: CueToken;
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
