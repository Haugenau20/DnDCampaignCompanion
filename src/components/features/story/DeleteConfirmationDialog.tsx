// components/features/story/DeleteConfirmationDialog.tsx
import React, { useState } from 'react';
import Dialog from '../../core/Dialog';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';

interface DeleteConfirmationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Title of the item being deleted */
  itemTitle: string;
  /** Type of item being deleted (e.g., 'chapter') */
  itemType: string;
  /** Callback when the deletion is confirmed */
  onConfirm: () => Promise<void>;
  /** Callback when the deletion is canceled */
  onCancel: () => void;
}

/**
 * A dialog for confirming deletion of content
 */
const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  itemTitle,
  itemType,
  onConfirm,
  onCancel
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
      // Don't need to close the dialog here, the parent component will handle that
    } catch (err) {
      console.error(`Error deleting ${itemType}:`, err);
      setError(err instanceof Error ? err.message : `An error occurred while deleting the ${itemType}`);
      setIsDeleting(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onCancel}
      title={`Delete ${itemType}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className={clsx("p-2 rounded-full", `${themePrefix}-error-bg`)}>
            <AlertTriangle className={clsx("w-6 h-6", `${themePrefix}-status-failed`)} />
          </div>
          <Typography variant="h4">Confirm Deletion</Typography>
        </div>
        
        <Typography>
          Are you sure you want to delete <strong>{itemTitle}</strong>? This action cannot be undone.
        </Typography>
        
        {error && (
          <div className={clsx("p-4 rounded-md", `${themePrefix}-note`)}>
            <Typography color="error">{error}</Typography>
          </div>
        )}
        
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleConfirm}
            isLoading={isDeleting}
            className={clsx(`${themePrefix}-delete-button`)}
            startIcon={<Trash2 />}
          >
            Delete {itemType}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;