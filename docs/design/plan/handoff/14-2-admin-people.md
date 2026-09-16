# PR 14.2 — `/admin/people`

Phase 14 · second PR · additive

Merges Users and Registration Tokens into one view: members, then the
invitations nobody has accepted yet. This is the PR that makes the admin page
worth having.

Depends on `14-1`.

## Read-only, in every PR of this phase

`../../../design/design-language.md`, `../../../design/colour-schema.md`,
`colour-schema.json`, `../../01-token-model.md`, `../00-surface-routing.md`
and every `14-*.md` handoff. Findings go to `../../03-drift-log.md`.

## Scope

- `src/features/user-management/admin/components/UserManagementView.tsx`
- `src/features/user-management/admin/components/TokenManagementView.tsx`
- New: a `PeopleView` (or the two above collapsed into one) under
  `admin/pages/`
- `admin/pages/AdminLayout.tsx` — band metadata line
- The corresponding `__tests__`
- New: an invite-link dialog (the one dialog this phase adds)

Out of scope: campaigns and group views (`14-3`), any permissions change.

## Do

1. **Two cards, in this order.**

   **Members** — card header: "Members" in serif, the count beside it, a
   search field, and the primary action *"Invite someone"*. Then rows:
   entity mark, username in serif, role, join date, and a right-aligned
   per-row action. Your own row is marked "You" and has no remove action.

   **Pending invitations** — only tokens with no accepted user. Row: a
   placeholder mark (dashed outline, no hue), the note if one exists,
   "Not yet sent to anyone" when there is none, created date, then Copy link
   and Revoke. Card header carries the sentence *"Accepted invitations appear
   above as members."*

2. **Drop used tokens from the UI entirely** — design doc §3. Do not add a
   filter, a toggle or an "all tokens" mode; a used token's only information
   is the member row above it. Nothing about the data model changes.

3. **Generate an invitation without a form.** "Invite someone" creates the
   token and opens the invite-link dialog: title, one sentence of
   consequence, the URL in a monospace field with Copy, one button. Optional
   note becomes an inline edit on the row afterwards, not a field in front of
   the action.

4. **Entity marks for members** come from the entity palette (colour schema
   §5.3) via the existing deterministic derivation — the same mark the person
   has everywhere else. Always beside the name, never instead of it.

5. **Band metadata line**: member count · campaign count ·
   *"you are one of N admins"*. N is counted, never assumed to be 1.

6. **Role column.** Render the role as text. "Admin" carries no hue and no
   badge — a Role column already says what it is (design language §8,
   redundant encoding). Render the actions the server already authorises and
   nothing more; read
   `docs/testing/bug-tracking/1409-member-can-escalate-to-group-admin.md`
   and `702-invitation-admin-role-check-case-sensitive.md` first. If promoting
   a member is not enforced server-side today, this PR does not offer it —
   log that in the drift log.

7. **Phone layout.** Rows become two lines: name in serif, one metadata line
   ("Admin · joined 31 May 2025"), action right-aligned. Minimum 44px targets.
   Primary action full-width above the list. No horizontal scroll at 390px.

8. **Empty states, designed** (design language §8): a group of one, with no
   pending invitations, must read as new rather than broken.

## Do not

- Do not show a token string in a table cell. A truncated `group1-u…` is not
  information; the link behind Copy is.
- Do not colour the role, the invitation state, or a row background. Status
  by row fill is out (design language §2, colour schema §3).
- Do not put the invite flow behind a multi-field form. One click, one link.
- Do not add a bulk-select or a second scroll region inside a card.
- Do not reintroduce a nested `Card` inside the invite dialog.

## Gates

- Members and pending invitations both render correctly for: a group of one; a
  group with two admins; a group with no pending invitations; a group with
  several.
- The invite dialog's link, copied, actually resolves to `/join?token=…` and
  completes a join end to end.
- Revoking an invitation removes the row and invalidates the link.
- No used token appears anywhere in the UI.
- 390px: no horizontal scroll, all targets ≥44px, in all three admin views.
- Serif/sans split holds: usernames, group and campaign names serif; labels,
  roles, dates, buttons sans (design language §4).
- Contrast re-checked for every pair introduced, both modes.
- No token value hand-written; no hex in the diff.

## References

Design doc §3, §4, §4.2, §6. Design language §2, §4, §5, §8. Colour schema
§5.2, §5.3, §5.5. Record D42, D43.
