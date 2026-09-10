// src/core/themes/__tests__/token-contrast.test.ts
// Contrast, verified per pair rather than per usage.
//
// Making surfaces carry their own ink is what turns contrast into something
// computable from the token set alone: a pair is checked once, and every
// component that picks that surface inherits the result. Three defects fixed
// in Phase 0 shared one shape -- a valid token in a valid slot, wrong in
// relation to what sat behind it -- which a per-usage review keeps missing.

import { lightTheme } from "../definitions/lightTheme";
import { darkTheme } from "../definitions/darkTheme";
import { medievalTheme } from "../definitions/medievalTheme";
import { Theme, ThemeTokens } from "../types";

const THEMES: ReadonlyArray<[string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["medieval", medievalTheme],
];

type Rgb = [number, number, number];

const parseHex = (value: string): Rgb | null => {
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
};

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminance = ([r, g, b]: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG contrast ratio. Both colours must be opaque. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const round = (n: number) => Math.round(n * 100) / 100;

describe("contrast per surface pair", () => {
  describe.each(THEMES)("%s", (_name, theme) => {
    const surfaces = Object.entries(theme.tokens.surface);

    test.each(surfaces)("%s: ink meets AA against its own background", (surfaceName, pair) => {
      const bg = parseHex(pair.bg);
      const on = parseHex(pair.on);
      const onMuted = parseHex(pair.onMuted);
      expect(bg).not.toBeNull();
      expect(on).not.toBeNull();
      expect(onMuted).not.toBeNull();

      // Both ink roles, because `onMuted` is the one that slips: a muted ink
      // that passes on `card` can fail on `sunken`, and only the pair catches it.
      expect({
        surface: surfaceName,
        on: round(contrastRatio(bg as Rgb, on as Rgb)) >= 4.5,
        onMuted: round(contrastRatio(bg as Rgb, onMuted as Rgb)) >= 4.5,
      }).toEqual({ surface: surfaceName, on: true, onMuted: true });
    });
  });
});

/**
 * Boundaries that identify a control -- an outline button, a text field -- owe
 * 3:1 under WCAG 1.4.11, and now meet it. This was a recorded failure through
 * Phases 1-4, ratcheted so it could not worsen while the phases that were
 * allowed to change values had not arrived; the ratchet is now a real
 * requirement.
 *
 * A surface's own `border` is deliberately not checked. A card hairline is
 * decorative structure, not the thing identifying a control, so 1.4.11 does not
 * bind -- and the design language wants it quiet ("separated by a hairline; it
 * does not float").
 */
const CONTROL_BOUNDARY_MINIMUM = 3;

describe("control boundaries meet 3:1", () => {
  const boundaryOf = (tokens: ThemeTokens, key: string): string => {
    if (key === "action.outline.border") return tokens.action.outline.border as string;
    // `action.primary.bg` is a fill everywhere else, but it is a *boundary* on a
    // chosen filter pill (D51) and now on a selected chip (8.2), where nothing
    // is filled with it and the border is the whole signal. A boundary owes 3:1
    // under WCAG 1.4.11 whatever token it happens to be named after, and this
    // one was never measured as one.
    if (key === "action.primary.bg") return tokens.action.primary.bg as string;
    return tokens.field.border;
  };

  describe.each(THEMES)("%s", (name, theme) => {
    // `action.primary.bg` is exempted for medieval only, and ratcheted below
    // instead. See the block after this one.
    const keys =
      name === "medieval"
        ? ["action.outline.border", "field.border"]
        : ["action.outline.border", "field.border", "action.primary.bg"];

    test.each(keys)("%s", (key) => {
      const colour = parseHex(boundaryOf(theme.tokens, key));
      expect(colour).not.toBeNull();

      // Measured against the least favourable of the two grounds a control
      // actually sits on, so the bar cannot be cleared by picking the kind one.
      const grounds = [theme.tokens.surface.page.bg, theme.tokens.surface.card.bg]
        .map(parseHex)
        .filter((c): c is Rgb => c !== null);
      const worst = Math.min(...grounds.map((g) => contrastRatio(colour as Rgb, g)));

      expect({ key, meets3to1: round(worst) >= CONTROL_BOUNDARY_MINIMUM }).toEqual({
        key,
        meets3to1: true,
      });
    });
  });
});


/**
 * Medieval's accent cannot serve as a boundary, and is held rather than fixed.
 *
 * `action.primary.bg` is `#E8D0AA` in medieval -- a pale parchment *fill*,
 * designed to carry dark text on top of it. As a border against the page it
 * measures **1.38:1**, against a 3:1 requirement. That is not a near miss; it is
 * a line you cannot see.
 *
 * This is pre-existing and is not the form chips' problem -- they border with
 * `--color-primary`, which measures 7.93 / 7.78 / 9.24 across the three themes.
 * The consumer that still uses this token as a boundary is `.roster-filter-active`,
 * which has painted the chosen directory filter with it since D51 shipped in
 * Phase 6. So medieval's active filter pill has been drawing an edge you cannot
 * see, in production, with every gate green -- because no gate measured this
 * token as a boundary. 8.2 is simply the first thing to look.
 *
 * Not fixed here: the filter pills are Phase 6's surface, not 8.2's, and a
 * one-line CSS change to a shipped directory does not belong in a PR about form
 * chips. The fix is identified though, and is the same one the chips took --
 * `.roster-filter-active` should take its border from `--color-primary`. Whoever
 * opens that file next should take it, and Phase 11 removes medieval regardless.
 * Ratcheted meanwhile, exactly as D48's status hues were while the phases allowed
 * to change values had not arrived: it cannot get worse.
 */
describe("medieval's accent as a boundary is held, not met", () => {
  const MEDIEVAL_ACCENT_BOUNDARY_FLOOR = 1.38;

  test("does not regress below its recorded ratio", () => {
    const colour = parseHex(medievalTheme.tokens.action.primary.bg);
    expect(colour).not.toBeNull();

    const grounds = [
      medievalTheme.tokens.surface.page.bg,
      medievalTheme.tokens.surface.card.bg,
    ]
      .map(parseHex)
      .filter((c): c is Rgb => c !== null);
    const worst = round(Math.min(...grounds.map((g) => contrastRatio(colour as Rgb, g))));

    expect(worst).toBeGreaterThanOrEqual(MEDIEVAL_ACCENT_BOUNDARY_FLOOR);
  });

  // The thing that must not happen quietly: medieval reaching 3:1 and this
  // exemption outliving the reason for it.
  test("still needs the exemption it is being given", () => {
    const colour = parseHex(medievalTheme.tokens.action.primary.bg);
    const grounds = [
      medievalTheme.tokens.surface.page.bg,
      medievalTheme.tokens.surface.card.bg,
    ]
      .map(parseHex)
      .filter((c): c is Rgb => c !== null);
    const worst = round(Math.min(...grounds.map((g) => contrastRatio(colour as Rgb, g))));

    // If this fails, medieval passes 3:1 now — delete this whole block and put
    // "action.primary.bg" back in the list above.
    expect(worst).toBeLessThan(CONTROL_BOUNDARY_MINIMUM);
  });
});

/**
 * A field's own ground is not a surface, and nothing was checking it.
 *
 * `.input` -- worn by every text field, and now by `Select` -- paints
 * `color: var(--surface-page-on)` on `background-color: var(--field-bg)`. Those
 * two tokens come from different halves of the model, and `field.bg` is a
 * distinct value from every surface background in all three themes. So the ink
 * inside a control was never measured against the thing actually behind it: the
 * surface-pair block above checks page ink on the *page*, which is not where a
 * field's text sits.
 *
 * That is the file header's own failure shape -- a legitimate colour in a
 * legitimate slot, wrong in relation to its background -- left ungated for the
 * one surface every form is made of. Found while building `Select` in 8.0,
 * whose gate asks that a control's text meet 4.5:1 and its boundary 3:1 in
 * every theme.
 *
 * The boundary is measured against both grounds it has to work on at once: the
 * field's own fill on the inside, and the card the field sits on outside. A
 * border only reads as an edge if it is distinguishable from both.
 */
describe("a field's ink and edge work against the field's own ground", () => {
  describe.each(THEMES)("%s", (_name, theme) => {
    const tokens: ThemeTokens = theme.tokens;

    test("control text meets AA on the field background", () => {
      const ink = parseHex(tokens.surface.page.on);
      const fieldBg = parseHex(tokens.field.bg);
      expect(ink).not.toBeNull();
      expect(fieldBg).not.toBeNull();

      const ratio = round(contrastRatio(ink as Rgb, fieldBg as Rgb));
      expect({ meetsAA: ratio >= 4.5, ratio }).toEqual({ meetsAA: true, ratio });
    });

    test("the field border reads as an edge from both sides", () => {
      const border = parseHex(tokens.field.border);
      expect(border).not.toBeNull();

      const grounds = [tokens.field.bg, tokens.surface.card.bg]
        .map(parseHex)
        .filter((c): c is Rgb => c !== null);
      const worst = round(
        Math.min(...grounds.map((g) => contrastRatio(border as Rgb, g)))
      );

      expect({ meets3to1: worst >= CONTROL_BOUNDARY_MINIMUM, worst }).toEqual({
        meets3to1: true,
        worst,
      });
    });
  });
});

/**
 * A status hue is text before it is anything else.
 *
 * The directories state a status as a word in the status hue -- that word is now
 * the only encoding of it, since the coloured dot beside it said the same thing
 * twice. So these are AA text pairs, not the 3:1 non-text pairs they resemble,
 * and they are measured against every surface a row's text can sit on.
 *
 * This block did not exist while the dot did, which is how `status.unknown`
 * reached the browser at 3.65:1 in the light theme with every gate green. It is
 * the gap that let a legitimate colour in a legitimate slot be wrong in relation
 * to what sat behind it -- the exact shape the file header warns about.
 *
 * `status.on` is excluded: it is ink for a filled status chip, not a hue used as
 * text, and the surface pairs above already cover the grounds it lands on.
 */
describe("status hues meet AA as text on every row surface", () => {
  const HUES = ["general", "active", "completed", "failed", "unknown"] as const;

  /**
   * Light is the migrated theme and owes the real 4.5:1.
   *
   * Dark met it in PR 6.3 (D56): its `completed` and `failed` were 3.05:1 and
   * 2.41:1, which is unreadable as a word, and after Phase 6 the word is the
   * only encoding a status has. Its ratchet entries are gone.
   *
   * Medieval keeps one. It is deleted in Phase 11 (D40), so raising its value
   * would be work on a theme with a scheduled end; the ratchet is only there so
   * it cannot get worse first. That last entry should disappear with the theme,
   * leaving one uniform 4.5.
   */
  const RATCHET: Record<string, Record<string, number>> = {
    medieval: { unknown: 1.83 },
  };

  describe.each(THEMES)("%s", (themeName, theme) => {
    // The grounds a directory row's text actually sits on: the page, a card, and
    // a nested group's sunken panel. Measured against the least favourable, so
    // the bar cannot be cleared by picking the kind one.
    const grounds = [
      theme.tokens.surface.page.bg,
      theme.tokens.surface.card.bg,
      theme.tokens.surface.sunken.bg,
    ]
      .map(parseHex)
      .filter((c): c is Rgb => c !== null);

    test.each(HUES)("status.%s", (hue) => {
      const colour = parseHex(theme.tokens.status[hue]);
      expect(colour).not.toBeNull();

      const worst = round(
        Math.min(...grounds.map((g) => contrastRatio(colour as Rgb, g)))
      );
      const floor = RATCHET[themeName]?.[hue] ?? 4.5;

      expect({ hue, floor, meets: worst >= floor }).toEqual({
        hue,
        floor,
        meets: true,
      });
    });
  });
});
