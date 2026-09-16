# PR 12.2b — The scales that arrived late

Phase 12 · after `12-2` merged · additive, and screenshot-identical

## Read-only, in every PR of this phase

`../../design/colour-schema.md`, `colour-schema.json`, `design-language.md`,
`01-token-model.md`, `06-colour-schema-rollout.md` and every
`handoff/12-*.md` are **read-only**. A handoff that is wrong is reported, not
rewritten. `../03-drift-log.md` is append-only and is where findings go.
Schema §9 has the procedure.

`12-2` shipped `outcome`, `knowledge` and `cue` and is merged. Three more
scales were added to the schema afterwards, when the token tree was finally
enumerated against its real consumers instead of reasoned outward from the
design. They need to arrive the same way the first three did.

**Why this is its own PR rather than part of `12-3a`.** Editing a merged PR's
handoff builds nothing, and folding 26 new tokens into a destructive migration
would mean the one revertible-on-its-own step in this phase stops being
revertible. Late work gets a late PR (D39).

## Scope

- `src/core/themes/token-types.ts`
- `src/core/themes/derive/role-map.ts`, `derive/generate.ts`
- `src/core/themes/__tests__/schema-fixture.test.ts`
- `src/core/themes/__tests__/token-manifest.test.ts`, `token-values.baseline.json`

## Do

1. **Add the 26 leaves in schema §5.5** — taking the tree from 109 to 135, with the sources that section
   gives. Every one resolves to a primitive that already exists, so no value
   `12-1` generated changes.

   - `accent.ink` / `.edge` / `.fill` / `.hover` / `.on` / `.ring` — one
     value under three usage names plus its pair; this is what `color.primary`
     consumers move to in `12-3b`.
   - `feedback.{error,warning,success,progress}.{ink,edge,wash}`
   - `disposition.{friendly,neutral,hostile,unknown}`
   - `outcome.failed.on`, `knowledge.wash`, `danger.confirmBg`,
     `danger.confirmText`

2. **Update the fixture assertions.** `schema-fixture.test.ts` pins `version`
   2 and `leafCount` 101; they become **6** and **135**.

3. **Delete that test's `additions` block.** It names `12-2`'s six colours and
   two cues as exceptions to the tree comparison, because the fixture predated
   them. The schema now carries them in `resolved.<mode>.tree`, so the
   comparison goes back to a plain equality over the whole tree. A correct
   workaround becoming a second source of truth is exactly what it was written
   to prevent.

4. **Teach the borrowed-role verification the wash pairing.** Schema §5.5's
   pairing rule: `feedback.*.ink` on its own `wash` fails AA in three of eight
   mode-state combinations, and *which* three differs by mode. Assert the
   illegal pairing so generation fails rather than review. The legal banner is
   `wash` background, `edge` border, `surface.*.on` text.

5. **Retag the role map.** `retire: "12-3"` becomes `12-3a` or `12-3b` per
   schema §5.4. Sources are unchanged — `accent.base` stays `accent.base`,
   because that is a primitive path, not a token name.

## Do not

- Do not migrate a single consumer. This PR must be screenshot-identical, for
  the same reason `12-2` was.
- Do not rename a primitive. `role-map.ts` on `main` references
  `accent.base`, `outcome.failedInk` and `knowledge.0`; the new tree tokens
  sit *alongside* those, they do not replace them. An earlier draft of the
  schema renamed them and would have broken the generator for no design gain
  (D36).
- Do not add `feedback.info`. Warning and progress both take the accent by
  design.
- Do not add a `presence.*` scale. Presence is not a colour job (D27);
  `disposition` is a different axis and is the one that gets tokens.

## Gates

- Generated trees equal `colour-schema.json` exactly — all 135 leaves, both
  modes, as a plain equality with no exception block.
- Borrowed-role verification green, including the new wash pairing, and the
  pairing assertion demonstrably *able* to fail (a test that pins it).
- `token-manifest.test.ts` enumerates all 135; every theme defines every one.
- Enum validation still rejects an illegal `cue` value.
- **Screenshot-identical to `main`.** If anything moved, a consumer was
  migrated and belongs in `12-3a` or `12-3b`.
- `colour-schema.md` and `colour-schema.json` unmodified in the diff.

## References

Schema §5.5 (the scales and the pairing rule), §7b (what is built), §11 (state
against `main`). Token model §5 (additive before destructive), §6 (ordered
collections, enums), §7 (no aliases). Record D32, D33, D36 and D39.
