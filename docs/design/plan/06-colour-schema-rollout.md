# Phase 12 — the colour schema

Derives both themes from one contract, and replaces the status scale with
scales named after what they mean.

- **The schema (outranks this document on every value):** `../design/colour-schema.md`
- **Design language (outranks both on every principle):** `../design/design-language.md`
- **Token rules:** `01-token-model.md`
- **Per-PR handoffs:** `handoff/12-1` … `handoff/12-5`

---

## 1. Why this is a phase and not a value tweak

Phases 6–11 are merged, and Phase 11 brought dark to parity by hand. Auditing
the result found that parity does not survive: the two theme files are
independently authored, so nothing prevents them from being different designs,
and they already were. Dark still carried Material Design's stock blue and
purple, five untouched Tailwind defaults in its field tokens, and a sans
heading font where light's was serif.

At the same time the light theme had the opposite failure: one red value doing
ten jobs, including both "primary button" and "failed quest", which made a
Delete link indistinguishable from an ordinary one and an in-progress quest
indistinguishable from a failed one.

Neither is fixable by editing hexes, because neither is caused by a hex. The
first is caused by two files that may each say anything; the second by token
names that describe appearance rather than meaning, so `status.completed`
was available for a location to borrow — which is exactly how the Locations
screen came to paint "visited" green and run its progress bar from red to
green as though exploring were a win condition.

## 2. Why it goes before extraction

What this plan previously called Phase 12 — remove the fallbacks, hand the
token model to `theme-contract` as a versioned package — is now Phase 13.

The schema renames tokens. Renaming tokens in a package that has already been
published is a breaking change to a consumer contract; renaming them before
extraction is a diff. The ordering is therefore forced, not preferred.

## 3. The five PRs

| PR | Does | Visual diff |
|---|---|---|
| `12-1` | The derivation: OKLCH contract in, both theme trees out | Yes — new palette |
| `12-2` | Add `outcome`, `knowledge`, `cue` tokens, no consumers | None |
| `12-3` | Migrate consumers, delete `status.*` | Yes — semantics fixed |
| `12-4` | Non-colour cues: hatch on failure, strike on negation | Small |
| `12-5` | Entity palette by loop; retire `--location-type-*` | Marks change hue |

`12-1` and `12-3` are the two that need real review time. `12-2` is
deliberately additive and screenshot-identical, which is the whole point of
token model §5 — it means `12-3` can be reverted alone without leaving the
app unstyled.

## 4. Sequencing rules specific to this phase

- **Never hand-correct a generated value.** If a colour is wrong, the contract
  in schema §4 is wrong. Edit it and regenerate both modes together. A value in
  a theme file that does not match `colour-schema.json` is a bug even if it
  looks better.
- **Regenerate both modes, always.** A mode regenerated alone is how the
  original drift happened.
- **Additive before destructive.** `12-2` lands before `12-3`, so no commit
  ever has a consumer pointing at a token that does not exist.
- **A domain state may not borrow a scale.** If a state does not fit outcome,
  knowledge or the accent, the scale set is missing something — raise it as a
  drift-log question rather than borrowing the nearest hue.
- **The cue is not optional decoration.** `12-4` is what makes the accent and
  `outcome.failed` safe at 40° apart on a warm palette. Shipping `12-3`
  without it leaves failure encoded by hue alone for deuteranopic users.

## 5. Gates, in addition to the standing six in `04-rollout.md` §4

1. Generated theme values match `../design/colour-schema.json` exactly. A
   mismatch fails the build; it is never resolved by editing the theme file.
2. Every pair in schema §5 at its stated threshold — 4.5:1 text, 3:1 fill and
   border — against **page, card and sunken simultaneously**, both modes.
3. A greyscale pass: every state in quests, locations, rumours and NPCs
   remains distinguishable with hue removed.
4. A deuteranopia pass on the accent and `outcome.failed` specifically, since
   they are the closest pair in the schema.
5. No token named after an appearance. `status.completed` is the pattern being
   removed; do not introduce its replacement.
6. The knowledge ladder is monotonic in contrast against its ground, in both
   modes, in ladder order.

## 6. Done

- `lightTheme.ts` and `darkTheme.ts` contain no authored hex values.
- `status.*` does not exist, and nothing greps for `status-`.
- Locations, rumours and NPCs carry no valenced hue.
- Failure is legible in greyscale.
- The entity palette is eight generated hues, and `--location-type-*` is gone.
- D23–D29 recorded in `03-drift-log.md`.
