// src/core/themes/derive/generate.ts
// The generator: a contract in, a theme tree out.
//
// Both modes come from here, and neither definition file holds a hex any more.
// The property that buys is not tidiness -- it is that a mode can no longer be
// a different design. It can only be the same design at a different lightness.

import { ThemeName, ThemeTokens, SurfacePair } from "../types";
import {
  AWAY_FROM_GROUND,
  CUES,
  ENTITY_COUNT,
  HUE,
  LEGAL_CUES,
  LEGAL_SCHEMES,
  NON_TEXT_MINIMUM,
  RAMP,
  RING_ALPHA,
  SOLVE_STEP,
  TEXT_MINIMUM,
  WASH_ALPHA,
} from "./contract";
import { ROLE_MAP, Role } from "./role-map";
import { contrastRatio, flattenOnto, oklchToHex, withAlpha } from "./oklch";

/** Section 5.1-5.3: the 91 values every token name resolves to. */
export interface Primitives {
  surface: Record<"chrome" | "band" | "page" | "card" | "sunken", SurfacePair>;
  accent: { base: string; hover: string; on: string; ring: string; wash: string };
  outcome: {
    succeeded: string;
    failedInk: string;
    failedFill: string;
    failedOn: string;
    failedWash: string;
    successWash: string;
    successRing: string;
    failedRing: string;
  };
  knowledge: readonly [string, string, string];
  knowledgeWash: string;
  /** Five stops, good to bad, each with an ink and a fill. */
  valence: readonly { ink: string; fill: string }[];
  neutralBorder: string;
  placeholder: string;
  secondary: { bg: string; on: string; hover: string };
  disabledBg: string;
  entity: readonly string[];
  entityInk: string;
}

/**
 * Section 4.3 rule 2: the authored lightness is a starting point.
 *
 * A role moves away from the ground in 0.005 steps until it clears its
 * threshold against page, card **and** sunken at once. Against the worst of
 * the three, not a chosen one -- three defects in this project were the same
 * shape, a legitimate value measured against the kind ground.
 */
const solve = (
  mode: ThemeName,
  grounds: readonly string[],
  start: number,
  c: number,
  h: number,
  minimum: number
): string => {
  let l = start;
  for (let step = 0; step < 400; step += 1) {
    const hex = oklchToHex({ l, c, h });
    if (Math.min(...grounds.map((ground) => contrastRatio(hex, ground))) >= minimum) {
      return hex;
    }
    l += AWAY_FROM_GROUND[mode] * SOLVE_STEP;
  }
  throw new Error(
    `No lightness clears ${minimum}:1 for hue ${h} in the ${mode} theme. ` +
      "The contract is wrong, not the theme file."
  );
};

