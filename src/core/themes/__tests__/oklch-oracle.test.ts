// src/core/themes/__tests__/oklch-oracle.test.ts
// An external check on the OKLCH conversion the whole colour system rests on.
//
// `schema-fixture.test.ts` compares generated themes against
// `docs/design/colour-schema.json`, and its power comes from that fixture
// being authored independently of the generator. Independence by authorship is
// a social guarantee: it holds exactly as long as nobody regenerates the
// fixture from the code it is supposed to check. The first time a contract
// value changes -- as it did when the knowledge ladder moved to 265 degrees --
// somebody has to produce new resolved values, and if they produce them by
// running `deriveTokens` and pasting the output, the fixture quietly stops
// being a check and becomes a copy of the thing it checks.
//
// This file replaces that social guarantee with a technical one for the part
// that can carry it: the maths. Every value in both themes is ultimately
// `oklchToHex` of an authored triple, so if this conversion is right and the
// contract is transcribed right, the resolved tree follows. The table below
// was not computed by this project. It was measured out of **Chromium's**
// colour pipeline -- a wholly separate implementation -- by painting `oklch()`
// onto a 1x1 canvas and reading the rasterized bytes back.
//
//   Recorded 2026-09-16, Chrome/Chromium 152, canvas colorSpace "srgb".
//   The canvas was verified byte-exact first: painting a plain `#rrggbb` and
//   reading it back returned the same bytes, so no colour management sits
//   between the conversion and the pixel.
//
// To re-record after a Chrome upgrade, paint each triple and read the pixel:
//   ctx.fillStyle = `oklch(${l} ${c} ${h})`; ctx.fillRect(0, 0, 1, 1);
//   ctx.getImageData(0, 0, 1, 1).data
//
// The table holds only colours Chromium reports as **in gamut** -- every sRGB
// channel inside 0..1 before rounding, read back through
// `color-mix(in srgb, ...)`. Outside the gamut the two implementations are not
// trying to compute the same thing: Chromium clips, and we reduce chroma on
// purpose. The second describe block tests that difference rather than
// papering over it.

import { oklchToHex } from "../derive/oklch";

