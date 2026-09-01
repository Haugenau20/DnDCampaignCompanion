// src/shared/components/context-switcher/useGroupSummaries.ts
import { useEffect, useState } from "react";
import firebaseServices from "core/services/firebase";

/**
 * What a group row says about itself, beyond its name.
 */
export interface GroupSummary {
  /** Campaigns in the group. */
  campaignCount: number;
  /** People in the group. */
  memberCount: number;
  /** Whether the current user is an admin of it. */
  isAdmin: boolean;
  /** When the current user joined it, or null if unknown. */
  joinedAt: Date | string | null;
}

/**
 * Describe each group the user belongs to.
 *
 * Both lookups already exist and both are permitted to any member of the group
 * -- `getGroupUsers` checks membership, not admin, despite its doc comment.
 * The user list carries the member count, the caller's role and the caller's
 * join date in one pass, so three of the four fields cost nothing beyond it.
 *
 * Fires only when `enabled` (the group step is showing), so the common case --
 * a user who never changes group -- pays nothing.
 *
 * @param groupIds Groups to describe
 * @param enabled Whether to fetch at all
 * @returns Summaries by group id; a missing key means "not known"
 */
export function useGroupSummaries(
  groupIds: string[],
  enabled: boolean
): Record<string, GroupSummary> {
  const [summaries, setSummaries] = useState<Record<string, GroupSummary>>({});

  const key = groupIds.join(",");

  useEffect(() => {
    if (!enabled || !key) return;

    let cancelled = false;
    const userId = firebaseServices.auth.getCurrentUserId();

    key.split(",").forEach((groupId) => {
      Promise.all([
        firebaseServices.campaign.getCampaigns(groupId),
        firebaseServices.group.getGroupUsers(groupId)
      ])
        .then(([campaigns, users]) => {
          if (cancelled) return;
          const me = users.find((u: any) => (u.userId ?? u.id) === userId);

          setSummaries((previous) => ({
            ...previous,
            [groupId]: {
              campaignCount: campaigns.length,
              memberCount: users.length,
              isAdmin: me?.role?.toLowerCase() === "admin",
              joinedAt: me?.joinedAt ?? null
            }
          }));
        })
        .catch(() => {
          // Leave the key absent: the row renders without a second line.
        });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  return summaries;
}
