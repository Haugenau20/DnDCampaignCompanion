// src/core/components/__tests__/ImageSlot.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ImageSlot from '../ImageSlot';
import { StoredImage } from 'core/types/storedImage';
import { firebaseConfig } from 'core/services/firebase/config/firebaseConfig';

const ownUrl =
  `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}` +
  '/o/groups%2Fg1%2Fcrest%2Fa.webp?alt=media&token=t';

const image = (url = ownUrl): StoredImage => ({
  path: 'groups/g1/crest/a.webp',
  url,
  width: 1600,
  height: 1200,
  uploadedBy: 'u1',
  uploadedAt: '2026-09-24T12:00:00.000Z',
});

describe('ImageSlot', () => {
  describe('empty', () => {
    it('states honestly that no image has been added', () => {
      render(<ImageSlot label="Bilbo — no image added" />);
      const slot = screen.getByTestId('image-slot');
      expect(slot).toHaveAttribute('role', 'img');
      expect(slot).toHaveAccessibleName('Bilbo — no image added');
      expect(slot).toHaveClass('image-slot');
      expect(screen.queryByRole('img', { name: /portrait/i })).toBeNull();
    });

    it('shows its caption, hidden from assistive technology', () => {
      render(<ImageSlot label="empty" caption="Optional." />);
      expect(screen.getByText('Optional.')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('filled', () => {
    it('renders the picture with its alt text and intrinsic size', () => {
      render(<ImageSlot label="Bilbo — no image added" image={image()} alt="Portrait of Bilbo" />);

      const img = screen.getByRole('img', { name: 'Portrait of Bilbo' });
      expect(img.tagName).toBe('IMG');
      expect(img).toHaveAttribute('src', ownUrl);
      // Intrinsic size reserves the space before the bytes arrive: no layout shift.
      expect(img).toHaveAttribute('width', '1600');
      expect(img).toHaveAttribute('height', '1200');
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
    });

    it('loads right away when the page asks, for a picture at the top of the page', () => {
      // Lazy loading only delays a picture that is already in view.
      render(<ImageSlot label="x" image={image()} alt="Portrait of Bilbo" loading="eager" />);
      expect(screen.getByRole('img', { name: 'Portrait of Bilbo' })).toHaveAttribute('loading', 'eager');
    });

    it('no longer draws the empty ruling, its caption, or the "none added" label', () => {
      render(
        <ImageSlot label="Bilbo — no image added" caption="Optional." image={image()} alt="Portrait of Bilbo" />
      );
      expect(screen.getByTestId('image-slot')).not.toHaveClass('image-slot');
      expect(screen.queryByText('Optional.')).toBeNull();
      expect(screen.queryByRole('img', { name: 'Bilbo — no image added' })).toBeNull();
    });

    it('keeps the caller\'s sizing on the frame', () => {
      render(<ImageSlot label="x" className="h-40" image={image()} alt="a" />);
      expect(screen.getByTestId('image-slot')).toHaveClass('h-40');
    });

    it('stays empty for a URL outside this bucket, which could track viewers', () => {
      render(
        <ImageSlot
          label="Bilbo — no image added"
          image={image('https://tracker.example.com/pixel.webp')}
          alt="Portrait of Bilbo"
        />
      );
      expect(screen.queryByRole('img', { name: 'Portrait of Bilbo' })).toBeNull();
      expect(screen.getByTestId('image-slot')).toHaveAccessibleName('Bilbo — no image added');
    });
  });
});