/** `[lightness, chroma, hue, the bytes Chromium rasterizes]`. */
const CHROMIUM: readonly [number, number, number, string][] = [
  [0.2, 0.02, 25, "#1e1311"], [0.2, 0.02, 70, "#1c140c"], [0.2, 0.02, 145, "#101910"],
  [0.2, 0.02, 200, "#0a191a"], [0.2, 0.02, 265, "#12161f"], [0.2, 0.02, 320, "#1a131c"],
  [0.2, 0.05, 25, "#290b0a"], [0.2, 0.05, 145, "#051c07"], [0.2, 0.05, 265, "#0b152d"],
  [0.2, 0.05, 320, "#200d24"], [0.2, 0.09, 265, "#03103e"], [0.2, 0.09, 320, "#27022e"],
  [0.35, 0.02, 25, "#443735"], [0.35, 0.02, 70, "#41392f"], [0.35, 0.02, 145, "#343d34"],
  [0.35, 0.02, 200, "#2e3e3f"], [0.35, 0.02, 265, "#353b45"], [0.35, 0.02, 320, "#3f3741"],
  [0.35, 0.05, 25, "#52302d"], [0.35, 0.05, 70, "#4b361c"], [0.35, 0.05, 145, "#29412a"],
  [0.35, 0.05, 200, "#134245"], [0.35, 0.05, 265, "#2e3a55"], [0.35, 0.05, 320, "#46324b"],
  [0.35, 0.09, 25, "#612421"], [0.35, 0.09, 145, "#15461a"], [0.35, 0.09, 265, "#233869"],
  [0.35, 0.09, 320, "#4f2957"], [0.5, 0.02, 25, "#6e5f5d"], [0.5, 0.02, 70, "#6b6157"],
  [0.5, 0.02, 145, "#5c665c"], [0.5, 0.02, 200, "#566768"], [0.5, 0.02, 265, "#5e636f"],
  [0.5, 0.02, 320, "#68606a"], [0.5, 0.05, 25, "#7e5855"], [0.5, 0.05, 70, "#765e44"],
  [0.5, 0.05, 145, "#516b52"], [0.5, 0.05, 200, "#3f6c6e"], [0.5, 0.05, 265, "#556380"],
  [0.5, 0.05, 320, "#705a75"], [0.5, 0.09, 25, "#904d49"], [0.5, 0.09, 70, "#845922"],
  [0.5, 0.09, 145, "#407142"], [0.5, 0.09, 265, "#4a6297"], [0.5, 0.09, 320, "#7a5283"],
  [0.65, 0.02, 25, "#9b8b89"], [0.65, 0.02, 70, "#978d82"], [0.65, 0.02, 145, "#889388"],
  [0.65, 0.02, 200, "#829394"], [0.65, 0.02, 265, "#898f9c"], [0.65, 0.02, 320, "#958b97"],
  [0.65, 0.05, 25, "#ac8480"], [0.65, 0.05, 70, "#a38a6e"], [0.65, 0.05, 145, "#7d987d"],
  [0.65, 0.05, 200, "#6a999b"], [0.65, 0.05, 265, "#808faf"], [0.65, 0.05, 320, "#9d86a2"],
  [0.65, 0.09, 25, "#c07973"], [0.65, 0.09, 70, "#b2854f"], [0.65, 0.09, 145, "#6c9e6d"],
  [0.65, 0.09, 200, "#3ea0a5"], [0.65, 0.09, 265, "#748ec7"], [0.65, 0.09, 320, "#a87db1"],
  [0.8, 0.02, 25, "#cab9b7"], [0.8, 0.02, 70, "#c6bcb0"], [0.8, 0.02, 145, "#b6c1b6"],
  [0.8, 0.02, 200, "#b0c2c3"], [0.8, 0.02, 265, "#b7becb"], [0.8, 0.02, 320, "#c4bac6"],
  [0.8, 0.05, 25, "#dcb2ae"], [0.8, 0.05, 70, "#d3b99b"], [0.8, 0.05, 145, "#aac7aa"],
  [0.8, 0.05, 200, "#98c8ca"], [0.8, 0.05, 265, "#aebedf"], [0.8, 0.05, 320, "#cdb4d2"],
  [0.8, 0.09, 25, "#f2a7a1"], [0.8, 0.09, 70, "#e3b47d"], [0.8, 0.09, 145, "#99ce9a"],
  [0.8, 0.09, 200, "#71d0d5"], [0.8, 0.09, 265, "#a1bdf9"], [0.8, 0.09, 320, "#d8abe2"],
  [0.92, 0.02, 25, "#f2e0de"], [0.92, 0.02, 70, "#ede3d7"], [0.92, 0.02, 145, "#dde8dd"],
  [0.92, 0.02, 200, "#d6e9ea"], [0.92, 0.02, 265, "#dee5f2"], [0.92, 0.02, 320, "#ebe1ed"],
  [0.92, 0.05, 70, "#fbe0c1"], [0.92, 0.05, 145, "#d1eed1"], [0.92, 0.05, 200, "#beeff2"],
  [0.92, 0.05, 320, "#f4dafa"], [0.92, 0.09, 145, "#c0f5c0"], [0.92, 0.09, 200, "#99f7fc"],
  // The knowledge ladder as it ships. The dark ladder's top rung,
  // oklch(0.84 0.09 265), is absent because it is out of gamut -- see below.
  [0.48, 0.09, 265, "#445c91"], [0.385, 0.09, 265, "#2c4173"], [0.29, 0.09, 265, "#152857"],
  [0.65, 0.09, 265, "#748ec7"], [0.735, 0.09, 265, "#8ea9e3"],
];

const bytesOf = (hex: string): number[] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/**
 * Unclamped encoded sRGB, 0..1 per channel.
 *
 * A deliberate second copy of the forward transform rather than a reach into
 * `oklch.ts`: the tests below need the channels *before* gamut fitting and
 * rounding, which the module does not expose, and a transcription error here
 * fails loudly against the Chromium table rather than hiding anything.
 */
const encodedChannels = ({ l, c, h }: { l: number; c: number; h: number }): number[] => {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);
  const lCube = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mCube = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sCube = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube,
    -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube,
    -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube,
  ].map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
};

/** The same channels in byte units, where rounding boundaries are visible. */
const encodedBytes = (colour: { l: number; c: number; h: number }): number[] =>
  encodedChannels(colour).map((e) => e * 255);

describe("the conversion agrees with Chromium", () => {
  test("the table is big enough to mean something", () => {
    // A guard on the table itself. Silently emptying it would make every
    // assertion below vacuous, and comparing two empty arrays passes.
    expect(CHROMIUM.length).toBeGreaterThanOrEqual(95);
  });

  test("no channel is ever more than one byte out", () => {
    // The real promise between two independent float implementations that both
    // round to bytes. A mistyped matrix constant breaks a whole region of the
    // space by far more than one byte, so this is the assertion that catches a
    // genuine error, and it needs no tolerance argued for in advance.
    const worst = CHROMIUM.map(([l, c, h, hex]) => {
      const ours = bytesOf(oklchToHex({ l, c, h }));
      return Math.max(...bytesOf(hex).map((b, i) => Math.abs(b - ours[i])));
    });
    expect(Math.max(...worst)).toBeLessThanOrEqual(1);
  });

  test("and every disagreement is a rounding boundary, not a difference of opinion", () => {
    // "Within one byte" alone would let a systematic bias hide under the
    // threshold, so the disagreements have to explain themselves. Eight of the
    // samples differ, and in every one the offending channel lands within
    // hundredths of a .5 boundary -- the point where a ~1e-4 difference between
    // two float implementations decides which way the byte rounds.
    //
    // The knowledge ladder's first rung in light mode, oklch(0.48 0.09 265), is
    // the one that ships: Chromium computes blue as 144.503 bytes and we
    // compute 144.494. One part in 255 of one channel, the same colour to any
    // display. A disagreement that is *not* near a boundary would be a real
    // defect in the conversion, and this is the assertion that tells them apart.
    const disagreements = CHROMIUM.filter(
      ([l, c, h, hex]) => oklchToHex({ l, c, h }).toLowerCase() !== hex
    );
    const offBoundary = disagreements.filter(([l, c, h]) => {
      const nearest = Math.min(
        ...encodedBytes({ l, c, h }).map((v) => Math.abs((v % 1) - 0.5))
      );
      return nearest > 0.05;
    });
    expect({ count: disagreements.length, offBoundary }).toEqual({
      count: 8,
      offBoundary: [],
    });
  });
});

