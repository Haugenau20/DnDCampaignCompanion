// src/core/utils/__tests__/prepare-image.test.ts
import {
  prepareImage,
  fitWithin,
  ImagePreparationError,
  MAX_EDGE_PX,
  MAX_INPUT_BYTES,
  MAX_UPLOAD_BYTES,
} from '../prepare-image';

/**
 * JSDOM has no image decoding and no canvas encoding, so both ends are
 * stubbed: `createImageBitmap` reports a chosen size, and `toBlob` answers
 * with whatever the test queues -- which is how a browser that can't encode
 * WebP (it silently returns PNG) is simulated.
 */

type Encoded = { type: string; size: number };

let bitmapSize = { width: 4000, height: 3000 };
let encodeQueue: Encoded[] = [];
const toBlobCalls: Array<{ type?: string; quality?: number }> = [];
const drawImage = jest.fn();
const close = jest.fn();
/** Stands in for the canvas's pixels; null makes reading them throw. */
let pixelData: Uint8ClampedArray | null = null;
const getImageData = jest.fn((_x: number, _y: number, w: number, h: number) => {
  if (!pixelData) throw new Error('The canvas has been tainted');
  return { data: pixelData, width: w, height: h };
});

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function blobOf({ type, size }: Encoded): Blob {
  const blob = new Blob(['x'], { type });
  Object.defineProperty(blob, 'size', { value: size });
  return blob;
}

beforeEach(() => {
  bitmapSize = { width: 4000, height: 3000 };
  encodeQueue = [];
  toBlobCalls.length = 0;
  drawImage.mockClear();
  close.mockClear();
  getImageData.mockClear();
  pixelData = null;

  (global as any).createImageBitmap = jest.fn(async () => ({ ...bitmapSize, close }));

  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => ({ drawImage, getImageData } as any));

  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation(function (cb: BlobCallback, type?: string, quality?: number) {
      toBlobCalls.push({ type, quality });
      const next = encodeQueue.shift() ?? { type: type ?? 'image/png', size: 100_000 };
      cb(blobOf(next));
    });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (global as any).createImageBitmap;
});

describe('fitWithin', () => {
  it('scales the longest edge down to the limit, keeping the ratio', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('never rounds an edge down to zero', () => {
    expect(fitWithin(10000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });
});

describe('prepareImage', () => {
  it('resizes a large photo to the edge limit and encodes it as WebP', async () => {
    const result = await prepareImage(makeFile('photo.jpg', 'image/jpeg'));

    expect(result.width).toBe(MAX_EDGE_PX);
    expect(result.height).toBe(1200);
    expect(result.contentType).toBe('image/webp');
    expect(result.extension).toBe('webp');
    expect(result.blob.type).toBe('image/webp');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
  });

  it('decodes with the photo\'s own orientation, so phone photos come out upright', async () => {
    await prepareImage(makeFile('photo.jpg', 'image/jpeg'));
    expect((global as any).createImageBitmap).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ imageOrientation: 'from-image' })
    );
  });

  it('leaves a small image at its own size', async () => {
    bitmapSize = { width: 800, height: 600 };
    const result = await prepareImage(makeFile('small.png', 'image/png'));
    expect(result).toMatchObject({ width: 800, height: 600 });
  });

  it('measures how bright each part of the picture is, as drawn', async () => {
    bitmapSize = { width: 32, height: 16 };
    pixelData = new Uint8ClampedArray(32 * 16 * 4).fill(255);
    const prepared = await prepareImage(makeFile('a.png', 'image/png'));

    expect(getImageData).toHaveBeenCalledWith(0, 0, 32, 16);
    expect(prepared.brightness).toEqual({ cols: 16, rows: 8, cells: new Array(16 * 8 * 3).fill(1) });
  });

  it('still prepares the image when the pixels cannot be read back', async () => {
    pixelData = null;
    const prepared = await prepareImage(makeFile('a.png', 'image/png'));

    expect(prepared.contentType).toBe('image/webp');
    expect('brightness' in prepared).toBe(false);
  });

  it('releases the decoded bitmap', async () => {
    await prepareImage(makeFile('photo.jpg', 'image/jpeg'));
    expect(close).toHaveBeenCalled();
  });

  it('falls back to JPEG when the browser cannot encode WebP', async () => {
    // A browser without a WebP encoder hands back PNG instead of failing.
    encodeQueue = [{ type: 'image/png', size: 900_000 }, { type: 'image/jpeg', size: 200_000 }];

    const result = await prepareImage(makeFile('photo.jpg', 'image/jpeg'));

    expect(toBlobCalls.map(c => c.type)).toEqual(['image/webp', 'image/jpeg']);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
  });

  it('re-encodes once at lower quality when the first result is over the upload limit', async () => {
    encodeQueue = [
      { type: 'image/webp', size: MAX_UPLOAD_BYTES + 1 },
      { type: 'image/webp', size: MAX_UPLOAD_BYTES - 1 },
    ];

    const result = await prepareImage(makeFile('noisy.png', 'image/png'));

    expect(toBlobCalls).toHaveLength(2);
    expect(toBlobCalls[1].quality!).toBeLessThan(toBlobCalls[0].quality!);
    expect(result.blob.size).toBe(MAX_UPLOAD_BYTES - 1);
  });

  it('refuses when even the lower-quality result is over the upload limit', async () => {
    encodeQueue = [
      { type: 'image/webp', size: MAX_UPLOAD_BYTES + 1 },
      { type: 'image/webp', size: MAX_UPLOAD_BYTES + 1 },
    ];

    await expect(prepareImage(makeFile('noisy.png', 'image/png'))).rejects.toMatchObject({
      reason: 'too-large-after-resize',
    });
  });

  it('refuses a file over the input limit before decoding it', async () => {
    const huge = makeFile('huge.jpg', 'image/jpeg', MAX_INPUT_BYTES + 1);

    const error = await prepareImage(huge).catch((e: any) => e);

    expect(error).toBeInstanceOf(ImagePreparationError);
    expect(error.reason).toBe('too-large');
    expect(error.message).toMatch(/20 MB/);
    expect((global as any).createImageBitmap).not.toHaveBeenCalled();
  });

  it('refuses something that is not an image', async () => {
    await expect(prepareImage(makeFile('notes.txt', 'text/plain'))).rejects.toMatchObject({
      reason: 'not-an-image',
    });
  });

  it('tries to decode a file whose type the OS left blank, as Windows does for HEIC', async () => {
    const result = await prepareImage(makeFile('IMG_0001.heic', ''));
    expect(result.contentType).toBe('image/webp');
  });

  it('refuses SVG, which is a document rather than a picture', async () => {
    const error = await prepareImage(makeFile('crest.svg', 'image/svg+xml')).catch((e: any) => e);
    expect(error.reason).toBe('svg');
    expect((global as any).createImageBitmap).not.toHaveBeenCalled();
  });

  it('says the format is unsupported in this browser when decoding fails', async () => {
    (global as any).createImageBitmap = jest.fn(async () => {
      throw new DOMException('The source image could not be decoded.', 'InvalidStateError');
    });

    const error = await prepareImage(makeFile('photo.heic', 'image/heic')).catch((e: any) => e);

    expect(error.reason).toBe('undecodable');
    expect(error.message).toMatch(/JPEG or PNG/);
  });
});
