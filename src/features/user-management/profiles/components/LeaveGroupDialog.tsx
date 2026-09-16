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
    <Dialog open={open} onClose={onClose} title={activeGroup?.name ? `Leave “${activeGroup.name}”?` : "Leave this group?"} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* The title asks; this says what happens. Body ink, not red: the
            fill is spent on the confirm button and nowhere else. */}
        <Typography color="secondary">
          You lose access to everything recorded in it, and what you have
          written stays for the others. You can rejoin later only with a new
          invitation. This cannot be undone from here.
        </Typography>
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={leaving}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={handleConfirm}
            isLoading={leaving}
            className="button-danger min-h-[2.75rem]"
            startIcon={<LogOut size={16} />}
          >
            Leave group
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
