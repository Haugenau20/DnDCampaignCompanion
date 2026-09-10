// src/core/themes/token-types.ts
// The nested token model. See docs/design/plan/01-token-model.md.
//
// Two rules shape everything here:
//
//   1. A surface carries its own foreground. A component picks a surface and
//      the ink comes with it, so contrast is a property of a pair and can be
//      verified once per pair rather than per usage.
//   2. Variable names derive from token paths mechanically -- no hand-kept
//      map. `surface.card.onMuted` becomes `--surface-card-on-muted`. A token
//      cannot exist without its variable, and the set is enumerable.

/**
 * A surface and the ink that goes on it. Every surface defines all four
 * roles; there are no partial surfaces. `onMuted` belongs to the pair rather
 * than being a global grey, because a muted ink that passes on `card` may
 * fail on `sunken`.
 */
export interface SurfacePair {
  bg: string;
  on: string;
  onMuted: string;
  border: string;
  /**
   * Feedback tints for something sitting ON this surface: `hover` for pointer
   * feedback, `selected` for a resting chosen state.
   *
   * These belong to the pair rather than being two global tints because a tint
   * is only meaningful relative to what it sits on -- a dark chrome needs a
   * light overlay where a light page needs a dark one, and no single value can
   * be both. That is section 2's rule applied literally: when a component needs
   * something the pair does not offer, the surface is under-specified, so the
   * role goes on the surface rather than into a one-off token.
   */
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

/**
 * Which way up a theme is, for the browser's benefit.
 *
 * The first **enum** token in this model, and the shape `01-token-model.md` §6
 * anticipated: not a colour, and validated by checking the *value* is legal
 * rather than that the variable exists.
 *
 * It is declared rather than derived from the theme's name. Deriving is two
 * lines and correct for exactly today's two themes, and wrong the moment a
 * theme is called something that does not say which way up it is -- which
 * Phase 12 guarantees, since it hands this model to `theme-contract` as a
 * package whose consumers name their own themes. Inferring "am I dark?" from a
 * name is also the hand-maintained map §4 exists to abolish.
 */
export type ColorSchemeToken = 'light' | 'dark';

export interface ThemeTokens {
  /**
   * What the browser paints its own controls to match -- a `<select>`'s popup
   * list, scrollbars, the focus ring on a native control, a date picker. None
   * of those is reachable from a stylesheet, which is why this is a token and
   * not a rule. See Q16 and R22.
   */
  scheme: ColorSchemeToken;

  color: {
    primary: string;
    secondary: string;
    accent: string;
    /** Emphasised text -- a link, a highlighted value. Not the accent. */
    emphasis: string;
    /** Heading ink, which a theme may pitch darker than body copy. */
    heading: string;
  };

  /**
   * `chrome` covers the header and the footer, which are one band. They were
   * briefly separate surfaces while Phase 1 preserved the old white header and
   * tinted footer; Phase 2 merged them, which is the change that makes the
   * design language's description true of the code.
   */
  surface: {
    page: SurfacePair;
    card: SurfacePair;
    sunken: SurfacePair;
    /** Header and footer are one band -- see the note above. */
    chrome: SurfacePair;
    band: SurfacePair;
  };

  /** Quest and rumour state. Never doubles as the accent. */
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

  /**
   * The entity palette: an ordered collection, not a record.
   *
   * A mark's hue comes from its position, so order is meaningful and a reorder
   * changes existing marks. Every entry is tuned to sit in one narrow band of
   * lightness and chroma -- generated at a fixed OKLCH lightness and chroma
   * with only the hue angle varying -- so the entries separate entities from
   * each other while all sitting equally quiet against `entityInk`. Saturated
   * jewel tones separate beautifully and shout; these do not.
   *
   * This replaces the eight hand-written location-type colours, which were
   * this pattern already, solved ad hoc and mapping eight types onto only
   * three distinct values.
   */
  entityPalette: string[];

  /** The single ink every palette entry is legible against. */
  entityInk: string;
}
