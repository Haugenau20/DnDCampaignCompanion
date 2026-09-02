// src/features/user-management/profiles/components/DangerZoneCard.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Card from "core/components/Card";
import { LogOut, Trash2 } from "lucide-react";
import LeaveGroupDialog from "./LeaveGroupDialog";
import DeleteAccountDialog from "./DeleteAccountDialog";
import { useGroups } from "../../groups/hooks/useGroups";
import { useGroupFootprint, GroupFootprint } from "../hooks/useGroupFootprint";

/**
 * Joins clause strings with normal list grammar: `"A"`, `"A and B"`, or
 * `"A, B and C"`.
 */
function joinClauses(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * The "what leaving costs" sentence, built from whichever of the three
 * footprint counts resolved. A count that is `null` -- still loading, or
 * its query rejected -- is dropped rather than guessed at; if none
 * resolved, only the reassurance half of the sentence survives.
 */
function buildLeaveSentence(footprint: GroupFootprint, groupCount: number | null): string {
  const clauses: string[] = [];

  if (footprint.campaigns !== null) {
    clauses.push(`${footprint.campaigns} campaign${footprint.campaigns === 1 ? "" : "s"}`);
  }
  if (footprint.chapters !== null) {
    clauses.push(`${footprint.chapters} chapter${footprint.chapters === 1 ? "" : "s"}`);
  }
  if (footprint.notes !== null) {
    clauses.push(`${footprint.notes} of your own notes`);
  }

  // The reassurance half has to survive any number of memberships. The mock
  // says "your other group" because its user has exactly two; saying that to
  // someone leaving their only group would be false, and to someone in four
  // it would be wrong about the rest.
  const staysPut =
    groupCount === null
      ? "Your account and any other groups you're in stay as they are."
      : groupCount <= 1
        ? "Your account stays as it is."
        : groupCount === 2
          ? "Your account and your other group stay as they are."
          : "Your account and your other groups stay as they are.";

  if (clauses.length === 0) {
    return staysPut;
  }

  return `You lose access to ${joinClauses(clauses)} in this group. ${staysPut}`;
}

/**
 * The "what deleting the account costs" sentence. Phrased from the real
 * number of groups the user belongs to where that count is known; otherwise
 * falls back to wording that stays true for any number.
 */
function buildDeleteSentence(groupCount: number | null): string {
  const groupsClause =
    groupCount !== null
      ? `all ${groupCount} group${groupCount === 1 ? "" : "s"} you're in`
      : "every group you're in";

  return (
    `Removes you from ${groupsClause} and deletes every profile, character and note you own. ` +
    "Permanent. You'll be asked to type your email to confirm."
  );
}

/**
 * The two destructive actions on the profile page -- leaving the active
 * group and deleting the account -- each stating what it actually affects
 * before its button, so the two are never mistaken for equivalent choices.
 *
 * Counts come from {@link useGroupFootprint} and are fetched as soon as this
 * card mounts; each is optional and simply omitted from the sentence when
 * it has not resolved. This card has no `Close` button: that control
 * existed only because `UserProfile` could be mounted inside a dialog,
 * which this page composition never does.
 */
const DangerZoneCard: React.FC = () => {
  const { activeGroup, groups } = useGroups();
  const footprint = useGroupFootprint(activeGroup?.id ?? null);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const groupName = activeGroup?.name ?? "this group";
  const groupCount = groups ? groups.length : null;

  return (
    <div className="rounded-lg" style={{ border: "2px solid var(--status-failed)" }}>
      <Card>
        <Card.Content className="space-y-6">
          <div>
            <Typography id="danger-heading" variant="h4" color="error">
              Leaving and deleting
            </Typography>
            <Typography color="secondary" className="mt-1">
              Two different scopes. Read the line, not the button.
            </Typography>
          </div>

          <div className="space-y-2">
            <Typography className="font-semibold">Leave {groupName}</Typography>
            <Typography color="secondary">{buildLeaveSentence(footprint, groupCount)}</Typography>
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
              --status-failed / --status-text are the error pair that is solid
              in all three themes. `.error-bg` is transparent in all three too,
              so the tinted ground comes from bg-secondary. */}
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
