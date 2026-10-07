// src/pages/layouts/dashboard/sections/defaultPictures.ts
import { useEffect, useMemo, useState } from 'react';
import { BrightnessGrid, PictureSource } from 'core/types/storedImage';
import { stableIndexFor } from 'core/utils/entity-sigil';
import contemplatingTheMoon from 'assets/defaults/banner-contemplating-the-moon.webp';
import heartOfTheAndes from 'assets/defaults/banner-heart-of-the-andes.webp';
import rockyMountains from 'assets/defaults/banner-rocky-mountains.webp';
import theOxbow from 'assets/defaults/banner-the-oxbow.webp';
import behamCock from 'assets/defaults/crest-beham-cock.webp';
import behamEagle from 'assets/defaults/crest-beham-eagle.webp';
import durerCock from 'assets/defaults/crest-durer-cock.webp';
import meckenemLion from 'assets/defaults/crest-meckenem-lion.webp';

/**
 * The pictures the dashboard shows while nothing has been uploaded (T074):
 * one for the campaign banner, one for the party crest. Public-domain works
 * released under CC0; `assets/defaults/SOURCES.md` says where each comes from.
 *
 * A default is **shown, never stored**. It is picked from the campaign's or
 * group's id, so the same campaign keeps the same picture on every visit and
 * every device, and nothing needs writing or backfilling. Uploading replaces
 * it; removing the upload brings it back.
 *
 * Adding or removing a picture changes `length`, which re-picks most
 * campaigns' defaults. Nothing breaks, but people notice: append rarely.
 */

/** A bundled banner, and the name its brightness grid is filed under. */
export interface DefaultBanner extends PictureSource {
  key: string;
}

/**
 * The banners. Their brightness grids -- what an upload would have measured --
 * load separately (`loadBannerBrightness`): the home page is in the entry
 * bundle, and the grids are 9 kB it should not carry.
 */
export const DEFAULT_BANNERS: readonly DefaultBanner[] = [
  { key: 'banner-rocky-mountains.webp', url: rockyMountains, width: 1440, height: 863 },
  { key: 'banner-heart-of-the-andes.webp', url: heartOfTheAndes, width: 1440, height: 791 },
  { key: 'banner-the-oxbow.webp', url: theOxbow, width: 1440, height: 979 },
  { key: 'banner-contemplating-the-moon.webp', url: contemplatingTheMoon, width: 1440, height: 1152 },
];

let brightnessLoad: Promise<Record<string, BrightnessGrid>> | null = null;
/** The grids once loaded, so a later visit to the page has them at once. */
let loadedBrightness: Record<string, BrightnessGrid> | null = null;

/** The banners' brightness grids, by `key`; fetched once, on first use. */
export const loadBannerBrightness = (): Promise<Record<string, BrightnessGrid>> => {
  brightnessLoad ??= import('assets/defaults/banner-brightness.json').then((module) => {
    loadedBrightness = module.default as Record<string, BrightnessGrid>;
    return loadedBrightness;
  });
  return brightnessLoad;
};

/** The crests: each print whole on a strip of its own paper. */
export const DEFAULT_CRESTS: readonly PictureSource[] = [
  { url: durerCock, width: 768, height: 240 },
  { url: behamEagle, width: 768, height: 240 },
  { url: behamCock, width: 768, height: 240 },
  { url: meckenemLion, width: 768, height: 240 },
];

/**
 * The banner a campaign shows until it has one of its own.
 *
 * @param campaignId The campaign's document id
 */
export const defaultBannerFor = (campaignId: string): DefaultBanner =>
  DEFAULT_BANNERS[stableIndexFor(campaignId, DEFAULT_BANNERS.length)];

/**
 * The default banner for a campaign, as a band draws it: at once without its
 * brightness grid (the band dims for the worst case), then with it, once the
 * grids have loaded -- usually before the picture itself has.
 *
 * @param campaignId The campaign's id; none, no banner
 */
export function useDefaultBanner(campaignId: string | undefined): PictureSource | null {
  const [grids, setGrids] = useState(() => loadedBrightness);

  useEffect(() => {
    if (!campaignId || grids) return undefined;
    let current = true;
    loadBannerBrightness()
      .then((loaded) => current && setGrids(loaded))
      // Without grids the band still dims enough; it only dims more than needed.
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [campaignId, grids]);

  // One object per campaign and load, so the band measures it once, not per render.
  return useMemo(() => {
    if (!campaignId) return null;
    const banner = defaultBannerFor(campaignId);
    const brightness = grids?.[banner.key];
    return brightness ? { ...banner, brightness } : banner;
  }, [campaignId, grids]);
}

/**
 * The crest a group shows until it has one of its own.
 *
 * @param groupId The group's document id
 */
export const defaultCrestFor = (groupId: string): PictureSource =>
  DEFAULT_CRESTS[stableIndexFor(groupId, DEFAULT_CRESTS.length)];
