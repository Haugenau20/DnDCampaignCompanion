// src/features/user-management/profiles/components/AccountCard.tsx
import React, { useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import { useJoinGroupCompletion } from "../../groups/hooks/useJoinGroupCompletion";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import Button from "core/components/Button";
import JoinGroupDialog from "../../groups/components/JoinGroupDialog";

/**
 * Account-scoped section of the profile page: the settings that apply to
 * the signed-in user everywhere, in every group they belong to.
 *
 * Shows the sign-in email and every group the user is a member of, and
 * hosts the "Join another" entrance onto {@link JoinGroupDialog}. A
 * successful join lands the user in the newly joined group through
 * {@link useJoinGroupCompletion} -- the same completion behaviour the
 * header's own "Join Group" entrance uses, so joining behaves identically
 * no matter which surface it is started from.
 */
const AccountCard: React.FC = () => {
  const { user } = useAuth();
  const { groups } = useGroups();
  const completeJoin = useJoinGroupCompletion();

  const [showJoinGroup, setShowJoinGroup] = useState(false);

  const groupNames = groups.map((group) => group.name).join(", ");

  const handleJoined = async () => {
    setShowJoinGroup(false);
    await completeJoin();
  };

  return (
    <Card>
      <Card.Content className="space-y-4">
        <div className="space-y-1">
          <Typography id="account-heading" variant="h4">Account</Typography>
          <Typography variant="body-sm" color="secondary">
            Applies everywhere, in every group.
          </Typography>
        </div>

        <div className="grid grid-cols-[170px_1fr_auto] items-center gap-x-3 gap-y-3">
          <Typography variant="body-sm" color="secondary">Email</Typography>
          <Typography>{user?.email}</Typography>
          <Typography variant="body-sm" color="muted">used to sign in</Typography>

          <Typography variant="body-sm" color="secondary">Groups you&apos;re in</Typography>
          <Typography>{groupNames}</Typography>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowJoinGroup(true)}
          >
            Join another
          </Button>
        </div>
      </Card.Content>

      <JoinGroupDialog
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onSuccess={handleJoined}
      />
    </Card>
  );
};

export default AccountCard;
