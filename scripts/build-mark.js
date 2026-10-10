#!/usr/bin/env node
// scripts/build-mark.js
//
// Writes what carries the site's mark, the rune ᛗ (U+16D7, mannaz), from the
// path in rune-glyph.js:
//
//   public/favicon.svg                       the icon: the glyph in the logo
//                                            amber on the header's colour
//   src/core/components/brandMarkGlyph.ts    the glyph's path for BrandMark,
//                                            which paints it from the theme's
//                                            `logo` tokens
//
// Then run `node scripts/build-icons.js`, which renders the PNGs and
// `favicon.ico` from favicon.svg, and commit what both write.
//
//   node scripts/build-mark.js
//
// The favicon's colours are tokens written out, since a browser reads it before
// any CSS: theme-assets.test.ts checks them.

const fs = require("fs");
const path = require("path");
const { glyphPath, MARK_GLYPH } = require("./rune-glyph");

/** The header's colour in the light theme (`surface.chrome.bg`). */
const CHROME = "#1B1611";
/** The mark's amber (`logo.bg`), the same in both themes. */
const AMBER = "#D69253";
/** The dark theme's card border, so a dark icon keeps an edge on a dark tab bar. */
const RING = "#3B3630";

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${CHROME}"/>
  <rect x="1" y="1" width="62" height="62" rx="11" fill="none" stroke="${RING}" stroke-width="2"/>
  <path fill="${AMBER}" d="${glyphPath({ cx: 32, cy: 32, height: 44, stem: 7 })}"/>
</svg>
`;

const glyphModule = `// src/core/components/brandMarkGlyph.ts
// Written by scripts/build-mark.js from scripts/rune-glyph.js. Do not edit.

/** The rune ᛗ inside BrandMark's 28-unit square, as an SVG path. */
export const BRAND_MARK_GLYPH =
  "${MARK_GLYPH}";
`;

const root = path.join(__dirname, "..");
fs.writeFileSync(path.join(root, "public", "favicon.svg"), favicon);
fs.writeFileSync(path.join(root, "src", "core", "components", "brandMarkGlyph.ts"), glyphModule);
