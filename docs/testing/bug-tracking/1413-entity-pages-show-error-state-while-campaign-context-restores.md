# Bug #1413 — Reloading any entity page shows a red "select a campaign" error for ~10 seconds

## Title
While auth and campaign context are being restored after a page load, entity pages render their
"no campaign selected" **error** state rather than a loading state — with a red warning icon — even
though a campaign is selected and about to appear.

## Status
🔍 DISCOVERED — 2026-07-29. Seen in the running app.

## Category
UI

## Discovered In
Driving the running dev server in Chrome, 2026-07-29.

## Affected Files
- `src/features/campaign-entities/npcs/components/NPCDirectory.tsx` (and the Locations/Quests/Rumors
  equivalents, which share the pattern)
- `src/features/campaign-entities/*/context/*Context.tsx` — `contextError` is computed purely from
  `activeGroupId`/`activeCampaignId` with no notion of "still loading"

## Description

`hasRequiredContext` is `!!activeGroupId && !!activeCampaignId`, and `contextError` is derived the
same way:

```tsx
if (!activeGroupId) return "Please select a group to view NPCs";
if (!activeCampaignId) return "Please select a campaign to view NPCs";
```

Neither distinguishes **"no campaign selected"** from **"the campaign has not been restored yet."**
On a fresh page load both are momentarily identical, so the page commits to the error state.

Restoring the campaign requires a chain of async work — Firebase Auth rehydrating the session,
`AuthService`'s auth-state listener reading the group user profile, and
`setActiveCampaign(groupUserDoc.activeCampaignId)` (`AuthService.ts:191-192`). Measured in the
running app, that took roughly **ten seconds** before the NPC list appeared.

**No data is lost and nothing is broken** — the page does resolve correctly on its own. The defect is
that for ten seconds it tells the user, with a red alert icon, that they have not selected a
campaign, when they have. A user would reasonably conclude something failed and navigate away or
re-select the campaign.

Initially mistaken for a lost session during this session's walkthrough; waiting longer showed it
resolving. Worth recording, because the state it shows is genuinely indistinguishable from the real
error.

## Reproduction

1. Sign in and select a group and campaign; confirm the dashboard shows the campaign.
2. Reload any entity page (`/npcs`, `/locations`, `/quests`, `/rumors`) — or navigate to one with a
   full page load rather than client-side routing.
3. A red "Please select a campaign to view NPCs" panel renders and stays for several seconds.
4. It then replaces itself with the fully populated list.

## Expected vs Actual

**Expected**: a loading indicator until auth and campaign context have settled; the error only once
it is established that nothing is selected.

**Actual**: a definitive error state during a normal, successful restore.

## Recommended Fix

Give the contexts a third state. `useAuth` already tracks a loading flag; the entity contexts need to
propagate "auth/context still resolving" and render the existing spinner for it, showing
`contextError` only once restoration has completed and genuinely produced no campaign.

Worth doing in one place — all four campaign-entity contexts derive `contextError` identically, and
the Story/Notes pages likely share the pattern.
