# Bug #1400 — NPC create and edit fail completely silently

## Title
`NPCForm` and `NPCEditForm` catch write failures and call only `console.error` — the user gets no
error, no success, and no new NPC. The form simply sits there.

## Status
🔍 DISCOVERED — 2026-07-29, during the first end-to-end emulator walkthrough this project has run.
**Proven at runtime**, not from a code reading (see Reproduction).

## Category
UI

## Discovered In
A throwaway probe suite rendering the real `NPCForm` with a rejecting `addNPC`, run under jest on
2026-07-29 and deleted afterwards. The permanent regression test is to be written as part of the fix.

## Affected Files
- `src/features/campaign-entities/npcs/components/NPCForm.tsx:194-196`
- `src/features/campaign-entities/npcs/components/NPCEditForm.tsx:85-87`

## Description

Both NPC forms end their submit handler like this:

```tsx
} catch (err) {
  console.error('Failed to create NPC:', err);
}
```

That is the entire failure path. No `setError`, no toast, no re-throw, and `onSuccess?.()` is inside
the `try` so it is skipped. The result is a form that accepts a click and does nothing observable.

This is **not** how the rest of the domain behaves. The other five entity forms all surface the
failure to the user:

| Form | Catch block |
|---|---|
| `NPCForm.tsx:194` | `console.error` only ❌ |
| `NPCEditForm.tsx:85` | `console.error` only ❌ |
| `QuestCreateForm.tsx:153` | `setError(err.message)` ✅ |
| `QuestEditForm.tsx:85` | `setError(err.message)` ✅ |
| `LocationCreateForm.tsx:184` | `setError(err.message)` ✅ |
| `LocationEditForm.tsx:101` | `setError(err.message)` ✅ |
| `RumorForm.tsx:216` | `setError(err.message)` ✅ |

Both NPC forms *do* render an error block (`NPCForm.tsx:433-437`) — but it reads `error` from
`useNPCs()`, which is dead on this path for the separate reason catalogued in
[#1401](./1401-entity-contexts-read-error-from-wrong-hook-instance.md). So there are two independent
reasons the user sees nothing, and fixing only one of them leaves the other live.

NPCs are the most-used entity type in the app, which makes this the most-exercised silent failure in
the codebase.

## Reproduction

Runtime probe (jest, real `NPCForm`, `addNPC` rejecting with the real `createDocument` collision
message):

```
addNPC rejected:        yes
onSuccess called:       NO (form stays open)
form still in DOM:      YES
any error text shown:   NO  <-- SILENT FAILURE
```

The scan for error text was deliberately broad — `/error|fail|already exists|cannot|unable|problem|sorry/i`
against the whole rendered `document.body`. Nothing matched.

In the real app the easiest trigger is the cross-session id collision described in
[#1402](./1402-cross-session-id-collision-surfaces-developer-error.md), but **any** write failure
does it: a permission denial, an offline Firestore, a validation throw from `addNPC` itself.

## Expected vs Actual

**Expected**: a failed create/edit tells the user it failed, in language they can act on, and leaves
their typed data intact so they can retry.

**Actual**: nothing renders. The user cannot distinguish "failed" from "the button is broken" from
"it worked but the list hasn't refreshed."

## Recommended Fix

Give both NPC forms the same local error state the other five forms already have — `setError` in the
catch, rendered in the existing error block. Match the established pattern rather than inventing a
new one.

Note that this fix is necessary but **not sufficient on its own** for write failures specifically:
[#1401](./1401-entity-contexts-read-error-from-wrong-hook-instance.md) must also be fixed, or errors
originating inside `useFirebaseData` still never reach any component. Conversely #1401 alone does not
cover errors thrown by `addNPC` before it reaches `useFirebaseData` (e.g. its own
`'Cannot add NPC: No group or campaign selected'` guard). Both are needed.
