// src/core/themes/derive/contract.ts
// The authored input, transcribed from design/colour-schema.md section 4.
//
// Hue and chroma are fixed across modes; a mode supplies lightness and
// nothing else. That asymmetry is the whole design: two files that may each
// say anything eventually say two different things, and this is the structure
// that makes them unable to.
//
// Read-only source of truth: docs/design/colour-schema.md. A value here that
// disagrees with it is a bug, and the fix is upstream.

import { ThemeName } from "../types";

/** Hue in degrees and chroma, per colour job. Section 4.1. */
export const HUE = {
  /** Surfaces and ink carry a trace of chroma so the greys read warm. */
  neutral: { h: 68, surfaceChroma: 0.012, inkChroma: 0.014 },
  accent: { h: 62, c: 0.115 },
  succeeded: { h: 143, c: 0.085 },
  failed: { h: 22, c: 0.155 },
  /**
   * The one hue `disposition` authors for itself.
   *
   * Friendly and hostile borrow the valence ramp's ends, because a stance
   * toward the party genuinely is good or bad, and neutral takes muted ink.
   * An *unknown* stance is none of those: it is not a point between friendly
   * and hostile, so painting it anywhere on the ramp would rank something the
   * record does not know. Indigo says "no reading" without implying one.
   *
   * This was the knowledge ladder's hue. The ladder itself is gone -- the four
   * directories that rode it are ranked now (D41) -- and this single value is
   * what outlived it.
   */
  dispositionUnknown: { h: 265, c: 0.09 },
  /**
   * The valence ramp: four stops from "good" to "bad", used by every directory
   * that ranks its states.
   *
   * Four, because that is the most states any one scale has -- NPC presence --
   * and a scale with three takes three of the four rather than getting its own
   * spacing. An earlier cut had five stops, which forced exactly the asymmetry
   * this avoids: three-state scales took 0/2/4 and NPC took 0/1/3/4, so NPC's
   * middles were two colours no other page showed and it never displayed the
   * middle the others shared. One ramp, sampled, keeps every directory drawing
   * from the same four colours.
   *
   * Which three a three-state scale takes is a judgement about the domain, not
   * about the ramp: quests and rumours end at the red because a quest can fail
   * and a rumour can be disproved, while locations stop at 2, since a place you
   * have merely heard of is the least of the three and not a bad outcome.
   *
   * Hue runs evenly from `succeeded` (143) to `failed` (22) the short way --
   * through yellow and amber, the warm half of the wheel, which is the only
   * path that reads as a single progression rather than a detour through blue.
   * Chroma rises with the index so that the reds at the far end carry the
   * weight the greens at the near end do not need.
   *
   * The ends are not merely *near* the outcome pair, they **are** it: stop 0
   * resolves to `outcome.succeeded` and stop 4 to `outcome.failed`, because
   * `valenceInk` interpolates between exactly those two lightnesses at exactly
   * those two chromas. That is what lets quests move onto this ramp without
   * changing colour, and it is checked rather than asserted -- see
   * `valence-ramp.test.ts`.
   */
  valence: {
    hues: [143, 102.67, 62.33, 22],
    chromas: [0.085, 0.1083, 0.1317, 0.155],
  },
  /** A loop, not a list: eight hues at even spacing. Order is the contract. */
  entity: { firstHue: 25, step: 45, c: 0.055 },
} as const;

/** How many identity hues the loop produces. */
export const ENTITY_COUNT = 8;

/**
 * Lightness per role, per mode. Section 4.2.
 *
 * Chromatic entries are *starting points*: section 4.3 rule 2 moves them away
 * from the ground until they clear their threshold, so the value that ships is
 * not always the value written here.
 */
export interface LightnessRamp {
  chrome: number;
  chromeBorder: number;
  band: number;
  bandBorder: number;
  page: number;
  card: number;
  sunken: number;
  /**
   * Ink for page, card and sunken. Named for light mode's grounds, where the
   * contract was authored -- in dark mode this is a *light* ink on a dark
   * ground. The family belongs to the surface, not to the mode.
   */
  inkOnLight: number;
  inkOnLightMuted: number;
  /** Ink for chrome and band, which are near-black in both modes. */
  inkOnDark: number;
  inkOnDarkMuted: number;
  /** Offsets, applied to a surface's own lightness. */
  hairline: number;
  hover: number;
  selected: number;
  disabled: number;
  fieldBorder: number;
  placeholder: number;
  accent: number;
  accentHover: number;
  accentOn: number;
  succeeded: number;
  failedInk: number;
  failedFill: number;
  /**
   * Ink *on* the failure fill, and the one entry that is identical in both
   * modes. A neutral ink does not vary with the mode -- only its lightness
   * does -- so authoring 0.975 twice is what makes `outcome.failed.on`
   * resolve to one value on both sides rather than two that happen to agree.
   */
  failedOn: number;
  /** Lightness for `disposition.unknown`, the one hue disposition authors. */
  dispositionUnknown: number;
  /** Start lightness for the valence ramp's fills, solved at 3:1. */
  valenceFill: number;
  secondary: number;
  secondaryHover: number;
  secondaryOn: number;
  entity: number;
  entityInk: number;
}

