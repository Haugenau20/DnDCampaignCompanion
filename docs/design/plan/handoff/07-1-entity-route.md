# PR 7.1 — The entity route and its read view

Phase 7 · branch `visual/phase-7-entity` · first migration PR · depends on 7.0

A route per NPC and per Location, reached from a "More info" action on the
directory row (D41). Read-only in this PR; 7.2 makes it editable and 7.3 adds
the image slot.

**Additive, and it must stay additive.** The row's inline expansion keeps every
field and action it has today. If this PR makes a directory worse, it has
failed regardless of how the new page looks.

## Scope

- `src/app/App.tsx` (two routes)
- `src/pages/npcs/` and `src/pages/locations/` (two new page components)
- `src/features/campaign-entities/npcs/components/NPCDirectory.tsx`
- `src/features/campaign-entities/locations/components/LocationDirectory.tsx`
- `src/core/components/Roster.tsx` (the "More info" affordance, if shared)
- `src/core/themes/css/components.css`
- the matching test files

## Do

1. **Two routes**, matching the pair that already exists for each entity:
   `/npcs/:npcId` beside `/npcs/create` and `/npcs/edit/:npcId`, and
   `/locations/:locationId` likewise. React Router ranks static segments above
   dynamic ones, so `/npcs/create` still wins — but assert it in a test rather
   than trusting it, because the failure mode is a create page that silently
   becomes a detail page for an NPC called "create".
2. **"More info" on the row.** It sits in the expanded content, not the
   collapsed row: the collapsed row is the highest-frequency surface in the
   product and does not get a second control. A row that is already expanded
   has told you it wants more.
3. **The page shows what the row does not.** The row's expansion already
   carries description, dated notes, race, recorded-by, edit and delete. The
   page carries all of it plus:
   - **NPC**: `appearance`, `personality`, `background`, `connections.relatedNPCs`,
     `connections.affiliations`, `connections.relatedQuests`, the full `notes[]`
     history rather than a truncated list.
   - **Location**: `features[]`, `connectedNPCs`, `relatedQuests`, `tags[]`,
     `lastVisited`, the parent location and any children, the full `notes[]`.
4. **Layout**: `surface.card` for the body, `surface.sunken` for the aside —
   relations, tags, attribution. Sigil at 44px beside a serif name. Sans for
   every piece of metadata (D46, same rule as the row).
5. **Attribution is visual, not a footnote** (design language §11). Credit the
   character who wrote it, using the fields already on `ContentAttribution`.
6. **Breadcrumb.** `PageShell` takes one; the page is reached from a directory
   and must say so.
7. **Designed states**: a missing id renders a designed not-found, not a blank
   page or a crash. An entity with nothing but a name still looks finished.

## Do not

- Do not call it a "timeline of edits". `ContentAttribution` stores *created*
  and *last modified* and nothing between, so a timeline would be two points
  pretending to be a history. Show the two facts plainly. Real edit history is
  a data feature, not a visual one, and is out of scope (Q12).
- Do not remove anything from the row's expansion to "make room" for the page.
- Do not add the route for Quests, Rumors or Notes. NPCs and Locations only,
  until the pattern proves itself (D41).
- Do not build the image slot here. 7.3 owns it, and the page must look
  finished before it arrives — that is the test of whether the slot is an
  enhancement or a crutch.
- Do not reach for the deleted cards. 7.0 removed them; their field list is
  in step 3.

## Gates

- The row's expansion renders exactly what it did before this PR. Assert it.
- `/npcs/create` still resolves to the create page. Assert it.
- An unknown id renders the designed not-found, not a crash.
- Empty campaign, and an entity with only a name: both look finished.
- One accent on the page, and it is the page's own action.
- Contrast: AA text and 3:1 non-text on both `card` and `sunken`.
- Screenshot: an NPC page and a Location page, light and dark, plus the row
  showing its new "More info".

## References

D41, D43, D46; design language §4, §11, §12.7; A2 in `../05-archetypes.md`.
