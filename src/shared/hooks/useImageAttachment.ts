// src/shared/hooks/useImageAttachment.ts
import { useCallback } from 'react';
import { images } from 'core/services/firebase';
import { StoredImage } from 'core/types/storedImage';
import { PreparedImage } from 'core/utils/prepare-image';

interface ImageAttachmentOptions {
  /**
   * Storage folder for this image (`entityImagePrefix` or `crestPrefix`), or
   * null while the group or campaign is not known.
   */
  prefix: string | null;
  /** The image the document holds now. */
  current: StoredImage | null | undefined;
  /** Write the image (or null, to clear it) to the owning document. */
  save: (image: StoredImage | null) => Promise<void>;
}

/**
 * Delete an image file that nothing points at any more. A failure only leaves
 * an orphan behind, never a broken page, so it is logged rather than thrown:
 * the user's action already succeeded. Also used when an entity is deleted.
 */
export function discardImage(path: string): void {
  images.remove(path).catch(error =>
    console.warn(`Could not delete image ${path}; it is now an orphan.`, error)
  );
}

/**
 * Attach an image to a document, replace it, or remove it -- in the one order
 * that can never leave a document pointing at a missing file:
 *
 * - upload the new file, **then** save it on the document, **then** delete the
 *   old file. If saving fails, the new file is deleted and the old one kept.
 * - to remove: clear the document, **then** delete the file.
 *
 * A failure can therefore leave an orphaned file (cheap, invisible), but never
 * a broken image. `ImageUploadControl` supplies the prepared image and shows
 * whatever this throws.
 */
export function useImageAttachment({ prefix, current, save }: ImageAttachmentOptions) {
  const upload = useCallback(
    async (image: PreparedImage, onProgress: (fraction: number) => void) => {
      if (!prefix) {
        throw new Error('Cannot add an image: no group or campaign selected');
      }

      const uploaded = await images.upload(prefix, image, onProgress);
      try {
        await save(uploaded);
      } catch (error) {
        discardImage(uploaded.path);
        throw error;
      }

      if (current) discardImage(current.path);
    },
    [prefix, current, save]
  );

  const remove = useCallback(async () => {
    if (!current) return;
    await save(null);
    discardImage(current.path);
  }, [current, save]);

  return { upload, remove };
}