describe("out of gamut, chroma is reduced rather than clipped", () => {
  /** What the naive alternative would produce: clamp each channel, then round. */
  const clipped = (colour: { l: number; c: number; h: number }): string =>
    `#${encodedChannels(colour)
      .map((e) =>
        Math.round(Math.min(1, Math.max(0, e)) * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")}`;

  /**
   * sRGB back to OKLCH hue, to measure what each strategy does to it.
   *
   * Only ever used to compare two results measured the same way, so a shared
   * inaccuracy cancels: the claim under test is that one number is far smaller
   * than the other, not that either is exact.
   */
  const hueOf = (hex: string): number => {
    const [r, g, b] = bytesOf(hex).map((byte) => {
      const v = byte / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const lRoot = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const mRoot = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const sRoot = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
    const b2 = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
    return ((Math.atan2(b2, a) * 180) / Math.PI + 360) % 360;
  };

  const shiftFrom =
    (colour: { h: number }) =>
    (hex: string): number => {
      const delta = Math.abs(hueOf(hex) - colour.h);
      return Math.min(delta, 360 - delta);
    };

  /**
   * Colours Chromium reports sRGB channels outside 0..1 for, confirmed against
   * the browser when this file was written. Two of them ship: the light accent
   * (blue lands at -0.021) and the dark knowledge ladder's top rung (blue at
   * 1.028), which is why that rung's chroma arrives at 0.079 rather than 0.09.
   */
  const OUT_OF_GAMUT = [
    { l: 0.49, c: 0.115, h: 62 },
    { l: 0.84, c: 0.09, h: 265 },
    { l: 0.2, c: 0.09, h: 145 },
    { l: 0.48, c: 0.3, h: 265 },
    { l: 0.65, c: 0.3, h: 143 },
    { l: 0.6, c: 0.25, h: 25 },
    { l: 0.75, c: 0.2, h: 90 },
    { l: 0.9, c: 0.2, h: 200 },
    { l: 0.3, c: 0.2, h: 70 },
    { l: 0.55, c: 0.25, h: 145 },
  ];

  test("every colour in the list really is out of gamut", () => {
    // Guards the fixture the way the table-size test guards the table. An
    // in-gamut colour added here would be reduced by nothing and clipped by
    // nothing, and would pass the comparison below while testing air --
    // oklch(0.5 0.2 320) was in this list until it was measured and removed.
    const inGamut = OUT_OF_GAMUT.filter((colour) =>
      encodedChannels(colour).every((e) => e >= 0 && e <= 1)
    );
    expect(inGamut).toEqual([]);
  });

  test.each(OUT_OF_GAMUT)("oklch($l $c $h) keeps its hue", (colour) => {
    // `fitChroma`'s comment says clipping "moves the hue -- an out-of-gamut
    // orange clips its blue to zero and arrives somewhere else". That claim
    // had never been exercised. Here it is, as a comparison rather than an
    // invented threshold: whatever the absolute error, reducing must beat
    // clipping, and must land within a degree of what was asked for.
    const shift = shiftFrom(colour);
    expect(shift(oklchToHex(colour))).toBeLessThan(shift(clipped(colour)));
    expect(shift(oklchToHex(colour))).toBeLessThan(1);
  });

  test("the orange in that comment is a real colour, and clipping wrecks it", () => {
    // oklch(0.3 0.2 70) is the comment's own example: a dark saturated orange
    // whose green and blue both go negative. Clipping both to zero leaves pure
    // dark red, 40 degrees away. Pinning the magnitude keeps the comparison
    // above honest -- "less than" would still pass if clipping were harmless.
    const colour = { l: 0.3, c: 0.2, h: 70 };
    const shift = shiftFrom(colour);
    expect(clipped(colour)).toBe("#650000");
    expect(shift(clipped(colour))).toBeGreaterThan(40);
    expect(shift(oklchToHex(colour))).toBeLessThan(0.5);
  });
});
