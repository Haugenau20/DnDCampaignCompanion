# PR 12.1 — Derive both modes from one contract

Phase 12 · first PR · opens the phase

Light and dark stop being authored files. One hue-and-chroma contract is
authored; a mode supplies lightness only. This PR changes every colour in the
application and renames nothing.

## Scope

- `src/core/themes/derive/` (new)
- `src/core/themes/definitions/lightTheme.ts`
- `src/core/themes/definitions/darkTheme.ts`
- `src/core/themes/__tests__/token-values.baseline.json`
- `src/core/themes/__tests__/` — one new test file

## Do

1. **A derivation module.** OKLCH to sRGB, with out-of-gamut colours resolved
   by *reducing chroma until they fit* — never by clipping channels, which
   shifts hue and silently breaks the "one hue across modes" guarantee.
2. **The contract as data**, transcribed from `../../design/colour-schema.md`
   §4: hue and chroma per role, a lightness ramp per mode, and the offsets that
   produce hover, selected, disabled and hairline borders from a surface's own
   lightness.
3. **Both theme token trees become generated output.** No hex literal survives
   in either definition file.
4. **A test that the generated trees equal `colour-schema.json`** — the
   `resolved` block, exactly. This test is the contract between the design
   source of truth and the code, and it is the reason the rest of the phase can
   move quickly.

## Do not

- Do not rename a single token. This PR is values only; `12-2` and `12-3`
  own the names. Mixing them makes the diff unreviewable.
- Do not touch `components.css`.
- Do not hand-correct a generated value you disagree with. Change the contract
  in the schema, regenerate both modes, and note it. A theme file that disagrees
  with `colour-schema.json` is a bug even when it looks better.
- Do not regenerate one mode. Both, together, always.
- Do not keep the old hex values as comments "for reference". They are in git.

## Gates

- Generated values match `colour-schema.json` exactly.
- `token-contrast.test.ts` green, extended to assert every chromatic role
  against **page, card and sunken simultaneously** rather than one ground.
- `token-values.baseline.json` updated deliberately, with the diff explained
  as one drift-log line — this is the largest baseline diff the project will
  ever have, and it is expected.
- `css-layers.test.ts` green; no new resting background in a state class.
- Screenshot every route, light and dark, before and after.

## References

Schema §4 (the contract), §4.3 (generation rules), §4.4 (why failure has two
values). Token model §2 (pairs), §4 (names derive from paths). Design language
§10 (contrast is a property of pairs). Record D24.
