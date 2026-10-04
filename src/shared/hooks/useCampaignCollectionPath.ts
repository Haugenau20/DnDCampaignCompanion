// src/shared/hooks/useCampaignCollectionPath.ts
import { campaignCollectionPath } from 'core/services/firebase/data/campaignCollectionPath';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';

/**
 * The full path of one of the active campaign's collections, as of this
 * render (`groups/g/campaigns/c/npcs`), or `null` while signed out or with no
 * group or campaign selected.
 *
 * Writes use it instead of the bare collection name. A bare name is resolved
 * against whatever campaign is active when the write finally runs, so an
 * operation that awaits anything first -- an image upload, a read, a batch's
 * earlier step -- followed a campaign switch into a same-id record of the
 * other campaign (T082). A function created during this render carries this
 * render's path for as long as it runs.
 *
 * @param collection The collection inside the campaign, e.g. `npcs`
 */
export function useCampaignCollectionPath(collection: string): string | null {
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  return campaignCollectionPath(Boolean(user), activeGroupId, activeCampaignId, collection);
}
