// src/core/utils/band-dimming.ts
import { BrightnessGrid } from '../types/storedImage';

/**
 * How much of a band's own colour to lay behind its text when that text sits
 * on a picture -- as little as the picture allows.
 *
 * The browser blends the dimming layer with the picture per channel, in
 * gamma-encoded sRGB, and the blend's luminance only rises with each channel.
 * `BrightnessGrid` stores, per cell, the 95th percentile of each channel on
 * its own -- a pixel at least as bright, channel by channel, as nearly every
 * pixel in the cell -- so blending the band with that pixel bounds how bright
 * the blend under the text can be. Exact for an even area; for a mixed one it
 * errs bright (half red and half blue counts as magenta), never dark. A few
 * specks of glare fall outside the percentile and do not decide it.
 */

/** Grid size measured at upload: 16 x 8 cells, about 100 px square on a 1600 x 600 banner. */
export const BRIGHTNESS_COLS = 16;
export const BRIGHTNESS_ROWS = 8;

/** Which pixel in a cell counts as its brightness: a few bright specks don't. */
const PERCENTILE = 0.95;

/** WCAG AA for body text. Both band inks are body-sized somewhere on the band. */
export const TEXT_CONTRAST = 4.5;

/**
 * Never less than this. Even a dark picture has detail, and fine strokes of
 * light text read better with a little of the band behind them.
 */
export const MIN_DIM = 0.3;

/** An sRGB colour, each channel 0 to 255. */
export type Rgb = [number, number, number];

/** A rectangle as fractions (0 to 1) of the picture's width and height. */
export interface Region {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Measure a picture's brightness per cell.
 *
 * @param data RGBA pixels, as `ImageData.data`
 * @param width Pixel width of `data`
 * @param height Pixel height of `data`
 */
export function measureBrightness(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cols = BRIGHTNESS_COLS,
  rows = BRIGHTNESS_ROWS
): BrightnessGrid {
  // A 256-bin histogram per channel per cell: percentiles without sorting 1.4M pixels.
  const histograms = new Uint32Array(cols * rows * 3 * 256);
  const counts = new Uint32Array(cols * rows);

  for (let y = 0; y < height; y++) {
    const row = Math.min(rows - 1, Math.floor((y * rows) / height));
    for (let x = 0; x < width; x++) {
      const cell = row * cols + Math.min(cols - 1, Math.floor((x * cols) / width));
      const i = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        histograms[(cell * 3 + channel) * 256 + data[i + channel]]++;
      }
      counts[cell]++;
    }
  }

  const cells: number[] = [];
  counts.forEach((count, cell) => {
    for (let channel = 0; channel < 3; channel++) {
      cells.push(count === 0 ? 1 : percentile(histograms, (cell * 3 + channel) * 256, count));
    }
  });

  return { cols, rows, cells };
}

/** The value, 0 to 1, that at least PERCENTILE of a histogram's samples are at or under. */
function percentile(histograms: Uint32Array, offset: number, count: number): number {
  const threshold = Math.ceil(count * PERCENTILE);
  let seen = 0;
  for (let value = 0; value < 256; value++) {
    seen += histograms[offset + value];
    if (seen >= threshold) return Math.round((value / 255) * 1000) / 1000;
  }
  return 1;
}

/**
 * Whether a value read from a document is a usable grid. Anyone in the group
 * can write the document, so it is checked before it decides anything.
 */
export function isBrightnessGrid(value: unknown): value is BrightnessGrid {
  const grid = value as BrightnessGrid | null | undefined;
  return (
    !!grid &&
    Number.isInteger(grid.cols) &&
    Number.isInteger(grid.rows) &&
    grid.cols > 0 &&
    grid.rows > 0 &&
    Array.isArray(grid.cells) &&
    grid.cells.length === grid.cols * grid.rows * 3 &&
    grid.cells.every(cell => typeof cell === 'number' && cell >= 0 && cell <= 1)
  );
}

/**
 * The part of a picture that lands under a box, when the picture is drawn with
 * `object-fit: cover`.
 *
 * @param box The box, in the same coordinates as `frame`
 * @param frame The element the picture fills
 * @param picture The picture's own pixel size
 * @param position `object-position` as fractions, 0 to 1
 * @returns The region, or null when there is nothing to measure yet
 */
