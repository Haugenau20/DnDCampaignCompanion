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

## 3b. The source of truth is read-only

`../design/colour-schema.md` and `colour-schema.json` are **not editable by
any PR in this phase.** Neither is `design-language.md`, `01-token-model.md`,
this document, or any `handoff/12-*.md`.

The reason is mechanical rather than procedural. The phase's central gate is
"generated themes equal the fixture". If the agent generating the themes also
authors the fixture, that gate compares the implementation to itself and passes
by construction — which is worse than having no gate, because it reports green.

`03-drift-log.md` is append-only and is where every finding goes.

**When a document is wrong, and one will be:** stop, append the gap to the
drift log as a question, raise it, and wait for a corrected document. Do not
extend the schema to cover what it missed. Version 1 of the schema was wrong by
52 leaves — it defined the primitives and the handoff assumed it covered the
token tree. That was found by an implementation agent, reported, and fixed at
the source; §5.4 exists because of it. That is the loop working.

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
- **No alias layer, in any PR.** A role in schema §5.4 is a derivation
  resolved at generation time, not a variable pointing at a variable. Tokens
  marked "Retired · 12-3" resolve in `12-1` so no commit is broken, and are
  deleted in `12-3` with their consumers. An alias that survives its migration
  is a second way to say what a pair already says (token model §7), and grep
  cannot tell it from an intentional reference.
- **A borrowed role is re-verified, not assumed.** A primitive that clears
  4.5:1 where it was authored is not automatically safe where it is borrowed.
  The check belongs in the generator, not in review.

## 5. Gates, in addition to the standing six in `04-rollout.md` §4

1. Generated theme values match `../design/colour-schema.json` exactly — all
   101 leaves, both modes. A mismatch fails the build; it is never resolved by
   editing the theme file, and never by editing the fixture.
1b. `colour-schema.md` and `colour-schema.json` do not appear in
   `git diff --stat` for any PR in this phase. If either does, the PR is wrong
   regardless of what else is green.
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
- Every one of the 101 leaves generated; no hex literal in either definition
  file; no alias layer anywhere.
- `finish-generator.py` deleted.
- D23–D30 recorded in `03-drift-log.md`.
