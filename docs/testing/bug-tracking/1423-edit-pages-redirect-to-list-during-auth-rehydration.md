# Bug #1423 — Reloading or deep-linking a Quest, Location or Rumor edit page bounces you to the list

## Title

Three edit pages redirect on a bare `if (!user)` inside a `useEffect`. `user` is null both when
nobody is signed in **and** while Firebase Auth is still rehydrating, so a signed-in user opening
one of these pages directly is sent back to the list ~124–375 ms in, long before auth can restore.

## Status

✅ FIXED (2026-08-28). Verified in the running app.

## Category

UI / CONTEXT

## Discovered In

Browser walkthrough on the local dev server, 2026-08-28, while verifying
[#1413](./1413-entity-pages-show-error-state-while-campaign-context-restores.md)'s fix. Navigating
to `/quests/edit/destroy-the-ring` landed on `/quests`.

## Affected Files

- `src/pages/quests/QuestEditPage.tsx:22`
- `src/pages/locations/LocationEditPage.tsx:26`
- `src/pages/rumors/RumorEditPage.tsx:21`

## Description

This is [#1413](./1413-entity-pages-show-error-state-while-campaign-context-restores.md)'s defect
in a shape that fix could not have caught. #1413 taught the *render* path to distinguish "context
still resolving" from "nothing selected", and its sweep looked for **every place that renders a
selection message**. A redirect renders nothing, so it was invisible to that search — the bug is the
same (a terminal decision committed while the context is unsettled), only the outcome differs.

Note that #1413 *did* touch `QuestEditPage`: it reordered the loading branch ahead of the
`hasRequiredContext` branch. That made the page render correctly and left the effect above it
untouched, so the page still navigated away before either branch mattered. **Reordering render
branches does not constrain an effect.**

Three sibling pages already had the correct guard, which is what makes this an inconsistency rather
than an unknown: `ChapterEditPage:39` and `ChapterCreatePage:20` use `!isLoading && !user`, and
`SagaEditPage:45` uses `!loading && !user`.

## Reproduction

Measured in the browser with a signed-in session, loading each route directly (a reload or a
bookmark does the same thing) and recording the URL over time:

| Route requested | Final URL | |
|---|---|---|
| `/quests/edit/destroy-the-ring` | `/quests` @124ms | ❌ |
| `/locations/edit/rivendell` | `/locations` @375ms | ❌ |
| `/rumors/edit/dwarves-in-moria` | `/rumors` @123ms | ❌ |
| `/story/chapters/edit/chapter-01` | unchanged | ✅ control |
| `/story/saga/edit` | unchanged | ✅ control |
| `/npcs/edit/aragorn` | unchanged | ✅ control (has no such guard) |

The three controls are what make this a measured difference rather than a code reading. For
context, auth rehydration in this environment completes at roughly 3–7 s, so the redirect fires with
a wide margin every time — it is not a race.

## Expected vs Actual

| | |
|---|---|
| **Expected** | The page waits for auth to settle, then shows the edit form; it redirects only if there is genuinely no signed-in user. |
| **Actual** | It redirects to the list on every direct load, so these pages are unreachable except by clicking through from the list in an already-warm session. |

## Recommended Fix

Gate the effect on the page's existing loading flag, matching the three sibling pages.

## Resolution (2026-08-28)

All three effects now read `if (!isLoading && !user)` (`!loading` in `QuestEditPage`, which names
the flag that way), with the flag added to the dependency array.

No other change was needed: all three pages **already** render a loading branch before anything
else, so once the redirect stops firing early they correctly show their spinner and then the form.
That was checked rather than assumed — had they lacked the loading gate, fixing the redirect would
merely have exposed a "not found" instead, which is precisely what
[#1424](./1424-npc-edit-page-claims-npc-not-found-while-loading.md) is.

### Verification

- Regression tests added to all three page suites, each **proven against the un-fixed code**:
  reverting a guard gives `Expected number of calls: 0, Received number of calls: 1`. Each suite also
  keeps a control asserting the redirect *does* still fire once loading finishes with no user, so the
  fix cannot be mistaken for deleting the guard.
- Full suite **187 suites / 4282 passed / 2 skipped / 0 failed**. `tsc --noEmit` clean;
  `npm run build` succeeds.
- **Confirmed in the running app**: all three routes now hold their URL and go
  blank → loading → content.