export const derivePrimitives = (mode: ThemeName): Primitives => {
  const ramp = RAMP[mode];
  const { h: neutralHue, surfaceChroma, inkChroma } = HUE.neutral;

  const neutral = (l: number, c: number): string => oklchToHex({ l, c, h: neutralHue });

  /**
   * A surface and its six roles. Border, hover and selected are offsets from
   * the surface's own lightness, so a surface cannot be given a state that
   * belongs to a different one.
   *
   * The ink family is a property of the surface, not of the mode. Chrome and
   * band are near-black in *both* modes -- that is the product's identity, not
   * a light-mode accident -- so they take the same ink either way, and the
   * content surfaces take theirs.
   */
  const surface = (
    l: number,
    family: "content" | "chrome",
    borderLightness = l + ramp.hairline
  ): SurfacePair => ({
    bg: neutral(l, surfaceChroma),
    on: neutral(family === "chrome" ? ramp.inkOnDark : ramp.inkOnLight, inkChroma),
    onMuted: neutral(
      family === "chrome" ? ramp.inkOnDarkMuted : ramp.inkOnLightMuted,
      inkChroma
    ),
    border: neutral(borderLightness, surfaceChroma),
    hover: neutral(l + ramp.hover, surfaceChroma),
    selected: neutral(l + ramp.selected, surfaceChroma),
  });

  const surfaces = {
    chrome: surface(ramp.chrome, "chrome", ramp.chromeBorder),
    band: surface(ramp.band, "chrome", ramp.bandBorder),
    page: surface(ramp.page, "content"),
    card: surface(ramp.card, "content"),
    sunken: surface(ramp.sunken, "content"),
  };

  // The three grounds content actually sits on. Chrome and band are excluded
  // deliberately: they carry their own ink and are gated as pairs.
  const grounds = [surfaces.page.bg, surfaces.card.bg, surfaces.sunken.bg];
  const against = (start: number, c: number, h: number, minimum: number): string =>
    solve(mode, grounds, start, c, h, minimum);

  const accentBase = against(ramp.accent, HUE.accent.c, HUE.accent.h, TEXT_MINIMUM);
  const succeeded = against(ramp.succeeded, HUE.succeeded.c, HUE.succeeded.h, TEXT_MINIMUM);
  const failedInk = against(ramp.failedInk, HUE.failed.c, HUE.failed.h, TEXT_MINIMUM);
  const knowledge = ramp.knowledge.map((l) =>
    against(l, HUE.knowledge.c, HUE.knowledge.h, TEXT_MINIMUM)
  ) as unknown as readonly [string, string, string];

  /*
   * The valence ramp. Both ends are pinned to the outcome pair by construction
   * rather than by coincidence: the ink lightness interpolates from the one
   * `succeeded` was solved from to the one `failedInk` was, and the chromas at
   * either end are those two roles' own. So stop 0 *is* `outcome.succeeded`
   * and stop 4 *is* `outcome.failedInk`, and a quest keeps its colour when it
   * moves onto the ramp.
   *
   * Fills solve against 3:1 rather than 4.5:1 -- section 4.4's split, the same
   * one `outcome.failed` carries. On a cream ground that is the difference
   * between a gold middle and an olive one.
   */
  const valence = HUE.valence.hues.map((h, index) => {
    const t = index / (HUE.valence.hues.length - 1);
    const inkLightness = ramp.succeeded + (ramp.failedInk - ramp.succeeded) * t;
    return {
      ink: against(inkLightness, HUE.valence.chromas[index], h, TEXT_MINIMUM),
      fill: against(ramp.valenceFill, HUE.valence.chromas[index], h, NON_TEXT_MINIMUM),
    };
  });

  return {
    surface: surfaces,
    accent: {
      base: accentBase,
      hover: oklchToHex({ l: ramp.accentHover, ...HUE.accent }),
      // Ink on the accent, so it is neutral rather than chromatic: it is
      // verified against the accent fill, not against a surface.
      on: neutral(ramp.accentOn, inkChroma),
      ring: withAlpha(accentBase, RING_ALPHA),
      wash: withAlpha(accentBase, WASH_ALPHA),
    },
    outcome: {
      succeeded,
      failedInk,
      // Section 4.4: the fill owes 3:1, not 4.5:1, so it can stay a proper
      // deep red on a dark ground instead of drifting to salmon.
      failedFill: against(ramp.failedFill, HUE.failed.c, HUE.failed.h, NON_TEXT_MINIMUM),
      // Section 4.3 rule 5: an `on` value is authored, not solved. Taken from
      // the ramp and verified against the fill it sits on, never against a
      // surface -- which is why it is `neutral(...)` here and not `against(...)`.
      failedOn: neutral(ramp.failedOn, inkChroma),
      failedWash: withAlpha(failedInk, WASH_ALPHA),
      successWash: withAlpha(succeeded, WASH_ALPHA),
      successRing: withAlpha(succeeded, RING_ALPHA),
      failedRing: withAlpha(failedInk, RING_ALPHA),
    },
    knowledge,
    valence,
    // Section 4.3 rule 6: derived from the ladder's first step, and it does
    // not constrain that step in return. Solving an ink against its own wash
    // is what pushed four primitives brighter than the contract asked for in
    // version 4 of the schema (D37).
    knowledgeWash: withAlpha(knowledge[0], WASH_ALPHA),
    neutralBorder: against(ramp.fieldBorder, inkChroma, neutralHue, NON_TEXT_MINIMUM),
    placeholder: against(ramp.placeholder, inkChroma, neutralHue, TEXT_MINIMUM),
    secondary: {
      bg: neutral(ramp.secondary, surfaceChroma),
      on: neutral(ramp.secondaryOn, inkChroma),
      hover: neutral(ramp.secondaryHover, surfaceChroma),
    },
    disabledBg: neutral(ramp.card + ramp.disabled, surfaceChroma),
    entity: Array.from({ length: ENTITY_COUNT }, (_, index) =>
      oklchToHex({
        l: ramp.entity,
        c: HUE.entity.c,
        h: (HUE.entity.firstHue + HUE.entity.step * index) % 360,
      })
    ),
    entityInk: neutral(ramp.entityInk, inkChroma),
  };
};