export function coverRegion(
  box: { left: number; top: number; width: number; height: number },
  frame: { left: number; top: number; width: number; height: number },
  picture: { width: number; height: number },
  position: { x: number; y: number } = { x: 0.5, y: 0.5 }
): Region | null {
  if (frame.width <= 0 || frame.height <= 0 || picture.width <= 0 || picture.height <= 0) {
    return null;
  }
  if (box.width <= 0 || box.height <= 0) return null;

  const scale = Math.max(frame.width / picture.width, frame.height / picture.height);
  const shownWidth = picture.width * scale;
  const shownHeight = picture.height * scale;
  const offsetX = (frame.width - shownWidth) * position.x;
  const offsetY = (frame.height - shownHeight) * position.y;

  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const x = (value: number) => clamp((value - frame.left - offsetX) / shownWidth);
  const y = (value: number) => clamp((value - frame.top - offsetY) / shownHeight);

  return {
    left: x(box.left),
    top: y(box.top),
    right: x(box.left + box.width),
    bottom: y(box.top + box.height),
  };
}

/**
 * The brightest pixel, channel by channel, of the cells a region touches -- or
 * of the whole grid without one. Each channel 0 to 255.
 */
export function brightestIn(grid: BrightnessGrid, region: Region | null): Rgb {
  const { left, top, right, bottom } = region ?? { left: 0, top: 0, right: 1, bottom: 1 };
  const firstCol = Math.min(grid.cols - 1, Math.floor(left * grid.cols));
  const lastCol = Math.max(firstCol, Math.min(grid.cols - 1, Math.ceil(right * grid.cols) - 1));
  const firstRow = Math.min(grid.rows - 1, Math.floor(top * grid.rows));
  const lastRow = Math.max(firstRow, Math.min(grid.rows - 1, Math.ceil(bottom * grid.rows) - 1));

  const brightest: Rgb = [0, 0, 0];
  for (let row = firstRow; row <= lastRow; row++) {
    for (let col = firstCol; col <= lastCol; col++) {
      for (let channel = 0; channel < 3; channel++) {
        const value = grid.cells[(row * grid.cols + col) * 3 + channel] * 255;
        brightest[channel] = Math.max(brightest[channel], value);
      }
    }
  }
  return brightest;
}

/** A pure white picture: the worst case, for a picture with nothing measured. */
export const WHITE: Rgb = [255, 255, 255];

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colours. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The dimming a band needs behind its text: the smallest share of the band's
 * colour, laid over a picture no brighter than `brightest`, that keeps every
 * ink at `TEXT_CONTRAST`. Never below `MIN_DIM`; 1 when even that is not enough.
 *
 * @param brightest The picture under the text, from `brightestIn`
 * @param band The band's colour
 * @param inks The colours of the text on it
 */
export function requiredDim(brightest: Rgb, band: Rgb, inks: Rgb[]): number {
  const readable = (dim: number) => {
    const blend = band.map((channel, i) => dim * channel + (1 - dim) * brightest[i]) as Rgb;
    return inks.every(ink => contrastRatio(ink, blend) >= TEXT_CONTRAST);
  };

  // Blending moves each channel in a straight line from the picture's value to
  // the band's, so the blend's luminance moves one way the whole time. Towards
  // the band from a brighter picture, contrast with a light ink only rises, and
  // the first passing step is the least that is enough; from a darker one,
  // every blend is darker than the band, which the band pair already passes.
  for (let step = Math.round(MIN_DIM * 100); step <= 100; step++) {
    if (readable(step / 100)) return step / 100;
  }
  return 1;
}

/**
 * Parse a computed CSS colour: `rgb()`/`rgba()`, either syntax, or `#rrggbb`.
 * Returns null for anything else, including a fully transparent colour.
 */
export function parseColor(value: string): Rgb | null {
  const hex = value.trim().match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];

  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (!rgb) return null;
  if (rgb[4] !== undefined && parseFloat(rgb[4]) === 0) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}
