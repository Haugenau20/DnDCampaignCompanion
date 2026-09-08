# Visual transition: current → 2a/3a

Master plan. Read this first; it is the only document that defines phase order.

- **Design language (outranks this document):** `../design/design-language.md`
- **Token rules:** `01-token-model.md`
- **Per-phase gates:** `02-acceptance-criteria.md`
- **Every decision + every reversal:** `03-drift-log.md`

This plan describes one project and will be finished. The design language
describes the product and outlives it — when the two disagree, or when a bump
forces a trade this plan does not cover, the design language decides.

---

## 1. What this is

Home and the global chrome move from a flat blue/white utility look to a
**banded** look: a dark chrome surface, a hero band carrying the campaign
identity, warm low-contrast page surfaces, and a per-entity identity mark on
every list row.

Two candidate finishes exist, `2a` (higher accent load) and `3a` (accents
concentrated in the chrome, quiet interior). **They differ only in token
values.** Structure, markup, token names and component boundaries are
identical. The choice between them is deferred to Phase 5, by design — it is
the one decision that gets better with real data in front of it.

Nothing in Phases 0–4 depends on which one wins.

## 2. What this is not

Explicitly out of scope. If you find yourself here, stop and log it in
`03-drift-log.md` instead of doing it.

- Story, Quests, Rumors, NPCs, Locations, Notes, auth pages, signed-out
  landing page. They keep today's look. They **must not break** — the chrome
  is global, so they inherit it.
- Bitmap imagery of any kind: no plates, no uploads, no Firebase Storage, no
  AI generation, no licensing or attribution work. Image slots ship with a
  designed empty fallback.
- Extracting the shared package. This project restructures tokens *in the
  contract's shape*; extraction happens after, in `theme-contract`.
- Dark and medieval theme parity. They follow later, and the fallback rule in
  `01-token-model.md` §5 is what makes that safe.

## 3. Sequencing against theme-contract

Interleaved. Restructure in-app now, extract later.

The rationale, so it survives being questioned in three weeks: today's tokens
are ~95 flat colour leaves, which exercise none of the hard parts of a
generation spec. The visual work is what surfaces them — surfaces that carry a
foreground, ordered collections, enum-valued tokens. Designing the package
against the current flat map would freeze a spec its first real consumer
immediately strains.

What that means in practice:

- Phase 1 adopts the contract's **shape** — nested token objects, variable
  names derived from token paths, no positional mapping.
- Shape decisions that are expensive to reverse get decided in Phase 1 and
  written into `theme-contract` as ADRs **as they are made**, not at the end.
  See §6.
- No dependency on the package existing, at any phase.

## 4. Phases

One branch per phase, cut from the long-lived integration branch. Each phase
is independently mergeable and independently revertable.

| # | Phase | Branch | Visual delta |
|---|---|---|---|
| 0 | Foundations & bug fixes | `visual/phase-0-foundations` | Lists gain separation. Nothing else. |
| 1 | Token model restructure | `visual/phase-1-tokens` | **None. Screenshot-identical.** |
| 2 | Global chrome | `visual/phase-2-chrome` | Header + footer become a themed surface |
| 3 | Entity sigils | `visual/phase-3-sigils` | Identity marks on rows |
| 4 | Home composition | `visual/phase-4-home` | Banded Home goes live |
| 5 | Value tuning → pick 2a or 3a | `visual/phase-5-tuning` | The finish is chosen |

### Phase 0 — Foundations & bug fixes

Fixes three defects that are independent of any visual direction, and
establishes the cascade discipline everything later depends on.

- Declare an explicit CSS layer order, surface before state.
- Split `.selectable-item`: **surface** classes own resting background and
  border; **state** classes own hover, selected and focus only. Today it owns
  both and is declared last, so its resting background beats `.card` and
  `.bg-secondary` everywhere — this is why every list surface renders one flat
  tone and why the quest cell's tint never appears.
- `Typography` applies `leading-none` unconditionally; body copy should not.
- The active nav item renders `--color-primary` on `--hover-medium`, which in
  the default theme is ~2.87:1. Below AA.

Why first: it is the only phase that improves the product with no new tokens
and no design commitment, and it removes the cascade ambiguity that would
otherwise make Phase 2 unpredictable.

### Phase 1 — Token model restructure

Adopt the nested token model in `01-token-model.md`. Replace the positional
declaration/`setProperty` mapping with derivation from token paths. Introduce
surface/foreground pairs, each falling back to its current value.

**The gate is that nothing changes visually.** If any screenshot differs, the
restructure is wrong or a fallback is missing. This is the highest-leverage
gate in the plan: it is the one phase where "looks the same" proves
correctness.

### Phase 2 — Global chrome

Header and footer consume the chrome surface pair instead of naming colours.
The default theme's chrome becomes dark; unmigrated themes fall back and look
as they do today.

Delete the theme-conditional patches this replaces — `[data-theme="light"]
.header-title` and its siblings exist *only* because no token could say "text
on the chrome surface". If any survive this phase, the pair is wrong.

Affects every page. This is the phase to check the out-of-scope surfaces still
read correctly.

### Phase 3 — Entity sigils

An ordered entity palette plus a deterministic mark per entity id, so the same
NPC or location looks like itself everywhere it appears. Absorbs the eight
hand-written `--location-type-*` tokens, which are already this pattern solved
ad hoc.

Ships on Home. Other surfaces adopt it later at no extra cost.

### Phase 4 — Home composition

Hero band with its empty-slot fallback, stats strip, activity list, quests
aside. Ornament driven by tokens, not literals.

### Phase 5 — Value tuning → pick 2a or 3a

Tune accent count and sigil saturation against real campaign data, then
commit. Record the choice and the reason in the drift log.

Cheap and worthwhile: put both in front of the other players for ten seconds
each and ask which they'd rather open. Three real users beat any
general-population study for a four-user product.

## 5. If you only have one evening

Phase 0 alone is worth shipping and leaves the product better with zero design
risk. Phase 1 alone is worth shipping and leaves it visually untouched. Do not
start Phase 2 without finishing Phase 1 — a half-migrated token model is the
one state that is worse than either end.

## 6. One-way doors

Cheap now, expensive after Phase 2. Decide deliberately; each has an entry in
`03-drift-log.md`.

1. **Variable naming derivation** — how a token path becomes a variable name.
   Every consumer depends on it and it is what the shared package will
   inherit.
2. **Nesting shape** — grouping by surface vs by component. Changing it later
   is a rename across the app.
3. **Entity palette as an ordered collection** — vs named entries. Determines
   whether a mark's colour is stable when the palette grows.
4. **Retiring `--location-type-*`** — a data migration once anything persists
   a colour choice.

Reversible any time, so do not agonise: which theme is default, how dark the
chrome is, accent count, sigil saturation, ornament strength, whether 2a or 3a
wins.

## 7. Done

- Phases 0–5 merged to the integration branch, each having passed its gate in
  `02-acceptance-criteria.md`.
- Default theme at parity. Dark and medieval unmigrated but visually intact
  via fallbacks.
- No `[data-theme=…]` rule remains for anything a surface pair can express.
- Out-of-scope pages verified unbroken under the new chrome.
- Contrast audit clean at AA for text, 3:1 for non-text.
- Shape decisions written into `theme-contract` as ADRs.
- `03-drift-log.md` reflects what actually happened, including reversals.
