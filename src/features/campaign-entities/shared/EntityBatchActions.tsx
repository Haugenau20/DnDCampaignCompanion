// src/features/campaign-entities/shared/EntityBatchActions.tsx
import React, { useState } from 'react';
import { Trash } from 'lucide-react';
import Button from 'core/components/Button';
import { RosterBatchBar } from 'core/components/Roster';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';

/** One status a selection can be set to. */
export interface BatchStatusOption<S extends string> {
  value: S;
  /** The button's label, e.g. "Mark Deceased". */
  label: string;
}

/** Props for {@link EntityBatchActions}. */
export interface EntityBatchActionsProps<S extends string> {
  /** The ticked records' ids. */
  selected: Set<string>;
  /** How one record and several are named: `{ one: 'NPC', many: 'NPCs' }`. */
  noun: { one: string; many: string };
  /** The statuses offered, in the order the directory's status bar shows them. */
  statuses: Array<BatchStatusOption<S>>;
  /** Sets every selected record to `status`, as one write. */
  onStatus: (ids: string[], status: S) => Promise<void>;
  /** Deletes every selected record, as one write. Without it there is no Delete. */
  onDelete?: (ids: string[]) => Promise<void>;
  /** What deleting takes with it, said in the confirmation after "Delete 3 NPCs?". */
  deleteConsequence?: string;
  /**
   * A confirmation of the directory's own, in place of the plain one, for an
   * entity whose delete asks something first (locations: what becomes of the
   * places inside). It calls `onDeleted` once the delete has gone through.
   */
  renderDeleteDialog?: (dialog: {
    ids: string[];
    isOpen: boolean;
    onClose: () => void;
    onDeleted: () => void;
  }) => React.ReactNode;
  /** Called once an action has gone through, to leave selection mode. */
  onComplete: () => void;
}

/**
 * A directory's batch actions (T017): set the status of every ticked record,
 * or delete them all. Each is one batched write, so a failure changes
 * nothing; a failed status change is reported under the bar, a failed delete
 * in its dialog, which stays open. A directory that brings its own delete
 * dialog (`renderDeleteDialog`) answers for how its delete fails.
 *
 * Rumours keep their own bar (`RumorBatchActions`), because combine and
 * convert-to-quest belong to no other entity.
 */
function EntityBatchActions<S extends string>({
  selected,
  noun,
  statuses,
  onStatus,
  onDelete,
  deleteConsequence,
  renderDeleteDialog,
  onComplete,
}: EntityBatchActionsProps<S>): React.ReactElement | null {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (selected.size === 0) {
    return null;
  }

  const ids = Array.from(selected);
  const plural = selected.size === 1 ? noun.one : noun.many;
  const count = `${selected.size} ${plural}`;

  const handleStatus = async (status: S) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await onStatus(ids, status);
      onComplete();
    } catch (err) {
      setActionError(
        `Failed to update ${noun.one} status: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /** Failures propagate to the dialog, which stays open and says why. */
  const handleConfirmDelete = async () => {
    await onDelete?.(ids);
    onComplete();
  };

  return (
    <>
      <RosterBatchBar label={`${count} selected`} error={actionError}>
        {statuses.map(({ value, label }) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            onClick={() => handleStatus(value)}
            disabled={isProcessing}
          >
            {label}
          </Button>
        ))}
        {(onDelete || renderDeleteDialog) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
            startIcon={<Trash size={16} className="feedback-error" />}
            disabled={isProcessing}
          >
            Delete
          </Button>
        )}
      </RosterBatchBar>

      {renderDeleteDialog?.({
        ids,
        isOpen: confirmingDelete,
        onClose: () => setConfirmingDelete(false),
        onDeleted: onComplete,
      })}

      {onDelete && !renderDeleteDialog && (
        <DeleteConfirmationDialog
          isOpen={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={handleConfirmDelete}
          itemName={count}
          itemType={plural}
          message={deleteConsequence ? `Delete ${count}? ${deleteConsequence}` : undefined}
        />
      )}
    </>
  );
}

export default EntityBatchActions;
