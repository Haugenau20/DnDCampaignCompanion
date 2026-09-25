// src/shared/components/PicturedBand.tsx
import React, { createContext, useContext, useId } from 'react';
import clsx from 'clsx';
import { StoredImage } from 'core/types/storedImage';
import BandPicture from './BandPicture';
import { useBandDim } from 'shared/hooks/useBandDim';

/** How far the halo grows each glyph, in CSS pixels. */
export const SILHOUETTE_GROW_PX = 3;
/** How much the halo's edge is softened (a Gaussian's standard deviation), in CSS pixels. */
export const SILHOUETTE_SOFTEN_PX = 2.5;

type RegionRef = (key: string) => (element: HTMLElement | null) => void;

/** The band's `regionRef`, or null outside a pictured band. */
const RegionContext = createContext<RegionRef | null>(null);

/**
 * The halo drawn behind every glyph of text on a picture: the text's own
 * shape, grown by `SILHOUETTE_GROW_PX`, softened, and filled with the band's
 * colour (`.hero-silhouette-flood` sets it from `--surface-band-bg`, so it
 * follows the theme).
 *
 * Grown 3px and softened by 2.5px -- the softness of option E, matched side
 * by side against the comparison image -- the halo is at least about 83% band
 * colour where it meets a stroke (a 1px stroke; wider ones get more). The
 * region's patch lies under it, so together they give every letter more band
 * colour than `useBandDim` measured it needs; see `.hero-dim-region` in
 * `components.css` for the arithmetic.
 *
 * Rendered in the page rather than a stylesheet because a CSS filter can only
 * grow a shape through an SVG filter. Not `display: none`: a filter inside a
 * hidden SVG draws nothing in some browsers.
 */
const BandSilhouette: React.FC<{ id: string }> = ({ id }) => (
  <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
    <filter
      id={id}
      // Room around each element for the halo; a single line of text is short.
      x="-25%"
      y="-50%"
      width="150%"
      height="200%"
      colorInterpolationFilters="sRGB"
    >
      <feMorphology in="SourceAlpha" operator="dilate" radius={SILHOUETTE_GROW_PX} result="grown" />
      <feGaussianBlur in="grown" stdDeviation={SILHOUETTE_SOFTEN_PX} result="soft" />
      <feFlood className="hero-silhouette-flood" result="band" />
      <feComposite in="band" in2="soft" operator="in" result="halo" />
      <feMerge>
        <feMergeNode in="halo" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </svg>
);

export interface PicturedBandProps {
  /** The picture, already through `bandPicture`; null draws the band as always. */
  image: StoredImage | null;
  /** Alt text for the picture. */
  alt: string;
  /** The band's own classes: `hero-band`, its padding, any layout of its own. */
  className?: string;
  /** Classes for the positioned wrapper the content sits in. */
  innerClassName?: string;
  testId?: string;
  pictureTestId?: string;
  children: React.ReactNode;
}

/**
 * A `.hero-band` that may carry a picture behind its text (design D10).
 *
 * The picture fills the band, untouched except where text sits on it. Each
 * block of text goes in a `BandRegion`, which gets two things:
 *
 * - **A silhouette.** Every glyph -- and every control outline -- gets a halo
 *   of the band colour (`BandSilhouette`). This is what keeps the text
 *   readable: each letter sits on the band surface.
 * - **A faint patch.** A soft patch of the band colour behind the block, at a
 *   third of the strength the block would need on its own (`useBandDim`
 *   measures that from the picture under the block). It only calms the
 *   picture's texture behind the words.
 *
 * On a phone a window at the top of the band shows the picture above the
 * text. Without a picture the band is drawn exactly as it always was, and a
 * `BandRegion` is a plain block.
 */
const PicturedBand: React.FC<PicturedBandProps> = ({
  image,
  alt,
  className,
  innerClassName,
  testId,
  pictureTestId,
  children,
}) => {
  const { bandRef, regionRef } = useBandDim(image);
  // `useId` returns `:r1:`; colons would need escaping inside `url(#…)`.
  const filterId = `band-silhouette-${useId().replace(/:/g, '')}`;

  return (
    <div
      ref={bandRef}
      className={clsx(className, 'relative', image && 'hero-band-pictured hero-band-adaptive')}
      style={image ? ({ '--hero-silhouette': `url("#${filterId}")` } as React.CSSProperties) : undefined}
      data-testid={testId}
    >
      {image && (
        <>
          <BandPicture image={image} alt={alt} testId={pictureTestId} />
          <BandSilhouette id={filterId} />
        </>
      )}
      {/* Positioned, so it paints above the picture. */}
      <div className={clsx('relative', innerClassName)}>
        {image && <div className="hero-picture-window" aria-hidden="true" />}
        <RegionContext.Provider value={image ? regionRef : null}>{children}</RegionContext.Provider>
      </div>
    </div>
  );
};

export interface BandRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A block of text on a `PicturedBand`: it gets the silhouette and the faint
 * patch when the band has a picture, and is a plain `div` when it does not.
 *
 * The halo is drawn around the block's children, not the block, so put the
 * text in elements rather than loose in the block.
 */
export const BandRegion: React.FC<BandRegionProps> = ({ className, children, ...rest }) => {
  const regionRef = useContext(RegionContext);
  const key = useId();
  return (
    <div {...rest} ref={regionRef ? regionRef(key) : undefined} className={clsx('hero-dim-region', className)}>
      {children}
    </div>
  );
};

export default PicturedBand;
