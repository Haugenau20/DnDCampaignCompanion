# PR 6.3 — Directory chrome: search, filters, density, empty states

Phase 6 · third PR · depends on 6.2

The frame around a collection: the search field, the filter row, section
heads, counts, pagination, and the empty and loading states.

## Scope

- `src/core/components/Roster.tsx` (the search and section-head region, ~lines
  280–350)
- the four directory components
- `src/features/collaboration/notes/components/NotesList.tsx`
- `src/core/themes/css/components.css`

## Do

1. **One accent inside the collection, on the active filter.** An active filter
   is the accent; every inactive control is `action.ghost` or
   `action.outline`. The page's primary action ("New NPC") is the one accent
   that sits *outside* that budget — it is the page's action, not the
   collection's, and it is accented on every route including an empty one.
2. **Search sits on `field.bg`** with the real field border and focus ring —
   not a bare input on the card.
3. **Section heads are sans, small, quiet**, with the count as muted ink on the
   same line. Remove the `bg-secondary` pill around counts
   (`Roster.tsx` ~line 337) and the fading rule (~line 349) if it is doing the
   same job as the head.
4. **Density:** rows comfortable to read at length, one line of metadata,
   generous vertical rhythm. Set it once in `components.css`; no per-directory
   padding.
5. **Empty and loading designed, not blank.** An empty directory states what
   the collection is for and offers the one action that fills it. A loading
   directory shows the row rhythm, not a spinner.

## Do not

- Do not add a second accent for "filters active" versus "filter hovered".
- Do not build a filter chip that fills with accent — border, not fill (A3's
  chip rule, same component eventually).
- Do not add sort or view-mode controls that do not exist today. This is a
  visual phase.

## Gates

- At most one accent-coloured element inside the directory card and its
  toolbar filters, plus the page's primary action. Zero in the toolbar with no
  filter active.
- Active filter and focus ring both ≥3:1 against their surface.
- Screenshot: each directory empty, loading, one page, filtered.

## References

Design language §2 "one accent, earned by action", §8 (density and rhythm,
designed empty states), A1 in `../05-archetypes.md`.
