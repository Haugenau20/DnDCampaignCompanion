# Bug #1401 — All four entity contexts expose the error state of a hook instance that never performs their writes

## Title
Each campaign-entity context calls `useFirebaseData` **twice** — it exposes `error` from the *read*
instance while its writes go through a *second* instance whose error state nothing reads. Every write
failure sets an error no component can see.

## Status
🔍 DISCOVERED — 2026-07-29, during the first end-to-end emulator walkthrough.

## Category
ARCHITECTURE

## Discovered In
Traced while investigating [#1400](./1400-npc-forms-swallow-write-failures-silently.md). The runtime
evidence is #1400's probe: `useNPCs().error` was `null` throughout a failed create, which is why the
probe could mock it as `null` and still be faithful.

## Affected Files
- `src/features/campaign-entities/npcs/context/NPCContext.tsx:14` vs `:21`, exposed at `:181`
- `src/features/campaign-entities/quests/context/QuestContext.tsx:36` vs `:37`, exposed at `:280`
- `src/features/campaign-entities/locations/context/LocationContext.tsx:16` vs `:22`, exposed at `:262`
- `src/features/campaign-entities/rumors/context/RumorContext.tsx:14` vs `:15`, exposed at `:324`
- `src/shared/hooks/useFirebaseData.ts:103` (where the unread error is set)

## Description

`useFirebaseData` is a stateful hook: every call site gets its own independent `error`, `loading` and
`data` state. All four entity contexts call it twice, via two different routes.

Taking `NPCContext` as the specimen:

```tsx
// :14 — instance #1, created inside useNPCData(). Its error is the one exposed.
const { npcs, loading, error, refreshNPCs, hasRequiredContext } = useNPCData();

// :21 — instance #2. Its error is never destructured.
const { updateData, deleteData, addData } = useFirebaseData<NPC>({
  collection: 'npcs'
});
```

and then:

```tsx
// :181
error: contextError || error,   // <- instance #1's error
```

The writes (`addData`, `updateData`, `deleteData`) all belong to **instance #2**. When one fails,
`useFirebaseData` does exactly the right thing:

```ts
// useFirebaseData.ts:101-104
} catch (err) {
  setError(errorMessage);
  throw err;
}
```

…but `setError` writes to instance #2's state, which no component subscribes to. Instance #1's
`error` — the one actually rendered — was never touched, because instance #1 only ever performs
reads via `getData`.

The consequence: **`useNPCs().error`, `useQuests().error`, `useLocations().error` and
`useRumors().error` are structurally incapable of reporting a write failure.** They report read
failures and missing-context messages only. Any component relying on them to show a failed
create/update/delete shows nothing — which is exactly what `NPCForm`'s `{error && …}` block does.

This is the seam problem [#1051](./1051-noteeditor-manualsave-rethrows-unhandled.md) already
catalogued in this repo: *tests covering a path may not cover the seam feeding it.* There is
substantial passing coverage of both `useFirebaseData`'s error handling and the contexts' error
exposure. Neither suite crosses the seam between them, so both stayed green while the wiring between
them was disconnected.

## Reproduction

1. Cause any write to fail in any of the four domains — easiest is the cross-session id collision in
   [#1402](./1402-cross-session-id-collision-surfaces-developer-error.md).
2. Observe `useXs().error` remains `null`.
3. Observe `useFirebaseData`'s own `error` (instance #2) *is* set — it just has no subscriber.

The forms for Quest/Location/Rumor mask this because they keep their own local error state and use
the thrown value directly; only the NPC forms depend on the context error, which is why #1400 is
where it surfaces as total silence.

## Expected vs Actual

**Expected**: a context that exposes an `error` field reports errors from the operations that context
performs, including its writes.

**Actual**: it reports only errors from the read hook, and silently drops every write error.

## Recommended Fix

Minimal and safe: destructure the write instance's `error` as well and combine it, in all four
contexts —

```tsx
const { updateData, deleteData, addData, error: writeError } = useFirebaseData<NPC>({ collection: 'npcs' });
...
error: contextError || error || writeError,
```

**Worth considering, but a larger change**: the two instances are arguably one instance too many.
`useXData` is documented as the hook "for managing NPC data" and could own the writes too, at which
point the duplication and this class of bug both disappear. That touches four hooks plus four
contexts and a lot of existing tests, so it is proposed separately rather than folded into a bug fix.

Whichever route, the regression test must fail against the reverted fix — assert that a rejecting
`addData` makes `useXs().error` non-null.
