// src/core/themes/__tests__/valence-ramp.test.ts
// The five-stop ramp every ranked directory shares, and the claims it makes.
//
// Schema D41. Quests, rumours, locations and NPC presence all rank their
// states, and before this they ranked them on three different scales -- which
// was semantically careful and left three of the four directories in greys a
// reader could not order at a glance.
//
// The ramp's value is entirely in two properties, and both are the kind that
// decay silently: that its ends are the outcome pair to the byte, and that it
// actually reads as an ordering. Neither is visible in a screenshot of any one
// page, so both are asserted here.

import { deriveTokens, contrastRatio } from "../derive";
import { ThemeName } from "../types";
import { HUE } from "../derive/contract";

const MODES: readonly ThemeName[] = ["light", "dark"];
const STOPS = [0, 1, 2, 3, 4] as const;

/** WCAG's floors. Text owes 4.5:1; a bar or a dot is not text and owes 3:1. */
const TEXT_MINIMUM = 4.5;
const NON_TEXT_MINIMUM = 3;

describe.each(MODES)("the valence ramp in %s", (mode) => {
  const tokens = deriveTokens(mode);
  const ramp = tokens.valence;
  const grounds = [
    tokens.surface.page.bg,
    tokens.surface.card.bg,
    tokens.surface.sunken.bg,
  ];
  const worst = (hex: string) =>
    Math.min(...grounds.map((ground) => contrastRatio(hex, ground)));

  test("both ends are the outcome pair, to the byte", () => {
    // The load-bearing claim. A quest that moves onto the ramp must not change
    // colour, and "these are near enough" would be a different, weaker promise
    // that drifts the first time anyone retunes a lightness. They are equal
    // because the contract solves them from the same numbers -- see
    // `derivePrimitives` -- so equality is the right assertion, not closeness.
    expect({ best: ramp[0].ink, worst: ramp[4].ink }).toEqual({
      best: tokens.outcome.succeeded,
      worst: tokens.outcome.failed.ink,
    });
  });

  test("every ink clears AA and every fill clears the non-text floor", () => {
    // Against the worst of the three content grounds, never a chosen one.
    const inks = STOPS.map((i) => worst(ramp[i].ink));
    const fills = STOPS.map((i) => worst(ramp[i].fill));
    expect({
      inkFloor: Math.min(...inks) >= TEXT_MINIMUM,
      fillFloor: Math.min(...fills) >= NON_TEXT_MINIMUM,
    }).toEqual({ inkFloor: true, fillFloor: true });
  });

  test("each fill sits closer to the ground than its ink", () => {
    // What the 4.5:1 / 3:1 split actually buys, stated the one way that holds
    // in both modes. A fill owes less contrast, so it may sit nearer the
    // surface it is painted on: lighter on cream, darker on soot. Asserting
    // "lighter" alone would pass in light mode and be exactly wrong in dark.
    const ground = tokens.surface.card.bg;
    const closer = STOPS.map(
      (i) => contrastRatio(ramp[i].fill, ground) < contrastRatio(ramp[i].ink, ground)
    );
    expect(closer).toEqual([true, true, true, true, true]);
  });

  test("the fill recovers chroma the ink cannot hold, where the gamut is tight", () => {
    // The reason the middle of the ramp is gold rather than olive, and it is a
    // light-mode effect specifically. At the lightness AA demands on a cream
    // ground, sRGB has no room near yellow, so `fitChroma` pulls stops 2 and 3
    // back -- stop 2 asks for 0.12 and the ink keeps about 0.092. The fill,
    // solving at 3:1, sits high enough to keep nearly all of it.
    //
    // In dark mode the inks are already light enough to hold their chroma, so
    // there is nothing to recover and the split is only about depth. Pinning
    // that difference rather than averaging over it is the point: it is why
    // this ramp needed two tokens per stop and the knowledge ladder did not.
    const chromaOf = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((byte) => {
        const v = byte / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      const lRoot = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
      const mRoot = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const sRoot = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
      const b2 = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
      return Math.hypot(a, b2);
    };
    const squeezed = [2, 3] as const;
    const asked = squeezed.map((i) => HUE.valence.chromas[i]);
    const inkShortfall = squeezed.map((i, n) => asked[n] - chromaOf(ramp[i].ink));
    const fillShortfall = squeezed.map((i, n) => asked[n] - chromaOf(ramp[i].fill));
    if (mode === "light") {
      // the ink loses real chroma, and the fill gets most of it back
      expect(Math.min(...inkShortfall) > 0.005).toBe(true);
      expect(Math.max(...fillShortfall) < 0.005).toBe(true);
    } else {
      expect(Math.max(...inkShortfall)).toBeLessThan(0.006);
    }
  });

  test("the hues run one way, from the green end to the red end", () => {
    // An ordering a reader can follow needs the hue to travel monotonically.
    // Asserted against the contract rather than the output so that a
    // transposed pair in `HUE.valence.hues` fails here rather than looking
    // like an unremarkable palette.
    const hues = HUE.valence.hues;
    const descending = hues.every((h, i) => i === 0 || hues[i - 1] > h);
    expect({ descending, first: hues[0], last: hues[hues.length - 1] }).toEqual({
      descending: true,
      first: HUE.succeeded.h,
      last: HUE.failed.h,
    });
  });

  test("no two stops collapse into the same colour", () => {
    // Five stops that are not five colours would be a ramp in name only.
    const inks = new Set(STOPS.map((i) => ramp[i].ink));
    const fills = new Set(STOPS.map((i) => ramp[i].fill));
    expect({ inks: inks.size, fills: fills.size }).toEqual({ inks: 5, fills: 5 });
  });
});

describe("the ramp does not bring back the bug that split the scales", () => {
  test("no stop is named after a domain state", () => {
    // D26's actual defect was a token called `status.completed`: green, and
    // available to anything that wanted green. Positional names are what stop
    // a rumour reaching for a quest's success. This is a real guard, not a
    // tautology -- it fails the moment someone adds a friendly alias.
    const tokens = deriveTokens("light");
    const names = Object.keys(tokens.valence);
    expect(names).toEqual(["0", "1", "2", "3", "4"]);
  });

  test("the unranked scales still exist and still differ from the ramp", () => {
    // The trade D41 makes is that *ranked* state shares a ramp. If `knowledge`,
    // `disposition` and `presence` quietly disappeared into it, the schema
    // would have lost the distinction rather than traded it, and the next
    // unranked thing would reach for a red.
    const tokens = deriveTokens("light");
    expect({
      knowledge: typeof tokens.knowledge[0],
      disposition: typeof tokens.disposition.neutral,
      presenceInk: tokens.surface.page.on !== tokens.valence[0].ink,
      knowledgeIsNotOnTheRamp:
        !Object.values(tokens.valence).some((stop) => stop.ink === tokens.knowledge[0]),
    }).toEqual({
      knowledge: "string",
      disposition: "string",
      presenceInk: true,
      knowledgeIsNotOnTheRamp: true,
    });
  });
});
