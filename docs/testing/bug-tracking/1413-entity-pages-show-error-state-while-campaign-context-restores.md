# Bug #1413 — Reloading any entity page shows a red "select a campaign" error for ~10 seconds

## Title
While auth and campaign context are being restored after a page load, entity pages render their
"no campaign selected" **error** state rather than a loading state — with a red warning icon — even
though a campaign is selected and about to appear.

## Status
✅ FIXED (2026-08-01) — see "Resolution" at the foot of this document.
⚠️ **Not yet verified in a browser**, which is how it was found; the gates below cannot see the
~10s window this bug is about.

Originally 🔍 DISCOVERED — 2026-07-29. Seen in the running app.

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

## Resolution (2026-08-01)

Fixed with one shared hook, `src/shared/hooks/useCampaignContextStatus.ts`, returning
`{ isResolving, hasRequiredContext, missingContext }`. Consumers fold `isResolving` into their own
loading flag and build a "please select…" message from `missingContext`, which is **`null` while
resolution is in flight** — so it is structurally impossible to render the error out of a state that
has not settled. That is the point of returning `missingContext` rather than two booleans: the
"don't know yet" case cannot be forgotten at a call site.

`shared/hooks/` because campaign-entities, storytelling and collaboration all consume it.

### Which loading flag, and why it is not the obvious one

`useAuth().loading` (`authLoading || profileLoading || groupsLoading` in `FirebaseContext`), **not**
`useGroups().loading`. The latter is `!fullyLoaded`, and `fullyLoaded`'s condition
(`Array.isArray(groups) || activeGroupUserProfile`) is satisfied by the *initial* `groups` state
(`[]` — already an array) the instant `user` becomes truthy. It flips false long before the campaign
is fetched, so it cannot tell "resolving" from "resolved to nothing" either. This is a direct
consequence of **#701**'s fix, which is worth noting: that fix was correct, and it made this flag
useless for this purpose.

### A dormant defect this fix woke — and the reason it needed fixing here

`FirebaseContext`'s auth-state `catch` reset `groupsLoading` and `authLoading` but **not
`profileLoading`**. `loadUserProfile` throws when its retries are exhausted, which skips the
`setProfileLoading(false)` on the happy path — so after a failed profile load `profileLoading` stayed
true forever, pinning `loading` true forever.

Before this bug's fix that was nearly inert. **After it, `useAuth().loading` feeds `isResolving`**, so
a stuck flag means every entity page renders a *permanent spinner* instead of its error state, and
`hasRequiredContext` never becomes true, so writes throw. Fixing #1413 would have promoted a dormant
defect into a page-level outage.

This is the **third** recorded instance of the pattern in this codebase (#018 → #852,
#1300 → #1411). Guarded by a regression test asserting `loading` settles to `false` when the profile
load fails outright, proven against the revert (`Expected: false, Received: true`, 2116 ms — the
~2s confirms it genuinely exhausted the retry path rather than short-circuiting).

### Full surface, because the first pass covered less than it appeared to

Migrating the four campaign-entity hooks was **not** the whole job. A sweep for every place that
renders a selection message found four more, three of which were missed on the first pass:

| Surface | Was it affected? | Resolution |
|---|---|---|
| `useNPCData` / `useLocationData` / `useQuestData` / `useRumorData` + `NPCContext` | yes | shared hook |
| `NPCsPage`, `QuestsPage`, `SagaPage` | yes | shared hook / reordered loading-first |
| `LocationsPage`, `LocationEditPage` | **no** | already check `isLoading` first; the fold covers them with no edit |
| `useChapterData` + `StoryContext` | yes — **missed initially** | shared hook; `contextError` now gated on `!isLoading`. `useSagaData` had been migrated while its sibling in the same domain had not |
| `QuestEditPage`, `SagaEditPage` | yes — **missed initially** | reordered so `loading` is checked before the context branch |
| `NotesPage` | yes — **missed initially** | gated the inline warning on `useNotes().isLoading`, which already folds `isResolving`; deliberately avoids putting `NotesPage` on the `useAuth`/`useGroups` surface its test does not mock |

**The generalisable point**: "all four contexts derive this identically" was true and still
under-described the work. The ordering of a page's early returns decides whether a shared loading
flag reaches the user at all — a page that checks `!hasRequiredContext` before `loading` is immune to
the fix. Two pages differed from their own siblings in exactly that way.

### Two consumers, two correct shapes — and a red that said so

`StoryContext` was first written to take `missingContext` threaded through `useChapterData`, matching
how `NPCContext` consumes it. That turned `StoryContext.behavioral.test.tsx` red on two tests
asserting the error message appears when no context exists — **correct, non-characterization
assertions**, so the fault was the production change.

Cause: the suite mocks `useChapterData` wholesale, and the mock supplies `hasRequiredContext` but no
`missingContext`, so the threaded value arrived `undefined` and the error silently vanished. The
obvious repair — have `StoryContext` call `useCampaignContextStatus()` directly, as `NPCContext`
does — is **worse**, because that file's `features/user-management` mock provides only `useAuth` and
`useUser`; the hook would call an undefined `useGroups()` and crash, and making those mocks dynamic
per test would fight the many cases that set `hasRequiredContext: true`.

Resolved by gating on `!isLoading` instead, which needs nothing new from the mock and is the same
thing `LocationsPage`/`LocationEditPage` already get structurally by ordering their loading branch
first. So the codebase now has **two shapes for one rule** — `missingContext` where a caller wants to
name *which* selection is missing, `!isLoading` where it only needs "has this settled?" — and that is
deliberate, not drift. Recorded here because a future consistency sweep will flag it, and #005's
history says the deciding evidence for such a split usually lives outside the files the sweep is
reading. Here it lives in the test mocks.

### Verification

- Full suite: **187 suites, 4270 passed, 2 skipped, 0 failed** (baseline `ce10987`: 186 / 4255 / 2,
  reproduced exactly before starting). +1 suite, +15 tests, all new, reconciling exactly.
- `./node_modules/.bin/tsc --noEmit` clean; `npm run build` succeeds.
- Regression tests for the shared hook (7), `useNPCData` (4), `NPCContext` (3) and the
  `profileLoading` fix (1), each proven by failing against the reverted production change.

⚠️ **The gates cannot see this bug.** Every one of them was green while it was live, because the
defect is a ~10s transient during a real Firebase auth rehydration that no test performs. The fix
should be confirmed by reloading an entity page in the running app before this row is trusted.