/** Walks a dotted path into the primitives. `knowledge.0` indexes an array. */
const lookup = (primitives: Primitives, path: string): string => {
  const value = path.split(".").reduce<unknown>((node, segment) => {
    if (node === undefined || node === null) return undefined;
    return (node as Record<string, unknown>)[segment];
  }, primitives);

  if (typeof value !== "string") {
    throw new Error(
      `Role source "${path}" is not a primitive. The role map names something ` +
        "the contract does not generate; that is a gap in the schema, not a value to invent."
    );
  }
  return value;
};

/**
 * Resolves every role once, and complains if the map holds an entry nobody
 * asked for.
 *
 * The second half matters more than it looks: a role that no token consumes is
 * indistinguishable from a typo, and both are silent. The tree below is built
 * by hand against `ThemeTokens`, so this is what keeps the two in step.
 */
const roleResolver = (primitives: Primitives) => {
  const unused = new Set(Object.keys(ROLE_MAP));

  const role = (path: string): string => {
    const entry: Role | undefined = ROLE_MAP[path];
    if (!entry) {
      throw new Error(`No role for "${path}". Section 5.4 is incomplete; raise it.`);
    }
    unused.delete(path);
    return "literal" in entry ? entry.literal : lookup(primitives, entry.from);
  };

  const assertAllConsumed = (): void => {
    if (unused.size > 0) {
      throw new Error(
        `Roles defined but never consumed: ${[...unused].sort().join(", ")}.`
      );
    }
  };

  return { role, assertAllConsumed };
};

