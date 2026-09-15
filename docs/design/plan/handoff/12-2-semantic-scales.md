# PR 12.2 — Add the semantic scales

Phase 12 · second PR · **MERGED on `main` (`1b3cc2d`)**

> Historical, and **partially superseded.** What merged was `outcome`,
> `knowledge` and `cue` — the three scales this file described when it was
> written. The `feedback` and `disposition` scales below were added to the
> schema afterwards (v6, D32) and are **not** on `main`; they arrive with
> their consumers in `12-3a` and `12-3b`, which is a departure from this
> phase's additive-before-destructive rule and is deliberate — adding them
> without consumers would mean a third screenshot-identical PR for two scales
> whose values already exist.
>
> `accent.*` is likewise new in v6 (schema §5.5) and lands in `12-3b`, where
> `color.primary` is deleted and its consumers need a name to move to. · **MERGED**

> Historical record — do not edit, and do not execute. This PR shipped
> `outcome`, `knowledge` and `cue`. The `feedback` and `disposition`
> sections below were added to this file *after* it merged, which built
> nothing — that error is recorded as D39, and those scales are built by
> `12-2b` instead.

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
3. **`feedback`** — `error`, `warning`, `success`, `progress`, each an
   ink/edge/wash triple. This is the *application* talking about itself, which
   is a different voice from the campaign's record even where the hues
   coincide. There is deliberately no `info`: warning and progress both take
   the accent, because the accent already means "your attention is needed".
4. **`disposition`** — `friendly`, `neutral`, `hostile`, `unknown`. An
   NPC's stance toward the party. Valenced, unlike presence — schema §3
   explains why the two differ.
5. **`cue`** — an enum: `hatch`, `strike`, `none`. Validate the *value* is
   legal, not merely that the variable exists; token model §6 asks for this
   explicitly and it is the stronger guarantee.
6. **Leave `status.*` in place**, unchanged and still consumed. Nothing about
   this PR should be visible.

## Do not

- Do not add a `presence.*` scale. NPC presence is deliberately not a colour
  job — alive is plain ink, deceased is muted ink plus `cue.strike` (D27).
  Adding the tokens is how the valence creeps back in. `disposition` is a
  different axis and does get tokens.
- Do not merge `feedback.error` into `outcome.failed` because they resolve to
  the same hex today. Separate names are what let them diverge later without
  archaeology, and what stops a save error being "fixed" by changing quests.
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