export const RAMP: Record<ThemeName, LightnessRamp> = {
  light: {
    chrome: 0.205,
    chromeBorder: 0.29,
    band: 0.25,
    bandBorder: 0.33,
    page: 0.945,
    card: 0.975,
    sunken: 0.915,
    inkOnLight: 0.23,
    inkOnLightMuted: 0.47,
    inkOnDark: 0.955,
    inkOnDarkMuted: 0.745,
    hairline: -0.06,
    hover: -0.03,
    selected: -0.062,
    disabled: -0.025,
    fieldBorder: 0.615,
    placeholder: 0.5,
    accent: 0.49,
    accentHover: 0.42,
    accentOn: 0.975,
    succeeded: 0.46,
    failedInk: 0.44,
    failedFill: 0.44,
    failedOn: 0.975,
    dispositionUnknown: 0.48,
    /**
     * Where the valence ramp's **fills** start solving from.
     *
     * A bar or a legend dot is not text, so it owes 3:1 rather than
     * 4.5:1 (section 4.4, the same split `outcome.failed` already
     * carries). That difference is not a technicality here: at the
     * lightness AA demands on a cream ground, sRGB cannot hold chroma
     * anywhere near yellow, and the middle of the ramp comes out olive.
     * Solved at 3:1 it comes out gold, which is the same ramp with the
     * mud taken out.
     */
    valenceFill: 0.58,
    secondary: 0.3,
    secondaryHover: 0.24,
    secondaryOn: 0.975,
    entity: 0.435,
    entityInk: 0.965,
  },
  dark: {
    chrome: 0.13,
    chromeBorder: 0.225,
    band: 0.175,
    bandBorder: 0.265,
    page: 0.225,
    card: 0.27,
    sunken: 0.18,
    inkOnLight: 0.915,
    inkOnLightMuted: 0.73,
    inkOnDark: 0.945,
    inkOnDarkMuted: 0.72,
    hairline: 0.065,
    hover: 0.04,
    selected: 0.082,
    // Negative in both modes: a disabled field recedes rather than lifts.
    disabled: -0.035,
    fieldBorder: 0.62,
    placeholder: 0.68,
    accent: 0.715,
    accentHover: 0.645,
    accentOn: 0.165,
    succeeded: 0.695,
    failedInk: 0.65,
    // Lower than the ink, deliberately. Section 4.4: a red that clears 4.5:1
    // on a dark ground is pink, so failure splits by role instead.
    failedFill: 0.56,
    failedOn: 0.975,
    dispositionUnknown: 0.65,
    /**
     * Where the valence ramp's **fills** start solving from.
     *
     * A bar or a legend dot is not text, so it owes 3:1 rather than
     * 4.5:1 (section 4.4, the same split `outcome.failed` already
     * carries). That difference is not a technicality here: at the
     * lightness AA demands on a cream ground, sRGB cannot hold chroma
     * anywhere near yellow, and the middle of the ramp comes out olive.
     * Solved at 3:1 it comes out gold, which is the same ramp with the
     * mud taken out.
     */
    valenceFill: 0.56,
    secondary: 0.35,
    secondaryHover: 0.415,
    secondaryOn: 0.915,
    entity: 0.395,
    entityInk: 0.955,
  },
};

/**
 * The non-colour cues, from schema section 6.
 *
 * Authored once rather than per mode, for the reason the colours are: a cue is
 * part of the design, and a mode that could choose its own would be a second
 * design. They live in the contract rather than being hardcoded in the
 * generator so that turning one off is a value change, not a code change --
 * which is the whole point of an enum token (token model section 6).
 */
export const CUES = {
  failure: "hatch",
  negation: "strike",
} as const;

/**
 * The legal values of the `cue` enum, as data the generator can check against.
 *
 * Token model section 6: "Validating an enum means checking the **value** is
 * legal, not just that the variable exists." `scheme` is the worked example --
 * `scheme: 'drak'` passes a manifest, passes a cross-theme path check, and is
 * then silently dropped by the browser, which is indistinguishable from having
 * declared nothing. A cue fails the same way: `cue.failure: 'hatchh'` would
 * define the variable and paint no hatching.
 */
export const LEGAL_CUES = ["hatch", "strike", "none"] as const;

/** Which way up a theme can say it is. */
export const LEGAL_SCHEMES = ["light", "dark"] as const;

/** Which way a role moves when it has to clear a threshold: away from the ground. */
export const AWAY_FROM_GROUND: Record<ThemeName, 1 | -1> = {
  light: -1,
  dark: 1,
};

/** The step the solve in section 4.3 rule 2 takes. */
export const SOLVE_STEP = 0.005;

/**
 * The two translucent strengths, authored once rather than per role.
 *
 * Section 4.3 rule 6: a translucent value has no ratio until it has a ground,
 * so these are never solved. They were previously a literal `0.35` inside the
 * generator, which meant a wash and a ring could drift apart from the schema
 * without anything noticing; the JSON carries both at its top level and this
 * is the transcription of that.
 */
export const WASH_ALPHA = 0.1;
export const RING_ALPHA = 0.35;

/** AA for text. */
export const TEXT_MINIMUM = 4.5;

/** WCAG 1.4.11 for anything that is only a fill or a boundary. */
export const NON_TEXT_MINIMUM = 3;
