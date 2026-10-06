// src/features/campaign-entities/locations/components/DeleteLocationsDialog.tsx
import React, { useState } from 'react';
import Dialog from 'core/components/Dialog';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import { LocationChildStrategy } from '../types';
import { BatchDeletePlan } from '../utils/batch-delete';
import LocationChildStrategyChoice from './LocationChildStrategyChoice';

export interface DeleteLocationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** How many places are ticked. */
  count: number;
  /** What each answer does to the selection, from `planBatchDelete`. */
  plan: BatchDeletePlan;
  /** Must reject on failure -- nothing here claims success before it resolves. */
  onConfirm: (childStrategy: LocationChildStrategy) => Promise<void>;
}

/** "1 place", "3 places". */
const placesCount = (n: number) => `${n} place${n === 1 ? '' : 's'}`;

/**
 * Deleting several places asks once what happens to everything inside them
 * (T017, decided 2026-10-06): the same choice deleting one place offers, for
 * the whole selection. The button says how many places go in all, because
 * "Delete 3 places" and "Delete 40 places" are different decisions.
 *
 * A selection that holds nothing gets no question, as one empty place does not.
 */
export const DeleteLocationsDialog: React.FC<DeleteLocationsDialogProps> = ({
  isOpen,
  onClose,
  count,
  plan,
  onConfirm,
}) => {
  const [strategy, setStrategy] = useState<LocationChildStrategy>('promote-to-grandparent');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asks = plan.inside > 0;
  const chosen: LocationChildStrategy = asks ? strategy : 'delete-subtree';
  const one = count === 1;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(chosen);
      setIsDeleting(false);
      onClose();
    } catch (err) {
      // Stays open and says why. Places before the failure may be gone; the
      // list shows which, and confirming again finishes the rest.
      setIsDeleting(false);
      setError(err instanceof Error ? err.message : 'Could not delete these places.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={`Delete ${placesCount(count)}?`} maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <Typography>
          {`${placesCount(count)} ${one ? 'is' : 'are'} removed for everyone`}
          {asks ? `, and ${one ? 'it holds' : 'they hold'} ${plan.inside} more.` : '.'}
        </Typography>

        {asks && (
          <LocationChildStrategyChoice
            legend={`What happens to the ${placesCount(plan.inside)} inside`}
            options={[
              {
                value: 'promote-to-grandparent',
                label: `Keep them — move ${placesCount(plan.movedUp)} up a level`,
                detail: 'Each goes to the nearest place that is not being deleted, or to the top level. Anything inside them travels with them.',
              },
              {
                value: 'delete-subtree',
                label: `Delete them too — ${placesCount(plan.removed['delete-subtree'])} in all`,
                detail: 'Every place below the ticked ones goes, at every depth.',
              },
            ]}
            value={strategy}
            onChange={setStrategy}
            disabled={isDeleting}
          />
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
            {one ? 'Keep it' : 'Keep them'}
          </Button>
          <Button className="delete-button" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : `Delete ${placesCount(plan.removed[chosen])}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteLocationsDialog;
