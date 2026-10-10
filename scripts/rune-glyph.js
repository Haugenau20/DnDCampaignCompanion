// scripts/rune-glyph.js
//
// The rune ᛗ (U+16D7, mannaz) as a path, for everything that draws the mark:
// build-mark.js (the favicon, and the header's mark in the app) and
// build-og-image.js (the link preview).
//
// The glyph is not the font's outline. Noto Sans Runic draws ᛗ with strokes
// 12% of its height, about a pixel at 16px, so the icon would vanish in a tab.
// It is rebuilt here from the font's proportions with heavier strokes, close to
// the slab "M" it replaced. Noto's outline, as fontTools' RecordingPen reads it
// (Noto Sans Runic v18, glyph uni16D7, 1000 units per em):
//
//   stems  x 97-184 and 579-666, y 0-714
//   the X  each diagonal leaves the top inner corner of one stem, (184, 714),
//          and meets the other stem's inner edge at y 245-347

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

/** The header's mark: the glyph inside a 28-unit square. */
const MARK_GLYPH = glyphPath({ cx: 14, cy: 14, height: 15, stem: 2.6 });

module.exports = { glyphPath, MARK_GLYPH };