/** Every token tree in the application. Nothing here is authored by hand. */
export const deriveTokens = (mode: ThemeName): ThemeTokens => {
  const primitives = derivePrimitives(mode);
  const { role, assertAllConsumed } = roleResolver(primitives);

  const tokens: ThemeTokens = {
    scheme: mode,
    color: {
      emphasis: role("color.emphasis"),
      heading: role("color.heading"),
    },
    // One primitive under three usage names. `color.primary` above is the
    // same value and is deleted in 12-3b; this is what its consumers move to.
    accent: {
      ink: primitives.accent.base,
      edge: primitives.accent.base,
      fill: primitives.accent.base,
      hover: primitives.accent.hover,
      on: primitives.accent.on,
      ring: primitives.accent.ring,
    },
    surface: primitives.surface,
    // The semantic scales. These take their values straight from the
    // primitives rather than through the role map, because they are not
    // existing names being resolved -- they *are* the primitives, finally
    // carrying the name of what they mean. The role map exists for the
    // opposite case, and putting these through it would invent an indirection
    // in the one place there genuinely is none.
    outcome: {
      succeeded: primitives.outcome.succeeded,
      failed: {
        ink: primitives.outcome.failedInk,
        fill: primitives.outcome.failedFill,
        on: primitives.outcome.failedOn,
      },
    },
    knowledge: {
      0: primitives.knowledge[0],
      1: primitives.knowledge[1],
      2: primitives.knowledge[2],
      wash: primitives.knowledgeWash,
    },
    // Ranked campaign state, good to bad. A record rather than an array for
    // the reason `knowledge` is one: `flattenTokens` emits index-suffixed
    // variables for arrays and would drop the ink/fill pair hung off each stop.
    valence: {
      0: primitives.valence[0],
      1: primitives.valence[1],
      2: primitives.valence[2],
      3: primitives.valence[3],
    },
    cue: { failure: CUES.failure, negation: CUES.negation },
    // The application's own voice. Error and success borrow the outcome
    // primitives; warning and progress borrow the accent, because the accent
    // already means "your attention is needed here". No `info`, deliberately.
    feedback: {
      error: {
        ink: primitives.outcome.failedInk,
        edge: primitives.outcome.failedInk,
        wash: primitives.outcome.failedWash,
      },
      warning: {
        ink: primitives.accent.base,
        edge: primitives.accent.base,
        wash: primitives.accent.wash,
      },
      success: {
        ink: primitives.outcome.succeeded,
        edge: primitives.outcome.succeeded,
        wash: primitives.outcome.successWash,
      },
      progress: {
        ink: primitives.accent.base,
        edge: primitives.accent.base,
        wash: primitives.accent.wash,
      },
    },
    // Valenced, unlike NPC presence -- a hostile NPC is a threat to the
    // people reading the page. `neutral` is muted ink rather than a hue,
    // because "no particular stance" is not a colour job.
    disposition: {
      friendly: primitives.outcome.succeeded,
      neutral: primitives.surface.card.onMuted,
      hostile: primitives.outcome.failedInk,
      unknown: primitives.knowledge[0],
    },
    icon: {
      bg: role("icon.bg"),
      border: role("icon.border"),
    },
    field: {
      bg: role("field.bg"),
      placeholder: role("field.placeholder"),
      border: role("field.border"),
      borderFocus: role("field.borderFocus"),
      ringFocus: role("field.ringFocus"),
      errorBorder: role("field.errorBorder"),
      errorFocus: role("field.errorFocus"),
      errorRing: role("field.errorRing"),
      successBorder: role("field.successBorder"),
      successFocus: role("field.successFocus"),
      successRing: role("field.successRing"),
      disabledBg: role("field.disabledBg"),
      labelText: role("field.labelText"),
      helperText: role("field.helperText"),
      errorText: role("field.errorText"),
      successText: role("field.successText"),
    },
    action: {
      primary: {
        bg: role("action.primary.bg"),
        text: role("action.primary.text"),
        hover: role("action.primary.hover"),
      },
      secondary: {
        bg: role("action.secondary.bg"),
        text: role("action.secondary.text"),
        hover: role("action.secondary.hover"),
      },
      link: {
        bg: role("action.link.bg"),
        text: role("action.link.text"),
        hover: role("action.link.hover"),
      },
      outline: {
        bg: role("action.outline.bg"),
        text: role("action.outline.text"),
        hover: role("action.outline.hover"),
        border: role("action.outline.border"),
      },
      ghost: {
        bg: role("action.ghost.bg"),
        text: role("action.ghost.text"),
        hover: role("action.ghost.hover"),
      },
    },
    danger: {
      bg: role("danger.bg"),
      deleteBg: role("danger.deleteBg"),
      deleteText: role("danger.deleteText"),
      deleteHover: role("danger.deleteHover"),
      confirmBg: role("danger.confirmBg"),
      confirmText: role("danger.confirmText"),
    },
    font: {
      primary: role("font.primary"),
      secondary: role("font.secondary"),
      heading: role("font.heading"),
    },
    border: {
      radius: {
        sm: role("border.radius.sm"),
        md: role("border.radius.md"),
        lg: role("border.radius.lg"),
      },
      width: {
        sm: role("border.width.sm"),
        md: role("border.width.md"),
        lg: role("border.width.lg"),
      },
    },
    entityPalette: [...primitives.entity],
    entityInk: primitives.entityInk,
  };

  assertAllConsumed();
  verifyEnums(tokens);
  verifyBorrowedRoles(tokens);
  return tokens;
};

