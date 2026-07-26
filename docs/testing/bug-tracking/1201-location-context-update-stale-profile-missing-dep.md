# Bug #1201 — LocationContext.updateLocation closes over a stale `activeGroupUserProfile`

## Title
`updateLocation` omits `activeGroupUserProfile` from its `useCallback` dependency array, so location edits can be attributed to the user's previously-active character

## Status
🔍 DISCOVERED

## Category
DATA

## Discovered In
Not surfaced by a test. Found during the attribution-consolidation Wave A refactor
(`docs/architecture/migration/attribution-consolidation-wave-a.md`) while verifying that dependency
arrays stayed correct.

## Affected File
`src/features/campaign-entities/locations/context/LocationContext.tsx`

## Description

`updateLocation` builds modification attribution from `activeGroupUserProfile`:

```tsx
// line 85
const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });
```

but its dependency array (line 102) does not list it:

```tsx
}, [user, activeGroupId, activeCampaignId, getLocationById, updateData, dispatchLocationChangedEvent]);
```

So the memoized callback captures whatever `activeGroupUserProfile` was current when it was last
recreated. When the user changes their active character — or switches group — `updateLocation` keeps
writing the **stale** profile's `modifiedByUsername`, `modifiedByCharacterId` and
`modifiedByCharacterName` until some other dependency changes and forces the callback to rebuild.

This is **pre-existing**, not introduced by Wave A: the hand-rolled attribution block that previously
sat at this spot referenced `activeGroupUserProfile` the same way and had the same missing
dependency. Wave A only made it easier to see.

`createLocation` in the same file (line 236) **does** list `activeGroupUserProfile`, so the two
sibling functions disagree — good evidence this is an oversight rather than a deliberate choice.

### Impact
- Location edits can be attributed to the wrong character, which is exactly the kind of data the
  attribution system exists to get right. Silent: nothing errors, the value is just wrong.
- Whether it manifests depends on incidental re-render timing, which makes it intermittent and hard
  to reproduce by hand — the worst shape for a data bug.
- Same-shape risk exists wherever a context builds attribution inside a `useCallback`; the other
  entity contexts were checked during Wave A and list the dependency correctly.

## Reproduction
1. Sign in as a user with at least two characters in the active group.
2. Open a location and edit it — attribution records character A.
3. Switch the active character to B **without** triggering a change to `user`, `activeGroupId`,
   `activeCampaignId`, `getLocationById`, `updateData`, or `dispatchLocationChangedEvent`.
4. Edit a location again.
5. Inspect the stored document: `modifiedByCharacterName` / `modifiedByCharacterId` still name
   character A.

## Expected vs Actual

**Expected:** Location modifications are attributed to the character active at the moment of the edit.

**Actual:** They are attributed to whichever character was active when the callback was last memoized.

## Recommended Fix

Add `activeGroupUserProfile` to the dependency array at line 102, matching `createLocation`:

```tsx
}, [user, activeGroupId, activeCampaignId, activeGroupUserProfile, getLocationById, updateData, dispatchLocationChangedEvent]);
```

**Write the failing test first.** Per this project's methodology the fix should be driven by a test
that renders `LocationProvider`, calls `updateLocation`, changes `activeGroupUserProfile`, calls
`updateLocation` again, and asserts the second write carries the *new* character. That test should
fail before the one-line change and pass after. Deliberately not fixed inside Wave A, whose scope was
limited to centralizing the attribution mapping without behavior changes.

Consider also enabling `react-hooks/exhaustive-deps` as an ESLint error for context files — this
class of bug is exactly what that rule catches, and it would have flagged this at author time.
