# 02 · Copy changes

These are the only places the voice appears. Keep the existing component structure and styling; only the text and, in two cases, an icon change.

| Where | File (probable) | Today | New |
|---|---|---|---|
| Rumors, empty (whole section, not filtered) | rumor list page / EmptyState usage | "No rumors yet" | **Muninn hasn't heard any rumors yet** |
| NPCs, empty | NPC list / EmptyState usage | generic "no items" | **Muninn hasn't met anyone yet.** |
| Locations, empty | location list / EmptyState usage | generic "no items" | **Muninn hasn't been anywhere yet.** |
| 404 title | NotFoundPage | "Page not found" | **Muninn has no memory of this page** |
| 404 body | NotFoundPage | "Nothing in the Companion lives at {path}…" | **Nothing lives at {path}. The link may be mistyped, or the page may have moved.** (also removes the old name "the Companion") |
| Signed-out home | `src/pages/home/SignedOutHome.tsx` | — | New line under the buttons: *Muninn was Odin's raven of memory.* + link **About the name** → `/about` |
| Sign-in band | `src/features/user-management/auth/pages/SignInPage.tsx` | — | *Muninn was Odin's raven of memory.* in the band's bottom slot |
| Footer | `src/app/layout/Footer.tsx` | "© 2026 Muninn" | **© 2026 Muninn · muninn.quest**, plus an **About** link before Privacy Policy and Contact Us |

Keep the existing description and button text in each empty state; only the title changes. For example, the rumors empty state keeps "Tavern gossip is the cheapest way to seed a session. Add the first one." and "Add a rumor".

## Details
**Empty states** (`src/pages/layouts/common/components/EmptyState.tsx`)
- Where the shared EmptyState currently shows a **generic** icon (no section-specific icon), show the ᛗ glyph instead: about 26px, muted ink colour, 50% opacity, the same as the generic icon today.
- If a section already passes its own icon, keep that icon.
- **Filtered or search "no results" states stay plain.** The Muninn copy is only for "this campaign has none of these yet".
- Use the same structure for other entity types that have a whole-section empty state (e.g. quests, chapters). Write them only if they're as plain as the three above; otherwise leave them alone.

**404**
- Centred card on the page background: ᛗ at 40px (muted, 50% opacity) above the title.
- Title in Zilla Slab 700, about 24px. Body in muted ink, max width about 380px, with the path in monospace.
- Keep the existing "Back to the dashboard" button.

**Signed-out home**
- Below the button row, add a 1px top border (the border token) with 14px padding above it. In one baseline-aligned row: the italic Zilla Slab line (15px, ink colour), then the "About the name" link (accent colour, underlined).
- The headline and the example panel don't change.

**Sign-in band**
- The line goes in the band's bottom slot, in italic Zilla Slab at 14px, in the chrome muted colour.
- That slot is currently only used for "You were heading to…". **If there is a destination, show it and hide the Muninn line.**
- Put the ᛗ mark (24px square) next to the small "Muninn" at the top of the band, like the header.
- Optional, later: a public-domain raven engraving as the band image. Not part of this task.

## Done when
- Each new string shows in light and dark.
- A filtered list with no results still shows the old plain message.
- `grep -ri "companion"` finds no user-facing copy.
- design-language.md §11 has the new sentence (see README).
