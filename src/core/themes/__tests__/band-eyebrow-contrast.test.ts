// src/core/themes/__tests__/band-eyebrow-contrast.test.ts
//
// T071: the small uppercase label above a band's heading ("PRIVATE CAMPAIGN"
// on `/signin`) measured 2.32:1 in the light theme. Its rule named the page's
// muted ink, which is solved against the page and not the band, so nothing
// that checks the band's own pair could see it.
//
// This reads the ink the rule actually names, resolves it in each theme, and
// measures it against the band it sits on. It checks the stylesheet, not a
// restatement of it, so pointing the rule at another page ink fails here.

import * as fs from "fs";
import * as path from "path";
import { contrastRatio, deriveTokens } from "core/themes/derive";
import { ThemeName } from "core/themes/types";

const COMPONENTS_CSS = path.join(__dirname, "..", "css", "components.css");
const source = fs.readFileSync(COMPONENTS_CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** WCAG AA for text; the eyebrow is 11px, so it gets no large-text allowance. */
const AA = 4.5;

/** Every token as the custom property the theme writes: `surface.band.onMuted` -> `--surface-band-on-muted`. */
function cssVariables(tree: object, prefix = "-"): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    const name = `${prefix}-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    if (typeof value === "string") out[name] = value;
    else if (value && typeof value === "object") Object.assign(out, cssVariables(value, name));
    return out;
  }, {});
}

const eyebrowInk = source.match(/\.hero-eyebrow\s*\{[^}]*\bcolor:\s*var\((--[\w-]+)\)/)?.[1];

describe("the band's eyebrow (T071)", () => {
  it("names its ink as a variable", () => {
    expect(eyebrowInk).toBeDefined();
  });

  describe.each(["light", "dark"] as ThemeName[])("%s theme", (mode) => {
    const tokens = deriveTokens(mode);

    it(`reads at ${AA}:1 on the band`, () => {
      const ink = cssVariables(tokens)[eyebrowInk as string];
      expect(ink).toBeDefined();
      expect(contrastRatio(ink, tokens.surface.band.bg)).toBeGreaterThanOrEqual(AA);
    });
  });
});
