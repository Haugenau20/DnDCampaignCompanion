// src/shared/components/__tests__/PicturedBand.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import PicturedBand, {
  BandRegion,
  SILHOUETTE_GROW_PX,
  SILHOUETTE_SOFTEN_PX,
} from '../PicturedBand';
import { StoredImage } from 'core/types/storedImage';

/**
 * D10: text over a band's picture keeps a silhouette of the band colour
 * around every glyph, and a faint patch behind each block of text.
 *
 * JSDOM draws nothing, so what is pinned here is the wiring the stylesheet
 * relies on: the filter, the variable that points at it, and the regions.
 */

const picture: StoredImage = {
  path: 'groups/g/campaigns/c/banner/p.webp',
  url: 'https://example.test/p.webp',
  width: 1600,
  height: 600,
  uploadedBy: 'u1',
  uploadedAt: '2026-09-25T12:00:00.000Z',
};

const renderBand = (image: StoredImage | null, testId = 'band') =>
  render(
    <PicturedBand image={image} alt="Bag End" className="hero-band" testId={testId} pictureTestId={`${testId}-picture`}>
      <BandRegion data-testid={`${testId}-name`}>
        <h1>Bag End</h1>
      </BandRegion>
    </PicturedBand>
  );

/** The filter a band's regions are drawn through, found by the id its variable names. */
function silhouetteOf(band: HTMLElement): Element | null {
  const reference = band.style.getPropertyValue('--hero-silhouette');
  const id = reference.match(/^url\("#(.+)"\)$/)?.[1];
  return id ? band.querySelector(`filter[id="${id}"]`) : null;
}

describe('PicturedBand', () => {
  it('draws the picture behind the content', () => {
    renderBand(picture);

    const band = screen.getByTestId('band');
    const img = screen.getByRole('img', { name: 'Bag End' });
    expect(band).toContainElement(img);
    expect(band).toHaveClass('hero-band', 'hero-band-pictured', 'hero-band-adaptive');
    expect(
      img.compareDocumentPosition(screen.getByRole('heading')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('points its text at a silhouette filter of its own', () => {
    renderBand(picture);

    expect(silhouetteOf(screen.getByTestId('band'))).not.toBeNull();
  });

  it('grows each glyph by 3px, softens the edge, and fills it with the band colour', () => {
    renderBand(picture);
    const filter = silhouetteOf(screen.getByTestId('band'))!;

    const grow = filter.querySelector('feMorphology')!;
    expect(grow).toHaveAttribute('operator', 'dilate');
    expect(grow).toHaveAttribute('in', 'SourceAlpha');
    expect(grow).toHaveAttribute('radius', String(SILHOUETTE_GROW_PX));
    expect(filter.querySelector('feGaussianBlur')).toHaveAttribute('stdDeviation', String(SILHOUETTE_SOFTEN_PX));
    // The theme's token, read live -- never a colour of its own.
    expect(filter.querySelector('feFlood')).toHaveClass('hero-silhouette-flood');
    // The text itself is drawn over its halo.
    const layers = Array.from(filter.querySelectorAll('feMergeNode')).map(node => node.getAttribute('in'));
    expect(layers[layers.length - 1]).toBe('SourceGraphic');
  });

  it('keeps the filter out of the accessibility tree', () => {
    renderBand(picture);

    expect(silhouetteOf(screen.getByTestId('band'))!.closest('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('gives two bands on one page two filters', () => {
    renderBand(picture, 'first');
    renderBand(picture, 'second');

    const first = silhouetteOf(screen.getByTestId('first'));
    const second = silhouetteOf(screen.getByTestId('second'));
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).not.toBe(second!.id);
  });

  it('marks each block of text as a region', () => {
    renderBand(picture);

    expect(screen.getByTestId('band-name')).toHaveClass('hero-dim-region');
    expect(screen.getByTestId('band-name')).toContainElement(screen.getByRole('heading'));
  });

  it('opens a window above the text for the picture to show through', () => {
    renderBand(picture);

    const window = screen.getByTestId('band').querySelector('.hero-picture-window');
    expect(window).not.toBeNull();
    expect(window!.compareDocumentPosition(screen.getByRole('heading')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  describe('without a picture', () => {
    it('draws the band as it always was', () => {
      renderBand(null);

      const band = screen.getByTestId('band');
      expect(band).toHaveClass('hero-band');
      expect(band).not.toHaveClass('hero-band-pictured');
      expect(band).not.toHaveClass('hero-band-adaptive');
      expect(screen.queryByRole('img')).toBeNull();
      expect(band.querySelector('filter')).toBeNull();
      expect(band.querySelector('.hero-picture-window')).toBeNull();
      expect(band.style.getPropertyValue('--hero-silhouette')).toBe('');
    });

    it('still renders its text, with no strength written on it', () => {
      renderBand(null);

      expect(screen.getByRole('heading', { name: 'Bag End' })).toBeInTheDocument();
      expect(screen.getByTestId('band-name').style.getPropertyValue('--hero-dim')).toBe('');
    });
  });
});
