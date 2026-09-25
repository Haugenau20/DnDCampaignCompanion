// src/core/services/firebase/storage/__tests__/ImageStorageService.test.ts

/**
 * Tests for ImageStorageService and its path and URL helpers.
 *
 * The Storage SDK is mocked; `uploadBytesResumable` returns a task whose
 * `on('state_changed', …)` the test drives by hand.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockStorage = { name: 'storage' };
const mockAuth: { currentUser: { uid: string } | null } = { currentUser: { uid: 'uploader-1' } };
const mockRef = jest.fn((_storage: unknown, path: string) => ({ fullPath: path }));
const mockUploadBytesResumable = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => mockStorage),
  connectStorageEmulator: jest.fn(),
  ref: function () { return (mockRef as Function).apply(null, arguments); },
  uploadBytesResumable: function () { return (mockUploadBytesResumable as Function).apply(null, arguments); },
  getDownloadURL: function () { return (mockGetDownloadURL as Function).apply(null, arguments); },
  deleteObject: function () { return (mockDeleteObject as Function).apply(null, arguments); },
}));
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  connectAuthEmulator: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
}));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn(),
}));

const mockConfig = {
  firebaseConfig: { apiKey: 'test', projectId: 'test', storageBucket: 'test-bucket.firebasestorage.app' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001', storage: '9199' },
};
jest.mock('../../config/firebaseConfig', () => mockConfig);

import ImageStorageService, {
  entityImagePrefix,
  crestPrefix,
  campaignBannerPrefix,
  supportScreenshotPrefix,
  isOwnBucketUrl,
  IMMUTABLE_CACHE_CONTROL,
} from '../ImageStorageService';
import type { PreparedImage } from '../../../../utils/prepare-image';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Observer = {
  next?: (s: { bytesTransferred: number; totalBytes: number }) => void;
  error?: (e: unknown) => void;
  complete?: () => void;
};

/** An upload task whose progress, failure and completion the test triggers. */
function fakeTask() {
  const observer: Observer = {};
  return {
    observer,
    task: {
      on: jest.fn((_event: string, next: Observer['next'], error: Observer['error'], complete: Observer['complete']) => {
        observer.next = next;
        observer.error = error;
        observer.complete = complete;
        return () => undefined;
      }),
    },
  };
}

const prepared: PreparedImage = {
  blob: new Blob(['x'], { type: 'image/webp' }),
  width: 1600,
  height: 1200,
  contentType: 'image/webp',
  extension: 'webp',
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.currentUser = { uid: 'uploader-1' };
  mockConfig.useEmulators = false;
});

// ─── Path helpers ────────────────────────────────────────────────────────────

describe('path helpers', () => {
  it('builds an entity prefix that mirrors the Firestore path', () => {
    expect(entityImagePrefix('g1', 'c1', 'npcs', 'n1')).toBe('groups/g1/campaigns/c1/npcs/n1');
    expect(entityImagePrefix('g1', 'c1', 'locations', 'l1')).toBe('groups/g1/campaigns/c1/locations/l1');
  });

  it("builds a campaign's banner prefix inside the campaign's own folder", () => {
    // Inside it, so deleteCampaign's prefix delete takes the banner too.
    expect(campaignBannerPrefix('g1', 'c1')).toBe('groups/g1/campaigns/c1/banner');
  });

  it('builds the crest prefix under the group', () => {
    expect(crestPrefix('g1')).toBe('groups/g1/crest');
  });

  it("builds a support prefix keyed by the uploader, outside every group", () => {
    expect(supportScreenshotPrefix('u1')).toBe('support/u1');
  });

  it('refuses an id that would escape its folder', () => {
    expect(() => entityImagePrefix('g1', 'c1', 'npcs', '../x')).toThrow();
    expect(() => crestPrefix('')).toThrow();
    expect(() => campaignBannerPrefix('g1', '..')).toThrow();
    expect(() => supportScreenshotPrefix('a/b')).toThrow();
  });
});

// ─── isOwnBucketUrl ──────────────────────────────────────────────────────────

