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
 * Clear an upload's pending entry (T084). Clean-up, like `discardImage`: an
 * entry left behind only holds its file until the sweep's lease runs out, so
 * nothing here may fail the user's upload.
 */
function forgetPendingUpload(path: string): void {
  try {
    images.clearPendingUpload(path);
  } catch (error) {
    console.warn(`Could not clear the pending entry for ${path}.`, error);
  }
}

/**
 * Attach an image to a document, replace it, or remove it -- in the one order
 * that can never leave a document pointing at a missing file:
 *
 * - upload the new file, **then** save it on the document, **then** delete the
 *   old file. If saving fails, the new file is deleted and the old one kept.
 *   The upload is recorded as pending until the save has landed, so the daily
 *   sweep does not take it for an orphan meanwhile (T084).
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
        forgetPendingUpload(uploaded.path);
        throw error;
      }
      // The document points at the file now, so the sweep no longer needs
      // telling that a write is on its way (T084).
      forgetPendingUpload(uploaded.path);

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