/** One enum token carrying a value nothing downstream understands. */
export interface IllegalEnumValue {
  token: string;
  value: string;
  legal: readonly string[];
}

/**
 * Enum tokens, checked by **value** rather than by presence.
 *
 * Token model section 6 asks for this explicitly, and the reason is that the
 * failure mode is silence. `scheme: 'drak'` defines a variable, satisfies the
 * manifest, satisfies the cross-theme path check, and is then dropped by the
 * browser -- the symptom is identical to having no `color-scheme` at all,
 * which is the bug `scheme` was added to fix. A misspelt cue fails the same
 * way: the variable is there and no hatching is painted.
 */
export const findIllegalEnumValues = (
  tokens: ThemeTokens
): readonly IllegalEnumValue[] => {
  const checks: ReadonlyArray<[string, string, readonly string[]]> = [
    ["scheme", tokens.scheme, LEGAL_SCHEMES],
    ["cue.failure", tokens.cue.failure, LEGAL_CUES],
    ["cue.negation", tokens.cue.negation, LEGAL_CUES],
  ];

  return checks
    .filter(([, value, legal]) => !legal.includes(value))
    .map(([token, value, legal]) => ({ token, value, legal }));
};

/** The same check, as a hard stop at generation time. */
export const verifyEnums = (tokens: ThemeTokens): void => {
  const illegal = findIllegalEnumValues(tokens);
  if (illegal.length === 0) return;

  throw new Error(
    "Enum tokens carry values nothing understands:\n" +
      illegal
        .map((e) => `  ${e.token}: "${e.value}" is not one of ${e.legal.join(", ")}`)
        .join("\n")
  );
};

/** One failed check: what was measured, against what, and how short it fell. */
export interface BorrowedRoleFailure {
  token: string;
  ground: string;
  ratio: number;
  minimum: number;
}

/**
 * Section 5.4 rule 2, run at generation time rather than in review.
 *
 * A primitive that clears 4.5:1 where it was authored is not automatically safe
 * where it is borrowed, because borrowing changes the ground. Two of the four
 * contrast failures this phase set out to fix were exactly that, and both were
 * legitimate values in legitimate slots -- the shape no per-usage review
 * reliably catches.
 *
 * Deliberately not checked here:
 *   - Anything resolving to `accent.hover`. Section 5.2 authors that primitive
 *     with no ratio -- a dash, where every verified role has a number -- so
 *     asserting one would be this file inventing a requirement the contract
 *     does not make. It is not academic: dark's is 4.45:1 on `card`, and both
 *     tokens that borrow it are hover states or retired in 12-3.
 *   - Fills. A fill is verified through the ink it carries, below.
 *   - Rings and washes. Translucent, so they have no ratio until they have a
 *     ground, and their ground is whatever they are drawn over.
 *   - Surfaces. `token-contrast.test.ts` gates those as pairs, states included.
 */
