# PR 14.3 — `/admin/campaigns` and `/admin/group`

Phase 14 · third PR · additive

The two remaining admin views, on the page shell `14-1` built. Smaller than
`14-2`: most of the work is removing a container and a redirect note.

Depends on `14-1`. Independent of `14-2` — may land in either order.

## Read-only, in every PR of this phase

`../../../design/design-language.md`, `../../../design/colour-schema.md`,
`colour-schema.json`, `../../01-token-model.md`, `../00-surface-routing.md`
and every `14-*.md` handoff. Findings go to `../../03-drift-log.md`.

## Scope

- `src/features/user-management/admin/components/CampaignManagementView.tsx`
- `src/features/user-management/admin/components/GroupManagementView.tsx`
- Their `__tests__`

## Do — `/admin/campaigns`

1. **One card**: header with "Campaigns" in serif, the count, search, and
   *"New campaign"* as the primary action.
2. **Campaign rows, not tiles.** The unit of the product is a row you scan
   (design language §8). Name in serif, the description on one line below,
   then created date and author as metadata; Edit and Delete right-aligned.
   Two cards side by side is fine at 1280 if the description genuinely needs
   the width — rows are the default and the phone layout regardless.
3. **The active campaign is marked** — it is the one thing you cannot tell
   from this view today. Text or a mark, never colour alone.
4. **Delete goes through the confirm dialog** with the campaign named and the
   blast radius stated (design doc §6). `danger.confirmBg` for the button.
5. **Empty state**: a group with no campaigns yet reads as new, and the
   primary action is the obvious next step.

## Do — `/admin/group`

1. **Delete the closing note** that tells the reader to use the Users and
   Registration Tokens tabs. The navigation is now three links at the top of
   the page; a workspace does not need to explain its own tabs.
2. **Group identity card**: name in serif, description, created-by and
   creation date as metadata facts. Created-by is *history*, and must not be
   presented as authority (design doc §3) — no "owner", no "the admin".
3. **Group ID** stays, in a monospace field with Copy, labelled as a
   reference value. Nobody types it from memory.
4. **Danger zone at the bottom**, in its own card, separated by more space
   than anything else on the page: leave group, delete group. Both go through
   confirm dialogs. Red appears on the confirm button and the destructive
   action label — nowhere else.
5. **"Create new group" moves out of the header** and becomes a plain action
   near the bottom. Creating a *different* group is not an administrative task
   of *this* group, and putting it top-right next to the group's own identity
   invites the wrong click.

## Do not

- Do not nest a `Card` inside a `Card`. The current view boxes its content
  twice; rules inside one card, per design language §5.
- Do not add group-level settings that do not exist in the data model.
- Do not colour the danger zone's background. A heading, spacing and a
  hairline are enough; the fill is spent on the confirm button.
- Do not let the error banner reproduce the bug in
  `docs/testing/bug-tracking/201-group-management-view-error-not-displayed-in-dialog.md`
  — on a page the banner has somewhere to live, so put it at the top of the
  view. A washed banner takes **body ink**, never the hue on its own wash
  (colour schema §5.5).

## Gates

- Both views render with: one campaign; several; none; and a group of one
  member.
- Delete confirmations name the object and cannot be dismissed by backdrop
  click once interacted with.
- The redirect note is gone and nothing replaces it.
- 390px: no horizontal scroll; the danger zone is not the first thing a
  scrolling thumb reaches.
- Serif/sans split holds. Contrast re-checked in both modes.
- No hex in the diff.

## References

Design doc §3, §4, §6. Design language §5, §8, §11. Colour schema §5.2, §5.5.
