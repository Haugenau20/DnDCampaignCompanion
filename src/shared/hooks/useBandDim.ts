// src/shared/hooks/useBandDim.ts
import { useLayoutEffect, useState } from 'react';
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

/**
 * How strongly a band dims its picture behind `text`, from what is actually
 * under the text at the current size.
 *
 * Reads the band's colour and its inks from the page (the band's own `color`
 * and any `.hero-muted` text), so it follows the theme without naming a token,
 * and the part of the picture under the text from the `img.hero-picture` in
 * the band, cropped as the browser crops it. Recomputed when the band or the
 * text changes size, the picture loads, or the theme changes.
 *
 * A picture with no usable brightness grid -- uploaded before grids existed,
 * or with a forged one -- is treated as pure white under the text: the worst
 * case, and the strength the full-band scrim always used.
 */
export function useBandDim(image: StoredImage | null) {
  const [band, setBand] = useState<HTMLElement | null>(null);
  const [text, setText] = useState<HTMLElement | null>(null);
  const [dim, setDim] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!image || !band || !text) {
      setDim(null);
      return;
    }

    const measure = () => setDim(dimFor(band, text, image));
    measure();

    const img = band.querySelector('img.hero-picture');
    img?.addEventListener('load', measure);

    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(band);
    resize?.observe(text);

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
  }, [image, band, text]);

  return {
    /** Ref for the band: the element that carries the band colour and the picture. */
    bandRef: setBand,
    /** Ref for the text block the dimming sits behind. */
    textRef: setText,
    /** 0 to 1, or null when there is no picture or the colours can't be read. */
    dim,
  };
}

/** `object-position` as fractions; anything but two percentages is the centre. */
function objectPosition(img: Element): { x: number; y: number } {
  const match = getComputedStyle(img).objectPosition.match(/^([\d.]+)%\s+([\d.]+)%$/);
  return match ? { x: Number(match[1]) / 100, y: Number(match[2]) / 100 } : { x: 0.5, y: 0.5 };
}

function dimFor(band: HTMLElement, text: HTMLElement, image: StoredImage): number | null {
  const bandColour = parseColor(getComputedStyle(band).backgroundColor);
  const inks = [band, ...Array.from(text.querySelectorAll('.hero-muted'))].map(element =>
    parseColor(getComputedStyle(element).color)
  );
  if (!bandColour || inks.some(ink => !ink)) return null;

  const grid = isBrightnessGrid(image.brightness) ? image.brightness : null;
  let brightest: Rgb = WHITE;
  if (grid) {
    const img = band.querySelector<HTMLImageElement>('img.hero-picture');
    const region = img
      ? coverRegion(
          text.getBoundingClientRect(),
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
