# Bug #1403 — Admin confirms campaign deletion and nothing happens

## Title
`CampaignManagementView` renders a Delete button, opens a confirmation dialog promising permanent
deletion, and on confirm runs `console.log` and closes. `CampaignService` has no delete method at all.

## Status
🔄 IN PROGRESS — 2026-07-29. Approach approved: server-side callable function using the Admin SDK's
`recursiveDelete`, plus explicit handling for the two things that live *outside* the campaign subtree.

## Category
CRUD

## Discovered In
Code reading during the 2026-07-29 session, then confirmed against the live emulator's data layout.
No test covers the confirm path — the three existing `campaign deletion` tests in
`CampaignManagementView.test.tsx:305-342` cover only dialog open, name display, and cancel. **None of
them asserts the no-op**, so no characterization test blocks the fix.

## Affected Files
- `src/features/user-management/admin/components/CampaignManagementView.tsx:131-135` (the no-op)
- `src/features/user-management/admin/components/CampaignManagementView.tsx:326-355` (the dialog)
- `src/core/services/firebase/campaign/CampaignService.ts` (no delete method exists)

## Description

```tsx
const handleConfirmDeleteCampaign = async () => {
  // TODO: Implement campaign deletion functionality
  console.log('Delete campaign:', confirmDeleteDialog.campaignId);
  setConfirmDeleteDialog({ isOpen: false, campaignId: '', campaignName: '' });
};
```

The dialog immediately above it tells the admin:

> This will permanently delete all campaign data including NPCs, locations, quests, and story
> chapters. This action cannot be undone.

Both sibling destructive operations in the same admin panel (`handleConfirmedUserDelete`,
`handleConfirmedTokenDelete`) are properly implemented, so this is an oversight rather than a
deliberate deferral.

### Why the naive fix is worse than the no-op

**Firestore does not delete subcollections with their parent document.** A plain `deleteDoc` on the
campaign would remove the campaign from every listing while permanently orphaning every entity
underneath it — unreachable through the app, still stored, still billed. That is strictly worse than
today's behaviour, where nothing happens but nothing breaks.

A campaign owns **seven** subcollections, confirmed against the emulator and the sample-data
generators:

`npcs`, `locations`, `quests`, `rumors`, `chapters`, `story-progress`, `saga`

The client Firestore SDK **cannot enumerate subcollections at all**, so any client-side cascade must
hardcode that list — and nothing will ever fail loudly when the list drifts from reality.

### Two things that are NOT under the campaign document

1. **Notes.** They live at `groups/{groupId}/users/{uid}/notes` with a `campaignId` *field*
   (`notes/types.ts:59`, `NoteContext.tsx:53`), not under the campaign. A recursive delete of the
   campaign document misses them entirely. They would survive forever, filtered out of every view
   because `note.campaignId === activeCampaignId` can never match again.
2. **`activeCampaignId` on group user profiles.** Every member who had the campaign selected keeps
   pointing at a dead id. `DocumentService.getCollectionRef` will happily build paths under a
   nonexistent parent: reads return empty, writes create documents under a phantom campaign.

Note also that production rules are path-scoped, so a `collectionGroup` query has no matching rule
and is denied — there is no shortcut for the notes fan-out.

## Reproduction

1. Sign in as a group admin, open Admin → Campaigns.
2. Click **Delete** on any campaign; confirm in the dialog.
3. The dialog closes. The campaign is still listed. Nothing is written. The only trace is a line in
   the browser console.

## Expected vs Actual

**Expected**: the campaign and everything belonging to it are removed, or the admin is told why not.

**Actual**: silent no-op after an explicit destructive confirmation.

## Recommended Fix

Approved approach (2026-07-29): a callable Cloud Function, matching the established pattern of
`deleteUser` and `removeUserFromGroup` (`onCall`, `europe-west1`, server-side permission check).

1. `admin.firestore().recursiveDelete(campaignRef)` — the Admin SDK enumerates subcollections via
   `listCollections()`, so this is complete **by construction** and stays correct when a new
   subcollection is added later. `firebase-admin ^12.6.0` supports it.
2. Delete notes with `campaignId == <deleted campaign>` across `groups/{groupId}/users/*/notes`.
3. Clear `activeCampaignId` on every group user profile referencing the campaign.
4. Reword the dialog to state what is actually deleted — the current copy lists four of the seven
   entity types and omits notes entirely.

Rejected: a client-side cascade. It works and needs no deploy, but its hardcoded subcollection list
is a latent orphan bug whose only safeguard is a human remembering to update an array. Compare
[#1300](./1300-app-check-never-initialized-lazy-firebase-init.md) — the same shape of silent,
long-fuse omission, which reached production.

See also [#1404](./1404-campaign-edit-button-has-no-onclick.md) (same file, same failure mode) and
[#1405](./1405-delete-user-orphans-notes-subcollection.md) (same orphan class, already shipped).
