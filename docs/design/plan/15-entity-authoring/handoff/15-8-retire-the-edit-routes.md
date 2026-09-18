# PR 15.8 — Retire the edit routes

Phase 15 · ninth and final PR · depends on every earlier PR merging

The only destructive PR in the phase, last for the same reason Phase 14's
`14-5` was last: a deleted surface with nothing to replace it is an outage.

By now every field of every entity is editable where it is read. The four edit
routes have nothing left to do, and the four create pages have been replaced
by a two-field dialog.

## Scope

- `src/app/App.tsx` — the four edit routes, and the create routes' mount
- `src/pages/quests/`, `src/pages/locations/`, `src/pages/npcs/`,
  `src/pages/rumors/` — the edit pages
- `src/features/campaign-entities/*/components/` — the create and edit forms
  and their now-unused sections
- every emitter of an edit link
- the matching test files

## Do

1. **Redirect, do not 404.** Each edit route becomes a redirect to the record:
   - `/quests/edit/:id` → `/quests/:id`
   - `/locations/edit/:id` → `/locations/:id`
   - `/npcs/edit/:id` → `/npcs/:id`
   - `/rumors/edit/:id` → `/rumors?highlight=:id`, which opens the row
   These URLs are in browser histories and possibly in campaign notes.
2. **Delete the edit pages and the create forms** that the dialog and the
   pages replaced — including `QuestFormSections` and the other multi-section
   form bodies, once nothing imports them.
3. **Keep the `/{entity}/create` routes.** They are `15-1`'s third mount and
   note conversion still uses them. Only the *forms* go.
4. **Remove every emitter of an edit link** — directory row actions, page
   menus, the command palette, anything in Home. A redirect is a safety net
   for old URLs, not a supported path.
5. **Check auth rehydration before deciding anything.** Bug
   `1423-edit-pages-redirect-to-list-during-auth-rehydration.md` is exactly
   this class of defect: a redirect that fires while auth is still rehydrating
   sends the user somewhere wrong. Do not decide "not signed in" or "not
   found" mid-rehydration. Phase 14 §4.1 hit the same trap.
6. **Close the `TODO.md` items this phase resolved** — T016, T014, and T001's
   display half — with a note pointing at the PR that did it. Leave T001's
   stored-shape half open; leave T005, T006, T017, T038 untouched and open.
7. **Record what this phase learned** in `TODO.md` if anything surprised you.
   Do not append to the drift log; `15-0` retired it.

## Do not

- Do not delete a form before checking every importer, including test files
  and barrel exports. A barrel re-export keeps dead code alive and hides it.
- Do not delete the create routes.
- Do not remove `InlineEditor`; it is now the mechanism, not a special case.
- Do not fold this PR into an earlier one. Its whole purpose is to be last.
- Do not "tidy" anything adjacent. A destructive PR with an unrelated
  refactor in it is unreviewable.
- Do not delete `/rumors/edit/:id`'s redirect on the grounds that rumours
  never had a page — that URL existed and was reachable.

## Gates

- All four old edit URLs land on the right record, signed in, cold, with a
  full page load — not just via client-side navigation.
- Rehydration: an old edit URL opened in a fresh session lands on the record,
  not on the list.
- Grep clean: no import of a deleted form anywhere, including barrels and
  tests; no remaining link to an edit route.
- Every entity is still creatable from the dialog, the sheet and the route.
- The full suite is green, and the suites for the deleted forms are deleted
  with them rather than skipped.
- Nothing that was visible before this phase is now unreachable — walk each
  entity's fields against `00-entity-authoring.md` §3 and confirm each one has
  a home.

## References

`00-entity-authoring.md` §2 (the audit table — the checklist for what
retires), §1.1. Phase 14 `00-surface-routing.md` §4.1 (the rehydration trap)
and its `14-5`, the model for a destructive final PR.
`docs/testing/bug-tracking/1423-edit-pages-redirect-to-list-during-auth-rehydration.md`.
