// src/core/themes/__tests__/roster-band-separation.test.ts
// Why the directory summary bars separate their bands with a hairline.
//
// Every contrast rule the schema states is written against a *surface*: an ink
// against the page, a border against the card. The summary bar breaks that
// assumption, because its bands sit flush against one another, and a band's
// only real ground is the band beside it. Nothing measured that pairing, and
// two of the four directories shipped bars whose bands were hard to tell apart.
//
// This file measures it, and pins the structural fix. The fix is structural on
// purpose: the knowledge ladder separates its rungs by lightness alone, which
// is what lets it survive greyscale and colour blindness as a value ramp
// (schema section 2), and that same property is what leaves adjacent rungs
// close together. No choice of hue or chroma escapes it -- raising chroma moves
// all three rungs together -- so the bands are separated by a gap instead of by
// asking the scale for a contrast it is not built to give.

import * as fs from "fs";
import * as path from "path";
import { deriveTokens, contrastRatio } from "../derive";
import { ThemeName } from "../types";

const COMPONENTS_CSS = path.join(__dirname, "..", "css", "components.css");
/** Comments stripped, so prose about the rule is never mistaken for the rule. */
const source = fs
  .readFileSync(COMPONENTS_CSS, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const MODES: readonly ThemeName[] = ["light", "dark"];

/** WCAG's floor for anything that is not text but still carries meaning. */
const NON_TEXT_MINIMUM = 3;

describe("the bands do not separate themselves", () => {
  describe.each(MODES)("%s", (mode) => {
    const tokens = deriveTokens(mode);

    test("adjacent knowledge rungs fall short of the non-text threshold", () => {
      // The locations bar, and the rumours bar, in ladder order.
      const ladder = [tokens.knowledge[0], tokens.knowledge[1], tokens.knowledge[2]];
      const adjacent = [
        contrastRatio(ladder[0], ladder[1]),
        contrastRatio(ladder[1], ladder[2]),
      ];
      expect(Math.max(...adjacent)).toBeLessThan(NON_TEXT_MINIMUM);
    });

    test("so do the quest bar's, which only hue has ever separated", () => {
      // Worth measuring because it is the counter-intuitive half: the quest bar
      // looks fine, and its bands are the *closest* of any bar in luminance.
      // Active against completed is near 1:1. It reads only because those two
      // differ in hue -- which is exactly what a non-valenced scale refuses to
      // do, so the moment a scale stops supplying hue the bar has nothing left.
      const bands = [tokens.accent.fill, tokens.outcome.succeeded, tokens.outcome.failed.fill];
      const adjacent = [
        contrastRatio(bands[0], bands[1]),
        contrastRatio(bands[1], bands[2]),
      ];
      expect(Math.max(...adjacent)).toBeLessThan(NON_TEXT_MINIMUM);
    });
  });
});

describe("so the bar separates them", () => {
  const ruleBody = (selector: string): string => {
    const at = source.indexOf(selector + " {");
    expect(at).toBeGreaterThan(-1);
    return source.slice(at, source.indexOf("}", at));
  };

  test("every band after the first carries a hairline", () => {
    // The adjacent-sibling selector matters: a border on every band would draw
    // one against the rounded end of the track as well.
    const body = ruleBody(".roster-band + .roster-band");
    expect(/border-left:\s*1px solid/.test(body)).toBe(true);
  });

  test("the hairline is the card's own colour, so it reads as a gap", () => {
    // Not a fifth colour, and not a hardcoded one. Any other token here would
    // be a new visual element that means nothing; the card showing through is
    // the absence of a band, which is what a separator should look like.
    const body = ruleBody(".roster-band + .roster-band");
    expect(body).toContain("var(--surface-card-bg)");
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  test("the separator is not itself a colour cue", () => {
    // If this rule ever grows a background or an opacity it has stopped being
    // a gap and started being decoration, which would put it back inside the
    // colour system it exists to work around.
    const body = ruleBody(".roster-band + .roster-band");
    expect(body).not.toMatch(/background|opacity/);
  });
});
