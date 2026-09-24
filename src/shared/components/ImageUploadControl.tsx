// src/shared/components/ImageUploadControl.tsx
import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import {
  prepareImage,
  ImagePreparationError,
  PreparedImage,
} from 'core/utils/prepare-image';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

interface ImageUploadControlProps {
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
  className?: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'uploading'; fraction: number };

const UPLOAD_FAILED = "Couldn't upload the image. Please try again.";

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
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const busy = phase.kind !== 'idle';

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

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        data-testid="image-upload-input"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          startIcon={<ImagePlus size={16} aria-hidden="true" />}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {hasImage ? `Replace ${subject}` : `Add ${subject}`}
        </Button>

        {hasImage && (
          <Button
            variant="ghost"
            size="sm"
            startIcon={<Trash2 size={16} aria-hidden="true" />}
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
          >
            {`Remove ${subject}`}
          </Button>
        )}

        {busy && (
          <Typography variant="body-sm" color="muted" role="status">
            {phase.kind === 'uploading'
              ? `Uploading… ${Math.round(phase.fraction * 100)}%`
              : 'Preparing…'}
          </Typography>
        )}
      </div>

      {error && (
        <Typography variant="body-sm" color="error" role="alert" className="mt-2">
          {error}
        </Typography>
      )}

      <DeleteConfirmationDialog
        isOpen={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        onConfirm={onRemove}
        itemName=""
        itemType={subject}
        message={`The ${subject} is removed for everyone in the group.`}
      />
    </div>
  );
};

export default ImageUploadControl;
