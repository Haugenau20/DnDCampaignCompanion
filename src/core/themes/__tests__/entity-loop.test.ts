// src/core/themes/__tests__/entity-loop.test.ts
// The entity palette is a loop, and this is what makes that checkable.
//
// Every other gate on this palette measures the *values*: eight entries, all
// clearing 4.5:1 against one ink, enough of them for the sigil buckets. All of
// those would pass for eight hand-picked hues that happen to be legible --
// which is exactly what the theme files used to hold, and exactly what the
// design language's "single narrow band of lightness and chroma" asks not to
// be trusted to care.
//
// So this checks the *construction*: that the shipped palette is the loop the
// contract describes, recomputed here from the contract's own numbers rather
// than read back from the generator. A hand-edited array cannot pass it.

import { lightTheme } from "../definitions/lightTheme";
import { darkTheme } from "../definitions/darkTheme";
import { ENTITY_COUNT, HUE, RAMP, oklchToHex, contrastRatio } from "../derive";
import { SIGIL_BUCKET_COUNT } from "core/utils/entity-sigil";
import { Theme, ThemeName } from "../types";

const THEMES: ReadonlyArray<[ThemeName, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

describe("the entity palette is a loop, not a list", () => {
  test("the hues divide the wheel exactly", () => {
    // Even spacing is the whole claim. If `step * count` were not 360 the
    // eight marks would cluster on one side of the wheel and the last would
    // sit beside the first, which is the failure a list makes easy and a loop
    // makes impossible.
    expect({
      count: ENTITY_COUNT,
      sweep: HUE.entity.step * ENTITY_COUNT,
    }).toEqual({ count: 8, sweep: 360 });
  });

  test.each(THEMES)("%s: every entry is the contract's own arithmetic", (mode, theme) => {
    // Recomputed from `HUE.entity` and the mode's single entity lightness --
    // deliberately not from `derivePrimitives`, which would be the generator
    // agreeing with itself. One lightness and one chroma for all eight is the
    // "narrow band"; the only thing that varies along the palette is hue.
    const expected = Array.from({ length: ENTITY_COUNT }, (_unused, index) =>
      oklchToHex({
        l: RAMP[mode].entity,
        c: HUE.entity.c,
        h: (HUE.entity.firstHue + HUE.entity.step * index) % 360,
      })
    );

    expect(theme.tokens.entityPalette).toEqual(expected);
  });

  test.each(THEMES)("%s: no entry repeats", (_mode, theme) => {
    // A duplicate would mean two entities share a mark while the code believes
    // they do not -- invisible in every other gate, since a duplicate is still
    // a legible colour.
    expect(new Set(theme.tokens.entityPalette).size).toBe(ENTITY_COUNT);
  });
});

describe("one ink, and every mark equally quiet against it", () => {
  test.each(THEMES)("%s: all eight clear AA against entityInk", (_mode, theme) => {
    const failing = theme.tokens.entityPalette
      .map((swatch, index) => ({
        index,
        ratio: Math.round(contrastRatio(theme.tokens.entityInk, swatch) * 100) / 100,
      }))
      .filter((entry) => entry.ratio < 4.5);
    expect(failing).toEqual([]);
  });

  test.each(THEMES)("%s: the band is narrow, and stays narrow", (_mode, theme) => {
    // Perceived unevenness across hues is real and is *not* compensated for --
    // the handoff is explicit that varying lightness per entry to "balance" the
    // wheel is the wrong trade. What the loop buys is that the spread stays
    // small, so no single mark shouts. Pinned loosely enough to allow the
    // honest variation and tightly enough to catch a hand-tuned entry.
    const ratios = theme.tokens.entityPalette.map((swatch) =>
      contrastRatio(theme.tokens.entityInk, swatch)
    );
    const spread = Math.max(...ratios) - Math.min(...ratios);
    expect({ within: spread < 1.5, spread: Math.round(spread * 100) / 100 }).toEqual({
      within: true,
      spread: Math.round(spread * 100) / 100,
    });
  });
});

describe("the palette and the sigil buckets agree", () => {
  test("every generated hue is reachable by some entity", () => {
    // `sigilIndexFor` returns `hash % SIGIL_BUCKET_COUNT`, so a palette longer
    // than the bucket count has entries nothing can ever select. That is a
    // legitimate *intermediate* state -- the sigil util keeps the count fixed
    // precisely so appending a hue does not renumber every mark in the product
    // -- but it should be a decision someone made, not a drift. Pinned at zero
    // so growing the palette has to move this number too.
    expect({
      palette: ENTITY_COUNT,
      buckets: SIGIL_BUCKET_COUNT,
      unreachable: Math.max(0, ENTITY_COUNT - SIGIL_BUCKET_COUNT),
    }).toEqual({ palette: 8, buckets: 8, unreachable: 0 });
  });
});
