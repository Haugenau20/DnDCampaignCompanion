# PR 15.1 — Quick add: two fields, then the record

Phase 15 · second PR · depends on `15-0` only for documentation hygiene

Creating any of the four entities currently means a full page carrying every
optional field the entity has — twenty-one controls on Create Quest, of which
two are required, with nothing saying which two until submit. This PR adds the
two-field create surface and leaves every existing form in place.

Visual reference: `Authoring UI handover.dc.html` · `S1`, and `S9` for the
sheet.

## Scope

- a new shared component under `src/shared/components/` — one component, used
  in three mounts
- `src/app/App.tsx` — the four `/{entity}/create` routes render the new
  component
- the four directory pages, for the launch action
- the global add affordance in the app chrome
- `src/features/collaboration/notes/` — only where note conversion hands off
  pre-filled values
- the matching test files

## Do

1. **One component, four label sets.** Name and one line, per the table in
   `00-entity-authoring.md` §4. The required pair is exactly today's
   validation — do not relax it and do not add to it.
2. **Three mounts of the same thing.** A centred dialog over the surface you
   launched from; a bottom sheet below the phone breakpoint; and the same
   component centred on an otherwise empty page at `/{entity}/create`, which
   note conversion and pasted links still need. Do not build two components
   and do not let the route mount drift from the dialog mount.
3. **`Create & open` is primary.** It navigates to the created record with its
   first unwritten field focused: NPC → the appearance prompt, quest → the
   first objective, location → the parent picker. Until `15-4` and `15-5`
   land, quest and location have no page — land on the directory with the new
   row expanded via `?highlight=`, which `15-3` will formalise.
4. **`Create & add another` is secondary.** Keeps the surface open, clears
   both fields, focuses the first, and shows a quiet count of what this run
   has added.
5. **The location case pre-fills its parent** when launched from a location's
   *Add a place inside*. It is the only pre-filled case in the phase.
6. **No status field.** New quest active, NPC alive with unknown stance,
   location known, rumour unconfirmed. Each is one click to change afterwards.
7. **Failure keeps the surface open**, keeps the typed text, and puts the
   error under the field it belongs to — the save contract in
   `00-entity-authoring.md` §7, which applies to creates as much as to edits.
8. **Dismissal is honest.** Escape and backdrop close a pristine surface; once
   anything is typed they ask once. Phase 14 §6 already requires this of every
   dialog and the rule is not new here.
9. **The rumour gets no dialog.** Its create action is a composer row in the
   directory. Build the row now if it is cheap; otherwise leave the rumour on
   its existing form and let `15-7` do it — say which in the PR description.

## Do not

- Do not delete or alter the existing create forms. `15-8` retires them, after
  every page that replaces them exists. A deleted form with no replacement is
  an outage.
- Do not add a third field to any entity, however tempting the location's type
  or the quest's status looks. The whole claim of this PR is two.
- Do not build the attach tray here. Quick add has no relation picker at all —
  that is `15-2`, and relations are attached on the record.
- Do not implement the prompts on the destination pages; `15-4`…`15-6` own
  those. This PR only needs to focus the right field.
- Do not change note conversion's `noteId`/`entityId` handoff. Pre-fill the
  two fields and leave the wiring alone.

## Gates

- Every entity is creatable from the dialog, the sheet and the route, with the
  same validation and the same result.
- At 390px: both fields and both actions are reachable above the keyboard, and
  no horizontal scroll. Render in a 320px-wide iframe as well — per
  `CLAUDE.md`, a maximized Chrome window silently ignores resize below its
  minimum width. Note that the app header already overflows below ~380px on
  every route (T002); do not attribute that to this component, and do not fix
  it here.
- A rejected write leaves the typed text on screen with an error beside the
  offending field.
- `Create & add another` five times produces five records and never a stale
  field.
- Existing create routes still work, including from note conversion.
- Designed empty and loading states, per design language §8.

## References

`00-entity-authoring.md` §1.2, §4, §7, §10. Phase 14
`00-surface-routing.md` §1 (this dialog passes all three questions — §4
records why) and §6 (the dialog diet). Design language §4 (the entity's name
is the campaign's voice and takes the serif; the labels are the app's and take
the sans), §8 (designed empty states), §11 (chrome copy is plain and short).
`TODO.md` T002 for the known header overflow.
