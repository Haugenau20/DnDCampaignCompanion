// src/shared/components/gated/useSelectableCampaigns.ts
import { useEffect, useMemo, useState } from "react";
import { useGroups } from "features/user-management";
import firebaseServices from "core/services/firebase";
import type { CampaignOption } from "./types";

/** What {@link useSelectableCampaigns} returns. */
export interface SelectableCampaigns {
  /** Every campaign the user could switch to, sorted by group then name. */
  options: CampaignOption[];
  /** True while any group's campaigns are still in flight. */
  loading: boolean;
}

/** The two fields a row needs, kept per group id while fetching. */
type FetchedCampaign = { id: string; name: string };

/**
 * Every campaign the signed-in user could switch to, across all their groups.
 *
 * `useCampaigns()` only holds the *active* group's campaigns, which is exactly
 * the wrong list here: the page is in this state because no campaign — and
 * possibly no group — is active. Offering only the active group's campaigns
 * would show an empty panel to someone who does have campaigns, just elsewhere.
 *
 * Follows `useGroupSummaries`' shape deliberately, including its failure
 * policy: a group whose fetch rejects contributes no rows rather than failing
 * the list, because one group's permissions problem must not blank a list the
 * user can still act on.
 *
 * @param enabled Whether to fetch at all — true only while the pick-campaign
 *   panel is actually showing, so the pages that never reach it pay nothing
 * @returns The merged options and whether they are still arriving
 */
export function useSelectableCampaigns(enabled: boolean): SelectableCampaigns {
  const { groups } = useGroups();
  const [byGroup, setByGroup] = useState<Record<string, FetchedCampaign[]>>({});
  const [loading, setLoading] = useState(false);

  // Identity of `groups` changes on every render; the ids do not.
  const key = groups.map((group) => group.id).join(",");

  useEffect(() => {
    if (!enabled) {
      // Disabling mid-fetch must still let `loading` settle: the cleanup below
      // (from the previous, enabled run) already flips `cancelled`, so the
      // in-flight fetch's `.then` is a no-op. Without this, a consumer that
      // disables while a fetch is in flight — e.g. the user picks a campaign
      // before the list finishes loading — would see `loading` stuck `true`
      // forever, since nothing else would ever flip it back.
      setLoading(false);
      return;
    }

    if (!key) {
      setByGroup({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      key.split(",").map((groupId) =>
        firebaseServices.campaign
          .getCampaigns(groupId)
          .then((campaigns: FetchedCampaign[]) => ({ groupId, campaigns }))
          .catch(() => ({ groupId, campaigns: [] as FetchedCampaign[] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, FetchedCampaign[]> = {};
      results.forEach(({ groupId, campaigns }) => {
        next[groupId] = campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
        }));
      });
      setByGroup(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  // Group names are read here rather than captured in the effect, so a rename
  // between fetch and render shows the current name.
  const options = useMemo(() => {
    const rows: CampaignOption[] = [];
    groups.forEach((group) => {
      (byGroup[group.id] ?? []).forEach((campaign) => {
        rows.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          groupId: group.id,
          groupName: group.name,
        });
      });
    });

    return rows.sort(
      (a, b) =>
        a.groupName.localeCompare(b.groupName) ||
        a.campaignName.localeCompare(b.campaignName)
    );
  }, [groups, byGroup]);

  return { options, loading };
}

export default useSelectableCampaigns;
