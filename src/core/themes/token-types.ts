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
}

/** One button variant. `border` is present only where the variant draws one. */
export interface ActionPair {
  bg: string;
  text: string;
  hover: string;
  border?: string;
}

export interface ThemeTokens {
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
   * `chrome` and `footer` are separate surfaces here even though the design
   * language treats the chrome as one band. Today the header is white and the
   * footer is tinted; collapsing them is a visual change, and Phase 1 makes
   * none. Phase 2 merges them when the chrome becomes one dark surface.
   */
  surface: {
    page: SurfacePair;
    card: SurfacePair;
    sunken: SurfacePair;
    chrome: SurfacePair;
    footer: SurfacePair;
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

  /** The journal's own ornament. Theme-specific by nature. */
  journal: {
    leather: string;
    binding: string;
    stitch: string;
    pageShadow: string;
    sectionDivider: string;
    characterCardBg: string;
    characterCardHover: string;
    questItemBg: string;
    questItemHover: string;
    activityHover: string;
    notesArea: string;
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
   * Location type colours, kept as a group of their own because they are
   * eight aliases of other tokens -- the entity palette solved ad hoc. Phase 3
   * replaces them with an ordered palette; retiring them is a one-way door
   * (see 00-transition-plan.md section 6), so they survive this phase intact.
   */
  locationType: {
    region: string;
    city: string;
    town: string;
    village: string;
    dungeon: string;
    landmark: string;
    building: string;
    poi: string;
  };
}
