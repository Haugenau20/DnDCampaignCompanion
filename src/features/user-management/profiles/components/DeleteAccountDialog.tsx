// src/features/user-management/profiles/components/DeleteAccountDialog.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Dialog from "core/components/Dialog";
import Input from "core/components/Input";
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
 * The confirm button stays disabled until the typed text matches the
 * account's own email, compared case-insensitively after trimming -- the
 * email is already on screen in the account card above, so this is a speed
 * bump against a stray click, not a memory test. On success this awaits the
 * delete-account service call, then awaits `signOut()`, then navigates
 * home, in that order.
 */
const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({ open, onClose }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  // Start clean each time the dialog is reopened.
  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setError(null);
    }
  }, [open]);

  const accountEmail = user?.email ?? "";
  const isConfirmed =
    accountEmail !== "" && confirmText.trim().toLowerCase() === accountEmail.trim().toLowerCase();

  const handleConfirm = async () => {
    if (!user || deleting || !isConfirmed) return;

    try {
      setDeleting(true);
      setError(null);

      await firebaseServices.user.deleteAccount(user.uid);
      await signOut();

      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
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
        <Input
          label={`Type ${accountEmail} to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={accountEmail}
          disabled={deleting}
        />
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            color="error"
            onClick={handleConfirm}
            isLoading={deleting}
            disabled={!isConfirmed}
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
