// components/shared/DeleteConfirmationDialog.tsx
import React, { useState } from 'react';
import Dialog from '../core/Dialog';
import Typography from '../core/Typography';
import Button from '../core/Button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';

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
  const { theme } = useTheme();
  const themePrefix = theme.name;
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

  const confirmationMessage = message || 
    `Are you sure you want to delete ${itemType} "${itemName}"? This action cannot be undone.`;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={`Delete ${itemType}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className={clsx("p-2 rounded-full mt-1", `${themePrefix}-error-bg`)}>
            <AlertTriangle className={clsx("w-5 h-5", `${themePrefix}-status-warning`)} />
          </div>
          <div>
            <Typography variant="h4" className="mb-2">
              Confirm Deletion
            </Typography>
            <Typography color="secondary">
              {confirmationMessage}
            </Typography>
          </div>
        </div>
        
        {error && (
          <div className={clsx("p-4 rounded-md", `${themePrefix}-note`)}>
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
            onClick={handleConfirm}
            isLoading={isDeleting}
            className={clsx(`${themePrefix}-button-danger`)}
            startIcon={<Trash2 size={16} />}
          >
            Delete
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;