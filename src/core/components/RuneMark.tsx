// src/core/components/RuneMark.tsx
import React from 'react';
import clsx from 'clsx';
import { BRAND_MARK_GLYPH } from './brandMarkGlyph';

/** ᛗ, the runic M (mannaz): the mark of Muninn. */
export const RUNE = 'ᛗ';

export interface RuneMarkProps {
  /** The glyph's font size in pixels. */
  size: number;
  className?: string;
}

/**
 * The rune as text, in Noto Sans Runic, so it takes the colour of whatever it
 * sits in: muted on an empty state, the accent on the About page.
 *
 * `index.html` loads that font with this one character and nothing else. A
 * screen reader skips it: the rune decorates a line that says what it means.
 */
export const RuneMark: React.FC<RuneMarkProps> = ({ size, className }) => (
  <span
    aria-hidden="true"
    className={clsx('rune-mark', className)}
    style={{ fontSize: size }}
  >
    {RUNE}
  </span>
);

export interface BrandMarkProps {
  /** The square's side in pixels. Defaults to 28, the header's. */
  size?: number;
  className?: string;
}

/**
 * The site's mark: the rune on an amber tile, beside the name wherever the
 * brand appears (the header, the sign-in band).
 *
 * Painted from the theme's `logo` tokens: the tile is the same amber in both
 * themes and the rune is the theme's chrome, so it reads as cut out of the
 * tile. The rune is the favicon's heavier drawing, not the font's
 * (`brandMarkGlyph.ts`, from `scripts/build-mark.js`).
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 28, className }) => (
  <svg
    viewBox="0 0 28 28"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
    data-testid="brand-mark"
    className={clsx('shrink-0 block', className)}
  >
    <rect width="28" height="28" rx="6" className="brand-mark-tile" />
    <path d={BRAND_MARK_GLYPH} className="brand-mark-glyph" />
  </svg>
);
