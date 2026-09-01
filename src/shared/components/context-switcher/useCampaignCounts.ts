// src/shared/components/context-switcher/useCampaignCounts.ts
import { useEffect, useState } from "react";
import firebaseServices from "core/services/firebase";
import type { CampaignCounts } from "core/services/firebase/campaign/CampaignService";

/**
 * Chapter and NPC counts for campaigns the user is not currently in.
 *
 * Two campaigns with only their names on screen are indistinguishable, and the
 * name is all the data model holds. These counts are what make a row mean
 * something -- but they are decoration, so a failure omits one row's second
 * line rather than breaking the list.
 *
 * Fires only when `enabled` (the popover is open), so a header that is never
 * opened costs nothing.
 *
 * @param groupId The group the campaigns belong to
 * @param campaignIds Campaigns to describe -- exclude the active one, whose
 *   numbers are already in context for free
 * @param enabled Whether to fetch at all
 * @returns Counts by campaign id; a missing key means "not known"
 */
export function useCampaignCounts(
  groupId: string | null,
  campaignIds: string[],
  enabled: boolean
): Record<string, CampaignCounts> {
  const [counts, setCounts] = useState<Record<string, CampaignCounts>>({});

  // Identity of the array changes on every render; its contents do not.
  const key = campaignIds.join(",");

  useEffect(() => {
    if (!enabled || !groupId || !key) return;

    let cancelled = false;

    key.split(",").forEach((campaignId) => {
      firebaseServices.campaign
        .getCampaignCounts(groupId, campaignId)
        .then((result) => {
          if (cancelled) return;
          setCounts((previous) => ({ ...previous, [campaignId]: result }));
        })
        .catch(() => {
          // Leave the key absent: the row renders without a second line.
        });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, groupId, key]);

  return counts;
}
