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
  const boundaryOf = (tokens: ThemeTokens, key: string): string =>
    key === "action.outline.border"
      ? (tokens.action.outline.border as string)
      : tokens.field.border;

  describe.each(THEMES)("%s", (_name, theme) => {
    test.each(["action.outline.border", "field.border"])("%s", (key) => {
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