export const findBorrowedRoleFailures = (
  tokens: ThemeTokens
): readonly BorrowedRoleFailure[] => {
  const contentGrounds: ReadonlyArray<[string, string]> = [
    ["page", tokens.surface.page.bg],
    ["card", tokens.surface.card.bg],
    ["sunken", tokens.surface.sunken.bg],
  ];

  /**
   * Primitives the contract itself does not hold to a ratio, named once rather
   * than skipped token by token. Section 5.2's table is the authority: a role
   * with a dash where the others have a number is not being asserted.
   */
  const unverified = new Set(["accent.hover"]);
  const isVerified = ([token]: [string, string]): boolean => {
    const entry = ROLE_MAP[token];
    return !(entry && "from" in entry && unverified.has(entry.from));
  };

  /** Ink that lands on page, card or sunken. All three, simultaneously. */
  const inkOnContent: ReadonlyArray<[string, string]> = ([
    ["color.emphasis", tokens.color.emphasis],
    ["color.heading", tokens.color.heading],
    ["accent.ink", tokens.accent.ink],
    ["feedback.error.ink", tokens.feedback.error.ink],
    ["feedback.warning.ink", tokens.feedback.warning.ink],
    ["feedback.success.ink", tokens.feedback.success.ink],
    ["feedback.progress.ink", tokens.feedback.progress.ink],
    ["disposition.friendly", tokens.disposition.friendly],
    ["disposition.neutral", tokens.disposition.neutral],
    ["disposition.hostile", tokens.disposition.hostile],
    ["disposition.unknown", tokens.disposition.unknown],
    ["field.placeholder", tokens.field.placeholder],
    ["field.labelText", tokens.field.labelText],
    ["field.helperText", tokens.field.helperText],
    ["field.errorText", tokens.field.errorText],
    ["field.successText", tokens.field.successText],
    ["action.link.text", tokens.action.link.text],
    ["action.outline.text", tokens.action.outline.text],
    ["action.ghost.text", tokens.action.ghost.text],
    ["danger.deleteText", tokens.danger.deleteText],
  ] as Array<[string, string]>).filter(isVerified);

  /**
   * Boundaries that identify a control, so WCAG 1.4.11 binds.
   *
   * `action.outline.border` is optional on `ActionPair` -- a variant draws one
   * only where it has an edge -- so an absent border is skipped rather than
   * measured as an empty string, which would fail for the wrong reason.
   */
  const boundaries: ReadonlyArray<[string, string]> = [
    ["icon.border", tokens.icon.border],
    ...(tokens.action.outline.border
      ? ([["action.outline.border", tokens.action.outline.border]] as Array<[string, string]>)
      : []),
    ["field.border", tokens.field.border],
    ["field.borderFocus", tokens.field.borderFocus],
    ["field.errorBorder", tokens.field.errorBorder],
    ["field.successBorder", tokens.field.successBorder],
    ["accent.edge", tokens.accent.edge],
    ["feedback.error.edge", tokens.feedback.error.edge],
    ["feedback.warning.edge", tokens.feedback.warning.edge],
    ["feedback.success.edge", tokens.feedback.success.edge],
    ["feedback.progress.edge", tokens.feedback.progress.edge],
  ];

  /** Ink whose ground is a fill rather than a surface. */
  const inkOnFill: ReadonlyArray<[string, string, string, string]> = [
    ["action.primary.text", tokens.action.primary.text, "action.primary.bg", tokens.action.primary.bg],
    [
      "action.secondary.text",
      tokens.action.secondary.text,
      "action.secondary.bg",
      tokens.action.secondary.bg,
    ],
    ["accent.on", tokens.accent.on, "accent.fill", tokens.accent.fill],
    [
      "outcome.failed.on",
      tokens.outcome.failed.on,
      "outcome.failed.fill",
      tokens.outcome.failed.fill,
    ],
    ["danger.confirmText", tokens.danger.confirmText, "danger.confirmBg", tokens.danger.confirmBg],
    ...tokens.entityPalette.map(
      (swatch, index) =>
        ["entityInk", tokens.entityInk, `entityPalette.${index}`, swatch] as [
          string,
          string,
          string,
          string
        ]
    ),
  ];

  const failures: BorrowedRoleFailure[] = [];
  const check = (token: string, colour: string, ground: string, groundColour: string, minimum: number) => {
    const ratio = contrastRatio(colour, groundColour);
    if (ratio < minimum) {
      failures.push({ token, ground, ratio: Math.round(ratio * 100) / 100, minimum });
    }
  };

  inkOnContent.forEach(([token, colour]) =>
    contentGrounds.forEach(([ground, groundColour]) =>
      check(token, colour, ground, groundColour, TEXT_MINIMUM)
    )
  );
  boundaries.forEach(([token, colour]) =>
    contentGrounds.forEach(([ground, groundColour]) =>
      check(token, colour, ground, groundColour, NON_TEXT_MINIMUM)
    )
  );
  inkOnFill.forEach(([token, colour, ground, groundColour]) =>
    check(token, colour, ground, groundColour, TEXT_MINIMUM)
  );

  /**
   * Body ink on a washed panel -- schema section 5.6, and the one pairing rule
   * the new scales carry.
   *
   * A wash has no ratio of its own (section 4.3 rule 6), so what is gated is
   * the text that lands on it once it has a ground. The legal banner is a
   * `wash` background, an `edge` border and **`surface.*.on` for the text**;
   * the hue appears as the boundary and never as the text on top of itself.
   *
   * That rule is not a style preference. `feedback.*.ink` on its own `wash`
   * fails AA in three of eight mode-state combinations, and *which* three
   * differs by mode -- light's warning and progress, dark's error. An
   * asymmetry in that shape is exactly what gets shipped by eye and caught by
   * a gate, which is why this runs at generation time.
   */
  const washes: ReadonlyArray<[string, string]> = [
    ["feedback.error.wash", tokens.feedback.error.wash],
    ["feedback.warning.wash", tokens.feedback.warning.wash],
    ["feedback.success.wash", tokens.feedback.success.wash],
    ["feedback.progress.wash", tokens.feedback.progress.wash],
    ["knowledge.wash", tokens.knowledge.wash],
  ];

  washes.forEach(([washToken, wash]) =>
    (["page", "card", "sunken"] as const).forEach((name) => {
      const surface = tokens.surface[name];
      check(
        `surface.${name}.on`,
        surface.on,
        `${washToken} over ${name}`,
        flattenOnto(wash, surface.bg),
        TEXT_MINIMUM
      );
    })
  );

  return failures;
};

