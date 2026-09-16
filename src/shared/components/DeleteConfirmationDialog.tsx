// components/shared/DeleteConfirmationDialog.tsx
import React, { useState } from 'react';
import Dialog from 'core/components/Dialog';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when the dialog is closed without confirming
   */
  onClose: () => void;
  
  /**
   * Callback when deletion is confirmed
   * Should return a Promise to enable loading state tracking
   */
  onConfirm: () => Promise<void>;
  
  /**
   * Name of the item being deleted (for display)
   */
  itemName: string;
  
  /**
   * Type of the item being deleted (e.g., "NPC", "Chapter", "Quest")
   * Used in button text and messaging
   */
  itemType?: string;
  
  /**
   * Custom message to display in the confirmation dialog
   * If not provided, a default message will be used
   */
  message?: string;
}

/**
 * A reusable dialog for confirming deletion actions across the application
 */
const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = "item",
  message
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(`Error deleting ${itemType}:`, err);
      setError(err instanceof Error ? err.message : `An error occurred while deleting the ${itemType}`);
      setIsDeleting(false);
    }
  };

  /**
   * The consequence, always ending in the same sentence.
   *
   * Callers describe the blast radius -- who loses what -- because only they
   * know it. This appends "This cannot be undone" when they have not said it,
   * so the last line of a destructive confirmation is never left to chance.
   */
  const blastRadius =
    message ||
    `${itemName ? `“${itemName}”` : `This ${itemType}`} is removed for everyone.`;
  const confirmationMessage = /cannot be undone/i.test(blastRadius)
    ? blastRadius
    : `${blastRadius.replace(/\s*$/, "")} This cannot be undone.`;

  /** The button says the verb, never "OK" or a bare "Delete". */
  const confirmLabel = `Delete ${itemType}`;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={itemName ? `Delete “${itemName}”?` : `Delete ${itemType}?`}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {/* The title already names the object and asks the question, so a
            second "Confirm Deletion" heading underneath it said nothing the
            reader had not just read. One title, one sentence of consequence. */}
        <Typography color="secondary">{confirmationMessage}</Typography>
        
        {error && (
          <div className="p-4 rounded-md note">
            <Typography color="error">{error}</Typography>
          </div>
        )}
        
        <div className="flex justify-end gap-4 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleConfirm}
            isLoading={isDeleting}
            className="button-danger min-h-[2.75rem]"
            startIcon={<Trash2 size={16} />}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;