// src/features/user-management/profiles/components/DeleteAccountDialog.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Dialog from "core/components/Dialog";
import { Trash2, AlertCircle } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import firebaseServices from "core/services/firebase";

interface DeleteAccountDialogProps {
  /** Whether the confirmation dialog is open. */
  open: boolean;
  /** Closes the dialog without deleting the account. */
  onClose: () => void;
}

/**
 * Confirmation dialog for permanently deleting the signed-in account.
 *
 * A behaviour-preserving extraction of the account-deletion dialog that used
 * to be nested inside `UserProfile.tsx`, over the same
 * `firebaseServices.user.deleteAccount` call (already regioned correctly).
 * A typed-email confirmation gate arrives in a later change.
 */
const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({ open, onClose }) => {
  const { user, signOut } = useAuth();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!user || deleting) return;

    try {
      setDeleting(true);
      setError(null);

      await firebaseServices.user.deleteAccount(user.uid);

      onClose();

      await signOut();

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Confirm Account Deletion" maxWidth="max-w-md">
      <div className="space-y-4">
        <Typography>Are you sure you want to permanently delete your account?</Typography>
        <Typography color="error">This will:</Typography>
        <ul className="list-disc pl-5 space-y-1 typography">
          <li>Remove your access to all groups</li>
          <li>Delete all your user profiles and settings</li>
          <li>This action is permanent and cannot be undone</li>
        </ul>
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            color="error"
            onClick={handleConfirm}
            isLoading={deleting}
            startIcon={<Trash2 size={16} />}
          >
            Delete My Account
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 form-error">
            <AlertCircle size={16} />
            <Typography color="error">{error}</Typography>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default DeleteAccountDialog;
