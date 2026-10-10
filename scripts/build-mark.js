#!/usr/bin/env node
// scripts/build-mark.js
//
// Writes the two SVGs that carry the site's mark, the rune ᛗ (U+16D7, mannaz):
//
//   public/favicon.svg  the icon: the glyph in amber on the header's colour
//   public/mark.svg     the header's mark: an amber square with the glyph cut
//                       out of it, so the bar's own colour shows through in
//                       either theme
//
// Then run `node scripts/build-icons.js`, which renders the PNGs and
// `favicon.ico` from favicon.svg, and commit what both write.
//
//   node scripts/build-mark.js
//
// The glyph is not the font's outline. Noto Sans Runic draws ᛗ with strokes
// 12% of its height, about a pixel at 16px, so the icon would vanish in a tab.
// It is rebuilt here from the font's proportions with heavier strokes, close to
// the slab "M" it replaces. Noto's outline, as fontTools' RecordingPen reads it
// (Noto Sans Runic v18, glyph uni16D7, 1000 units per em):
//
//   stems  x 97-184 and 579-666, y 0-714
//   the X  each diagonal leaves the top inner corner of one stem, (184, 714),
//          and meets the other stem's inner edge at y 245-347
//
// The colours are tokens written out: theme-assets.test.ts checks them.

const fs = require("fs");
const path = require("path");

/** Noto's glyph, in font units (see above). */
const NOTO = {
  height: 714,
  width: 666 - 97,
  stem: 184 - 97,
  /** How far the diagonal's upper edge falls from one stem to the other. */
  drop: 714 - 347,
  /** The diagonal's thickness, measured vertically. */
  band: 347 - 245,
};

/** The header's colour in the light theme (`surface.chrome.bg`). */
const CHROME = "#1B1611";
/** The dark theme's accent (`accent.fill`), the one amber the brand uses. */
const AMBER = "#D69253";
/** The dark theme's card border, so a dark icon keeps an edge on a dark tab bar. */
const RING = "#3B3630";

const round = (n) => Math.round(n * 100) / 100;

/**
 * The glyph as one path of four overlapping pieces, two stems and two
 * diagonals, all drawn clockwise so the non-zero fill rule paints their union.
 *
 * `height` is the glyph's height and `stem` its stroke; the width and the X
 * keep Noto's proportions, and the diagonals thicken with the stems.
 */
const glyphPath = ({ cx, cy, height, stem }) => {
  const scale = height / NOTO.height;
  const weight = stem / (NOTO.stem * scale);
  const width = NOTO.width * scale + (stem - NOTO.stem * scale);
  const left = cx - width / 2;
  const right = cx + width / 2;
  const top = cy - height / 2;
  const bottom = cy + height / 2;
  const span = width - 2 * stem;
  const drop = NOTO.drop * scale;
  const band = NOTO.band * scale * weight;
  const slope = drop / span;
  // Each diagonal runs half a stem into the stems at either end, so the pieces
  // overlap rather than merely touch; a shared edge can show a hairline seam.
  const inset = stem / 2;

  const pieces = [
    // Left stem, right stem.
    [[left, top], [left + stem, top], [left + stem, bottom], [left, bottom]],
    [[right - stem, top], [right, top], [right, bottom], [right - stem, bottom]],
    // From the top of the left stem down to the right one.
    [
      [left + inset, top],
      [left + stem, top],
      [right - stem, top + drop],
      [right - inset, top + drop + inset * slope],
      [right - inset, top + drop + band + inset * slope],
      [left + inset, top + band - inset * slope],
    ],
    // Its mirror image, from the top of the right stem down to the left one.
    [
      [right - stem, top],
      [right - inset, top],
      [right - inset, top + band - inset * slope],
      [left + inset, top + drop + band + inset * slope],
      [left + inset, top + drop + inset * slope],
      [left + stem, top + drop],
    ],
  ];

  return pieces
    .map((points) => "M" + points.map(([x, y]) => `${round(x)} ${round(y)}`).join("L") + "Z")
    .join("");
};

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${CHROME}"/>
  <rect x="1" y="1" width="62" height="62" rx="11" fill="none" stroke="${RING}" stroke-width="2"/>
  <path fill="${AMBER}" d="${glyphPath({ cx: 32, cy: 32, height: 44, stem: 7 })}"/>
</svg>
`;

// The glyph is cut out with a mask rather than painted in the chrome colour, so
// one file serves both themes: the light and dark headers differ in colour.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <mask id="glyph">
    <rect width="28" height="28" fill="white"/>
    <path fill="black" d="${glyphPath({ cx: 14, cy: 14, height: 15, stem: 2.6 })}"/>
  </mask>
  <rect width="28" height="28" rx="6" fill="${AMBER}" mask="url(#glyph)"/>
</svg>
`;

const outDir = path.join(__dirname, "..", "public");
fs.writeFileSync(path.join(outDir, "favicon.svg"), favicon);
fs.writeFileSync(path.join(outDir, "mark.svg"), mark);
