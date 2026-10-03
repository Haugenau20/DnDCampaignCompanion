// src/features/campaign-entities/npcs/components/NPCBatchActions.tsx
import React, { useState } from 'react';
import { Trash } from 'lucide-react';
import Button from 'core/components/Button';
import { RosterBatchBar } from 'core/components/Roster';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import { NPCStatus } from '../types';
import { useNPCs } from '../context/NPCContext';

/** Props for {@link NPCBatchActions}. */
export interface NPCBatchActionsProps {
  /** The ticked NPCs' ids. */
  selected: Set<string>;
  /** Called once an action has gone through, to leave selection mode. */
  onComplete: () => void;
}

/**
 * Status, best to worst as the directory's status bar orders it. No icons and
 * no hue: presence carries none in this directory (see `NPCDirectory`'s
 * `STATUS_TONE`), and a death is not an error.
 */
const STATUS_ACTIONS: Array<{ status: NPCStatus; label: string }> = [
  { status: 'alive', label: 'Mark Alive' },
  { status: 'unknown', label: 'Mark Unknown' },
  { status: 'missing', label: 'Mark Missing' },
  { status: 'deceased', label: 'Mark Deceased' },
];

/**
 * The NPC directory's batch actions (T017): set the status of every ticked
 * NPC, or delete them all. Each is one batched write, so a failure changes
 * nothing; it is reported under the bar, or in the delete dialog.
 */
const NPCBatchActions: React.FC<NPCBatchActionsProps> = ({ selected, onComplete }) => {
  const { updateNPCsStatus, deleteNPCs } = useNPCs();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (selected.size === 0) {
    return null;
  }

  const ids = Array.from(selected);
  const count = `${selected.size} ${selected.size === 1 ? 'NPC' : 'NPCs'}`;

  const handleStatus = async (status: NPCStatus) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await updateNPCsStatus(ids, status);
      onComplete();
    } catch (err) {
      setActionError(`Failed to update NPC status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Failures propagate to the dialog, which stays open and says why. */
  const handleConfirmDelete = async () => {
    await deleteNPCs(ids);
    onComplete();
  };

  return (
    <>
      <RosterBatchBar label={`${count} selected`} error={actionError}>
        {STATUS_ACTIONS.map(({ status, label }) => (
          <Button
            key={status}
            variant="ghost"
            size="sm"
            onClick={() => handleStatus(status)}
            disabled={isProcessing}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmingDelete(true)}
          startIcon={<Trash size={16} className="feedback-error" />}
          disabled={isProcessing}
        >
          Delete
        </Button>
      </RosterBatchBar>

      <DeleteConfirmationDialog
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleConfirmDelete}
        itemName={count}
        itemType={selected.size === 1 ? 'NPC' : 'NPCs'}
        message={`Delete ${count}? Their pages, notes and portraits go with them.`}
      />
    </>
  );
};

export default NPCBatchActions;
