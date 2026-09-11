# PR 12.5 — Entity palette by loop; retire `--location-type-*`

Phase 12 · fifth PR · closes the phase

The entity palette is the strongest thing in the old theme files and the last
hand-listed one. Eight hues at even spacing, one lightness, one chroma — that
is a loop, and writing it as a loop is what makes the design language's "single
narrow band" true by construction rather than by care.

## Scope

- `src/core/themes/derive/` — the contract
- `src/core/themes/definitions/`
- `src/core/components/Roster.tsx`, `EntitySigil`
- `src/core/themes/css/components.css`

## Do

1. **Generate the eight hues**: even spacing from the contract's starting hue,
   one fixed lightness and chroma per mode (schema §4.1). Delete both
   hand-listed arrays.
2. **Retire `--location-type-*`.** Those eight ad-hoc tokens are this same
   pattern solved twice; the entity palette absorbs them, as token model §6
   anticipated.
3. **Document that marks move.** A mark's hue comes from its index, and the
   generated order is not the old list's order, so existing entities change
   colour once. Order is the contract from this commit forward: appending a
   ninth hue is safe, reordering is not.

## Do not

- Do not preserve the old hues to avoid marks moving. The hand-listed order was
  arbitrary; freezing it would make the arbitrary order permanent.
- Do not vary lightness or chroma per entry to "balance" the wheel. Perceived
  unevenness across hues is real, and it is the price of the guarantee that
  every mark sits equally quiet against one ink.
- Do not let a sigil be the only statement of an entity's type. It is a
  recognition aid on top of a label, always.

## Gates

- All eight hues at 4.5:1 or better against `entityInk`, both modes.
- No `--location-type-` variable anywhere in `src/`.
- Screenshot the NPC and Location directories, both modes, with enough rows
  that all eight hues appear.
- Ordering test: the same entity id yields the same index, so a mark is stable
  across sessions even though it changed once in this commit.

## References

Schema §4.1, §5.3. Token model §6 (ordered collection; position is meaningful).
Design language §7 (identity marks). Record D29.
