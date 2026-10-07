// src/pages/layouts/dashboard/sections/__tests__/defaultPictures.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import {
  DEFAULT_BANNERS,
  DEFAULT_CRESTS,
  defaultBannerFor,
  defaultCrestFor,
  loadBannerBrightness,
  useDefaultBanner,
} from '../defaultPictures';
import { isBrightnessGrid, BRIGHTNESS_COLS, BRIGHTNESS_ROWS } from 'core/utils/band-dimming';

/**
 * T074: the default banner and crest are picked from the id, shown and never
 * stored -- so the pick must be stable, and must reach every picture.
 */
describe('default pictures', () => {
  const ids = Array.from({ length: 200 }, (_, i) => `campaign-${i}`);

  it('gives the same id the same picture every time', () => {
    for (const id of ids.slice(0, 20)) {
      expect(defaultBannerFor(id)).toBe(defaultBannerFor(id));
      expect(defaultCrestFor(id)).toBe(defaultCrestFor(id));
    }
  });

  it('uses every picture across many ids', () => {
    expect(new Set(ids.map(defaultBannerFor)).size).toBe(DEFAULT_BANNERS.length);
    expect(new Set(ids.map(defaultCrestFor)).size).toBe(DEFAULT_CRESTS.length);
  });

  it('has, for every banner, the brightness grid an upload would carry', async () => {
    const grids = await loadBannerBrightness();
    for (const picture of DEFAULT_BANNERS) {
      expect(isBrightnessGrid(grids[picture.key])).toBe(true);
      expect(grids[picture.key]).toMatchObject({ cols: BRIGHTNESS_COLS, rows: BRIGHTNESS_ROWS });
    }
  });

  it("draws a campaign's banner at once, and adds its grid once loaded", async () => {
    const { result } = renderHook(() => useDefaultBanner('campaign-7'));
    expect(result.current?.url).toBe(defaultBannerFor('campaign-7').url);

    const grids = await loadBannerBrightness();
    await waitFor(() =>
      expect(result.current?.brightness).toBe(grids[defaultBannerFor('campaign-7').key])
    );
  });

  it('keeps the same picture object across renders, so the band measures it once', async () => {
    const { result, rerender } = renderHook(() => useDefaultBanner('campaign-7'));
    await waitFor(() => expect(result.current?.brightness).toBeDefined());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('has no banner without a campaign', () => {
    const { result } = renderHook(() => useDefaultBanner(undefined));
    expect(result.current).toBeNull();
  });

  it("records each picture's size, so the frame is reserved before it loads", () => {
    for (const picture of [...DEFAULT_BANNERS, ...DEFAULT_CRESTS]) {
      expect(picture.width).toBeGreaterThan(0);
      expect(picture.height).toBeGreaterThan(0);
    }
  });
});
