// src/features/user-management/profiles/components/GroupMembershipCard.tsx
import React from "react";
import { useGroups } from "../../groups/hooks/useGroups";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import UsernameEditor from "./UsernameEditor";

/**
 * Group-scoped section of the profile page: the active group's name, the
 * inline username editor for this membership, and the member's role.
 *
 * A behaviour-preserving extraction of the "Current Group" / "Username in
 * this Group" / "Role in this Group" blocks that used to sit inline in
 * `UserProfile.tsx`. Scope copy (a role pill, an other-group caveat) arrives
 * in a later change.
 */
const GroupMembershipCard: React.FC = () => {
  const { activeGroup, activeGroupUserProfile } = useGroups();

  return (
    <Card>
      <Card.Content className="space-y-6">
        <div className="space-y-1">
          <Typography variant="body-sm" color="secondary">Current Group</Typography>
          <Typography id="group-heading" variant="h4">{activeGroup?.name}</Typography>
        </div>

        <UsernameEditor />

        <div className="space-y-1">
          <Typography variant="body-sm" color="secondary">Role in this Group</Typography>
          <Typography color="default">
            {activeGroupUserProfile?.role === "admin" ? "Administrator" : "Member"}
          </Typography>
        </div>
      </Card.Content>
    </Card>
  );
};

export default GroupMembershipCard;
