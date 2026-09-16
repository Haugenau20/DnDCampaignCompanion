// src/core/themes/__tests__/roster-band-separation.test.ts
// Why the directory summary bars draw their bands as separate pills.
//
// Every contrast rule the schema states is written against a *surface*: an ink
// against the page, a border against the card. The summary bar breaks that
// assumption. Its bands sit side by side, so a band's only real ground is the
// band beside it, and no gate looks at that pairing.
//
// The numbers are far worse than they look, and this file measures them rather
// than asserting them, because the instinct is to fix a bar like this by
// choosing better colours. That does not work here, and the reason is the point
// of the file: the valence ramp is *supposed* to move smoothly from one stop to
// the next, so neighbouring stops are necessarily close. Spreading them until
// each cleared 3:1 against the next would need far more than five stops' worth
// of room and would wreck the ordering the ramp exists to express.
//
// So the separation is structural and costs the palette nothing.

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
    const fills = [0, 1, 2, 3, 4].map((i) => tokens.valence[i as 0].fill);

    test("no two neighbouring stops clear the non-text threshold", () => {
      // What every bar on every directory actually paints, in the order it
      // paints them. Nothing here comes close to 3:1.
      const adjacent = fills.slice(1).map((fill, i) => contrastRatio(fills[i], fill));
      expect(Math.max(...adjacent)).toBeLessThan(NON_TEXT_MINIMUM);
    });

    test("not even the two stops a three-state scale skips between", () => {
      // Rumours, locations and quests use stops 0, 2 and 4 -- the widest
      // spacing the ramp offers. Even those neighbours fall short, so this is
      // not a problem confined to the four-stop NPC bar.
      const widest = [
        contrastRatio(fills[0], fills[2]),
        contrastRatio(fills[2], fills[4]),
      ];
      expect(Math.max(...widest)).toBeLessThan(NON_TEXT_MINIMUM);
    });
  });
});

describe("so the bar separates them", () => {
  const ruleBody = (selector: string): string => {
    const at = source.indexOf(selector + " {");
    expect(at).toBeGreaterThan(-1);
    return source.slice(at, source.indexOf("}", at));
  };

  test("each band is its own pill", () => {
    // Not a shared rounded track with the bands butting inside it: the radius
    // is on the band, so every band has two rounded ends and reads as a
    // separate object rather than as a slice of one bar.
    expect(ruleBody(".roster-band")).toMatch(/border-radius:\s*999px/);
  });

  test("and the bands are held apart by a gap", () => {
    // The gap is what the separation actually rests on. A radius with no gap
    // would put two rounded ends flush against each other and separate nothing.
    expect(ruleBody(".roster-bands")).toMatch(/gap:\s*[1-9]/);
  });

  test("a band never collapses below the bar's own height", () => {
    // One item out of fifty is 2% of the width, which at this bar's height is
    // thinner than the gap beside it. The floor keeps it a dot.
    expect(ruleBody(".roster-band")).toMatch(/min-width:\s*7px/);
  });

  test("the separation asks nothing of the palette", () => {
    // The point of doing this structurally. If the rule ever grows a colour it
    // has become a fourth thing on the bar competing with the five that carry
    // meaning -- and it would have to clear its own contrast bar to be seen.
    const band = ruleBody(".roster-band") + ruleBody(".roster-bands");
    expect(band).not.toMatch(/#[0-9a-fA-F]{3,8}|var\(--|background|color:/);
  });
});
