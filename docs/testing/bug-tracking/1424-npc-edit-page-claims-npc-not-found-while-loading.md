# Bug #1424 — The NPC edit page shows a red "NPC not found" for ~4 seconds on every load

## Title

`NPCsEditPage` never reads `loading`. While the fetch is in flight `npcs` is `[]`, so
`npcs.find(...)` is `undefined` and the page commits to its "NPC not found" branch, then replaces
itself with the real form once data arrives.

## Status

✅ FIXED (2026-08-28). Verified in the running app.

## Category

UI / CONTEXT

## Discovered In

Browser walkthrough on the local dev server, 2026-08-28, while verifying
[#1413](./1413-entity-pages-show-error-state-while-campaign-context-restores.md). Loading
`/npcs/edit/bard` directly showed the error for ~3.9 s before the form appeared.

## Affected Files

- `src/pages/npcs/NPCsEditPage.tsx:14` (destructured only `{ npcs }`), `:33` ("not found" branch)

## Description

Third variant of [#1413](./1413-entity-pages-show-error-state-while-campaign-context-restores.md)'s
defect, alongside [#1423](./1423-edit-pages-redirect-to-list-during-auth-rehydration.md), and the
one that shows the reason all three were missed: #1413's sweep searched for places rendering a
**selection** message. This page's message says *"NPC not found"* — same defect, different words, so
a text-shaped search could not find it.

The page was the only entity edit page reading **no** loading state at all:

| Page | Loading gate | Redirect guard |
|---|---|---|
| `NPCsEditPage` | **none** | none |
| `QuestEditPage` | ✅ | bare `!user` ([#1423](./1423-edit-pages-redirect-to-list-during-auth-rehydration.md)) |
| `LocationEditPage` | ✅ | bare `!user` ([#1423](./1423-edit-pages-redirect-to-list-during-auth-rehydration.md)) |
| `RumorEditPage` | ✅ | bare `!user` ([#1423](./1423-edit-pages-redirect-to-list-during-auth-rehydration.md)) |
| `ChapterEditPage` | ✅ | ✅ gated |
| `SagaEditPage` | ✅ | ✅ gated |

Having no redirect guard is why this page was *reachable* at all — it is the one edit page #1423
does not affect. The absent loading gate is what made it lie about the NPC while it waited.

`useNPCData()` already returns exactly the right flag: `loading: Boolean(loading) || isResolving`,
which folds in #1413's `useCampaignContextStatus`. The value was available all along and simply not
destructured.

## Reproduction

1. Sign in and open `/npcs/edit/aragorn` directly (a reload does the same).
2. Sample the DOM from t=0.

Measured: `blank @2ms → NOT-FOUND @155ms → content @4034ms`. A red "NPC not found" is on screen for
just under four seconds of a successful load.

## Expected vs Actual

| | |
|---|---|
| **Expected** | A spinner while data loads; "NPC not found" only if the NPC genuinely is not in the active campaign. |
| **Actual** | "NPC not found" first, for ~4 s, on every load — including loads that succeed. |

## Recommended Fix

Read `loading` from `useNPCData()` and return the standard loading card before the "not found"
branch.

## Resolution (2026-08-28)

`const { npcs, loading } = useNPCData();`, plus a loading card matching the one the sibling edit
pages already render, placed before the existing branch. No change to the "not found" branch itself
— it is correct once it is only reached after loading completes.

### Verification

- Three regression tests in `NPCsEditPage.test.tsx`, **proven against the un-fixed code**: removing
  the guard yields *"expected document not to contain element, found `<div
  data-testid="typography-error">NPC not found</div>` instead"* — the exact string seen in the
  browser. A third test holds the other side: a genuinely absent NPC still reports "NPC not found"
  once loading has finished, so the fix cannot degrade into never reporting it.
- Full suite **187 suites / 4282 passed / 2 skipped / 0 failed**. `tsc --noEmit` clean;
  `npm run build` succeeds.
- **Confirmed in the running app**: `/npcs/edit/aragorn` now goes blank → loading → content with no
  error state. Cross-checked against `/npcs/edit/bard` while the *other* campaign was active, which
  correctly still ends at "NPC not found" — the fix delays the verdict, it does not suppress it.
