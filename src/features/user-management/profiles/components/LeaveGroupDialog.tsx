// src/features/user-management/profiles/components/LeaveGroupDialog.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
 * On confirm, this awaits the group-leave service call, then awaits
 * `refreshGroups()`, then navigates home -- in that order. The earlier
 * version closed the dialog and started a hard `window.location.href`
 * navigation immediately after firing the request, discarding the awaited
 * refresh one line after awaiting it and throwing away the whole SPA in the
 * process. Navigating only after both the service call and the refresh have
 * completed is what makes the landing page correct without a reload.
 */
const LeaveGroupDialog: React.FC<LeaveGroupDialogProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { activeGroup, refreshGroups } = useGroups();
  const navigate = useNavigate();

  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!user || !activeGroup || leaving) return;

    try {
      setLeaving(true);
      setError(null);

      await firebaseServices.group.removeUserFromGroup(activeGroup.id, user.uid);

      if (refreshGroups) {
        await refreshGroups();
      }

      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
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
