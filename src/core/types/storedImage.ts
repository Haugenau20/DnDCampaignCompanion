// src/core/types/storedImage.ts

/**
 * An image held in Firebase Storage and referenced from a Firestore document.
 *
 * The file itself is immutable: replacing an image uploads a new object under a
 * new name and swaps this value, so `url` can be cached forever.
 */
export interface StoredImage {
  /** Full object path in the bucket; what deletion uses. */
  path: string;
  /** Tokenised download URL; what rendering uses. */
  url: string;
  /** Pixel width after resizing. */
  width: number;
  /** Pixel height after resizing -- with `width`, lets any slot shape crop it. */
  height: number;
  /** uid of the uploader. */
  uploadedBy: string;
  /** ISO timestamp of the upload. */
  uploadedAt: string;
}
