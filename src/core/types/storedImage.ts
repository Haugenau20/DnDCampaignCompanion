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
  /**
   * How bright each part of the picture is, measured at upload (see
   * `measureBrightness`). Lets a band dim only as much as its text needs.
   * Absent on images uploaded before it existed, or where the browser could
   * not read the pixels back.
   */
  brightness?: BrightnessGrid;
}

/**
 * The picture divided into `cols` x `rows` cells, row by row from the top
 * left. Each cell is three values, 0 to 1: the 95th percentile of its pixels'
 * red, green and blue, gamma-encoded as the browser blends them -- so `cells`
 * holds `cols * rows * 3` numbers.
 */
export interface BrightnessGrid {
  cols: number;
  rows: number;
  cells: number[];
}
