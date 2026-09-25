// src/core/utils/__tests__/band-dimming.test.ts
import {
  measureBrightness,
  isBrightnessGrid,
  coverRegion,
  brightestIn,
  requiredDim,
  contrastRatio,
  parseColor,
  MIN_DIM,
  TEXT_CONTRAST,
  WHITE,
  Rgb,
} from '../band-dimming';

/** RGBA pixels of one colour, or of `paint(x, y)`. */
function pixels(width: number, height: number, paint: (x: number, y: number) => Rgb) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return data;
}

// The light theme's band pair, as the tokens define it today.
const BAND: Rgb = [0x26, 0x21, 0x1c];
const INK: Rgb = [0xf7, 0xef, 0xe6];
const MUTED: Rgb = [0xb2, 0xab, 0xa3];

describe('measureBrightness', () => {
  it('stores each cell as its red, green and blue, gamma-encoded, 0 to 1', () => {
    const grid = measureBrightness(pixels(8, 4, () => [255, 102, 0]), 8, 4, 2, 1);
    expect(grid).toEqual({ cols: 2, rows: 1, cells: [1, 0.4, 0, 1, 0.4, 0] });
  });

  it('measures each cell on its own, row by row from the top left', () => {
    const data = pixels(4, 4, (x, y) => (x < 2 && y < 2 ? [255, 255, 255] : [0, 0, 0]));
    expect(measureBrightness(data, 4, 4, 2, 2).cells).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('ignores a few specks of glare', () => {
    // 1 bright pixel in 100: under the 95th percentile.
    const data = pixels(10, 10, (x, y) => (x === 0 && y === 0 ? [255, 255, 255] : [51, 51, 51]));
    expect(measureBrightness(data, 10, 10, 1, 1).cells).toEqual([0.2, 0.2, 0.2]);
  });

  it('does not ignore a bright area', () => {
    // 10 bright pixels in 100: over it.
    const data = pixels(10, 10, (x, y) => (y === 0 ? [255, 255, 255] : [51, 51, 51]));
    expect(measureBrightness(data, 10, 10, 1, 1).cells).toEqual([1, 1, 1]);
  });

  it('errs bright on a mixed cell: half red and half blue counts as magenta', () => {
    const data = pixels(10, 10, x => (x < 5 ? [255, 0, 0] : [0, 0, 255]));
    expect(measureBrightness(data, 10, 10, 1, 1).cells).toEqual([1, 0, 1]);
  });

  it('defaults to a 16 x 8 grid', () => {
    const grid = measureBrightness(pixels(32, 16, () => [0, 0, 0]), 32, 16);
    expect([grid.cols, grid.rows, grid.cells.length]).toEqual([16, 8, 16 * 8 * 3]);
  });
});

describe('isBrightnessGrid', () => {
  it('accepts what measureBrightness makes', () => {
    expect(isBrightnessGrid(measureBrightness(pixels(4, 4, () => [9, 9, 9]), 4, 4, 2, 2))).toBe(true);
  });

  it.each([
    ['nothing', undefined],
    ['one value per cell instead of three', { cols: 2, rows: 1, cells: [0, 0] }],
    ['a value out of range', { cols: 1, rows: 1, cells: [0, 2, 0] }],
    ['a value that is not a number', { cols: 1, rows: 1, cells: ['0', 0, 0] }],
    ['a fractional size', { cols: 0.5, rows: 2, cells: [0, 0, 0] }],
  ])('refuses %s', (_, value) => {
    expect(isBrightnessGrid(value)).toBe(false);
  });
});

describe('coverRegion', () => {
  const frame = { left: 0, top: 0, width: 1000, height: 250 };

  it('maps a box to the part of the picture under it, cropped as object-fit: cover', () => {
    // A 2:1 picture in a 4:1 frame: scaled to 1000 x 500, half its height cropped,
    // a quarter off the top and a quarter off the bottom.
    const region = coverRegion(
      { left: 0, top: 0, width: 500, height: 250 },
      frame,
      { width: 1600, height: 800 }
    );
    expect(region).toEqual({ left: 0, top: 0.25, right: 0.5, bottom: 0.75 });
  });

  it('follows object-position', () => {
    const region = coverRegion(
      { left: 0, top: 0, width: 1000, height: 250 },
      frame,
      { width: 1600, height: 800 },
      { x: 0.5, y: 0 }
    );
    expect(region).toEqual({ left: 0, top: 0, right: 1, bottom: 0.5 });
  });

  it('works in page coordinates, whatever the frame\'s offset', () => {
    const region = coverRegion(
      { left: 150, top: 80, width: 500, height: 250 },
      { ...frame, left: 150, top: 80 },
      { width: 1600, height: 800 }
    );
    expect(region).toEqual({ left: 0, top: 0.25, right: 0.5, bottom: 0.75 });
  });

  it('clamps a box that runs past the picture', () => {
    const region = coverRegion(
      // The picture overhangs the frame by 125 px above and below; this runs past that.
      { left: -1000, top: -1000, width: 3000, height: 3000 },
      frame,
      { width: 1600, height: 800 }
    );
    expect(region).toEqual({ left: 0, top: 0, right: 1, bottom: 1 });
  });

  it('has nothing to measure before layout', () => {
    const empty = { left: 0, top: 0, width: 0, height: 0 };
    expect(coverRegion(empty, frame, { width: 1600, height: 800 })).toBeNull();
    expect(coverRegion({ ...frame }, empty, { width: 1600, height: 800 })).toBeNull();
  });
});

describe('brightestIn', () => {
  // 4 x 2: bright only in the top-right cell; the rest dark, one cell dark red.
  const dark = [0.1, 0.1, 0.1];
  const grid = {
    cols: 4,
    rows: 2,
    cells: [...dark, [0.5, 0, 0], ...dark, [0.9, 0.8, 0.7], ...dark, ...dark, ...dark, ...dark].flat(),
  };

  it('takes the brightest of each channel over the cells the region touches', () => {
    expect(brightestIn(grid, { left: 0, top: 0, right: 0.5, bottom: 1 }).map(Math.round)).toEqual([128, 26, 26]);
    expect(brightestIn(grid, { left: 0.8, top: 0, right: 1, bottom: 0.4 }).map(Math.round)).toEqual([230, 204, 179]);
  });

  it('counts a cell the region only partly covers', () => {
    expect(brightestIn(grid, { left: 0.7, top: 0.4, right: 0.76, bottom: 0.45 }).map(Math.round)).toEqual([230, 204, 179]);
  });

  it('takes the whole picture without a region', () => {
    expect(brightestIn(grid, null).map(Math.round)).toEqual([230, 204, 179]);
  });
});

describe('requiredDim', () => {
  const grey = (value: number): Rgb => [value * 255, value * 255, value * 255];
  const blend = (dim: number, picture: Rgb) => BAND.map((c, i) => dim * c + (1 - dim) * picture[i]) as Rgb;

  it('keeps both inks readable, whatever the picture', () => {
    const pictures: Rgb[] = [grey(0), grey(0.4), grey(0.8), WHITE, [255, 140, 0], [80, 160, 255], [0, 255, 0]];
    for (const picture of pictures) {
      const dim = requiredDim(picture, BAND, [INK, MUTED]);
      expect(contrastRatio(MUTED, blend(dim, picture))).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      expect(contrastRatio(INK, blend(dim, picture))).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    }
  });

  it('uses no more than it needs: one step less would fail', () => {
    const dim = requiredDim(grey(0.8), BAND, [INK, MUTED]);
    expect(contrastRatio(MUTED, blend(dim - 0.01, grey(0.8)))).toBeLessThan(TEXT_CONTRAST);
  });

  it('dims a dark picture only to the minimum', () => {
    expect(requiredDim(grey(0.1), BAND, [INK, MUTED])).toBe(MIN_DIM);
  });

  it('dims a brighter picture more', () => {
    const dims = [0.3, 0.5, 0.7, 0.9, 1].map(b => requiredDim(grey(b), BAND, [INK, MUTED]));
    expect(dims).toEqual([...dims].sort((a, b) => a - b));
    expect(dims[dims.length - 1]).toBeGreaterThan(dims[0]);
  });

  it('dims a saturated colour by its real brightness, not its brightest channel', () => {
    // Deep red is as bright as a grey of ~0.5 by luminance, far below white.
    expect(requiredDim([200, 0, 0], BAND, [INK, MUTED])).toBeLessThan(requiredDim(grey(200 / 255), BAND, [INK, MUTED]));
  });

  it('matches the measured worst case behind the old full-band scrim (86% for pure white)', () => {
    expect(requiredDim(WHITE, BAND, [INK, MUTED])).toBeCloseTo(0.86, 2);
  });

  it('goes all the way when no dim is enough', () => {
    // An ink that fails on the band itself.
    expect(requiredDim(WHITE, BAND, [[0x60, 0x59, 0x53]])).toBe(1);
  });
});

describe('parseColor', () => {
  it.each([
    ['rgb(38, 33, 28)', [38, 33, 28]],
    ['rgba(38, 33, 28, 1)', [38, 33, 28]],
    ['rgb(38 33 28 / 0.5)', [38, 33, 28]],
    ['#26211C', [38, 33, 28]],
  ])('reads %s', (value, rgb) => {
    expect(parseColor(value)).toEqual(rgb);
  });

  it.each(['', 'transparent', 'rgba(0, 0, 0, 0)', 'red'])('gives up on %p', value => {
    expect(parseColor(value)).toBeNull();
  });
});
