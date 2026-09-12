# PR 12.1 — Derive both modes from one contract

Phase 12 · first PR · opens the phase

Light and dark stop being authored files. One hue-and-chroma contract is
authored; a mode supplies lightness only. This PR changes every colour in the
application and renames nothing.

## The rule that comes before the scope

**`../../design/colour-schema.md` and `colour-schema.json` are read-only.**
This PR does not edit them, extend them, or add a section to them. They are the
independent fixture the gate below checks against; a fixture edited by the agent
being checked proves nothing.

If the schema does not answer something — a token with no source, a value that
seems wrong — **stop and write it in `../03-drift-log.md` as a question, then
raise it.** Do not patch around it and do not extend the schema. A blocked PR is
cheap. Schema §9 has the full procedure and the list of which documents are
append-only.

Also read-only for this PR: `design-language.md`, `01-token-model.md`,
`06-colour-schema-rollout.md`, and every `handoff/12-*.md` including this one.
The drift log is the one file you append to.

## Scope

- `src/core/themes/derive/` (new)
- `src/core/themes/definitions/lightTheme.ts`
- `src/core/themes/definitions/darkTheme.ts`
- `src/core/themes/__tests__/token-values.baseline.json`
- `src/core/themes/__tests__/` — one new test file
- `docs/design/plan/finish-generator.py` — **deleted**

## Do

1. **A derivation module.** OKLCH to sRGB, with out-of-gamut colours resolved
   by *reducing chroma until they fit* — never by clipping channels, which
   shifts hue and silently breaks the "one hue across modes" guarantee.
2. **The contract as data**, transcribed from `../../design/colour-schema.md`
   §4: hue and chroma per role, a lightness ramp per mode, and the offsets that
   produce hover, selected, disabled and hairline borders from a surface's own
   lightness.
3. **The role map as data**, transcribed from schema §5.4. The theme tree is
   101 leaves; §5.1–5.3 generate the primitives and §5.4 says which primitive
   each remaining token resolves to. Transcribe it, do not re-derive it.

   Two things about the role map that decide how to implement it:

   - **A role is a derivation, not an alias.** Resolve it at generation time to
     a literal value in the theme tree. Nothing in the running application
     indirects through a second variable name. Do not build an alias layer, a
     `var(--other-token)` chain, or a compatibility map.
   - **Tokens marked "Retired · 12-3" resolve here and are deleted there.**
     They exist in this PR only so that no commit is broken. They are not
     shims and must not outlive `12-3`.
4. **Both theme token trees become generated output.** No hex literal survives
   in either definition file.
5. **A test that the generated trees equal `colour-schema.json`** — the
   `resolved.<mode>.tree` block, all 101 leaves, exactly. This test is the
   contract between the design source of truth and the code, and it is the
   reason the rest of the phase can move quickly. It is only meaningful while
   the fixture stays untouched.
6. **A borrowed-role verification in the generator**, not in review: every
   token that takes a primitive from elsewhere is re-checked against page, card
   and sunken. A primitive that clears 4.5:1 where it was authored is not
   automatically safe where it is borrowed — two of the audit's four measured
   failures were exactly that. Schema §5.4 rule 2.
7. **Delete `docs/design/plan/finish-generator.py`.** It emits `lightTheme.ts`
   from hardcoded hexes, is already stale against `main`, and after this PR
   would be a second generator disagreeing with the first.

## Do not

- Do not rename a single token. This PR is values only; `12-2` and `12-3`
  own the names. Mixing them makes the diff unreviewable.
- Do not touch `components.css`.
- Do not hand-correct a generated value you disagree with. Change the contract
  in the schema, regenerate both modes, and note it. A theme file that disagrees
  with `colour-schema.json` is a bug even when it looks better.
- Do not regenerate one mode. Both, together, always.
- Do not keep the old hex values as comments "for reference". They are in git.
- Do not add an alias map, a legacy-token module, or a `var()` fallback chain.
  Schema §5.4 replaces all three. An alias is a second name that outlives the
  migration it was meant to enable.
- Do not invent a value for a token the role map does not cover. If one exists,
  the map is incomplete and that is a finding, not a gap to fill.

## Gates

- Generated values match `colour-schema.json` exactly — all 101 leaves, both
  modes.
- `colour-schema.md` and `colour-schema.json` are **unmodified in the diff.**
  If either appears in `git diff --stat`, the PR is wrong regardless of what
  else is green.
- Borrowed-role verification green: 3:1 for `icon.border`,
  `action.outline.border` and `field.border`; 4.5:1 for every borrowed ink.
- `token-contrast.test.ts` green, extended to assert every chromatic role
  against **page, card and sunken simultaneously** rather than one ground.
- `token-values.baseline.json` updated deliberately, with the diff explained
  as one drift-log line — this is the largest baseline diff the project will
  ever have, and it is expected.
- `css-layers.test.ts` green; no new resting background in a state class.
- Screenshot every route, light and dark, before and after.

## References

Schema §4 (the contract), §4.3 (generation rules), §4.4 (why failure has two
values), §5.4 (the role map), §9 (why this PR may not edit the schema), §10
(the learnings behind all of it). Token model §2 (pairs), §4 (names derive from
paths), §7 (what tokens must not be). Design language §10 (contrast is a
property of pairs). Record D24 and D30.
