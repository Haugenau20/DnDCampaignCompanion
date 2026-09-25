// src/shared/components/__tests__/PicturedBand.contrast.test.ts
//
// D10: text on a band's picture is readable because two layers of the band
// colour lie under it -- the halo around each glyph and the region's patch.
// Neither is drawn in JSDOM, so this file does the arithmetic the stylesheet's
// comment states, from the same numbers the page uses: the halo's size in
// `PicturedBand`, the patch's share and floor in `components.css`, and each
// theme's band pair.

import * as fs from "fs";
import * as path from "path";
import { SILHOUETTE_GROW_PX, SILHOUETTE_SOFTEN_PX } from "../PicturedBand";
import { deriveTokens } from "core/themes/derive/generate";
import { ThemeName } from "core/themes/types";
import { MIN_DIM, parseColor, requiredDim, Rgb, WHITE } from "core/utils/band-dimming";

const COMPONENTS_CSS = path.join(__dirname, "..", "..", "..", "core", "themes", "css", "components.css");
/** Comments stripped, so prose about the rule is never mistaken for the rule. */
const source = fs.readFileSync(COMPONENTS_CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** A custom property's value where `.hero-band-adaptive` declares it. */
function declared(property: string): number {
  const match = source.match(new RegExp(`\\.hero-band-adaptive\\s*\\{[^}]*${property}:\\s*([\\d.]+)`));
  if (!match) throw new Error(`${property} is not declared on .hero-band-adaptive`);
  return Number(match[1]);
}

const SHARE = declared("--hero-patch-share");
const FLOOR = declared("--hero-patch-floor");

/** The patch's opacity for a measured need `d`, as the stylesheet computes it. */
const patch = (d: number) => Math.max(FLOOR, d * SHARE);

/** The standard normal CDF, from an erf approximation good to 1.5e-7. */
function phi(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * The halo's opacity at the edge of a stroke `width` px wide: the stroke grown
 * by the halo's size on each side, then blurred, read at the stroke's edge.
 */
const haloAtStroke = (width: number) =>
  phi(SILHOUETTE_GROW_PX / SILHOUETTE_SOFTEN_PX) -
  phi(-(width + SILHOUETTE_GROW_PX) / SILHOUETTE_SOFTEN_PX);

/** Band colour under a stroke: the halo over the patch. */
const underStroke = (d: number, width = 1) => 1 - (1 - haloAtStroke(width)) * (1 - patch(d));

describe("the patch behind text on a band's picture", () => {
  it("is two thirds of the measured need -- what option E showed", () => {
    // Measured on the comparison image: E's patch added ~55% band colour
    // where B's added ~84%.
    expect(SHARE).toBeCloseTo(2 / 3, 1);
  });

  it("never drops under 30%, so a dark picture still gets a calm", () => {
    expect(FLOOR).toBe(0.3);
    expect(patch(MIN_DIM)).toBe(0.3);
  });

  it("is drawn from both, whichever is larger", () => {
    expect(source).toMatch(
      /\.hero-dim-region::before\s*\{[^}]*opacity:\s*max\(var\(--hero-patch-floor\),\s*calc\(var\(--hero-dim\)\s*\*\s*var\(--hero-patch-share\)\)\)/
    );
  });
});

describe("the halo and the patch together", () => {
  it("control: the halo alone is not enough for a bright picture", () => {
    // Without the patch under it, a thin stroke's halo misses the 0.86 a pure
    // white picture needs -- so these tests can tell the layers apart.
    expect(haloAtStroke(1)).toBeLessThan(0.86);
    expect(haloAtStroke(1)).toBeGreaterThan(0.8);
  });

  it("give a stroke at least the band colour its measured need asks for", () => {
    for (let d = MIN_DIM; d <= 0.93; d += 0.01) {
      expect(underStroke(d)).toBeGreaterThanOrEqual(d);
    }
  });

  describe.each(["light", "dark"] as ThemeName[])("%s theme, on a pure white picture", (mode) => {
    const band = deriveTokens(mode).surface.band;
    const [bg, on, muted] = [band.bg, band.on, band.onMuted].map(value => parseColor(value) as Rgb);

    it("keeps both band inks at 4.5:1", () => {
      const need = requiredDim(WHITE, bg, [on, muted]);
      expect(need).toBeLessThan(0.93);
      expect(underStroke(need)).toBeGreaterThanOrEqual(need);
    });
  });
});
