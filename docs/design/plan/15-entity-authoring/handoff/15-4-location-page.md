# PR 15.4 — `/locations/:locationId`, and the hierarchy module

Phase 15 · fifth PR · depends on `15-3`

The hardest PR in the phase, sequenced first among the pages because it is the
clearest test of whether the model holds. If it fails here, `15-5` and `15-6`
should be re-planned rather than built.

A location is a tree node, and the current directory renders a parent by
expanding it into a full record card, printing a "Locations in X" heading, and
then nesting a *child record card* inside it — two records at identical weight,
nested, unbounded as depth grows. A row cannot hold a tree. This PR gives the
location a page, and the page a hierarchy module.

Visual reference: `Authoring UI handover.dc.html` · `S4` (the tree in the
directory) and `S5` (the page), plus `S9` for the phone.

## Scope

- `src/app/App.tsx` — the new route
- a new page under `src/pages/locations/`
- a shared page shell, built here and consumed unchanged by `15-5` and `15-6`
- `src/features/campaign-entities/locations/components/LocationDirectory.tsx`
  — the tree
- `src/features/campaign-entities/locations/context/LocationContext.tsx` — a
  reparent method, if none exists
- the matching test files

## Do

1. **The route, and the page shell.** Band header (breadcrumb, identity mark,
   name in serif, one metadata line, knowledge control), then a two-column
   body — prose and structure left, relations and record right — collapsing to
   one column in that order on a phone. `15-5` and `15-6` consume this shell;
   build it to be consumed.
   **The band has no accent pair.** Colour schema §5.2 solves `accent.*`
   against page, card and sunken only; light `#8D4F00` on band `#26211C`
   measures ~1.9:1. Band chips take the neutral band treatment, as the
   reference shows. Do not invent a value — the gap is filed in `TODO.md`.
2. **"Where this sits" — the hierarchy module.** Parent, self, children,
   siblings at reduced emphasis. Three levels at once, always exactly three,
   however deep the data goes.
3. **Reparenting is *Move elsewhere***, opening the `15-2` tray filtered to
   locations and **excluding self and every descendant**. Today's form offers a
   combobox that silently blanks an invalid parent — an invalid choice must be
   unofferable, not quietly discarded.
4. **Adding a child is *Add a place inside***, which is `15-1`'s quick add
   with the parent pre-set. It is the only way a child is created, so nothing
   lands loose.
5. **Every traversal carries a visited set and a depth cap**, and reparenting
   refuses to create a cycle. `PERF-11`/T033 reports the existing parent walk
   has neither. This PR makes cycles *reachable* — a user can now choose a
   parent — so the guard ships here or the feature does not. `15-3`'s shared
   hook already has one; reuse it rather than writing a second.
6. **Deleting a parent asks what happens to its children** — promote to the
   grandparent, or delete the subtree — and names the count. Never orphan,
   never decide silently. Phase 14 §6 for destructive copy.
7. **Features are not children.** `features` stay free text on the record;
   children are documents. A **promote** action moves a feature across,
   keeping its name, for when the party actually arrives.
8. **The directory becomes a tree of rows.** One line per place at every
   depth — mark, name, type in words, knowledge step, what is inside, a way in
   — with 30px indent and a 1px rail. Expanding adds the bounded summary from
   `15-3` and then lists what is inside as more one-line rows.
   **Do not empty the row.** The summary is the point; §1.3 records the
   rejected first draft.
   - The twisty and the name are different targets: twisty toggles, name opens
     the page. No twisty on a leaf.
   - Visual indent caps at four levels; logical indent continues; the name
     column never collapses.
   - **Search flattens the tree** and shows each match with its path. A
     filtered tree with orphaned parents is unreadable.
9. **Edit in place**, per §7 — description, features, notes, tags, the
   knowledge step. No edit form, and no link to one.
10. **The record line states only what exists**: created-by and
    last-modified-by. **Notes may be credited individually**, because a note
    carries its own author and date. Nothing else may imply per-field history
    — §8 and T005.
11. **Formatted dates only**, via `15-3`'s shared helper. The current notes
    list prints a raw ISO timestamp.

## Do not

- **Do not add another `locations` loader.** T023: `LocationDirectory` already
  mounts one of its own under a comment claiming real-time updates, on top of
  the context's two. Consume the provider; if the page genuinely cannot, that
  is a finding for `TODO.md`, not a fifth owner.
- Do not delete `/locations/edit/:id`. `15-8` does, once every field is
  editable here.
- Do not give a location an image slot beyond what `ImageSlot` already
  provides. Uploads are T021 and need Storage rules that are not deployed from
  this repo.
- Do not let a note be edited or deleted. T006 is an open question about who
  owns campaign history; notes here are append-only, as the NPC page's are.
- Do not build the quest page's sections, even where they look similar.
- Do not change `knowledge.*` semantics. A child may be more known than its
  parent; that is legal and is not a warning.

## Gates

- `/locations/:locationId` renders, is linkable, and browser back works.
- The hierarchy module shows parent, self, children and siblings, at depth 1
  and at depth 4.
- **Cycle safety, asserted not eyeballed**: a deliberately-constructed parent
  cycle terminates in the tree render, the breadcrumb, and the descendant
  exclusion. Reparenting cannot select self or a descendant.
- Deleting a parent offers both outcomes and names the child count. No orphan
  is reachable.
- Every field on the page is editable in place, one at a time, with a rejected
  write keeping the typed text.
- A location with no description, no features, no notes and no children looks
  **new, not broken** — prompts, not empty boxes (design language §8, §12.7).
- At 390px and 320px: one column, no horizontal scroll, the tree readable at
  depth 3.
- Screenshot pairs of the directory: the diff reads as one object with parts
  instead of cards inside cards.

## References

`00-entity-authoring.md` §1.3, §3, §6 in full, §7, §8, §10. Design language §5
(depth by value and rule; rules inside cards read as one object with parts —
this is the principle the current nesting breaks), §8 (the row is the unit;
designed empty states), §4 (a place name is the campaign's voice), §7
(identity marks), §12.3 (an empty region is a layout problem). Colour schema
§5.1 (surfaces), §5.5 (`knowledge.*`). Phase 14 §6 (destructive copy).
`TODO.md` T005, T006, T021, T023, T033.
