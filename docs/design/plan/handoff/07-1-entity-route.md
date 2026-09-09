# PR 7.1 — The NPC route and its read view

Phase 7 · branch `visual/phase-7-entity` · first migration PR · depends on 7.0

One route, `/npcs/:npcId`, reached from a "More info" action on the directory
row (D41, narrowed by D61). Read-only in this PR; 7.2 makes it editable and 7.3
adds the image slot.

**There is no Location route, and adding one is out of scope.** Q14 settled
this: the Location row already renders every field the type has, so the page
would restate it at a different URL, and `/locations?highlight=<id or name>`
already gives Locations a working permalink. If you think a Location page has
become worth building, that is a new decision — reopen it in the drift log
rather than adding the route here.

**Why this page exists at all**, in one sentence, because it should shape every
judgement call you make: the NPC type has ten content fields, the row shows
four, and **six are collected by the create and edit forms, written to
Firestore, and rendered nowhere in the app**. This page is not a new surface for
existing content; it makes write-only data readable for the first time.

**Additive, and it must stay additive.** The row's inline expansion keeps every
field and action it has today. If this PR makes a directory worse, it has
failed regardless of how the new page looks.

## Scope

- `src/app/App.tsx` (one route)
- `src/pages/npcs/` (one new page component)
- `src/features/campaign-entities/npcs/components/NPCDirectory.tsx`
- `src/core/components/Roster.tsx` (the "More info" affordance, if shared)
- `src/core/themes/css/components.css`
- the matching test files

## Do

1. **One route**, joining the pair that already exists: `/npcs/:npcId` beside
   `/npcs/create` and `/npcs/edit/:npcId`. React Router ranks static segments
   above dynamic ones, so `/npcs/create` still wins — but assert it in a test
   rather than trusting it, because the failure mode is a create page that
   silently becomes a detail page for an NPC called "create".
2. **"More info" on the row.** It sits in the expanded content, not the
   collapsed row: the collapsed row is the highest-frequency surface in the
   product and does not get a second control. A row that is already expanded
   has told you it wants more.
3. **The page shows what the row does not.** Verified against the directories
   in 7.0, not against the deleted cards:
   - **NPC** — the row's expansion renders four fields (description, notes,
     race, recorded-by) and the collapsed row adds status, relationship,
     occupation and location. Genuinely absent, and this page's whole reason to
     exist: `appearance`, `personality`, `background`,
     `connections.relatedNPCs`, `connections.affiliations`,
     `connections.relatedQuests`. Note that **no component has ever rendered
     the three `connections.*` arrays** — there is no prior art for how they
     look, `relatedNPCs` holds ids needing `getNPCById`, and `affiliations` is
     free text. Expect many campaigns to have them empty; design the empty
     state first.
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
- Do not add the route for Locations, Quests, Rumors or Notes. NPCs only
  (D61). One entity is the trial D41 asked for.
- Do not build the image slot here. 7.3 owns it, and the page must look
  finished before it arrives — that is the test of whether the slot is an
  enhancement or a crutch.
- Do not reach for the deleted cards. 7.0 removed them; their field list is
  in step 3.
- Do not attribute individual notes to a person. `NPCNote` and `LocationNote`
  are `{ date, text }` — no author field. Only `RumorNote` carries
  `createdByUsername`, and rumors are not in this PR. The note history can say
  *when*, never *who*; the entity's own attribution is the only credit
  available. Inventing a byline would be showing data that does not exist.

## Gates

- The row's expansion renders exactly what it did before this PR. Assert it.
- `/npcs/create` still resolves to the create page. Assert it.
- An unknown id renders the designed not-found, not a crash.
- Empty campaign, and an entity with only a name: both look finished.
- One accent on the page, and it is the page's own action.
- Contrast: AA text and 3:1 non-text on both `card` and `sunken`.
- Every one of the six previously invisible fields renders when present, and
  the page still looks finished when all six are empty. This is the gate that
  matters: if a populated NPC still shows nothing new, the PR did not happen.
- Screenshot: an NPC page in light and dark, plus the row showing its new
  "More info".

## References

D41, D43, D46; design language §4, §11, §12.7; A2 in `../05-archetypes.md`.