/**
 * The pairing section 5.6 forbids, measured rather than asserted in prose.
 *
 * Exported because the rule is only worth having if it can be *seen* to bind:
 * a gate nobody has watched fail is indistinguishable from one that cannot,
 * and this one reads as a stylistic preference until the numbers are in front
 * of you. `themes.test.ts` pins that three of these eight fall below AA.
 */
export const findWashPairingRatios = (
  tokens: ThemeTokens
): ReadonlyArray<{ scale: string; ground: string; ratio: number }> => {
  const triples: ReadonlyArray<[string, { ink: string; wash: string }]> = [
    ["error", tokens.feedback.error],
    ["warning", tokens.feedback.warning],
    ["success", tokens.feedback.success],
    ["progress", tokens.feedback.progress],
  ];

  // Against the worst of the three content grounds, never a chosen one --
  // the same rule the solve in section 4.3 follows.
  return triples.map(([scale, { ink, wash }]) => {
    const measured = (["page", "card", "sunken"] as const).map((name) => ({
      ground: name,
      ratio: contrastRatio(ink, flattenOnto(wash, tokens.surface[name].bg)),
    }));
    const worst = measured.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    return { scale, ground: worst.ground, ratio: Math.round(worst.ratio * 100) / 100 };
  });
};

/**
 * The same check, as a hard stop.
 *
 * Generation fails rather than review catching it later: contrast is an
 * assertion in this model, because lightness is the input. A contract change
 * that breaks a borrowed role should be unable to reach a theme file at all.
 */
export const verifyBorrowedRoles = (tokens: ThemeTokens): void => {
  const failures = findBorrowedRoleFailures(tokens);
  if (failures.length === 0) return;

  throw new Error(
    "Borrowed roles fail against their new ground:\n" +
      failures
        .map((f) => `  ${f.token} on ${f.ground}: ${f.ratio}:1, needs ${f.minimum}:1`)
        .join("\n") +
      "\nThe contract in colour-schema.md section 4 is wrong. Do not hand-correct a value."
  );
};