describe('isOwnBucketUrl', () => {
  const prod = 'https://firebasestorage.googleapis.com/v0/b/test-bucket.firebasestorage.app/o/groups%2Fg1%2Fcrest%2Fa.webp?alt=media&token=t';
  const emulator = 'http://localhost:9199/v0/b/test-bucket.firebasestorage.app/o/groups%2Fg1%2Fcrest%2Fa.webp?alt=media&token=t';

  it('accepts a download URL for this bucket', () => {
    expect(isOwnBucketUrl(prod)).toBe(true);
  });

  it('rejects another bucket on the same host', () => {
    expect(isOwnBucketUrl(prod.replace('test-bucket', 'someone-else'))).toBe(false);
  });

  it('rejects a foreign host, which could log every viewer', () => {
    expect(isOwnBucketUrl('https://tracker.example.com/v0/b/test-bucket.firebasestorage.app/o/x.webp')).toBe(false);
  });

  it('rejects plain http to the production host', () => {
    expect(isOwnBucketUrl(prod.replace('https:', 'http:'))).toBe(false);
  });

  it('rejects things that are not URLs at all', () => {
    expect(isOwnBucketUrl('javascript:alert(1)')).toBe(false);
    expect(isOwnBucketUrl('')).toBe(false);
  });

  it('accepts the emulator only while emulators are in use', () => {
    expect(isOwnBucketUrl(emulator)).toBe(false);
    mockConfig.useEmulators = true;
    expect(isOwnBucketUrl(emulator)).toBe(true);
  });
});

// ─── upload ──────────────────────────────────────────────────────────────────

describe('ImageStorageService.upload', () => {
  const service = ImageStorageService.getInstance();

  it('uploads under a fresh name in the prefix, with type and immutable caching', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);
    mockGetDownloadURL.mockResolvedValue('https://example/url');

    const pending = service.upload('groups/g1/crest', prepared);
    observer.complete!();
    const image = await pending;

    const path = mockRef.mock.calls[0][1];
    expect(path).toMatch(/^groups\/g1\/crest\/[0-9a-f-]{36}\.webp$/);
    expect(mockRef.mock.calls[0][0]).toBe(mockStorage);
    expect(mockUploadBytesResumable).toHaveBeenCalledWith(
      { fullPath: path },
      prepared.blob,
      { contentType: 'image/webp', cacheControl: IMMUTABLE_CACHE_CONTROL }
    );
    expect(IMMUTABLE_CACHE_CONTROL).toMatch(/immutable/);
    expect(image).toMatchObject({
      path,
      url: 'https://example/url',
      width: 1600,
      height: 1200,
      uploadedBy: 'uploader-1',
    });
    expect(Number.isNaN(Date.parse(image.uploadedAt))).toBe(false);
  });

  it('stores the brightness measured at preparation with the image', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);
    mockGetDownloadURL.mockResolvedValue('u');
    const brightness = { cols: 1, rows: 1, cells: [0.5] };

    const pending = service.upload('groups/g1/crest', { ...prepared, brightness });
    observer.complete!();

    expect((await pending).brightness).toEqual(brightness);
  });

  it('leaves the brightness out, not undefined, when there is none -- Firestore refuses undefined', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);
    mockGetDownloadURL.mockResolvedValue('u');

    const pending = service.upload('groups/g1/crest', prepared);
    observer.complete!();

    expect('brightness' in (await pending)).toBe(false);
  });

  it('never reuses a name, so a replace cannot hit a cached old image', async () => {
    for (let i = 0; i < 2; i++) {
      const { task, observer } = fakeTask();
      mockUploadBytesResumable.mockReturnValueOnce(task);
      mockGetDownloadURL.mockResolvedValueOnce('u');
      const pending = service.upload('groups/g1/crest', prepared);
      observer.complete!();
      await pending;
    }
    expect(mockRef.mock.calls[0][1]).not.toBe(mockRef.mock.calls[1][1]);
  });

  it('reports progress as a fraction', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);
    mockGetDownloadURL.mockResolvedValue('u');
    const onProgress = jest.fn();

    const pending = service.upload('groups/g1/crest', prepared, onProgress);
    observer.next!({ bytesTransferred: 50, totalBytes: 200 });
    observer.complete!();
    await pending;

    expect(onProgress).toHaveBeenCalledWith(0.25);
  });

  it('rejects when the upload fails, without asking for a URL', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);

    const pending = service.upload('groups/g1/crest', prepared);
    observer.error!(Object.assign(new Error('denied'), { code: 'storage/unauthorized' }));

    await expect(pending).rejects.toMatchObject({ code: 'storage/unauthorized' });
    await flush();
    expect(mockGetDownloadURL).not.toHaveBeenCalled();
  });

  it('refuses to upload when nobody is signed in', async () => {
    mockAuth.currentUser = null;
    await expect(service.upload('groups/g1/crest', prepared)).rejects.toThrow(/Not authenticated/);
    expect(mockUploadBytesResumable).not.toHaveBeenCalled();
  });
});

