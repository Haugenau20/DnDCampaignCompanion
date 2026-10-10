// src/core/components/RuneMark.tsx
import React from 'react';
import clsx from 'clsx';

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
 * The amber square carrying the rune, beside the name wherever the brand
 * appears (the header, the sign-in band).
 *
 * A file rather than a styled `RuneMark`: its amber is the dark theme's accent
 * in both themes, which no light-theme token holds, so it is written out in
 * `public/mark.svg` like the favicon's colours and checked against the token by
 * `theme-assets.test.ts`. The rune is cut out of the square, so the bar beneath
 * shows through it. `scripts/build-mark.js` writes the file.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 28, className }) => (
  <img
    src="/mark.svg"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={clsx('shrink-0 block', className)}
  />
);
