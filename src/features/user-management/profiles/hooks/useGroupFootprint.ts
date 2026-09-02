// src/features/user-management/profiles/hooks/useGroupFootprint.ts
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import firebaseServices from "core/services/firebase";

/**
 * The counts the "leaving this group" sentence needs. Each is `null` until
 * its own query resolves, and stays `null` forever if that query rejects --
 * a failed count is not an error state, it is simply a clause the sentence
 * drops.
 */
export interface GroupFootprint {
  /** Number of campaigns in the group, or `null` if not yet known. */
  campaigns: number | null;
  /** Chapters summed across every campaign in the group, or `null`. */
  chapters: number | null;
  /** The signed-in user's own notes in this group, or `null`. */
  notes: number | null;
}

const EMPTY_FOOTPRINT: GroupFootprint = { campaigns: null, chapters: null, notes: null };

/**
 * Fetches the three counts a leave-group confirmation needs to say what it
 * actually costs: how many campaigns and chapters become unreachable, and
 * how many of the signed-in user's own notes live in this group.
 *
 * Every count is fetched independently and is simply omitted (left `null`)
 * if its query has not resolved or rejects -- there is no aggregate error
 * state, following the precedent set by
 * `shared/components/context-switcher/useCampaignCounts`. The chapter count
 * fans out one `getCampaignCounts` call per campaign in the group, which is
 * affordable because groups here run two or three campaigns; if that ever
 * stops being true, the chapter clause is the first thing to drop, not a
 * reason to add a denormalised counter.
 *
 * @param groupId The group to describe, or `null` before one is known --
 *   nothing is fetched in that case.
 * @returns The three counts, each `null` until resolved.
 */
export function useGroupFootprint(groupId: string | null): GroupFootprint {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [footprint, setFootprint] = useState<GroupFootprint>(EMPTY_FOOTPRINT);

  useEffect(() => {
    setFootprint(EMPTY_FOOTPRINT);

    if (!groupId) {
      return;
    }

    let cancelled = false;

    firebaseServices.campaign
      .getCampaigns(groupId)
      .then((campaigns) => {
        if (cancelled) return;
        setFootprint((previous) => ({ ...previous, campaigns: campaigns.length }));

        Promise.all(
          campaigns.map((campaign) =>
            firebaseServices.campaign.getCampaignCounts(groupId, campaign.id)
          )
        )
          .then((counts) => {
            if (cancelled) return;
            const chapters = counts.reduce((total, count) => total + count.chapters, 0);
            setFootprint((previous) => ({ ...previous, chapters }));
          })
          .catch(() => {
            // Leave chapters null: the sentence drops the clause.
          });
      })
      .catch(() => {
        // Leave campaigns (and, therefore, chapters) null.
      });

    if (uid) {
      firebaseServices.document
        .getCollectionCount(`groups/${groupId}/users/${uid}/notes`)
        .then((notes) => {
          if (cancelled) return;
          setFootprint((previous) => ({ ...previous, notes }));
        })
        .catch(() => {
          // Leave notes null: the sentence drops the clause.
        });
    }

    return () => {
      cancelled = true;
    };
  }, [groupId, uid]);

  return footprint;
}
