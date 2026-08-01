// src/shared/hooks/useCampaignContextStatus.ts
import { useMemo } from 'react';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';

/**
 * Which piece of context is missing once resolution has actually finished.
 * `null` while still resolving (see `isResolving` below) — it does not mean
 * "nothing is missing", it means "we don't know yet".
 */
export type MissingCampaignContext = 'group' | 'campaign' | null;

export interface CampaignContextStatus {
  /**
   * True while auth/group/campaign restoration is still in flight — i.e.
   * `activeGroupId`/`activeCampaignId` being `null` right now does not yet
   * mean the user has nothing selected, only that we haven't found out.
   * Sourced from `useAuth().loading`, which is `authLoading || profileLoading
   * || groupsLoading` in `FirebaseContext` and — critically — stays `true`
   * for the whole chain that restores `activeCampaignId` on a fresh page
   * load (auth rehydration -> profile -> groups -> campaigns), not just
   * until the user object appears.
   *
   * Deliberately NOT `useGroups().loading`: that flag is `!fullyLoaded`,
   * and `fullyLoaded`'s effect condition (`Array.isArray(groups) ||
   * activeGroupUserProfile`) is satisfied by the initial `groups` state
   * (`[]`, already an array) the moment `user` becomes truthy — see bug
   * #701 and `useGroups.test.tsx`'s "Array.isArray short-circuit" cases.
   * It flips to `false` well before groups or the campaign have actually
   * been fetched, so it cannot distinguish "resolving" from "resolved to
   * nothing" either. `useAuth().loading` is the one flag in this chain
   * that is still true for the entire restore.
   */
  isResolving: boolean;
  /** True once resolved AND both a group and a campaign are selected. */
  hasRequiredContext: boolean;
  /**
   * Which selection is missing, but only once resolution has completed —
   * `null` while `isResolving` is true, so callers can't accidentally build
   * an error message out of a state that hasn't settled yet.
   */
  missingContext: MissingCampaignContext;
}

/**
 * Single source of truth for "is the group/campaign selection still
 * resolving, or has it settled on nothing?" — see bug #1413.
 *
 * All four campaign-entity contexts (and the campaign-entity data hooks
 * behind them), plus the storytelling saga hook, used to derive
 * `hasRequiredContext` identically from `!!activeGroupId &&
 * !!activeCampaignId`, with no notion of "still loading". On a fresh page
 * load both "nothing selected" and "not restored yet" look identical, so
 * every one of those places briefly rendered its "please select a
 * group/campaign" error while auth was still rehydrating.
 *
 * Consumers should gate their loading UI on `isResolving` (typically by
 * folding it into their own fetch-loading flag) and only render a "please
 * select..." error once `!isResolving && !hasRequiredContext`.
 */
export function useCampaignContextStatus(): CampaignContextStatus {
  // Coerced to a real boolean: `useAuth()` is mocked without a `loading` key
  // in several existing test suites, and callers fold this into their own
  // `loading` flag with `||` -- `false || undefined` is `undefined`, not
  // `false`, which would leak a non-boolean out of a `boolean`-typed field.
  const { loading: rawIsResolving } = useAuth();
  const isResolving = !!rawIsResolving;
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

  return useMemo(() => {
    const missingContext: MissingCampaignContext = isResolving
      ? null
      : !activeGroupId
      ? 'group'
      : !activeCampaignId
      ? 'campaign'
      : null;

    return {
      isResolving,
      hasRequiredContext: !isResolving && !!activeGroupId && !!activeCampaignId,
      missingContext,
    };
  }, [isResolving, activeGroupId, activeCampaignId]);
}

export default useCampaignContextStatus;
