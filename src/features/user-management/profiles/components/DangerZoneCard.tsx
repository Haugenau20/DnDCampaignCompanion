// src/features/user-management/profiles/components/DangerZoneCard.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Card from "core/components/Card";
import { LogOut, Trash2 } from "lucide-react";
import LeaveGroupDialog from "./LeaveGroupDialog";
import DeleteAccountDialog from "./DeleteAccountDialog";

/**
 * The two destructive actions on the profile page -- leaving the active
 * group and deleting the account -- and the open state of their
 * confirmation dialogs.
 *
 * A behaviour-preserving extraction of the trailing "danger zone" block that
 * used to sit inline in `UserProfile.tsx`. This card has no `Close` button:
 * that control existed only because `UserProfile` could be mounted inside a
 * dialog, which this page composition never does. Sentences describing what
 * each action affects arrive in a later change.
 */
const DangerZoneCard: React.FC = () => {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <Card>
      <Card.Content className="space-y-6">
        <Typography id="danger-heading" variant="h4" color="error">
          Leaving and deleting
        </Typography>

        <div className="space-y-2">
          <Button
            variant="outline"
            color="error"
            onClick={() => setShowLeaveDialog(true)}
            startIcon={<LogOut size={16} />}
            className="w-full"
          >
            Leave Group
          </Button>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            color="error"
            onClick={() => setShowDeleteDialog(true)}
            startIcon={<Trash2 size={16} />}
            className="w-full"
          >
            Delete Account
          </Button>
        </div>
      </Card.Content>

      <LeaveGroupDialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)} />
      <DeleteAccountDialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} />
    </Card>
  );
};

export default DangerZoneCard;
