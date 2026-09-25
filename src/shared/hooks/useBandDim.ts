// src/shared/hooks/useBandDim.ts
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { StoredImage } from 'core/types/storedImage';
import {
  brightestIn,
  coverRegion,
  isBrightnessGrid,
  parseColor,
  requiredDim,
  Rgb,
  WHITE,
} from 'core/utils/band-dimming';

/** The custom property each text region's dimming strength is written to. */
export const DIM_PROPERTY = '--hero-dim';

type ElementRef = (element: HTMLElement | null) => void;

/**
 * How strongly a band dims its picture behind each block of text on it, from
 * what is actually under that block at the current size.
 *
 * A band may carry several blocks of text over its picture -- a breadcrumb, the
 * name, a row of controls -- and each is measured against its own part of the
 * picture, so a block over a dark corner is not dimmed as hard as one over the
 * sun. The result is written to the block itself as `--hero-dim` (0 to 1),
 * which the stylesheet reads; a block with no result falls back to the band's
 * own worst case.
 *
 * Reads the band's colour and its inks from the page (the band's own `color`
 * and any `.hero-muted` text in the block), so it follows the theme without naming a
 * token, and the part of the picture under the block from the
 * `img.hero-picture` in the band, cropped as the browser crops it. Measured
 * again when the band or a block changes size, the picture loads, or the theme
 * changes.
 *
 * A picture with no usable brightness grid -- uploaded before grids existed,
 * or with a forged one -- is treated as pure white: the worst case.
 */
export function useBandDim(image: StoredImage | null) {
  const [band, setBand] = useState<HTMLElement | null>(null);
  const [regions, setRegions] = useState<ReadonlyMap<string, HTMLElement>>(new Map());
  const refs = useRef(new Map<string, ElementRef>());

  /**
   * A ref for one block of text, by a key unique within the band. Stable per
   * key, so React does not detach and re-attach it on every render.
   */
  const regionRef = useCallback((key: string): ElementRef => {
    let ref = refs.current.get(key);
    if (!ref) {
      ref = (element: HTMLElement | null) =>
        setRegions(previous => {
          if ((previous.get(key) ?? null) === element) return previous;
          const next = new Map(previous);
          if (element) next.set(key, element);
          else next.delete(key);
          return next;
        });
      refs.current.set(key, ref);
    }
    return ref;
  }, []);

  useLayoutEffect(() => {
    const blocks = Array.from(regions.values());
    if (!image || !band || blocks.length === 0) {
      blocks.forEach(block => block.style.removeProperty(DIM_PROPERTY));
      return;
    }

    const measure = () =>
      blocks.forEach(block => {
        const dim = dimFor(band, block, image);
        if (dim === null) block.style.removeProperty(DIM_PROPERTY);
        else block.style.setProperty(DIM_PROPERTY, String(dim));
      });
    measure();

    const img = band.querySelector('img.hero-picture');
    img?.addEventListener('load', measure);

    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(band);
    blocks.forEach(block => resize?.observe(block));

    // A theme change rewrites the root's `data-theme` and token variables.
    const theme = new MutationObserver(measure);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });

    return () => {
      img?.removeEventListener('load', measure);
      resize?.disconnect();
      theme.disconnect();
    };
  }, [image, band, regions]);

  return {
    /** Ref for the band: the element that carries the band colour and the picture. */
    bandRef: setBand,
    regionRef,
  };
}

/** `object-position` as fractions; anything but two percentages is the centre. */
function objectPosition(img: Element): { x: number; y: number } {
  const match = getComputedStyle(img).objectPosition.match(/^([\d.]+)%\s+([\d.]+)%$/);
  return match ? { x: Number(match[1]) / 100, y: Number(match[2]) / 100 } : { x: 0.5, y: 0.5 };
}

function dimFor(band: HTMLElement, block: HTMLElement, image: StoredImage): number | null {
  const bandColour = parseColor(getComputedStyle(band).backgroundColor);
  const inks = [band, ...Array.from(block.querySelectorAll('.hero-muted'))].map(element =>
    parseColor(getComputedStyle(element).color)
  );
  if (!bandColour || inks.some(ink => !ink)) return null;

  const grid = isBrightnessGrid(image.brightness) ? image.brightness : null;
  let brightest: Rgb = WHITE;
  if (grid) {
    const img = band.querySelector<HTMLImageElement>('img.hero-picture');
    const region = img
      ? coverRegion(
          block.getBoundingClientRect(),
          img.getBoundingClientRect(),
          {
            width: img.naturalWidth || image.width,
            height: img.naturalHeight || image.height,
          },
          objectPosition(img)
        )
      : null;
    // No layout yet: the whole picture, which can only over-dim.
    brightest = brightestIn(grid, region);
  }

  return requiredDim(brightest, bandColour, inks as Rgb[]);
}
