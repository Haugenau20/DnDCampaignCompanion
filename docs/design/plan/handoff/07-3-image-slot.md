# PR 7.3 — The image slot and its designed empty state

> **Not executed as its own PR. The work shipped inside `07-2-5` (R18).**
> The mock the redo was built from opens with the image band, and the identity
> card's proportions are set by it, so building the layout around a hole and
> filling it afterwards would have meant judging the page twice. Every rule
> below was kept: no Storage, no picker, no upload, no generation, and the
> empty state is the whole component. `.party-crest-slot` was generalised to
> `.image-slot` behind a shared `ImageSlot`, which is the "two uses is the
> threshold" instruction in step 1 being taken at the moment the second use
> arrived. Kept here because its reasoning is still the reasoning.

Phase 7 · third migration PR · closes the phase · depends on 7.1

One image slot, on the NPC page (D61 — there is no Location page). **No bitmaps
ship** (D6): this PR builds the slot and its empty state, and nothing else. The upload path is a separate,
optional PR that is deliberately not written yet.

The empty state *is* the design. Most slots will be empty for most entities for
the life of the campaign, so a slot that only looks right once someone uploads
something is a slot that looks wrong almost always.

## Scope

- the NPC page component from 7.1
- `src/core/themes/css/components.css`
- a shared slot component if the second use earns it — `PartyCrest` is the
  first, and two uses is the threshold, not one

## Do

1. **Generalise the pattern that already exists.** `PartyCrest` ships a working
   designed-empty slot: `.party-crest-slot`, a hatched panel built from
   `surface.sunken.bg` and a repeating gradient in `surface.page.selected`,
   with `role="img"` and an `aria-label` that says none has been uploaded. Lift
   that into something both callers use rather than writing a second one.
   Adoption before invention.
2. **Fixed aspect, cropped to fill, centred. No focal point, no crop UI**
   (D44). A crop tool is a feature built for content that does not exist yet.
3. **Text over the image always sits on a scrim** strong enough to meet
   contrast independent of the image (§6). If the page currently puts no text
   over the slot, keep it that way — that is the cheapest way to honour the
   rule.
4. **The slot is on the page, not the row.** Imagery goes on low-frequency
   surfaces; a directory row never gets one (§6).
5. **The page must look finished with the slot empty.** Check this by looking
   at it, not by reasoning about it: if the page reads as broken or
   placeholder-ish, the slot is wrong and no upload will fix it.

## Do not

- Do not add Firebase Storage, an upload control, a file picker, or a
  generation call. Not in this PR, and not "behind a flag".
- Do not use a stock illustration or an icon as the empty state. The hatched
  panel reads as reserved space; a picture of a mountain reads as a wrong
  picture.
- Do not let the slot push the NPC's name or description below the fold.
  Recognition is the job; the name is what does the recognising.
- Do not give the slot a hue from the entity palette. That palette belongs to
  the sigil, and two marks in two hues for one entity is the row problem again
  at a larger size.

## Gates

- The page looks finished with an empty slot, in both themes. Screenshot as
  evidence, not as illustration.
- The slot has an accessible name that says the state honestly.
- No new token unless it earns a drift-log entry.
- No `Storage` import, no upload affordance, anywhere in the diff.
- Reflows without horizontal scroll at 320px (render in a 320px iframe — a
  maximized Chrome window silently ignores resize below its minimum width).

## References

D6, D44; design language §6 (imagery), §2 "richness comes from shipped
structure"; A2 in `../05-archetypes.md`.
