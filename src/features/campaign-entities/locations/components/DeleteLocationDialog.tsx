// src/features/campaign-entities/locations/components/DeleteLocationDialog.tsx
import React, { useState } from 'react';
import Dialog from 'core/components/Dialog';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import { LocationChildStrategy } from '../types';

export interface DeleteLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The place being deleted. */
  name: string;
  /** How many places sit directly inside it. */
  childCount: number;
  /** Where the children go when promoted: the grandparent's name, or nothing. */
  grandparentName?: string;
  /** Must reject on failure -- nothing here claims success before it resolves. */
  onConfirm: (childStrategy: LocationChildStrategy) => Promise<void>;
}

/**
 * Deleting a place asks what happens to the places inside it.
 *
 * §6.2: **never orphan, never decide silently.** Today `deleteLocation` takes
 * the whole subtree without asking, so deleting a region to tidy it up takes
 * every city, dungeon and room in it and says only "This cannot be undone".
 *
 * Phase 14 §6 for the copy: name the object and the blast radius. Here the
 * blast radius is a count, and the count is the reason the question exists --
 * "and the 12 places inside it" is a different decision from "and the 1 place
 * inside it".
 *
 * A childless location gets no question, because there is nothing to decide.
 */
export const DeleteLocationDialog: React.FC<DeleteLocationDialogProps> = ({
  isOpen,
  onClose,
  name,
  childCount,
  grandparentName,
  onConfirm,
}) => {
  const [strategy, setStrategy] = useState<LocationChildStrategy>('promote-to-grandparent');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const places = `${childCount} place${childCount === 1 ? '' : 's'}`;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(childCount > 0 ? strategy : 'delete-subtree');
      setIsDeleting(false);
      onClose();
    } catch (err) {
      // The dialog stays open and says what happened. Closing on a failed
      // delete would leave the record on screen with no explanation of why.
      setIsDeleting(false);
      setError(err instanceof Error ? err.message : 'Could not delete this place.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={`Delete ${name}?`} maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <Typography>
          {childCount > 0
            ? `${name} is removed for everyone, and it holds ${places}.`
            : `${name} is removed for everyone.`}
        </Typography>

        {childCount > 0 && (
          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
            <legend className="sr-only">What happens to the {places} inside</legend>
            {(
              [
                {
                  value: 'promote-to-grandparent' as const,
                  label: grandparentName
                    ? `Keep them — move the ${places} into ${grandparentName}`
                    : `Keep them — move the ${places} to the top level`,
                  detail: 'Anything inside them travels with them.',
                },
                {
                  value: 'delete-subtree' as const,
                  label: `Delete them too — ${name} and everything inside it`,
                  detail: 'Every place below it goes, at every depth.',
                },
              ]
            ).map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-3 p-3 rounded-md card-border border cursor-pointer selectable-item"
              >
                <input
                  type="radio"
                  name="location-child-strategy"
                  value={option.value}
                  checked={strategy === option.value}
                  onChange={() => setStrategy(option.value)}
                  disabled={isDeleting}
                  className="mt-1 shrink-0"
                />
                <span className="min-w-0">
                  <Typography variant="body-sm" className="block">
                    {option.label}
                  </Typography>
                  <Typography variant="body-sm" color="secondary" className="block text-xs">
                    {option.detail}
                  </Typography>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <Typography variant="body-sm" color="secondary">
          This cannot be undone.
        </Typography>

        {error && (
          <Typography variant="body-sm" color="error" role="alert">
            {error}
          </Typography>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Keep it
          </Button>
          <Button
            className="delete-button"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : `Delete ${name}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteLocationDialog;
