// src/core/services/firebase/data/campaignCollectionPath.ts

/**
 * The full path of a campaign-scoped collection, or `null` when there is no
 * campaign to scope it to -- signed out, or no group or campaign selected.
 *
 * A listener needs an explicit path (see
 * `DocumentService.subscribeToCollection`), and `null` is what
 * `useFirebaseData`'s `subscribeTo` takes for "nothing to listen to yet".
 *
 * @param signedIn Whether a user is signed in
 * @param groupId The active group's id
 * @param campaignId The active campaign's id
 * @param collectionName The collection inside the campaign, e.g. `npcs`
 */
export const campaignCollectionPath = (
  signedIn: boolean,
  groupId: string | null | undefined,
  campaignId: string | null | undefined,
  collectionName: string
): string | null =>
  signedIn && groupId && campaignId
    ? `groups/${groupId}/campaigns/${campaignId}/${collectionName}`
    : null;
