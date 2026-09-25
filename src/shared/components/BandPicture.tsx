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
 * A picture drawn into a `.hero-band`, behind its text. It fills the band.
 *
 * Use it through `PicturedBand`, which keeps the text on it readable (a
 * silhouette around each glyph and a faint patch behind each block of text)
 * and positions the content above it.
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
  </div>
);

export default BandPicture;