// ─── uploadScreenshot ────────────────────────────────────────────────────────

describe('ImageStorageService.uploadScreenshot', () => {
  const service = ImageStorageService.getInstance();

  it("uploads under a fresh name in the signed-in user's support folder", async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);

    const pending = service.uploadScreenshot(prepared);
    observer.complete!();
    const path = await pending;

    expect(path).toMatch(/^support\/uploader-1\/[0-9a-f-]{36}\.webp$/);
    expect(mockRef).toHaveBeenCalledWith(mockStorage, path);
    expect(mockUploadBytesResumable).toHaveBeenCalledWith({ fullPath: path }, prepared.blob, {
      contentType: 'image/webp',
    });
  });

  it('never asks for a download URL -- nobody may read the folder', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);

    const pending = service.uploadScreenshot(prepared);
    observer.complete!();
    await pending;

    expect(mockGetDownloadURL).not.toHaveBeenCalled();
  });

  it('reports progress as a fraction', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);
    const onProgress = jest.fn();

    const pending = service.uploadScreenshot(prepared, onProgress);
    observer.next!({ bytesTransferred: 150, totalBytes: 200 });
    observer.complete!();
    await pending;

    expect(onProgress).toHaveBeenCalledWith(0.75);
  });

  it('rejects when the upload fails', async () => {
    const { task, observer } = fakeTask();
    mockUploadBytesResumable.mockReturnValue(task);

    const pending = service.uploadScreenshot(prepared);
    observer.error!(Object.assign(new Error('denied'), { code: 'storage/unauthorized' }));

    await expect(pending).rejects.toMatchObject({ code: 'storage/unauthorized' });
  });

  it('refuses to upload when nobody is signed in', async () => {
    mockAuth.currentUser = null;
    await expect(service.uploadScreenshot(prepared)).rejects.toThrow(/Not authenticated/);
    expect(mockUploadBytesResumable).not.toHaveBeenCalled();
  });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('ImageStorageService.remove', () => {
  const service = ImageStorageService.getInstance();

  it('deletes the object at the path', async () => {
    mockDeleteObject.mockResolvedValue(undefined);
    await service.remove('groups/g1/crest/a.webp');
    expect(mockRef).toHaveBeenCalledWith(mockStorage, 'groups/g1/crest/a.webp');
    expect(mockDeleteObject).toHaveBeenCalledWith({ fullPath: 'groups/g1/crest/a.webp' });
  });

  it('treats an already-missing object as removed', async () => {
    mockDeleteObject.mockRejectedValue(Object.assign(new Error('gone'), { code: 'storage/object-not-found' }));
    await expect(service.remove('groups/g1/crest/a.webp')).resolves.toBeUndefined();
  });

  it('passes any other failure on', async () => {
    mockDeleteObject.mockRejectedValue(Object.assign(new Error('no'), { code: 'storage/unauthorized' }));
    await expect(service.remove('groups/g1/crest/a.webp')).rejects.toMatchObject({ code: 'storage/unauthorized' });
  });
});
