# PR 14.1 — Routes, guards and entry points

Phase 14 · first PR · additive

Adds four routes and the guards behind them. **Renders the existing
components unchanged** inside them. Every dialog still works exactly as it
does today; nothing is deleted until `14-5`.

## Read-only, in every PR of this phase

`../../../design/design-language.md`, `../../../design/colour-schema.md`,
`colour-schema.json`, `../../01-token-model.md`, `../00-surface-routing.md`
and every `14-*.md` handoff. A handoff that is wrong is reported, not
rewritten: append to `../../03-drift-log.md` and stop.

## Scope

- `src/app/App.tsx` — route table
- `src/app/layout/Layout.tsx` — if the admin page needs a layout variant
- `src/shared/components/user-menu/UserMenu.tsx` — the admin entry point
- New: `src/features/user-management/admin/pages/AdminLayout.tsx`,
  `src/features/user-management/auth/pages/SignInPage.tsx`,
  `src/features/user-management/groups/pages/JoinPage.tsx`
- New: a `next`-parameter helper, co-located with the auth feature
- Tests for the above

Out of scope: the visual design of any of these pages (`14-2`…`14-4`), and
removing any dialog (`14-5`).

## Do

1. **Add the routes.**
   - `/admin` → redirect to `/admin/people`
   - `/admin/people`, `/admin/campaigns`, `/admin/group`
   - `/signin`
   - `/join`

   `AdminLayout` owns the chrome, band and sub-navigation shell (content
   styling arrives in `14-2`/`14-3`); the three children render the existing
   `UserManagementView` + `TokenManagementView`, `CampaignManagementView` and
   `GroupManagementView` **as they are**. `/admin/people` renders both
   existing user and token views stacked for now — the merge is `14-2`.

2. **Move the three panel states to the route** (design doc §4.1), lifting
   them out of `AdminPanel`:
   - loading, **keeping the existing 3-second timeout verbatim**, comment and
     all. `AdminPanel.tsx` states why removing it is an unpredictable
     behaviour change.
   - not-an-admin: a full page, plain, one link back to the campaign. Not an
     error, not alarm-coloured.
   - no active group: a page, with the group switcher reachable.

3. **Guard `/admin` on `isAdmin` from `useGroups`**, and do not decide while
   auth or group data is still rehydrating. Read
   `docs/testing/bug-tracking/1423-edit-pages-redirect-to-list-during-auth-rehydration.md`
   before writing the guard — it is the same failure mode.

4. **Signed-out on a guarded route** redirects to
   `/signin?next=<current path + search>`.

5. **Write the `next` helper, with validation.** Accept only a same-origin
   path beginning with exactly one `/`. Reject anything containing a scheme, a
   protocol-relative `//`, or a host; reject `/signin` and `/join` themselves
   to avoid a loop. Invalid or absent → campaign home. Unit-test the rejection
   cases, including `//evil.test`, `https://evil.test`, `/\evil.test` and an
   encoded variant.

6. **Add the user-menu entry**, visible only when `isAdmin`: label
   *"Group administration"*, a normal link to `/admin/people`. No badge, no
   nav item, no campaign-switcher entry (design doc §4).

7. **`/signin` and `/join` render the existing forms** — `SignInForm` and
   `JoinGroupDialog`'s form body — in a plain page container, without the
   `Dialog` wrapper. `/join` keeps reading `token` and `groupId` from the
   query exactly as `JoinGroupDialog` does today.

## Do not

- Do not delete, hide or unwire `AdminPanel`'s dialog, the sign-in dialog or
  `JoinGroupDialog`. Both paths coexist through this PR; `14-5` removes one.
- Do not restyle anything. A page that looks like a dialog's contents on a
  page is the correct output of this PR.
- Do not add role-editing UI. `14-2` covers what may be rendered, and
  `docs/testing/bug-tracking/1409-member-can-escalate-to-group-admin.md` is
  why nothing about roles is added on a hunch.
- Do not route `SessionTimeoutWarning`. It stays a dialog, permanently.
- Do not introduce a second source of truth for "am I an admin". Use
  `useGroups`.

## Gates

- All four routes reachable by URL; browser back and forward behave; a
  page reload on each one lands in the same place.
- `/admin/people` as a signed-out visitor → `/signin?next=/admin/people`, and
  after signing in, back to `/admin/people`.
- `next` validation unit tests pass, including every rejection case above.
- A non-admin member reaching `/admin/*` sees the not-an-admin page and no
  flash of admin content, including on a cold load while auth rehydrates.
- The user-menu item is absent for non-admins — absent, not disabled.
- Existing dialog tests still pass untouched (`AdminPanel.test.tsx`,
  `SignInForm.test.tsx`, `JoinGroupDialog.test.tsx`).
- No token, colour or font change in the diff.

## References

Design doc `../00-surface-routing.md` §1, §2, §4, §4.1, §5.1. Design language
§12 for any judgement call this handoff did not anticipate. Record D41, D45.
