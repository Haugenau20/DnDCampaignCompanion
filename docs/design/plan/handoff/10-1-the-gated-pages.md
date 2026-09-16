# PR 10.1 — The gated pages stop hand-rolling their gates

Phase 10 · second PR · depends on 10.0

> **Scope narrowed when the phase reached it (R39): this PR is `ProfilePage`
> alone.** `AdminPanel` is not a page — there is no `/admin` route; it is the
> body of a `Dialog` opened from the account menu (`Header.tsx:198`). So it has
> no page frame to hand-roll, `PageShell` cannot apply to it, and the
> signed-out state of a gate is unreachable from an account menu that only
> renders for a signed-in admin. Everything below about `AdminPanel` and the
> four management views is deferred until the route question is decided on its
> own merits. Item 1 grew a decision it did not anticipate: the gate had no way
> to say "signed in is enough", so `requires: "none"` was added (D95).

The other half of the frame, and the riskier half: these two pages have real
auth states, and both currently write their own.

Measured:

| page | frame | gate |
|---|---|---|
| `ProfilePage` (113 lines) | hand-rolled | hand-rolled — three states in JSX |
| `AdminPanel` (199 lines) | hand-rolled | hand-rolled — `if (!isAdmin \|\| !activeGroup)` |

`ProfilePage`'s own header comment describes its three states — "signed in,
groups still loading: the shell plus a skeleton", and the deliberate choice
that "the URL must stay linkable even when signed out". That is a good
decision, carefully made, and it is `usePageGate`'s exact contract, written a
second time by hand.

## Scope

- `src/pages/profile/ProfilePage.tsx`
- `src/features/user-management/admin/components/AdminPanel.tsx`
- `src/features/user-management/admin/components/{Campaign,Group,Token,User}ManagementView.tsx`
  — only where the frame changes what they receive
- the matching test files

## Do

1. **`ProfilePage` adopts `PageShell` + `usePageGate`/`GatedContent`.** Its
   three states map onto the gate's five; the two it does not use (no campaign
   chosen, error) should resolve to something deliberate rather than to
   nothing. Preserve the linkable-while-signed-out behaviour its comment
   defends — the gate supports it, and losing it would be a regression its
   author wrote a paragraph to prevent.
2. **`AdminPanel` adopts the same, and keeps its own admin check.** `usePageGate`
   answers "is there a user, a group, a campaign"; it does not answer "is this
   user an admin", which is `AdminPanel`'s own question. Do not fold the role
   check into the gate — layer it inside, so a non-admin sees a designed "your
   role is not admin" state rather than an empty shell.
3. **The nine profile cards keep their composition.** `AccountCard`,
   `AppearanceCard`, `CharactersCard`, `CharacterRow`, `DangerZoneCard`,
   `GroupMembershipCard` and the two dialogs are in scope only insofar as the
   frame above them moves. If one of them needs work, log it rather than
   widening this PR — the last three phases each found the real work in a
   different place than the plan predicted, and the way that stayed manageable
   was one concern per PR.
4. **Admin views may be dense** (A5). They are the one place in the product
   where density beats rhythm, so do not apply row spacing here to match the
   directories. Check them against that rule rather than against `Roster`.
5. **`DangerZoneCard` and its dialogs are where the accent rules bite.**
   `danger.delete*` and never beside save (A3), and a dialog is entitled to its
   own filled accent because the budget is per surface (D78). Verify with
   `dialogAccentsIn`, which is what that helper exists for.

## Do not

- Do not change what any of this *does*. Deleting an account, leaving a group
  and promoting a user are the highest-consequence actions in the product; this
  PR moves their frame, not their behaviour or their confirmations.
- Do not remove `AdminPanel`'s loading timeout. It forces loading to complete
  after a delay, which looks like a workaround and probably is one — but it is
  load-bearing until someone establishes why it was added. Log it.
- Do not adopt the gate on the four management views individually. They render
  inside `AdminPanel`, which owns the gate once; five gates on one page is the
  redundancy the pattern exists to remove.

## Gates

- Every state renders deliberately, checked directly: signed out, signed in
  with groups loading, signed in and ready, signed in but not an admin, and
  signed in with no active group.
- No route becomes unlinkable while signed out that was linkable before.
- `dialogAccentsIn` shows at most one filled accent per open dialog;
  `formAccentsIn` at most one on the page behind it.
- The admin suites stay green — `AdminPanel`, and all four management views
  have their own test files.
- Screenshots: profile and admin, light and dark, plus the not-an-admin state.
- Empty campaign: a group with no campaign chosen, on both pages.

## References

A5 in `../05-archetypes.md`; D78 (the accent budget is per surface); D71 for
the Dialog audit's precedent; `ChaptersPage` for the gate pattern; A3 for
delete placement.
