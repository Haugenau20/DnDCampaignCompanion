// src/shared/components/__tests__/ImageUploadControl.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploadControl from '../ImageUploadControl';
import { prepareImage, ImagePreparationError, PreparedImage } from 'core/utils/prepare-image';

jest.mock('core/utils/prepare-image', () => {
  const actual = jest.requireActual('core/utils/prepare-image');
  return { ...actual, prepareImage: jest.fn() };
});

const mockPrepare = prepareImage as jest.MockedFunction<typeof prepareImage>;

const prepared: PreparedImage = {
  blob: new Blob(['x'], { type: 'image/webp' }),
  width: 800,
  height: 600,
  contentType: 'image/webp',
  extension: 'webp',
};

const photo = () => new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

/** A promise the test settles by hand, to observe in-flight states. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const fileInput = () => screen.getByTestId('image-upload-input') as HTMLInputElement;

beforeEach(() => {
  mockPrepare.mockReset();
  mockPrepare.mockResolvedValue(prepared);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('ImageUploadControl', () => {
  it('offers to add when there is no image, and nothing to remove', () => {
    render(<ImageUploadControl subject="portrait" hasImage={false} onUpload={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Add portrait' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('offers to replace or remove when there is one', () => {
    render(<ImageUploadControl subject="portrait" hasImage onUpload={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Replace portrait' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove portrait' })).toBeInTheDocument();
  });

  it('accepts any image type, and leaves the filtering to prepareImage', () => {
    render(<ImageUploadControl subject="portrait" hasImage={false} onUpload={jest.fn()} onRemove={jest.fn()} />);
    expect(fileInput()).toHaveAttribute('accept', 'image/*');
  });

  it('opens the file picker from the button', async () => {
    render(<ImageUploadControl subject="portrait" hasImage={false} onUpload={jest.fn()} onRemove={jest.fn()} />);
    const click = jest.spyOn(fileInput(), 'click');
    await userEvent.click(screen.getByRole('button', { name: 'Add portrait' }));
    expect(click).toHaveBeenCalled();
  });

  it('prepares the picked file and hands the result to onUpload', async () => {
    const onUpload = jest.fn().mockResolvedValue(undefined);
    render(<ImageUploadControl subject="portrait" hasImage={false} onUpload={onUpload} onRemove={jest.fn()} />);

    const file = photo();
    await userEvent.upload(fileInput(), file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(prepared, expect.any(Function)));
    expect(mockPrepare).toHaveBeenCalledWith(file);
  });

  it('shows progress while uploading, and disables every button', async () => {
    const upload = deferred();
    let report!: (fraction: number) => void;
    const onUpload = jest.fn((_image: PreparedImage, onProgress: (f: number) => void) => {
      report = onProgress;
      return upload.promise;
    });
    render(<ImageUploadControl subject="portrait" hasImage onUpload={onUpload} onRemove={jest.fn()} />);

    await userEvent.upload(fileInput(), photo());
    await waitFor(() => expect(onUpload).toHaveBeenCalled());
    act(() => report(0.42));

    expect(screen.getByRole('status')).toHaveTextContent('Uploading… 42%');
    expect(screen.getByRole('button', { name: 'Replace portrait' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove portrait' })).toBeDisabled();

    await act(async () => upload.resolve());
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Replace portrait' })).toBeEnabled();
  });

  it('shows why a file was refused, and never uploads it', async () => {
    mockPrepare.mockRejectedValue(new ImagePreparationError('svg'));
    const onUpload = jest.fn();
    render(<ImageUploadControl subject="portrait" hasImage={false} onUpload={onUpload} onRemove={jest.fn()} />);

    await userEvent.upload(fileInput(), new File(['<svg/>'], 'crest.svg', { type: 'image/svg+xml' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/SVG images aren't supported/);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('shows a plain retry message when the upload itself fails', async () => {
    const onUpload = jest.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'storage/unauthorized' }));
    render(<ImageUploadControl subject="portrait" hasImage={false} onUpload={onUpload} onRemove={jest.fn()} />);

    await userEvent.upload(fileInput(), photo());

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't upload the image. Please try again.");
    expect(screen.getByRole('button', { name: 'Add portrait' })).toBeEnabled();
  });

  it('clears an old error when a new pick starts', async () => {
    mockPrepare.mockRejectedValueOnce(new ImagePreparationError('svg'));
    render(
      <ImageUploadControl
        subject="portrait"
        hasImage={false}
        onUpload={jest.fn().mockResolvedValue(undefined)}
        onRemove={jest.fn()}
      />
    );

    await userEvent.upload(fileInput(), photo());
    await screen.findByRole('alert');
    await userEvent.upload(fileInput(), photo());

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('lets the same file be picked again after a failure', async () => {
    mockPrepare.mockRejectedValueOnce(new ImagePreparationError('too-large'));
    render(<ImageUploadControl subject="portrait" hasImage={false} onUpload={jest.fn()} onRemove={jest.fn()} />);

    await userEvent.upload(fileInput(), photo());
    await screen.findByRole('alert');

    expect(fileInput().value).toBe('');
  });

  it('asks before removing, and removes only on confirmation', async () => {
    const onRemove = jest.fn().mockResolvedValue(undefined);
    render(<ImageUploadControl subject="portrait" hasImage onUpload={jest.fn()} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove portrait' }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByText(/removed for everyone in the group/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete portrait' }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
  });

  it('does not remove when the confirmation is cancelled', async () => {
    const onRemove = jest.fn();
    render(<ImageUploadControl subject="portrait" hasImage onUpload={jest.fn()} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove portrait' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onRemove).not.toHaveBeenCalled();
  });
});
