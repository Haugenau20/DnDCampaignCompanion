// src/shared/hooks/__tests__/useImageAttachment.test.ts
import { renderHook, act } from '@testing-library/react';
import { useImageAttachment } from '../useImageAttachment';
import { StoredImage } from 'core/types/storedImage';
import { PreparedImage } from 'core/utils/prepare-image';

const mockUpload = jest.fn();
const mockRemove = jest.fn();

jest.mock('core/services/firebase', () => ({
  images: {
    upload: (...args: unknown[]) => mockUpload(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

const stored = (name: string): StoredImage => ({
  path: `groups/g1/crest/${name}.webp`,
  url: `https://example/${name}`,
  width: 10,
  height: 10,
  uploadedBy: 'u1',
  uploadedAt: '2026-09-24T12:00:00.000Z',
});

/**
 * Run a hook action inside act and hand back what it threw. Asserting with
 * `expect(act(...)).rejects` settles before the hook's own catch block has
 * run, so its clean-up would look missing.
 */
async function settle(run: () => Promise<unknown>): Promise<unknown> {
  let error: unknown;
  await act(async () => {
    try {
      await run();
    } catch (e) {
      error = e;
    }
  });
  return error;
}

const prepared = {} as PreparedImage;
const OLD = stored('old');
const NEW = stored('new');

/** Records every call to upload, save and remove, in the order they happened. */
let calls: string[];

beforeEach(() => {
  calls = [];
  mockUpload.mockReset().mockImplementation(async () => {
    calls.push('upload');
    return NEW;
  });
  mockRemove.mockReset().mockImplementation(async (path: string) => {
    calls.push(`remove ${path}`);
  });
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

function setup(current: StoredImage | null | undefined, save = jest.fn(async (image: StoredImage | null) => {
  calls.push(`save ${image ? image.path : 'null'}`);
})) {
  const { result } = renderHook(() =>
    useImageAttachment({ prefix: 'groups/g1/crest', current, save })
  );
  return { result, save };
}

describe('useImageAttachment', () => {
  describe('upload', () => {
    it('uploads into the prefix, then saves the new image', async () => {
      const { result } = setup(undefined);
      const onProgress = jest.fn();

      await act(() => result.current.upload(prepared, onProgress));

      expect(mockUpload).toHaveBeenCalledWith('groups/g1/crest', prepared, onProgress);
      expect(calls).toEqual(['upload', `save ${NEW.path}`]);
    });

    it('replacing deletes the old file only after the document points at the new one', async () => {
      const { result } = setup(OLD);

      await act(() => result.current.upload(prepared, jest.fn()));

      expect(calls).toEqual(['upload', `save ${NEW.path}`, `remove ${OLD.path}`]);
    });

    it('keeps the old file, and deletes the new one, when saving fails', async () => {
      const save = jest.fn().mockRejectedValue(new Error('permission-denied'));
      const { result } = setup(OLD, save);

      expect(await settle(() => result.current.upload(prepared, jest.fn()))).toEqual(expect.objectContaining({ message: 'permission-denied' }));

      expect(mockRemove).toHaveBeenCalledWith(NEW.path);
      expect(mockRemove).not.toHaveBeenCalledWith(OLD.path);
    });

    it('saves nothing when the upload fails', async () => {
      mockUpload.mockRejectedValue(new Error('storage/unauthorized'));
      const { result, save } = setup(OLD);

      expect(await settle(() => result.current.upload(prepared, jest.fn()))).toEqual(expect.any(Error));

      expect(save).not.toHaveBeenCalled();
      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('still succeeds when the old file cannot be deleted -- it is only an orphan', async () => {
      mockRemove.mockRejectedValue(new Error('network'));
      const { result } = setup(OLD);

      expect(await settle(() => result.current.upload(prepared, jest.fn()))).toBeUndefined();
    });

    it('refuses without a prefix, before uploading anything', async () => {
      const { result } = renderHook(() =>
        useImageAttachment({ prefix: null, current: undefined, save: jest.fn() })
      );

      expect(await settle(() => result.current.upload(prepared, jest.fn()))).toEqual(expect.any(Error));
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('clears the document first, then deletes the file', async () => {
      const { result } = setup(OLD);

      await act(() => result.current.remove());

      expect(calls).toEqual(['save null', `remove ${OLD.path}`]);
    });

    it('keeps the file when clearing the document fails', async () => {
      const save = jest.fn().mockRejectedValue(new Error('offline'));
      const { result } = setup(OLD, save);

      expect(await settle(() => result.current.remove())).toEqual(expect.objectContaining({ message: 'offline' }));
      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('does nothing when there is no image', async () => {
      const { result, save } = setup(null);

      await act(() => result.current.remove());

      expect(save).not.toHaveBeenCalled();
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });
});
