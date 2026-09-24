// src/core/utils/prepare-image.ts

/** Largest file a user may pick, before any processing. */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * Largest file that may be uploaded. The Storage rules enforce the same limit
 * (`storage.rules.prod`); keep the two equal.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** The longest edge, in pixels, an uploaded image is scaled down to. */
export const MAX_EDGE_PX = 1600;

const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;
/** The one retry when a first encode lands over MAX_UPLOAD_BYTES. */
const RETRY_QUALITY = 0.6;

/** An image ready to upload: resized, re-encoded and stripped of metadata. */
export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  contentType: 'image/webp' | 'image/jpeg';
  /** File extension matching `contentType`, without the dot. */
  extension: 'webp' | 'jpg';
}

/** Why a picked file could not be turned into an upload. */
export type ImagePreparationFailure =
  | 'too-large'
  | 'not-an-image'
  | 'svg'
  | 'undecodable'
  | 'too-large-after-resize';

const MESSAGES: Record<ImagePreparationFailure, string> = {
  'too-large': 'That file is over 20 MB. Please pick a smaller image.',
  'not-an-image': "That file isn't an image.",
  svg: "SVG images aren't supported. Please use a JPEG or PNG.",
  undecodable:
    "This browser can't open that image format. Please use a JPEG or PNG.",
  'too-large-after-resize':
    'That image is still too large after shrinking it. Please try a different one.',
};

/**
 * A picked file that can't be uploaded. `message` is written for the user and
 * safe to show as is.
 */
export class ImagePreparationError extends Error {
  constructor(public readonly reason: ImagePreparationFailure) {
    super(MESSAGES[reason]);
    this.name = 'ImagePreparationError';
  }
}

/**
 * Scale a size so its longest edge is at most `maxEdge`, keeping the aspect
 * ratio. Never enlarges, and never rounds an edge down to zero.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new ImagePreparationError('undecodable'))),
      type,
      quality
    );
  });
}

/**
 * Turn whatever image the user picked into something fit to upload.
 *
 * Any format this browser can decode is accepted; the user never has to make
 * a WebP themselves. The image is decoded upright, scaled so its longest edge
 * is at most MAX_EDGE_PX, and re-encoded as WebP -- or JPEG, where the browser
 * has no WebP encoder and quietly returns PNG instead. Drawing through a
 * canvas drops all metadata, including a phone photo's GPS position, which is
 * a privacy requirement rather than a side effect.
 *
 * SVG is refused outright: it is a document that can carry scripts, not a
 * picture with a fixed size.
 *
 * @throws ImagePreparationError, with a message fit to show the user
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > MAX_INPUT_BYTES) throw new ImagePreparationError('too-large');
  if (file.type === 'image/svg+xml') throw new ImagePreparationError('svg');
  // A blank type is not a refusal: Windows reports one for formats it doesn't
  // know, HEIC among them, and the browser may still decode the file.
  if (file.type && !file.type.startsWith('image/')) {
    throw new ImagePreparationError('not-an-image');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImagePreparationError('undecodable');
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE_PX);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new ImagePreparationError('undecodable');
    context.drawImage(bitmap, 0, 0, width, height);
  } finally {
    bitmap.close();
  }

  let blob = await encode(canvas, 'image/webp', WEBP_QUALITY);
  let contentType: PreparedImage['contentType'] = 'image/webp';
  if (blob.type !== 'image/webp') {
    blob = await encode(canvas, 'image/jpeg', JPEG_QUALITY);
    contentType = 'image/jpeg';
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    blob = await encode(canvas, contentType, RETRY_QUALITY);
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new ImagePreparationError('too-large-after-resize');
    }
  }

  return {
    blob,
    width,
    height,
    contentType,
    extension: contentType === 'image/webp' ? 'webp' : 'jpg',
  };
}
