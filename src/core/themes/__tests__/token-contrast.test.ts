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
import { Theme, ThemeTokens } from "../types";

const THEMES: ReadonlyArray<[string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
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

/**
 * A colour that may carry alpha. `parseHex` deliberately does not accept these:
 * an `rgba()` string has no meaning as a ratio until it has a ground.
 */
type Rgba = [number, number, number, number];

const parseColour = (value: string): Rgba | null => {
  const rgba = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/);
  if (rgba) {
    return [
      Number(rgba[1]),
      Number(rgba[2]),
      Number(rgba[3]),
      rgba[4] === undefined ? 1 : Number(rgba[4]),
    ];
  }
  const hex = parseHex(value);
  return hex === null ? null : [hex[0], hex[1], hex[2], 1];
};

/**
 * Source-over compositing: a translucent colour onto an opaque ground.
 *
 * **This is the whole point of the state half of this file, and R35 is why it
 * exists.** Both themes express `hover` and `selected` as translucent white on
 * their dark surfaces, and a check that reads the first three numbers out of
 * `rgba(255, 255, 255, 0.1)` sees opaque white. It then reports the theme as
 * broken -- R35 measured a rail row at 1.32:1 that way and nearly produced a
 * fix to a defect that did not exist; composited over its real ground it was
 * 7.78:1.
 */
const composite = (fg: Rgba, bg: Rgb): Rgb =>
  [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])) as Rgb;

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
 * A surface's ink, against the two states it can sit on.
 *
 * The block above checks `on` and `onMuted` against the surface's *resting*
 * background and stops there, so a selected row's ink was gated by nothing.
 * R35 recorded that gap and did not close it, because closing it needs
 * compositing and this file did pure hex arithmetic.
 *
 * R40 is the bill for leaving it open: `.navigation-item-active` painted
 * `--surface-chrome-on` on `--surface-chrome-selected` in three places, only
 * one of which was the chrome, and the admin panel's active tab measured
 * **1.09:1** -- invisible -- with every gate green, because no gate multiplied
 * those two tokens together.
 */
describe("contrast of ink against its own states", () => {
  describe.each(THEMES)("%s", (_name, theme) => {
    const surfaces = Object.entries(theme.tokens.surface);

    test.each(surfaces)("%s: ink stays legible on hover and selected", (surfaceName, pair) => {
      const bg = parseHex(pair.bg);
      const on = parseHex(pair.on);
      expect(bg).not.toBeNull();
      expect(on).not.toBeNull();

      const against = (role: string): number => {
        const parsed = parseColour(role);
        expect(parsed).not.toBeNull();
        // Composited over this surface's OWN background, which is the only
        // ground a state role ever lands on.
        return round(contrastRatio(on as Rgb, composite(parsed as Rgba, bg as Rgb)));
      };

      expect({
        surface: surfaceName,
        hover: against(pair.hover) >= 4.5,
        selected: against(pair.selected) >= 4.5,
      }).toEqual({ surface: surfaceName, hover: true, selected: true });
    });
  });
});

/**
 * The compositor itself, checked against values whose answers are known.
 *
 * R31's lesson applied to a gate rather than an assertion: a state check that
 * silently treated every `rgba()` as opaque would pass this file's new block
 * for the light theme -- whose content states are opaque hexes -- and fail it
 * for dark, which is exactly the false alarm R35 describes. These pin the
 * arithmetic so the gate above cannot be quietly wrong.
 */
describe("the compositor", () => {
  test("a fully opaque overlay is itself", () => {
    expect(composite([255, 0, 0, 1], [0, 0, 0])).toEqual([255, 0, 0]);
  });

  test("a fully transparent overlay is the ground", () => {
    expect(composite([255, 255, 255, 0], [17, 34, 51])).toEqual([17, 34, 51]);
  });

  test("a half-alpha white over black is mid grey", () => {
    expect(composite([255, 255, 255, 0.5], [0, 0, 0])).toEqual([127.5, 127.5, 127.5]);
  });

  test("R35's own numbers: 10% white over the rail ground is not white", () => {
    // The measurement that nearly caused a fix to a defect that did not exist.
    const ground: Rgb = [42, 42, 60];
    const composited = composite([255, 255, 255, 0.1], ground);
    expect(composited.map(Math.round)).toEqual([63, 63, 80]);
    // Read as opaque white it would have measured ~1.3:1 against a light ink.
    expect(round(contrastRatio([224, 224, 224], composited))).toBeGreaterThan(7);
  });

  test("an rgba string round-trips through parseColour", () => {
    expect(parseColour("rgba(255, 255, 255, 0.08)")).toEqual([255, 255, 255, 0.08]);
    expect(parseColour("#3D3932")).toEqual([61, 57, 50, 1]);
    expect(parseColour("not a colour")).toBeNull();
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

  // Every theme owes all three. `action.primary.bg` used to be exempted for
  // medieval, which measured 1.38:1 as a boundary and was ratcheted in a block
  // below rather than fixed, because the theme had a scheduled end. It reached
  // it (D40), and the exemption left with it.
  const keys = ["action.outline.border", "field.border", "action.primary.bg"];

  describe.each(THEMES)("%s", (name, theme) => {
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
 * A field's own ground is not a surface, and nothing was checking it.
 *
 * `.input` -- worn by every text field, and now by `Select` -- paints
 * `color: var(--surface-page-on)` on `background-color: var(--field-bg)`. Those
 * two tokens come from different halves of the model, and `field.bg` is a
 * distinct value from every surface background in both themes. So the ink
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
   * One uniform 4.5, with no exemptions left.
   *
   * There were two. Dark's `completed` and `failed` were 3.05:1 and 2.41:1 --
   * unreadable as words, and after Phase 6 the word is the only encoding a
   * status has -- and they were fixed in PR 6.3 (D56). Medieval's `unknown` was
   * held at 1.83 rather than fixed, because raising it would have been work on a
   * theme with a scheduled end; it reached it (D40) and the last entry went with
   * it, exactly as the comment here predicted it should.
   */

  describe.each(THEMES)("%s", (_themeName, theme) => {
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
      expect({ hue, meets4point5: worst >= 4.5 }).toEqual({
        hue,
        meets4point5: true,
      });
    });
  });
});
