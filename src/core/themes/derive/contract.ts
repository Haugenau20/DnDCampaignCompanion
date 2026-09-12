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
  knowledge: { h: 245, c: 0.034 },
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
  /** The knowledge ladder, in order. More knowledge means more contrast. */
  knowledge: readonly [number, number, number];
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
    knowledge: [0.48, 0.385, 0.29],
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
    knowledge: [0.65, 0.735, 0.84],
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

/** AA for text. */
export const TEXT_MINIMUM = 4.5;

/** WCAG 1.4.11 for anything that is only a fill or a boundary. */
export const NON_TEXT_MINIMUM = 3;
