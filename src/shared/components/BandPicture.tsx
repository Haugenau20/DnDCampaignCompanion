// src/shared/components/BandPicture.tsx
import React from 'react';
import { StoredImage } from 'core/types/storedImage';
import { isOwnBucketUrl } from 'core/services/firebase/storage/ImageStorageService';

/**
 * The image a band may draw, or null.
 *
 * The same refusal `ImageSlot` makes: a member can write any string into a
 * document, and a planted third-party URL would log everyone who opens the page.
 */
export function bandPicture(image: StoredImage | null | undefined): StoredImage | null {
  return image && isOwnBucketUrl(image.url) ? image : null;
}

interface BandPictureProps {
  /** An image `bandPicture` let through. */
  image: StoredImage;
  alt: string;
  testId?: string;
}

/**
 * A picture drawn into a `.hero-band`, behind its text.
 *
 * It fills the band; a scrim in the band's own colour lets it show nearly
 * clear at the top and closes over it by the foot of `.hero-picture-window`,
 * so the text below still sits on the band surface and keeps the band pair's
 * contrast whatever was uploaded (see `.hero-picture-scrim`).
 *
 * The band must be positioned and carry `.hero-band-pictured`; its content
 * goes in a positioned child, so it paints above this, and opens with a
 * `.hero-picture-window` spacer, so the text starts below the window.
 * `.hero-band-adaptive` replaces the scrim with a patch behind the text only.
 */
const BandPicture: React.FC<BandPictureProps> = ({ image, alt, testId = 'band-picture' }) => (
  <div className="hero-picture-frame" data-testid={testId}>
    <img
      src={image.url}
      alt={alt}
      loading="eager"
      decoding="async"
      className="hero-picture block w-full h-full object-cover"
    />
    <div className="hero-picture-scrim absolute inset-0" aria-hidden="true" />
  </div>
);

export default BandPicture;
