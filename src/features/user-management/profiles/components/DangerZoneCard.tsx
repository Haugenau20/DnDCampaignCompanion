// src/features/user-management/profiles/components/DangerZoneCard.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Card from "core/components/Card";
import { LogOut, Trash2 } from "lucide-react";
import LeaveGroupDialog from "./LeaveGroupDialog";
import DeleteAccountDialog from "./DeleteAccountDialog";
import { useGroups } from "../../groups/hooks/useGroups";
import { useCampaigns } from "../../groups/hooks/useCampaigns";

/**
 * What leaving this group costs, in terms of access rather than destruction:
 * leaving removes your access, it does not delete the group's content for
 * anyone else.
 *
 * Only the campaign count is quoted. Counting chapters and notes as well was
 * both noisier to read and more expensive to produce -- it needed a
 * per-campaign fan-out of count queries -- without changing the decision the
 * sentence exists to inform.
 *
 * @param campaignCount Campaigns in the group, or null while unknown
 */
function buildLeaveSentence(campaignCount: number | null): string {
  const scope =
    campaignCount === null
      ? "this group"
      : `${campaignCount} campaign${campaignCount === 1 ? "" : "s"} in this group`;

  return `You'll lose access to ${scope}. Your account stays as it is.`;
}

/**
 * What deleting the account costs. Phrased from the real number of
 * memberships where it is known, and as access lost rather than an inventory
 * of everything destroyed.
 *
 * @param groupCount Groups the user belongs to, or null while unknown
 */
function buildDeleteSentence(groupCount: number | null): string {
  const scope =
    groupCount === null
      ? "every group you're in"
      : `${groupCount} group${groupCount === 1 ? "" : "s"}`;

  return `You'll lose access to ${scope} and everything in them. This can't be undone.`;
}

/**
 * The two destructive actions on the profile page -- leaving the active
 * group and deleting the account -- each saying what it affects before its
 * button, so the two are never mistaken for equivalent choices.
 *
 * Both counts come from context the page already holds, so this card issues
 * no queries of its own. This card has no `Close` button: that control
 * existed only because `UserProfile` could be mounted inside a dialog, which
 * this page composition never does.
 */
const DangerZoneCard: React.FC = () => {
  const { activeGroup, groups } = useGroups();
  const { campaigns } = useCampaigns();

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const groupName = activeGroup?.name ?? "this group";
  const groupCount = groups ? groups.length : null;
  const campaignCount = campaigns ? campaigns.length : null;

  return (
    <div className="rounded-lg" style={{ border: "2px solid var(--status-failed)" }}>
      <Card>
        <Card.Content className="space-y-6">
          <Typography id="danger-heading" variant="h4" color="error">
            Leaving and deleting
          </Typography>

          <div className="space-y-2">
            <Typography className="font-semibold">Leave {groupName}</Typography>
            <Typography color="secondary">{buildLeaveSentence(campaignCount)}</Typography>
            <Button
              variant="outline"
              className="typography-error w-full"
              onClick={() => setShowLeaveDialog(true)}
              startIcon={<LogOut size={16} />}
            >
              Leave group
            </Button>
          </div>

          {/* The heavier of the two, and it has to look it. `.delete-button`
              is the app's QUIET delete affordance -- every theme sets
              --delete-button-bg to transparent -- so it renders lighter than
              the outlined Leave button beside it, inverting the hierarchy.
              `.button-danger` is the filled error pair. `.error-bg` is
              transparent in all three themes, so the tint comes from
              bg-secondary. */}
          <div className="space-y-2 bg-secondary rounded-lg p-3">
            <Typography className="font-semibold">Delete your account</Typography>
            <Typography color="secondary">{buildDeleteSentence(groupCount)}</Typography>
            <Button
              variant="ghost"
              className="button-danger w-full"
              onClick={() => setShowDeleteDialog(true)}
              startIcon={<Trash2 size={16} />}
            >
              Delete account
            </Button>
          </div>
        </Card.Content>

        <LeaveGroupDialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)} />
        <DeleteAccountDialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} />
      </Card>
    </div>
  );
};

export default DangerZoneCard;
