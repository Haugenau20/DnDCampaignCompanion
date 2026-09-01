// src/shared/components/context-switcher/GroupStep.tsx
import React from "react";
import { useGroups } from "features/user-management";
import Typography from "core/components/Typography";
import { ArrowLeft, Check, Users } from "lucide-react";
import clsx from "clsx";
import { useGroupSummaries } from "./useGroupSummaries";

/**
 * Props for {@link GroupStep}.
 */
interface GroupStepProps {
  /** Switch to a group. */
  onSelectGroup: (groupId: string) => void;
  /** Return to the campaign step. */
  onBack: () => void;
}

/**
 * Pluralise a count-noun pair the plain way English does it.
 */
function countNoun(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * The month a date fell in, or null if the date does not parse.
 *
 * `joinedAt` can arrive as a `Date`, an ISO string, or -- if a summary has not
 * resolved -- be entirely absent. An unparsable value must not render as the
 * literal string "Invalid Date", so this is the one place that guards it.
 */
function joinedMonth(joinedAt: Date | string | null): string | null {
  if (!joinedAt) return null;
  const date = new Date(joinedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { month: "long" });
}

/**
 * The switcher's second step: choosing a group.
 *
 * Reached only through `Change` on the campaign step, because the group
 * rarely changes -- this is the deliberate second click, not the default view.
 * Choosing a group here is a full switch, not a staged selection: it loads
 * that group's campaigns and activates the one the user last had open there.
 */
const GroupStep: React.FC<GroupStepProps> = ({ onSelectGroup, onBack }) => {
  const { groups, activeGroupId } = useGroups();

  const groupIds = groups.map((group) => group.id);
  const summaries = useGroupSummaries(groupIds, true);

  /**
   * The second line of a group row, or null when its summary has not
   * resolved -- the row then shows its name alone.
   */
  const describe = (groupId: string): string | null => {
    const summary = summaries[groupId];
    if (!summary) return null;

    const parts = [
      countNoun(summary.campaignCount, "campaign"),
      countNoun(summary.memberCount, "member")
    ];

    if (summary.isAdmin) {
      parts.push("you're an admin");
    } else {
      const month = joinedMonth(summary.joinedAt);
      if (month) parts.push(`joined in ${month}`);
    }

    return parts.join(" · ");
  };

  return (
    <div role="none">
      <button
        type="button"
        role="menuitem"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-3 w-full text-left border-b dropdown-item"
      >
        <ArrowLeft className="w-4 h-4 flex-shrink-0" />
        <Typography className="font-semibold">Choose a group</Typography>
      </button>

      <div role="group" aria-label="Choose a group" className="p-2 max-h-64 overflow-y-auto">
        {groups.map((group) => {
          const isActive = group.id === activeGroupId;
          const summary = describe(group.id);

          return (
            <button
              key={group.id}
              type="button"
              role="menuitem"
              onClick={() => onSelectGroup(group.id)}
              className={clsx(
                "flex items-center justify-between gap-3 px-3 py-2 w-full text-left rounded-md",
                isActive ? "dropdown-item-active" : "dropdown-item"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <Typography className="truncate font-semibold">
                    {group.name}
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
        })}
      </div>

      <div className="px-4 py-3">
        <Typography variant="body-sm" color="secondary">
          Choosing a group loads that group's campaigns and picks the one you
          last opened there.
        </Typography>
      </div>
    </div>
  );
};

export default GroupStep;
