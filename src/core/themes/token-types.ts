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
  failed: {
    ink: string;
    fill: string;
    /**
     * Ink on the failure fill. Identical in both modes, because it is a
     * neutral taken straight from the ramp at 0.975 and a neutral does not
     * vary with the mode -- only its lightness does.
     */
    on: string;
  };
}

/**
 * The accent, under the three names that say how it is being spent.
 *
 * All three of `ink`, `edge` and `fill` carry the same value today, and that
 * is not redundancy waiting to be collapsed: the accent was previously a
 * primitive with no name in the token tree at all, so `color.primary` had no
 * successor and roughly twenty consumers had nowhere to move to. Naming the
 * *jobs* is what lets a later schema give a border a different value from a
 * background without revisiting every call site.
 */
export interface AccentScale {
  /** Text and icons. */
  ink: string;
  /** Borders, outlines, rules. */
  edge: string;
  /** A background that carries `on`. */
  fill: string;
  hover: string;
  /** The ink that goes on `fill`. */
  on: string;
  /** Translucent, for focus rings. Has no ratio until it has a ground. */
  ring: string;
}

/** Ink, boundary and background for one feedback state. */
export interface FeedbackTriple {
  ink: string;
  edge: string;
  /**
   * Translucent. **`ink` is not legal on its own `wash`** -- three of eight
   * mode-state combinations fail AA, and which three differs by mode. A washed
   * banner takes `surface.*.on` for its text; the hue appears as the boundary,
   * never as the text on top of itself. Schema section 5.6, asserted in
   * `findBorrowedRoleFailures`.
   */
  wash: string;
}

/**
 * The application talking about itself.
 *
 * A failed quest is a fact about the fiction; a failed save is a fact about
 * the software. They resolve to the same hues today and are named apart so
 * they can diverge later without archaeology -- and so that a save error is
 * never "fixed" by changing what a quest looks like.
 *
 * There is deliberately no `info`. Warning and progress both take the accent,
 * because the accent already means "your attention is needed here".
 */
export interface FeedbackScale {
  error: FeedbackTriple;
  warning: FeedbackTriple;
  success: FeedbackTriple;
  progress: FeedbackTriple;
}

/**
 * An NPC's stance toward the party. Valenced, and deliberately so.
 *
 * This looks like it contradicts the rule that NPC presence carries no
 * valence, and does not: *presence* (alive, deceased) is a fact about the
 * world, while *disposition* has valence from the only point of view the
 * record keeps -- a hostile NPC is genuinely a threat to the people reading
 * the page. It is still not an `outcome`, because nothing concluded.
 */
/** One stop on the valence ramp. */
export interface ValenceStop {
  /** The state as a word, on a content surface. Owes 4.5:1. */
  ink: string;
  /** A bar segment or a legend dot. Not text, so it owes 3:1. */
  fill: string;
}

/**
 * Ranked campaign state, good to bad, in five stops.
 *
 * Position is the meaning, exactly as in `knowledge`: a stop named `failed`
 * would tie a ramp that quests, rumours, locations and NPCs all share to one
 * of them. A scale with three states takes 0, 2 and 4; NPC presence, which has
 * four, takes 0, 1, 3 and 4. Both keep the same ends, which is what makes the
 * four directories read as one system.
 *
 * Stops 0 and 4 carry the same values as `outcome.succeeded` and
 * `outcome.failed` -- not by an alias but because the contract solves them from
 * the same lightnesses and chromas. `outcome` remains for the things that are
 * genuinely a verdict rather than a rank, and for `disposition` and `feedback`,
 * which borrow from it.
 */
export interface ValenceScale {
  0: ValenceStop;
  1: ValenceStop;
  2: ValenceStop;
  3: ValenceStop;
  4: ValenceStop;
}

export interface DispositionScale {
  friendly: string;
  neutral: string;
  hostile: string;
  unknown: string;
}

export interface ThemeTokens {
  /** Sets `color-scheme` on the document element. */
  scheme: ColorSchemeToken;

  /**
   * What is left of the pre-pair-model `color.*`.
   *
   * `primary`, `secondary` and `accent` are gone with their consumers: all
   * three were the accent under names that said nothing about the job, and
   * `accent.ink` / `.edge` / `.fill` say it. These two survive because they
   * name something real -- emphasis is the page's muted ink, heading is its
   * full-strength ink.
   */
  color: {
    emphasis: string;
    heading: string;
  };

  /**
   * The accent, named by job. `color.primary` moves here and is deleted.
   */
  accent: AccentScale;

  surface: {
    page: SurfacePair;
    card: SurfacePair;
    sunken: SurfacePair;
    chrome: SurfacePair;
    band: SurfacePair;
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
   * Position is the meaning: a step named `visited` would tie a ladder that
   * locations *and* rumours use to one of them. Contrast against the ground
   * rises monotonically with the index, in both modes, so the ladder survives
   * greyscale and colour blindness as a value ramp rather than a hue
   * difference.
   *
   * **Why this is a record and not an array**, against token model section 6's
   * preference for ordered collections: the schema gives the ladder a named
   * sibling, `knowledge.wash`, and an array cannot carry one -- `flattenTokens`
   * branches on `Array.isArray` and emits index-suffixed variables only, so a
   * property hung off an array would be silently dropped. The ordering the
   * array type used to express is not lost, because it was never really the
   * type that enforced it: `token-contrast.test.ts` asserts the ladder rises
   * with the index in both modes, and the fixture pins all four paths. That
   * pair is a stronger guarantee than the shape was. `entityPalette` stays an
   * array, so the ordered-collection mechanism is still exercised.
   */
  knowledge: {
    0: string;
    1: string;
    2: string;
    /** Translucent. A backdrop for a knowledge-tinted panel. */
    wash: string;
  };

  /** Ranked campaign state, good to bad. See `ValenceScale`. */
  valence: ValenceScale;

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

  /** The application's own voice, distinct from the campaign's record. */
  feedback: FeedbackScale;

  /** An NPC's stance toward the party. */
  disposition: DispositionScale;

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
    /**
     * A *filled* destructive button: the red is the background and carries its
     * own ink. `deleteText` stays the red-on-a-plain-surface case -- the two
     * are different grounds, which is exactly the distinction that a single
     * "delete red" token loses.
     */
    confirmBg: string;
    confirmText: string;
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
