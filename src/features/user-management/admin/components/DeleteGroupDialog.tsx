// src/features/user-management/admin/components/DeleteGroupDialog.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Dialog from "core/components/Dialog";
import Input from "core/components/Input";
import { Trash2, AlertCircle } from "lucide-react";
import { useGroups } from "../../groups/hooks/useGroups";
import firebaseServices from "core/services/firebase";

interface DeleteGroupDialogProps {
  /** Whether the confirmation dialog is open. */
  open: boolean;
  /** Closes the dialog without deleting the group. */
  onClose: () => void;
}

/**
 * Confirmation dialog for deleting the active group, for everyone (T037).
 *
 * The confirm button stays disabled until the group's name is typed,
 * compared case-insensitively after trimming, as `DeleteAccountDialog` does
 * with the email. On success it awaits the deletion, then `refreshGroups()`,
 * then navigates home -- the order `LeaveGroupDialog` keeps, for the same
 * reason: the landing page must already know the group is gone.
 */
const DeleteGroupDialog: React.FC<DeleteGroupDialogProps> = ({ open, onClose }) => {
  const { activeGroup, refreshGroups } = useGroups();
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

  const groupName = activeGroup?.name ?? "";
  const isConfirmed =
    groupName !== "" && confirmText.trim().toLowerCase() === groupName.trim().toLowerCase();

  const handleConfirm = async () => {
    if (!activeGroup || deleting || !isConfirmed) return;

    try {
      setDeleting(true);
      setError(null);

      await firebaseServices.group.deleteGroup(activeGroup.id);

      if (refreshGroups) {
        await refreshGroups();
      }

      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete the group");
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={groupName ? `Delete “${groupName}”?` : "Delete this group?"}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Body ink, not red. The fill is spent on the confirm button. */}
        <Typography color="secondary">
          This deletes the group for every member: every campaign in it, with
          everything recorded there, every member&apos;s notes, and its
          pictures. Members keep their accounts and any other groups. This
          cannot be undone.
        </Typography>
        <Input
          label={`Type ${groupName} to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={groupName}
          disabled={deleting}
        />
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={handleConfirm}
            isLoading={deleting}
            disabled={!isConfirmed}
            className="button-danger min-h-[2.75rem]"
            startIcon={<Trash2 size={16} />}
          >
            Delete group
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

export default DeleteGroupDialog;
