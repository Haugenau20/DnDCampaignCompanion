// src/features/user-management/profiles/components/LeaveGroupDialog.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Dialog from "core/components/Dialog";
import { LogOut, AlertCircle } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import firebaseServices from "core/services/firebase";

interface LeaveGroupDialogProps {
  /** Whether the confirmation dialog is open. */
  open: boolean;
  /** Closes the dialog without leaving the group. */
  onClose: () => void;
}

/**
 * Confirmation dialog for leaving the active group.
 *
 * A behaviour-preserving extraction of the group-leave dialog that used to
 * be nested inside `UserProfile.tsx`, over the same
 * `firebaseServices.group.removeUserFromGroup` call (already regioned
 * correctly). The `refreshGroups()` / `window.location.href` sequence is
 * unchanged here -- a later change replaces it with a proper navigation.
 */
const LeaveGroupDialog: React.FC<LeaveGroupDialogProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { activeGroup, refreshGroups } = useGroups();

  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!user || !activeGroup || leaving) return;

    try {
      setLeaving(true);
      setError(null);

      await firebaseServices.group.removeUserFromGroup(activeGroup.id, user.uid);

      onClose();

      if (refreshGroups) {
        await refreshGroups();
      }

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Confirm Group Leave" maxWidth="max-w-md">
      <div className="space-y-4">
        <Typography>
          Are you sure you want to leave the group <strong>{activeGroup?.name}</strong>?
        </Typography>
        <Typography color="error">
          Leaving this group will remove your access to all content within it. You can rejoin
          later if you have an invitation.
        </Typography>
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={leaving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            color="error"
            onClick={handleConfirm}
            isLoading={leaving}
            startIcon={<LogOut size={16} />}
          >
            Leave Group
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

export default LeaveGroupDialog;
