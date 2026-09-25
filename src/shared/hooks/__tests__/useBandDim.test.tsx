// src/shared/hooks/__tests__/useBandDim.test.tsx
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useBandDim, DIM_PROPERTY } from '../useBandDim';
import { requiredDim, MIN_DIM, Rgb, WHITE } from 'core/utils/band-dimming';
import { StoredImage } from 'core/types/storedImage';

/**
 * Each block of text on a band is dimmed only as much as the part of the
 * picture under it needs, judged against the band's actual colours, and the
 * result is written onto the block as `--hero-dim`.
 */

const BAND: Rgb = [38, 33, 28];
const INK: Rgb = [247, 239, 230];
const MUTED: Rgb = [178, 171, 163];
const rgb = ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`;

const image = (brightness?: unknown): StoredImage => ({
  path: 'p',
  url: 'u',
  width: 1600,
  height: 800,
  uploadedBy: 'u1',
  uploadedAt: '2026-09-25T00:00:00.000Z',
  ...(brightness !== undefined ? { brightness: brightness as any } : {}),
});

/** One cell of an even grey, as a grid. */
const even = (value: number) => ({ cols: 1, rows: 1, cells: [value, value, value] });
const grey = (value: number): Rgb => [value * 255, value * 255, value * 255];

/** 4 x 2 cells: dark on the left half, bright on the right. */
const splitGrid = {
  cols: 4,
  rows: 2,
  cells: [0.1, 0.1, 0.95, 0.95, 0.1, 0.1, 0.95, 0.95].flatMap(v => [v, v, v]),
};

let bandColour = rgb(BAND);

const Harness: React.FC<{ picture: StoredImage | null; second?: boolean }> = ({ picture, second }) => {
  const { bandRef, regionRef } = useBandDim(picture);
  return (
    <div ref={bandRef} data-testid="band" style={{ backgroundColor: bandColour, color: rgb(INK) }}>
      <img className="hero-picture" alt="" />
      <div ref={regionRef('name')} data-testid="text" data-text="left">
        <span className="hero-muted" style={{ color: rgb(MUTED) }}>Started 3 March</span>
      </div>
      {second && (
        <div ref={regionRef('controls')} data-testid="controls" data-text="right">
          <span>Explored</span>
        </div>
      )}
    </div>
  );
};

/** What was written onto a block, or 'none'. */
const dimOf = (testId = 'text') =>
  screen.getByTestId(testId).style.getPropertyValue(DIM_PROPERTY) || 'none';

/**
 * Lay the picture over a 1000 x 250 frame, the first block at `text` and a
 * second, if any, at `right`.
 */
function layout(text: { left: number; width: number }, right = { left: 600, width: 300 }) {
  jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const which = (this as HTMLElement).dataset?.text;
    const box = this.tagName === 'IMG'
      ? { left: 0, top: 0, width: 1000, height: 250 }
      : which === 'left'
        ? { left: text.left, top: 50, width: text.width, height: 150 }
        : which === 'right'
          ? { left: right.left, top: 50, width: right.width, height: 150 }
          : { left: 0, top: 0, width: 0, height: 0 };
    return { ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON: () => box } as DOMRect;
  });
}

beforeEach(() => {
  bandColour = rgb(BAND);
});

afterEach(() => {
  jest.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe('useBandDim', () => {
  it('does not dim without a picture', () => {
    render(<Harness picture={null} />);
    expect(dimOf()).toBe('none');
  });

  it('dims a dark picture only to the minimum', () => {
    render(<Harness picture={image(even(0.1))} />);
    expect(Number(dimOf())).toBe(MIN_DIM);
  });

  it('dims a bright picture as much as the band\'s inks need', () => {
    render(<Harness picture={image(even(0.9))} />);
    expect(Number(dimOf())).toBe(requiredDim(grey(0.9), BAND, [INK, MUTED]));
    expect(Number(dimOf())).toBeGreaterThan(MIN_DIM);
  });

  it('judges only the part of the picture under the text', () => {
    layout({ left: 0, width: 400 });
    const { unmount } = render(<Harness picture={image(splitGrid)} />);
    expect(Number(dimOf())).toBe(MIN_DIM);
    unmount();

    layout({ left: 600, width: 300 });
    render(<Harness picture={image(splitGrid)} />);
    expect(Number(dimOf())).toBe(requiredDim(grey(0.95), BAND, [INK, MUTED]));
  });

  it('treats a picture without a grid as the worst case, pure white', () => {
    render(<Harness picture={image()} />);
    expect(Number(dimOf())).toBe(requiredDim(WHITE, BAND, [INK, MUTED]));
  });

  it('treats a forged grid as none', () => {
    render(<Harness picture={image({ cols: 1, rows: 1, cells: [-5, 0, 0] })} />);
    expect(Number(dimOf())).toBe(requiredDim(WHITE, BAND, [INK, MUTED]));
  });

  it('leaves the strength to the stylesheet when the colours cannot be read', () => {
    bandColour = 'transparent';
    render(<Harness picture={image(even(0.9))} />);
    expect(dimOf()).toBe('none');
  });

  it('measures each block against the part of the picture under it', () => {
    layout({ left: 0, width: 400 }, { left: 600, width: 300 });
    render(<Harness picture={image(splitGrid)} second />);

    // The name is over the dark half, the controls over the bright one.
    expect(Number(dimOf('text'))).toBe(MIN_DIM);
    // The controls have no muted text, so only the band's own ink decides.
    expect(Number(dimOf('controls'))).toBe(requiredDim(grey(0.95), BAND, [INK]));
  });

  it('stops dimming a block once the picture is gone', () => {
    const { rerender } = render(<Harness picture={image(even(0.9))} />);
    expect(dimOf()).not.toBe('none');

    rerender(<Harness picture={null} />);
    expect(dimOf()).toBe('none');
  });

  it('measures again when the theme changes', async () => {
    render(<Harness picture={image(even(0.9))} />);
    const before = Number(dimOf());

    // A lighter band needs more of itself to hold the same inks.
    screen.getByTestId('band').style.backgroundColor = 'rgb(90, 80, 70)';
    await act(async () => {
      document.documentElement.dataset.theme = 'other';
      await Promise.resolve();
    });

    expect(Number(dimOf())).toBe(requiredDim(grey(0.9), [90, 80, 70], [INK, MUTED]));
    expect(Number(dimOf())).not.toBe(before);
  });
});
