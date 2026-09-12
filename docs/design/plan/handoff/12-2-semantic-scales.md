# PR 12.2 — Add the semantic scales

Phase 12 · second PR · additive, and screenshot-identical

The scales that replace `status.*` arrive with no consumers, so the
destructive PR that follows can be reverted on its own without leaving the
application unstyled. This is token model §5 being used for what it is for.

## Read-only, in every PR of this phase

`../../design/colour-schema.md`, `colour-schema.json`, `design-language.md`,
`01-token-model.md`, `06-colour-schema-rollout.md` and every
`handoff/12-*.md` are **read-only**. A handoff that is wrong is reported, not
rewritten. `../03-drift-log.md` is append-only and is where findings go.
Schema §9 has the procedure.

## Scope

- `src/core/themes/token-types.ts`
- `src/core/themes/derive/` — the contract
- `src/core/themes/definitions/`
- `src/core/themes/__tests__/token-manifest.test.ts`

## Do

1. **`outcome`** — `succeeded`, and `failed` as a pair of `ink` and
   `fill`. Two values for failure is deliberate; schema §4.4 explains why, and
   the explanation is not negotiable on a dark ground.
2. **`knowledge`** — an *ordered collection* of three, the same shape as the
   entity palette (token model §6). Position is the ladder, so it is an array
   and not a record with names like `low`/`high`.
3. **`cue`** — an enum: `hatch`, `strike`, `none`. Validate the *value* is
   legal, not merely that the variable exists; token model §6 asks for this
   explicitly and it is the stronger guarantee.
4. **Leave `status.*` in place**, unchanged and still consumed. Nothing about
   this PR should be visible.

## Do not

- Do not add a `presence.*` scale. NPC presence is deliberately not a colour
  job — alive is plain ink, deceased is muted ink plus `cue.strike` (D27).
  Adding the tokens is how the valence creeps back in.
- Do not migrate any consumer. Not even one, not even an obvious one.
- Do not name a knowledge step after a domain word. `knowledge.1` is a step on
  a ladder that locations and rumours both use; `knowledge.visited` would tie
  it to one of them.

## Gates

- Manifest test enumerates the new variables, and every theme defines every
  one — no fallbacks needed, because both themes are generated now.
- Enum validation rejects an illegal `cue` value.
- Contrast test green for the new roles at their stated thresholds.
- **Screenshot-identical to `12-1`.** If anything moved, a consumer was
  migrated and does not belong in this PR.

## References

Schema §2 (the four colour jobs), §4.4. Token model §5 (fallbacks), §6 (ordered
collections and enums). Record D26 and D28.
