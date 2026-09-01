// src/shared/components/context-switcher/CampaignStep.tsx
import React from "react";
import { useGroups, useCampaigns } from "features/user-management";
import { useStory } from "features/storytelling";
import { useNPCs } from "features/campaign-entities";
import Typography from "core/components/Typography";
import { BookOpen, Check, ChevronRight, PlusCircle } from "lucide-react";
import clsx from "clsx";
import { useCampaignCounts } from "./useCampaignCounts";

/**
 * Props for {@link CampaignStep}.
 */
interface CampaignStepProps {
  /** Switch to a campaign. */
  onSelectCampaign: (campaignId: string) => void;
  /** Show the group step. */
  onChangeGroup: () => void;
  /** Open the join-a-group dialog. */
  onJoinGroup: () => void;
}

/**
 * The switcher's first and usual step.
 *
 * Campaigns lead and the group is a header row, because one group holds
 * several campaigns and the group rarely changes -- two equal-weight stacked
 * lists gave the rare choice the same prominence as the common one.
 */
const CampaignStep: React.FC<CampaignStepProps> = ({
  onSelectCampaign,
  onChangeGroup,
  onJoinGroup
}) => {
  const { activeGroup, activeGroupId } = useGroups();
  const { campaigns, activeCampaignId } = useCampaigns();
  const { chapters, storyProgress } = useStory();
  const { npcs } = useNPCs();

  // The active campaign's numbers are already loaded; only the others cost a
  // query, and only while this step is on screen.
  const otherIds = campaigns
    .filter((campaign) => campaign.id !== activeCampaignId)
    .map((campaign) => campaign.id);
  const counts = useCampaignCounts(activeGroupId, otherIds, true);

  /**
   * The second line of a campaign row.
   *
   * Returns null when nothing is known, and the row then shows its name alone
   * -- there is no per-campaign "last opened" anywhere in the data model, so
   * there is nothing to fall back to and nothing worth inventing.
   */
  const describe = (campaignId: string): string | null => {
    if (campaignId === activeCampaignId) {
      const current = chapters.find((c) => c.id === storyProgress.currentChapter);
      const parts = [
        `${chapters.length} chapters`,
        `${npcs.length} NPCs`
      ];
      if (current) parts.push(`you're on chapter ${current.order}`);
      return parts.join(" · ");
    }

    const known = counts[campaignId];
    if (!known) return null;
    return `${known.chapters} chapters · ${known.npcs} NPCs`;
  };

  return (
    <div role="none">
      {/* Group header -- pure layout wrapper around a single menuitem, so it
          carries role="none" rather than participating in the menu tree. */}
      <div role="none" className="flex items-center justify-between px-4 py-3 bg-secondary border-b card-divider">
        <div className="min-w-0">
          <Typography variant="caption" color="muted" className="uppercase tracking-wide">
            Group
          </Typography>
          <Typography className="truncate font-semibold">
            {activeGroup ? activeGroup.name : "No group"}
          </Typography>
        </div>
        <button
          type="button"
          role="menuitem"
          onClick={onChangeGroup}
          className="flex items-center gap-1 font-semibold primary shrink-0"
        >
          Change
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Campaigns */}
      <div role="none" className="p-2">
        <Typography
          variant="caption"
          color="muted"
          className="px-3 py-1 uppercase tracking-wide"
        >
          Campaigns in this group
        </Typography>

        <div role="group" aria-label="Campaigns in this group" className="mt-1 max-h-64 overflow-y-auto">
          {campaigns.length > 0 ? (
            campaigns.map((campaign) => {
              const isActive = campaign.id === activeCampaignId;
              const summary = describe(campaign.id);

              return (
                <button
                  key={campaign.id}
                  type="button"
                  role="menuitem"
                  onClick={() => onSelectCampaign(campaign.id)}
                  className={clsx(
                    "flex items-center justify-between gap-3 px-3 py-2 w-full text-left rounded-md",
                    isActive ? "dropdown-item-active" : "dropdown-item"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <Typography className="truncate font-semibold">
                        {campaign.name}
                      </Typography>
                      {summary && (
                        <Typography variant="body-sm" color="secondary" className="truncate">
                          {summary}
                        </Typography>
                      )}
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2">
              <Typography color="secondary">No campaigns in this group</Typography>
            </div>
          )}
        </div>
      </div>

      {/* Joining a group is not one of the choices above it */}
      <div className="mx-4 border-t card-divider" />
      <button
        type="button"
        role="menuitem"
        onClick={onJoinGroup}
        className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-md dropdown-item"
      >
        <PlusCircle className="w-4 h-4 flex-shrink-0" />
        <Typography variant="body-sm">Join a group with an invite code</Typography>
      </button>
    </div>
  );
};

export default CampaignStep;
