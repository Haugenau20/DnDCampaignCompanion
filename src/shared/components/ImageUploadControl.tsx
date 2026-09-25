// src/shared/components/ImageUploadControl.tsx
import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import {
  prepareImage,
  ImagePreparationError,
  PreparedImage,
} from 'core/utils/prepare-image';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

export interface ImageUploadControlProps {
  /** What the image is, lower case: "portrait", "picture", "crest". */
  subject: string;
  /** Whether an image is there now, which decides Add versus Replace/Remove. */
  hasImage: boolean;
  /**
   * Store a prepared image. The caller owns the order of writes (upload, save
   * the document, delete the old file), which this control knows nothing of.
   * Rejecting shows a retry message.
   */
  onUpload: (image: PreparedImage, onProgress: (fraction: number) => void) => Promise<void>;
  /** Remove the image. Rejecting shows the error in the confirmation dialog. */
  onRemove: () => Promise<void>;
  /**
   * "full" (the default) prints its actions as labelled buttons in a row.
   *
   * "compact" wraps `children` -- the picture, or what stands in for it -- and
   * lays icon buttons over its top-right corner. Where the device can hover
   * they stay hidden until the pointer is over the picture or a button has
   * focus. Progress and errors are never hidden: they show as a small note
   * just below the picture, laid over the page rather than pushing it about.
   */
  variant?: 'full' | 'compact';
  /** What the compact control is laid over. Ignored by "full". */
  children?: React.ReactNode;
  /**
   * Where the compact buttons sit on the corner: "inside" it (the default),
   * or "outside", straddling it, for something too small to cover -- a 56px
   * sigil would lose half its letter to an inside button.
   */
  placement?: 'inside' | 'outside';
  className?: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'uploading'; fraction: number };

const UPLOAD_FAILED = "Couldn't upload the image. Please try again.";

/**
 * Hidden until wanted, but only where "wanted" can be expressed: a touch
 * screen has no hover, so there the buttons are always shown. Focus reveals
 * them too, so a keyboard user never tabs onto something invisible.
 */
const REVEAL_ON_HOVER =
  '[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity';

/** The icon buttons' own recipe: square, and opaque over a photograph. */
const ICON_BUTTON = 'p-1.5 bg-[var(--surface-card-bg)]';

/**
 * Add, replace or remove one image.
 *
 * Any file the browser can decode is accepted and converted by
 * `prepareImage`; its refusals are written for the user and shown as they
 * are. Every button is disabled while an image is being prepared or uploaded,
 * so two uploads can never race to be the current one.
 */
const ImageUploadControl: React.FC<ImageUploadControlProps> = ({
  subject,
  hasImage,
  onUpload,
  onRemove,
  variant = 'full',
  children,
  placement = 'inside',
  className,
}) => {
  const compact = variant === 'compact';
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const busy = phase.kind !== 'idle';
  const addLabel = hasImage ? `Replace ${subject}` : `Add ${subject}`;
  const removeLabel = `Remove ${subject}`;

  const status = busy && (
    <Typography variant="body-sm" color="muted" role="status">
      {phase.kind === 'uploading'
        ? `Uploading… ${Math.round(phase.fraction * 100)}%`
        : 'Preparing…'}
    </Typography>
  );

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared at once, so picking the same file again still fires `change`.
    event.target.value = '';
    if (!file) return;

    setError(null);
    setPhase({ kind: 'preparing' });
    try {
      const prepared = await prepareImage(file);
      setPhase({ kind: 'uploading', fraction: 0 });
      await onUpload(prepared, fraction => setPhase({ kind: 'uploading', fraction }));
    } catch (err) {
      console.error(`Error uploading ${subject}:`, err);
      setError(err instanceof ImagePreparationError ? err.message : UPLOAD_FAILED);
    } finally {
      setPhase({ kind: 'idle' });
    }
  };

  const pickFile = () => inputRef.current?.click();
  const confirmRemove = () => setConfirmingRemove(true);

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFile}
      data-testid="image-upload-input"
    />
  );

  const removeDialog = (
    <DeleteConfirmationDialog
      isOpen={confirmingRemove}
      onClose={() => setConfirmingRemove(false)}
      onConfirm={onRemove}
      itemName=""
      itemType={subject}
      message={`The ${subject} is removed for everyone in the group.`}
    />
  );

  if (compact) {
    return (
      <div className={clsx('group relative', className)}>
        {fileInput}
        {children}

        <div
          className={clsx(
            'absolute flex gap-1',
            placement === 'inside' ? 'top-1 right-1' : '-top-3 -right-3',
            // Kept in view while busy: the disabled buttons are what says the
            // control is not idle.
            !busy && REVEAL_ON_HOVER
          )}
        >
          <Button
            variant="outline"
            size="sm"
            className={ICON_BUTTON}
            aria-label={addLabel}
            title={addLabel}
            onClick={pickFile}
            disabled={busy}
          >
            <ImagePlus size={16} aria-hidden="true" />
          </Button>
          {hasImage && (
            <Button
              variant="outline"
              size="sm"
              className={ICON_BUTTON}
              aria-label={removeLabel}
              title={removeLabel}
              onClick={confirmRemove}
              disabled={busy}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          )}
        </div>

        {(busy || error) && (
          <div className="card absolute left-0 top-full z-10 mt-1 w-max max-w-[16rem] px-2 py-1">
            {status}
            {error && (
              <Typography variant="body-sm" color="error" role="alert">
                {error}
              </Typography>
            )}
          </div>
        )}

        {removeDialog}
      </div>
    );
  }

  return (
    <div className={className}>
      {fileInput}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          startIcon={<ImagePlus size={16} aria-hidden="true" />}
          onClick={pickFile}
          disabled={busy}
        >
          {addLabel}
        </Button>

        {hasImage && (
          <Button
            variant="ghost"
            size="sm"
            startIcon={<Trash2 size={16} aria-hidden="true" />}
            onClick={confirmRemove}
            disabled={busy}
          >
            {removeLabel}
          </Button>
        )}

        {status}
      </div>

      {error && (
        <Typography variant="body-sm" color="error" role="alert" className="mt-2">
          {error}
        </Typography>
      )}

      {removeDialog}
    </div>
  );
};

export default ImageUploadControl;
