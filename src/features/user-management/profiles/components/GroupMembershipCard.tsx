// src/features/user-management/profiles/components/GroupMembershipCard.tsx
import React from "react";
import { useGroups } from "../../groups/hooks/useGroups";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import { Star } from "lucide-react";
import UsernameEditor from "./UsernameEditor";

/**
 * Group-scoped section of the profile page: the active group's name and
 * role, the inline username editor for this membership, and a display-only
 * "Posting as" row for the active character.
 *
 * Everything on this card is scoped to the active membership only -- the
 * heading names the group it applies to, the role pill beside it and the
 * subtitle both say so, and the other membership the account may also hold
 * is left entirely alone: editing it means switching to it first.
 */
const GroupMembershipCard: React.FC = () => {
  const { activeGroup, activeGroupUserProfile } = useGroups();

  const isAdmin = activeGroupUserProfile?.role === "admin";
  const characters = activeGroupUserProfile?.characters ?? [];
  const activeCharacterId = activeGroupUserProfile?.activeCharacterId ?? null;
  const activeCharacter = characters.find((character) => character.id === activeCharacterId);

  return (
    <Card>
      <Card.Content className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Typography id="group-heading" variant="h4">{activeGroup?.name}</Typography>
            <span className="tag px-2 py-0.5 rounded-full text-xs font-medium typography">
              {isAdmin ? "Administrator" : "Member"}
            </span>
          </div>
        </div>

        <UsernameEditor />

        <div className="space-y-1">
          <Typography variant="body-sm" color="secondary">Posting as</Typography>
          {activeCharacter ? (
            <div className="flex items-center gap-2">
              <Star size={16} className="accent" />
              <Typography>{activeCharacter.name}</Typography>
              <Typography variant="body-sm" color="muted">
                — new chapters, quests and rumours are credited to this name
              </Typography>
            </div>
          ) : (
            <Typography color="secondary">
              No active character selected. Actions will use your username.
            </Typography>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default GroupMembershipCard;
