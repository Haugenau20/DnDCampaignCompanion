# PR 14.5 — Retire the dialogs, and put the survivors on a diet

Phase 14 · fifth PR · **destructive**

Deletes the four dialog entry points the routes replaced, and applies the
four rules the remaining six dialogs now follow.

Depends on `14-1` through `14-4`. **Do not start this PR until all four are
merged and the routes have been used.** A deleted dialog with no working route
behind it is an outage.

## Read-only, in every PR of this phase

`../../../design/design-language.md`, `../../../design/colour-schema.md`,
`colour-schema.json`, `../../01-token-model.md`, `../00-surface-routing.md`
and every `14-*.md` handoff. Findings go to `../../03-drift-log.md`.

## Scope

- `src/features/user-management/admin/components/AdminPanel.tsx` — deleted
- `src/features/user-management/groups/components/JoinGroupDialog.tsx` —
  deleted, its form body having moved to `JoinPage` in `14-4`
- Every call site that opened the admin, sign-in or join dialog
- `src/core/components/Dialog.tsx` — the dismissal rule only
- `src/shared/components/DeleteConfirmationDialog.tsx`
- `src/features/user-management/profiles/components/DeleteAccountDialog.tsx`,
  `LeaveGroupDialog.tsx`
- `src/features/campaign-entities/rumors/components/CombineRumorsDialog.tsx`,
  `ConvertToQuestDialog.tsx`
- The corresponding `__tests__`

## Do

1. **Delete `AdminPanel` and `JoinGroupDialog`**, and every trigger that
   opened them or the sign-in dialog. Anything that previously opened one is
   now a link to `/admin/people`, `/signin` or `/join`.
2. **No compatibility shim.** No `openAdminDialog` that redirects, no wrapper
   component that renders the page inside a dialog. This project has already
   learned that an alias outlives the migration it was meant to enable
   (colour schema §10) — the same applies to a surface.
3. **No `Card` inside a `Dialog`.** Sweep all six survivors. `Dialog` owns
   the title, border and padding; an inner `Card` is the duplication that
   produced two "Sign In" headings.
4. **Dismissal rule, in `Dialog`.** Backdrop click and Escape may close a
   dialog that has not been interacted with. Once any input inside has
   changed, both must be inert and the user cancels explicitly. Implement it
   in `Dialog` — a `dirty` signal from the content, defaulting to clean, so
   confirms keep their one-key exit. Keep the focus trap, the focus return
   and the top-most-only Escape behaviour exactly as documented in the file.
5. **Destructive confirm copy**, all three: name the object, state the blast
   radius, then "This cannot be undone." The button carries the verb —
   "Delete campaign", "Delete account", "Leave group" — never "OK" or
   "Confirm". `danger.confirmBg` / `danger.confirmText`, and red nowhere else
   in the dialog.
6. **Check the two rumour dialogs against the rule** (design doc §1) rather
   than assuming. Both act on entries selected on the page behind them, so
   both stay — but if either has grown tabs, a table or a second scroll
   region, log it in the drift log as a candidate page; do not convert it in
   this PR.
7. **Delete the dialog-only test scaffolding** that existed because content
   was unreachable in jsdom:
   `301-join-group-dialog-form-content-unreachable-in-jsdom.md` and
   `302-location-quest-form-sections-dialog-content-unreachable.md`. Where a
   surface is now a page, its tests render a route and need no portal
   workaround. Mark both bug files resolved-by-design rather than editing the
   dialog around them.

## Do not

- Do not touch `SessionTimeoutWarning`. It stays a dialog, and its
  mount-with-`open`-already-true behaviour is load-bearing — see the
  `portalRoot` state comment in `Dialog.tsx` and bug #150.
- Do not remove the focus trap, the scroll lock, the nested-dialog z-index
  handling or the focus-return-on-close while simplifying. Every one of them
  was added to fix a specific reported defect.
- Do not widen `maxWidth` on the survivors. Smaller is the point.
- Do not delete `RegistrationForm`; `14-4` re-homed it.
- Do not change a colour value.

## Gates

- `grep` shows no remaining reference to `AdminPanel` or `JoinGroupDialog`,
  and no component named for a sign-in dialog.
- Every former entry point navigates; nothing opens an overlay.
- Six dialogs remain, each with exactly one title, one border, one padding,
  no inner `Card`, no tabs, no table, no nested scroll region.
- Typing into a dialog and then clicking the backdrop or pressing Escape does
  not close it or discard input. An untouched dialog still closes on both.
- Focus moves into the panel on open and returns to the trigger on close, for
  all six — including when the trigger's row was deleted by the action.
- `Dialog.test.tsx` passes, extended with the dirty-dismissal cases.
- Full keyboard pass on `/admin/people`, `/signin`, `/join` and each
  surviving dialog.
- No hex in the diff; no token change.

## References

Design doc §1, §2, §6. Design language §5, §9, §11, §12. Colour schema §5.2
(`danger.*`), §10 (an alias is not a migration mechanism). Record D40, D41.
