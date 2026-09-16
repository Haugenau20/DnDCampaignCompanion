# Colour schema — Torchlight Forge

**Source of truth for every colour in the application.** Values are generated,
not chosen: this document declares a contract, and `colour-schema.json` is its
output. Neither file is edited by hand.

Ranking: `design-language.md` decides *why* and outranks this document on any
principle. This document decides *what the numbers are* and outranks every
theme file, plan and handoff on any value. `plan/` decides *when*.

- **Why it looks like this:** `design-language.md`
- **How tokens are shaped:** `../plan/01-token-model.md`
- **Generated values:** `colour-schema.json`
- **Rollout:** `../plan/06-colour-schema-rollout.md`

---

## 1. What changed, and why it is a schema rather than two theme files

Before this document, light and dark were two independently hand-authored
files of roughly ninety-five hex values each, with nothing in the code
requiring them to be the same design. They drifted, and the drift was not
subtle: light carried a deliberately authored palette while dark still ran
Material Design's stock blue and purple and five untouched Tailwind defaults,
and its heading font was sans where light's was serif.

That is not a values problem, so it does not have a values fix. Two files that
may each say anything will eventually each say something different.

So the modes stop being authored. **Every role is authored once as a hue and a
chroma, and a mode supplies only lightness.** Cross-mode recognition — the
property that made the amber still read as *this product's* amber after the
switch — becomes a consequence of the structure instead of a thing anyone
maintains.

Four things fall out of that, all of them wanted:

- A theme cannot be a different design. It can only be the same design at
  different lightness.
- A new theme is about a dozen numbers, not ninety-five hexes.
- Contrast becomes an assertion rather than a review habit, because lightness
  is the input. Every ratio in §5 is generated and checked, not measured
  afterwards.
- The entity palette becomes a loop rather than a list, which is what finally
  makes the design language's "single narrow band of lightness and chroma"
  true by construction.

## 2. The colour jobs

Four, and the count is the budget. This **amends design language §3**, which
specified three; the reasons are in §3 below.

**Four hues. Six scales.** The distinction matters: the *hue budget* is four
families and does not grow, while a *scale* is a named set of roles that draws
on those hues. Two scales were added after the token tree was enumerated
against its real consumers (D32), and neither introduced a colour.

| Scale | Hue family | Valenced | Carries |
|---|---|---|---|
| **Accent** | amber | no | Action, interactivity, anything in progress |
| **Outcome** | green + red | **yes** | A thing that concluded: succeeded, failed |
| **Knowledge** | indigo, three steps | no | How much the party knows |
| **Entity** | eight hues | no | Identity marks |
| **Feedback** | amber, green, red | **yes** | The *application* talking about itself |
| **Disposition** | green, red, neutral | **yes** | An NPC's stance toward the party |

The hue budget is unchanged from version 1 of this document. Feedback and
disposition were added in v6 and introduced **no new colour** — every value
they carry already existed as a primitive.

Everything else is surface ink. A fallback state is not a colour job — it
takes `surface.*.onMuted` and says nothing.

**Why feedback is a separate scale from outcome.** A failed quest is a fact
about the fiction; a failed save is a fact about the software. They are
different voices, and conflating them is how a token ends up borrowed. They
resolve to the same hues today and may diverge later without archaeology —
which is the whole reason to name them apart. Red/green valence is *honest*
here in a way it rarely is elsewhere: a machine reporting whether it succeeded
is the textbook case for the convention.

**Feedback has no `info`.** Warning and in-progress both take the accent,
because the accent already means "your attention is needed here" — a session
about to expire and a quest in play are the same request. That is one fewer
hue, not one more.

**The accent is never red.** This is the single load-bearing rule of the
schema. Red is reserved for exactly two meanings — this failed, and this
deletes something — which is what makes both of them readable. Before this
rule, one red value was simultaneously the primary button, the link, the focus
ring, the in-progress quest, the failed quest, the error text and the delete
action.

## 3. Why colour semantics are split into two scales

Red/green valence is pre-attentive and, for this audience, effectively
universal. It cannot be opted out of: a red thing reads as bad whether or not
that was the intent. The correct response is not to avoid the convention but
to **use it only where the domain actually has valence, and to use a different
encoding everywhere else.**

The failure this replaces was live in the application. Locations are tracked as
known, explored and visited — a ladder of how much the party has learned — and
they were painted with the quest outcome scale, so "visited" rendered green
and the progress bar ran red to green as though exploring a place were a win
condition. Rumours marked false rendered in the same red as a failed quest,
which states that a disproven rumour is a failure; it is a *resolved* one, and
a good outcome for the party.

That bug had a root cause in the token names. `status.completed` existed, was
green, and was available to borrow. So the scales are now named after meaning:

| Domain state | Token | Hue |
|---|---|---|
| Quest active | `accent` | amber — it is the thing you can act on |
| Quest completed | `outcome.succeeded` | green |
| Quest failed | `outcome.failed` | red + hatch cue |
| Location known | `knowledge.0` | ladder, step 0 |
| Location explored | `knowledge.1` | ladder, step 1 |
| Location visited | `knowledge.2` | ladder, step 2 |
| Rumour unconfirmed | `knowledge.0` | a rumour is knowledge, not outcome |
| Rumour confirmed | `knowledge.2` | fully known |
| Rumour false | `knowledge.2` + strike cue | also fully known, and negated |
| NPC alive | `surface.*.on` | the default state needs no encoding |
| NPC deceased | `surface.*.onMuted` + strike cue | a fact, not an error |
| NPC missing | `knowledge.0` | genuinely uncertain |
| NPC friendly / hostile | `disposition.*` | green / red — see below |
| Save or request failed | `feedback.error` | the app, not the campaign |
| Unsaved changes, session expiring, quota near | `feedback.warning` | amber: act soon |
| Saved, converted | `feedback.success` | green |
| Uploading, extracting | `feedback.progress` | amber: in play |

Two consequences worth stating because they look like omissions:

**NPC presence is not valenced.** A slain villain is not a bad outcome. Alive
takes plain ink, deceased takes muted ink and a shape cue. Green and red leave
the NPC directory entirely.

**Disposition is valenced, and deliberately so.** This looks like it
contradicts the NPC rule above, and does not: *presence* (alive, deceased) is a
fact about the world with no valence, while *disposition* is the NPC's stance
toward the party, which has valence from the only point of view the record
keeps. A hostile NPC is genuinely a threat to the people reading the page. It
is still not an `outcome` — nothing concluded — so it gets its own name.

**The ladder runs in one direction in both modes.** More knowledge means more
contrast against the ground — darker in light, lighter in dark. The hue never
changes, so the ladder survives greyscale, print, and colour blindness as a
value ramp rather than a hue difference.

## 4. The contract

This is the authored input. Everything in §5 is derived from it.

### 4.1 Hue and chroma — fixed across modes

| Role | Hue | Chroma |
|---|---|---|
| Neutral surfaces | 68° | 0.012 |
| Neutral ink | 68° | 0.014 |
| Accent | 62° | 0.115 |
| `outcome.succeeded` | 143° | 0.085 |
| `outcome.failed` | 22° | 0.155 |
| `knowledge.*` | 265° | 0.09 |
| `entity[i]` | 25 + 45i | 0.055 |

The entity palette is a loop, not a list: eight hues at even 45° spacing
from 25°, one fixed lightness, one fixed chroma. Order is the contract —
appending a ninth is safe, reordering changes every existing mark.

### 4.2 Lightness — the only thing a mode supplies

| Role | Light | Dark |
|---|---|---|
| `surface.chrome.bg` | 0.205 | 0.13 |
| `surface.band.bg` | 0.25 | 0.175 |
| `surface.page.bg` | 0.945 | 0.225 |
| `surface.card.bg` | 0.975 | 0.27 |
| `surface.sunken.bg` | 0.915 | 0.18 |
| ink on page/card/sunken | 0.23 | 0.915 |
| muted ink on page/card/sunken | 0.47 | 0.73 |
| ink on chrome/band | 0.955 | 0.945 |
| muted ink on chrome/band | 0.745 | 0.72 |
| accent | 0.49 | 0.715 |
| accent hover | 0.42 | 0.645 |
| `outcome.succeeded` | 0.46 | 0.695 |
| `outcome.failed.ink` | 0.44 | 0.65 |
| `outcome.failed.fill` | 0.44 | 0.56 |
| `outcome.failed.on` | 0.975 | 0.975 |
| `accent.on` | 0.975 | 0.165 |
| `knowledge.0 / .1 / .2` | 0.48 / 0.385 / 0.29 | 0.65 / 0.735 / 0.84 |
| entity | 0.435 | 0.395 |
| entity ink | 0.965 | 0.955 |

Hover, selected and disabled are not authored values. They are offsets from
the surface's own lightness, toward its ink:

| | Light | Dark |
|---|---|---|
| hover | -0.03 | +0.04 |
| selected | -0.062 | +0.082 |
| disabled | -0.025 | -0.035 |
| hairline border | -0.06 | +0.065 |

### 4.3 Generation rules

These are stated to the precision that reproduces a byte, because the fixture
in §5 is only a check if two independent implementations agree on every one of
them. Version 4 of this document stated them loosely and the fixture drifted
from the generator in six primitives — see §10.

1. **OKLCH to sRGB.** If the colour is outside sRGB, **reduce chroma, never
   clip channels** — clipping moves the hue, which silently breaks the one
   property the schema rests on.
2. **Gamut fitting is a binary search on chroma, to representability rather
   than to containment.** 60 iterations between 0 and the authored chroma. A
   colour counts as representable when every channel, encoded, lies within
   **half of one 8-bit step** (0.5/255) of [0, 1] — a channel that encodes to
   −0.001 still rounds to 0 and is reproduced exactly, so rejecting it would
   discard chroma the display can show. Below zero the transfer function is
   extended linearly (12.92 × linear), because the standard curve is undefined
   for negatives. A fixed decrement loop is **not** equivalent and will land on
   a different byte.
3. **The authored lightness is a starting point.** Move away from the ground in
   **0.005** steps until the role clears its threshold against **page, card and
   sunken simultaneously** — the worst of the three, never a chosen one.
   Maximum 400 steps, then fail loudly: the contract is wrong, not the theme.
4. **Thresholds: 4.5:1 text, 3:1 fill-or-boundary.** `outcome.failed`
   therefore has two values — see §4.4.
5. **An `on` value is authored, not solved, and is verified against its fill.**
   `accent.on` and `outcome.failed.on` are neutral inks taken straight from
   the ramp and measured against the fill they sit on — never against a
   surface, and never chosen by searching for the best-contrasting pole. They
   are the one place the ramp is final.
6. **A translucent value has no ratio until it has a ground.** Rings and washes
   are `rgba()` over whatever they are drawn on, so they are not solved for
   contrast. What *is* gated is the **body ink that lands on a wash** — see
   §5.6 — and that is a property of the wash, not of the ink it was derived
   from. Do not constrain a role by the wash made from it; version 4 did, and
   it pushed four primitives two-thirds of a step brighter than the contract
   asks for.
7. **Regenerate both modes together.** A mode is never regenerated alone.

### 4.4 Why `outcome.failed` has two values

On a dark ground, a red that clears 4.5:1 as small text is necessarily light.
Raising chroma does not rescue it — it goes neon (`#FF5F64`) well before it
goes deep, and the design language rules neon out. Lowering the wash alpha does
not rescue it either: the surfaces bind, not the wash.

So failure splits by role. `outcome.failed.ink` (`#E16566` dark) is the word
"Failed" and clears 4.5:1. `outcome.failed.fill` (`#BE4649` dark) paints bars,
hatching and borders, needs only 3:1, and is therefore a proper deep red. In
light mode the constraint does not bind and both roles resolve to `#951D28`.

**On the lightness of the dark-mode red.** `#E16566` is a light red, and at
label scale that is correct and stays. An earlier revision of this document
carried a much stronger rule — that red must never render as text at all — and
built a filled-chip model across every directory row to enforce it. That was an
over-reading of a preference about the *accent*, it inflated the token tree by
roughly forty leaves, and it is reverted (D35, D36).

The rule that was always doing the real work is narrower: **the accent is never
red** (§2). Given that, a light red in a status label is simply what a dark
ground costs, and the deep red still appears wherever it can — fills, borders,
hatching, destructive confirms.

This is the pair model from token model §2 doing exactly what it was built for.

## 5. Resolved values

Generated. Do not edit these; edit §4 and regenerate.

Every table in this section is emitted from `colour-schema.json`, not typed by
hand — because in version 4 the hand-written tables and the generated ones
disagreed, and the doc was wrong in two directions at once.

**The fixture reproduces `src/core/themes/derive/` exactly**, including the
binary-search gamut fit of §4.3 rule 2. Where the two have disagreed, the
merged generator has been right and this document has been wrong; the values
below are the ones the contract actually produces.

### 5.1 Surfaces

| Token | L bg | L on | L muted | L border | D bg | D on | D muted | D border |
|---|---|---|---|---|---|---|---|---|
| `surface.chrome` | `#1B1611` | `#F7EFE6` | `#B2ABA3` | `#2F2A25` | `#0A0704` | `#F3EBE3` | `#ABA39B` | `#201B16` |
| `surface.band` | `#26211C` | `#F7EFE6` | `#B2ABA3` | `#3A342F` | `#14100B` | `#F3EBE3` | `#ABA39B` | `#29241F` |
| `surface.page` | `#F2EBE4` | `#211C16` | `#605953` | `#DFD8D1` | `#201B16` | `#E9E1D9` | `#AEA69F` | `#2F2A25` |
| `surface.card` | `#FCF5EE` | `#211C16` | `#605953` | `#E8E2DB` | `#2A2520` | `#E9E1D9` | `#AEA69F` | `#3B3630` |
| `surface.sunken` | `#E8E2DB` | `#211C16` | `#605953` | `#D5CEC7` | `#15110C` | `#E9E1D9` | `#AEA69F` | `#241F1A` |

### 5.2 Verified roles

Every chromatic role with a threshold, and its measured worst case. "Worst" is
the lowest ratio against **page, card and sunken**, so the real figure is never
below it. "on fill" means the ink measured against the fill it sits on.

| Token | Light | worst | Dark | worst |
|---|---|---|---|---|
| `accent.ink` | `#8D4F00` | 5.02 | `#D69253` | 5.85 |
| `accent.edge` | `#8D4F00` | 5.02 | `#D69253` | 5.85 |
| `accent.fill` | `#8D4F00` | 5.02 | `#D69253` | 5.85 |
| `accent.hover` | `#723F00` | — | `#BF7C3C` | — |
| `accent.on` | `#FDF5ED` | 5.99 on fill | `#120D08` | 7.45 on fill |
| `accent.ring` | `rgba(141, 79, 0, 0.35)` | — | `rgba(214, 146, 83, 0.35)` | — |
| `accent.wash` | `undefined` | — | `undefined` | — |
| `outcome.succeeded` | `#3A6437` | 5.34 | `#7EAB7A` | 5.78 |
| `outcome.failed.ink` | `#951D28` | 6.57 | `#E16566` | 4.52 |
| `outcome.failed.fill` | `#951D28` | 6.57 | `#BE4649` | 3.01 |
| `outcome.failed.on` | `#FDF5ED` | 7.83 on fill | `#FDF5ED` | 4.68 on fill |
| `knowledge.0` | `#445C90` | 5.15 | `#748EC7` | 4.65 |
| `knowledge.1` | `#2C4173` | 7.76 | `#8EA9E3` | 6.46 |
| `knowledge.2` | `#152857` | 11.12 | `#B1CAFF` | 9.22 |
| `knowledge.wash` | `rgba(68, 92, 144, 0.1)` | — | `rgba(116, 142, 199, 0.1)` | — |
| `field.border` | `#878079` | 3.03 | `#8C857D` | 4.17 |
| `field.placeholder` | `#69625B` | 4.67 | `#9E978F` | 5.26 |
| `field.disabledBg` | `#F4EDE6` | — | `#221D18` | — |
| `field.errorRing` | `rgba(149, 29, 40, 0.35)` | — | `rgba(225, 101, 102, 0.35)` | — |
| `field.successRing` | `rgba(58, 100, 55, 0.35)` | — | `rgba(126, 171, 122, 0.35)` | — |
| `action.secondary.bg` | `#322D27` | — | `#3F3934` | — |
| `action.secondary.text` | `#FDF5ED` | 12.63 on fill | `#E9E1D9` | 8.79 on fill |
| `danger.confirmBg` | `#951D28` | 6.57 | `#BE4649` | 3.01 |
| `danger.confirmText` | `#FDF5ED` | 7.83 on fill | `#FDF5ED` | 4.68 on fill |
| `disposition.friendly` | `#3A6437` | 5.34 | `#7EAB7A` | 5.78 |
| `disposition.hostile` | `#951D28` | 6.57 | `#E16566` | 4.52 |
| `disposition.neutral` | `#605953` | 5.35 | `#AEA69F` | 6.33 |
| `disposition.unknown` | `#445C90` | 5.15 | `#748EC7` | 4.65 |

A dash is not a gap. It marks a role the contract makes no threshold claim
about — a wash, a ring, a hover state, a disabled ground. Asserting a number
there would be the generator inventing a requirement.

**`accent.ink`, `accent.edge` and `accent.fill` are one value under three
names.** Ink for text, edge for a border, fill for a background that carries
`accent.on`. They are named apart because `components.css` spends the accent
in all three ways and the single `color.primary` made them indistinguishable —
which is how a 1.83:1 fill survived review. One value today; three names means
they can diverge without touching a call site.

### 5.3 Entity palette

Ink `#FAF2EA` light, `#F7EFE6` dark. Worst ink ratio 6.92 light, 7.98 dark.

| i | Hue | Light | Dark |
|---|---|---|---|
| 0 | 25° | `#6C4542` | `#613A37` |
| 1 | 70° | `#654C2F` | `#594124` |
| 2 | 115° | `#505531` | `#454A26` |
| 3 | 160° | `#355B47` | `#2A503C` |
| 4 | 205° | `#275A60` | `#1B4F54` |
| 5 | 250° | `#39546F` | `#2F4963` |
| 6 | 295° | `#534B6D` | `#484061` |
| 7 | 340° | `#66455B` | `#5A3B50` |

### 5.4 Role map — the existing token names

§5.1–5.3 generate the primitives. The theme tree ships **135 leaves — 123 colours
and 12 non-colour values**. This section says which primitive each existing
token name resolves to.

It was the original oversight in version 1, which defined the primitives and
then assumed the schema covered the tree; it covered slightly over half.

**A role is a derivation, not an alias.** `action.primary.bg` does not point at
a variable named `accent`; it *is* the accent, resolved at generation time to a
literal value in the theme tree. Nothing in the running application indirects
through a second name. An alias layer is a second way to say what a pair
already says (token model §7), and an alias outlives the migration it was meant
to enable.

Three rules govern this table:

1. **No role introduces a value.** Every entry is a primitive from §5.1–5.3 or
   a literal. If a token seems to need a colour no primitive provides, the
   *contract* in §4 is incomplete — raise it, do not invent a hex.
2. **A borrowed role is re-verified against its new ground.** A primitive that
   clears 4.5:1 where it was authored is not automatically safe where it is
   borrowed. Two of the audit's four measured failures were exactly this.
   Verification is part of generation, not review.
3. **"Retired" means deleted, not aliased.** Tokens marked `12-3a` or `12-3b`
   resolve now so that no commit is broken, then go with their consumers.

**Legacy `color.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `color.primary` | `accent.base` | `#8D4F00` | `#D69253` | **12-3b** |
| `color.secondary` | `accent.hover` | `#723F00` | `#BF7C3C` | **12-3b** |
| `color.accent` | `accent.base` | `#8D4F00` | `#D69253` | **12-3b** |
| `color.emphasis` | `surface.page.onMuted` | `#605953` | `#AEA69F` | — |
| `color.heading` | `surface.page.on` | `#211C16` | `#E9E1D9` | — |

- `color.primary` — consumers move to `accent.ink` / `accent.edge` / `accent.fill`
- `color.secondary` — was a darker accent, never a role
- `color.accent` — duplicate of color.primary
- `color.emphasis` — was #9A9082 at 2.7:1 — this fixes it

**Legacy `status.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `status.general` | `surface.card.onMuted` | `#605953` | `#AEA69F` | **12-3a** |
| `status.active` | `accent.base` | `#8D4F00` | `#D69253` | **12-3a** |
| `status.completed` | `outcome.succeeded` | `#3A6437` | `#7EAB7A` | **12-3a** |
| `status.failed` | `outcome.failedInk` | `#951D28` | `#E16566` | **12-3a** |
| `status.unknown` | `knowledge.0` | `#445C90` | `#748EC7` | **12-3a** |
| `status.on` | `accent.on` | `#FDF5ED` | `#120D08` | **12-3a** |

**Legacy `state.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `state.hoverLight` | `surface.card.hover` | `#F2EBE4` | `#342F2A` | **12-3b** |
| `state.hoverMedium` | `surface.card.selected` | `#E8E1DA` | `#3F3A34` | **12-3b** |
| `state.selected` | `surface.card.selected` | `#E8E1DA` | `#3F3A34` | **12-3b** |

- `state.hoverLight` — a global hover grey is what token model §2 forbids
- `state.hoverMedium` — ditto
- `state.selected` — ditto

**`icon.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `icon.bg` | `surface.sunken.bg` | `#E8E2DB` | `#15110C` | — |
| `icon.border` | `neutralBorder` | `#878079` | `#8C857D` | — |

- `icon.border` — was #C9BCA3 at 1.8:1 — reuses the 3:1-solved neutral

**`field.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `field.bg` | `surface.card.bg` | `#FCF5EE` | `#2A2520` | — |
| `field.placeholder` | `placeholder` | `#69625B` | `#9E978F` | — |
| `field.border` | `neutralBorder` | `#878079` | `#8C857D` | — |
| `field.borderFocus` | `accent.base` | `#8D4F00` | `#D69253` | — |
| `field.ringFocus` | `accent.ring` | `rgba(141, 79, 0, 0.35)` | `rgba(214, 146, 83, 0.35)` | — |
| `field.errorBorder` | `outcome.failedInk` | `#951D28` | `#E16566` | — |
| `field.errorFocus` | `outcome.failedInk` | `#951D28` | `#E16566` | — |
| `field.errorRing` | `outcome.failedRing` | `rgba(149, 29, 40, 0.35)` | `rgba(225, 101, 102, 0.35)` | — |
| `field.successBorder` | `outcome.succeeded` | `#3A6437` | `#7EAB7A` | — |
| `field.successFocus` | `outcome.succeeded` | `#3A6437` | `#7EAB7A` | — |
| `field.successRing` | `outcome.successRing` | `rgba(58, 100, 55, 0.35)` | `rgba(126, 171, 122, 0.35)` | — |
| `field.disabledBg` | `disabledBg` | `#F4EDE6` | `#221D18` | — |
| `field.labelText` | `surface.card.on` | `#211C16` | `#E9E1D9` | — |
| `field.helperText` | `surface.card.onMuted` | `#605953` | `#AEA69F` | — |
| `field.errorText` | `outcome.failedInk` | `#951D28` | `#E16566` | — |
| `field.successText` | `outcome.succeeded` | `#3A6437` | `#7EAB7A` | — |

**`action.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `action.primary.bg` | `accent.base` | `#8D4F00` | `#D69253` | — |
| `action.primary.text` | `accent.on` | `#FDF5ED` | `#120D08` | — |
| `action.primary.hover` | `accent.hover` | `#723F00` | `#BF7C3C` | — |
| `action.secondary.bg` | `secondary.bg` | `#322D27` | `#3F3934` | — |
| `action.secondary.text` | `secondary.on` | `#FDF5ED` | `#E9E1D9` | — |
| `action.secondary.hover` | `secondary.hover` | `#231E19` | `#504B45` | — |
| `action.link.bg` | _literal_ | `transparent` | `transparent` | — |
| `action.link.text` | `accent.base` | `#8D4F00` | `#D69253` | — |
| `action.link.hover` | `accent.hover` | `#723F00` | `#BF7C3C` | — |
| `action.outline.bg` | _literal_ | `transparent` | `transparent` | — |
| `action.outline.text` | `accent.base` | `#8D4F00` | `#D69253` | — |
| `action.outline.hover` | `surface.page.hover` | `#E8E2DB` | `#29241F` | — |
| `action.outline.border` | `neutralBorder` | `#878079` | `#8C857D` | — |
| `action.ghost.bg` | _literal_ | `transparent` | `transparent` | — |
| `action.ghost.text` | `surface.page.onMuted` | `#605953` | `#AEA69F` | — |
| `action.ghost.hover` | `surface.page.hover` | `#E8E2DB` | `#29241F` | — |

- `action.outline.border` — 3:1 verified; not a decorative hairline

**`danger.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `danger.bg` | _literal_ | `transparent` | `transparent` | — |
| `danger.deleteBg` | _literal_ | `transparent` | `transparent` | — |
| `danger.deleteText` | `outcome.failedInk` | `#951D28` | `#E16566` | — |
| `danger.deleteHover` | `outcome.failedWash` | `rgba(149, 29, 40, 0.1)` | `rgba(225, 101, 102, 0.1)` | — |

**`font.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `font.primary` | _literal_ | `Archivo, system-ui, sans-serif` | `Archivo, system-ui, sans-serif` | — |
| `font.secondary` | _literal_ | `Archivo, system-ui, sans-serif` | `Archivo, system-ui, sans-serif` | — |
| `font.heading` | _literal_ | `'Zilla Slab', Georgia, serif` | `'Zilla Slab', Georgia, serif` | — |

- `font.heading` — identical in both modes

**`border.*`**

| Token | Source | Light | Dark | Retired |
|---|---|---|---|---|
| `border.radius.sm` | _literal_ | `0.25rem` | `0.25rem` | — |
| `border.radius.md` | _literal_ | `0.375rem` | `0.375rem` | — |
| `border.radius.lg` | _literal_ | `0.5rem` | `0.5rem` | — |
| `border.width.sm` | _literal_ | `1px` | `1px` | — |
| `border.width.md` | _literal_ | `2px` | `2px` | — |
| `border.width.lg` | _literal_ | `4px` | `4px` | — |

### 5.5 Scales added after `12-2`

The 26 leaves below are **not in the code yet** — they land in `12-2b`
(§11). Every one sources a primitive that already exists, so they introduce
**no new colour and change no value `12-1` shipped.**

Two of these exist because the token tree was finally enumerated against its
real consumers rather than reasoned outward from the design (D32).

**`accent.*` gives `color.primary` a successor.** Before this, the accent was
a primitive with no name in the tree, so deleting `color.primary` in `12-3b`
would have left roughly twenty consumers with nothing to move to. A real gap,
correctly found during implementation and fixed here rather than there.

**`feedback.*` is the application talking about itself.** A failed quest is a
fact about the fiction; a failed save is a fact about the software. They
resolve to the same hues today and are named apart so they can diverge without
archaeology. There is deliberately no `feedback.info`: warning and progress
both take the accent, because the accent already means "your attention is
needed here".

**`accent.*`**

| Token | Source | Light | Dark |
|---|---|---|---|
| `accent.ink` | `accent.base` | `#8D4F00` | `#D69253` |
| `accent.edge` | `accent.base` | `#8D4F00` | `#D69253` |
| `accent.fill` | `accent.base` | `#8D4F00` | `#D69253` |
| `accent.hover` | `accent.hover` | `#723F00` | `#BF7C3C` |
| `accent.on` | `accent.on` | `#FDF5ED` | `#120D08` |
| `accent.ring` | `accent.ring` | `rgba(141, 79, 0, 0.35)` | `rgba(214, 146, 83, 0.35)` |

**`outcome.failed.on`**

| Token | Source | Light | Dark |
|---|---|---|---|
| `outcome.failed.on` | `outcome.failedOn` | `#FDF5ED` | `#FDF5ED` |

**`knowledge.wash`**

| Token | Source | Light | Dark |
|---|---|---|---|
| `knowledge.wash` | `knowledgeWash` | `rgba(68, 92, 144, 0.1)` | `rgba(116, 142, 199, 0.1)` |

**`feedback.*`**

| Token | Source | Light | Dark |
|---|---|---|---|
| `feedback.error.ink` | `outcome.failedInk` | `#951D28` | `#E16566` |
| `feedback.error.edge` | `outcome.failedInk` | `#951D28` | `#E16566` |
| `feedback.error.wash` | `outcome.failedWash` | `rgba(149, 29, 40, 0.1)` | `rgba(225, 101, 102, 0.1)` |
| `feedback.warning.ink` | `accent.base` | `#8D4F00` | `#D69253` |
| `feedback.warning.edge` | `accent.base` | `#8D4F00` | `#D69253` |
| `feedback.warning.wash` | `accent.wash` | `rgba(141, 79, 0, 0.1)` | `rgba(214, 146, 83, 0.1)` |
| `feedback.success.ink` | `outcome.succeeded` | `#3A6437` | `#7EAB7A` |
| `feedback.success.edge` | `outcome.succeeded` | `#3A6437` | `#7EAB7A` |
| `feedback.success.wash` | `outcome.successWash` | `rgba(58, 100, 55, 0.1)` | `rgba(126, 171, 122, 0.1)` |
| `feedback.progress.ink` | `accent.base` | `#8D4F00` | `#D69253` |
| `feedback.progress.edge` | `accent.base` | `#8D4F00` | `#D69253` |
| `feedback.progress.wash` | `accent.wash` | `rgba(141, 79, 0, 0.1)` | `rgba(214, 146, 83, 0.1)` |

**`disposition.*`**

| Token | Source | Light | Dark |
|---|---|---|---|
| `disposition.friendly` | `outcome.succeeded` | `#3A6437` | `#7EAB7A` |
| `disposition.hostile` | `outcome.failedInk` | `#951D28` | `#E16566` |
| `disposition.neutral` | `surface.card.onMuted` | `#605953` | `#AEA69F` |
| `disposition.unknown` | `knowledge.0` | `#445C90` | `#748EC7` |

**`danger.confirm*`**

| Token | Source | Light | Dark |
|---|---|---|---|
| `danger.confirmBg` | `outcome.failedFill` | `#951D28` | `#BE4649` |
| `danger.confirmText` | `outcome.failedOn` | `#FDF5ED` | `#FDF5ED` |

### 5.6 The one pairing rule these scales carry

`feedback.*.ink` is legal on **page, card and sunken** — every value clears
4.5:1 there. It is **not** legal on its own `wash`. Measured:

| Pairing | Light | Dark |
|---|---|---|
| `feedback.warning.ink` on `feedback.warning.wash` | **4.39** | 4.95 |
| `feedback.error.ink` on `feedback.error.wash` | 5.57 | **3.99** |
| `feedback.success.ink` on `feedback.success.wash` | 4.67 | 4.92 |

Three of eight fail, and which three differs by mode — which is exactly the
kind of asymmetry that gets shipped by eye and caught by a gate.

**So a washed banner takes body ink, not the hue:** background
`feedback.*.wash`, border `feedback.*.edge`, text `surface.*.on`. The hue
appears as the boundary, never as the text on top of itself. `12-2b` adds this
pairing to the borrowed-role verification so the illegal combination fails
generation rather than review.

## 6. Non-colour cues

Because nothing is encoded by colour alone (design language §2), and because
the accent and `outcome.failed` are 40° apart on a warm palette — the closest
pair in the schema — three states carry a shape cue as well as a hue. These are
theme-level values, in the sense of token model §6's ornament enum, not
per-component decisions.

| Cue | Applies to | What it is |
|---|---|---|
| `cue.hatch` | `outcome.failed` | The progress fill renders as 45° hatching in `outcome.failed.fill` rather than a solid bar |
| `cue.strike` | NPC deceased, rumour false | A hairline rule through the label, in the label's own ink |
| `cue.none` | everything else | — |

The hatch is the important one: it makes a failed quest legible from the bar's
texture alone, in greyscale, and under deuteranopia, where amber and red
collapse toward each other. It requires no copy change and no icon.

## 7. What this schema does not decide

- **Type.** Design language §4 owns the serif/sans rule. The schema notes only
  that both modes must use the same families — dark's heading font being sans
  while light's was serif was the same class of drift as the colour.
- **Ornament strength, corner treatment, rule weight.** Token model §6.
- **Density and layout.** Design language §8.
- **Which route adopts this when.** `../plan/06-colour-schema-rollout.md`.

## 7b. What is already built, and what is not

`12-1` and `12-2` are **merged** on `main` (`1b3cc2d`). The code holds 109 of
this document's 135 leaves, the full OKLCH derivation, the role map, the
borrowed-role verification, and the `outcome` / `knowledge` / `cue` scales.

The 26 leaves in §5.5 **do not exist in the code.** They land in `12-2b`,
which exists precisely so they arrive the same way every other token did —
additively, with no consumers, screenshot-identical — rather than being
smuggled in alongside a destructive migration.

## 8. Decisions this schema records

Carry these into `../plan/03-drift-log.md` as they are implemented.

- **D23 — Torchlight Forge chosen** over three alternatives (archival
  verdigris, indigo instrument, arcane violet). Warm limestone and iron with a
  molten amber accent; the two cooler candidates were rejected on the harshness
  of their light grounds.
- **D24 — Modes are derived, not authored.** One hue-and-chroma contract, one
  lightness ramp per mode. Supersedes the two hand-authored theme files.
- **D25 — The accent is never red.** Red means failed or destructive, nothing
  else. This is what resolves the collision recorded in the audit.
- **D26 — Two semantic scales.** Outcome is valenced, knowledge is a
  non-valenced ladder. Amends design language §3 from three colour jobs to
  four.
- **D27 — NPC presence is not valenced.** Green and red leave the NPC
  directory; deceased is muted ink plus `cue.strike`.
- **D28 — `outcome.failed` splits into ink and fill.** The alternative was a
  dark-mode red that reads as salmon, which was rejected outright.
- **D29 — Entity palette is generated by loop**, replacing the hand-listed
  array and retiring `--location-type-*`.
- **D30 — The source of truth is read-only to implementation.** No PR and no
  agent executing one edits this document or its JSON. Raised by schema v1
  covering 49 primitives against a 101-leaf token tree: the gap was correctly
  found by an implementation agent, and correctly fixed here rather than there.
  §5.4 and §9 are the result.
- **D32 — Scales are enumerated against consumers, not derived from the
  design.** Feedback and disposition were both missed twice by reasoning
  outward from the four colour jobs, and both were found by grepping the actual
  token consumers. Adding them cost zero hues.
- **D33 — Application feedback is its own scale.** The app talking about itself
  is a different voice from the campaign's record, even where the hues
  coincide. `feedback.warning` takes the accent; there is no `feedback.info`.
- **D34 — Disposition is valenced; presence is not.** A hostile NPC is a threat
  to the reader (red is honest); a deceased NPC is a fact (muted ink and
  `cue.strike`).
- **D35 — The chip model is reverted.** Version 3 of this document required
  outcome and feedback to render as filled chips so that red never appeared as
  text. That was an over-correction of a preference about the accent, and it
  grew the tree from 101 to 144 leaves for no semantic gain. Status labels are
  tinted text again; `outcome.failed` keeps its ink/fill split for the
  contrast reason in §4.4.
- **D36 — The fixture reproduces the generator's algorithm, to the byte.**
  Version 4 stated §4.3 loosely — "reduce chroma until it fits" — and its
  fixture used a fixed 0.002 decrement where the merged code binary-searches to
  byte-representability. Six primitives disagreed. The merged code was right;
  §4.3 now states the algorithm precisely enough to reproduce.
- **D37 — A wash does not constrain the ink it is made from.** Version 4 solved
  each ink against its own wash, effectively raising the threshold to ~5.15 and
  brightening four primitives. What matters is the body ink *on* the wash, which
  is gated separately in §5.6.
- **D38 — `on` values are authored, never searched.** `accent.on` and
  `outcome.failed.on` come from the ramp and are verified against their fill.
  Version 4 picked whichever pole contrasted best, producing `#050301` and a
  light ink in dark mode that no ramp entry could explain.
- **D40 — The knowledge ladder is indigo, not slate.** Version 6 gave it
  0.034 chroma at 245°, which renders as three greys; in the directory summary
  bars the rungs sit 1.4–1.5:1 apart and read as a single band. Nothing in D26
  required that. The ladder's constraints are that it carries no valence and
  that its hue does not change along its length, and both hold at any chroma —
  blue is unvalenced, so saturation costs nothing D25 or D26 protects. 265° at
  0.09 is the most chroma an indigo can carry while all three light-mode rungs
  stay in gamut; 245° desaturates its darkest rung above roughly 0.07, and teal
  and cyan clip harder. Five leaves change per mode. This supersedes "v6 is
  additive over v2" for this case: that rule existed to keep a multi-PR stack
  coherent while Phase 12 was in flight, and Phase 12 is merged. It does **not**
  fix the adjacency — the rungs differ only in lightness, by design, so the
  bars separate their bands with a hairline instead.
- **D39 — A merged handoff is history, not an instruction.** `12-2`'s handoff
  was edited to include the feedback and disposition scales after `12-2` had
  merged without them, leaving two PRs consuming names nothing had built. Work
  added to a phase after its PR merges gets a new PR — here `12-2b`.
- **D36 — v6 is additive over v2.** The merged implementation is the floor: no
  value v2 shipped may change, and a correction arrives as a new token, not a
  renamed or re-solved one. An earlier draft of v6 renamed `accent.base` to
  `accent.ink`/`edge`/`fill` and re-solved several inks against their own
  washes; both would have broken `role-map.ts` and the fixture test on `main`
  for no design gain.
- **D31 — No alias layer.** Legacy names resolve as derivations at generation
  time and are deleted with their consumers in `12-3a`/`12-3b`; none survives as a
  compatibility shim. `color.primary/secondary/accent` and
  `state.hoverLight/hoverMedium/selected` are retired alongside `status.*`.

## 9. This document is never edited by an implementation agent

**`colour-schema.md` and `colour-schema.json` are the source of truth. No
implementation PR, and no agent executing one, changes either file.**

Not "should avoid". Never. The reason is not ceremony:

The schema outranks the plan, the handoffs and the code on every value. If the
agent doing the implementation also authors the schema, the source of truth
becomes downstream of the implementation, and the one guarantee the whole phase
rests on — that the generated themes can be checked against something
independent — quietly becomes a tautology. A test that compares generated output
to a fixture the same agent just wrote proves nothing at all.

So the fixture must be *independently* authored. That is its entire job.

### What to do instead, when the schema is wrong

It will be wrong sometimes; version 1 of this document was wrong by 52 leaves.
The procedure is the same in every case:

1. **Stop.** Do not patch around it, and do not extend the schema to cover it.
2. **Write the gap down** in `../plan/03-drift-log.md` as a question: what the
   token needs, which primitive seems closest, and why the schema does not
   answer it.
3. **Raise it** and wait for a corrected schema. Both files are regenerated
   together, and the version number in the JSON increments.
4. **Resume** against the new fixture.

A blocked PR is cheap. A fixture that agrees with the code because the code
wrote it is expensive, and the cost does not show up until a value is wrong and
nothing catches it.

### The same rule, stated for the other documents

| File | May an implementation PR change it? |
|---|---|
| `design/colour-schema.md` | **No.** Never. |
| `design/colour-schema.json` | **No.** Never. |
| `design/design-language.md` | **No.** Principles are not an implementation concern. |
| `plan/01-token-model.md` | No — propose in the drift log. |
| `plan/06-colour-schema-rollout.md` | No — propose in the drift log. |
| `plan/handoff/12-*.md` | No. A handoff that is wrong is reported, not rewritten. |
| A handoff whose PR has **merged** | Never — by anyone. It is a historical record. New work gets a new PR. |
| `plan/03-drift-log.md` | **Yes — append only.** This is where findings go. |

## 10. Learnings worth keeping

Six, each earned by getting something wrong in this project.

**A theme that may say anything will eventually say something different.** Two
hand-authored mode files drifted into two different designs, and no amount of
review caught it because nothing was violated. The fix was structural, not
editorial: author the shared part once and let the mode supply only what
genuinely differs.

**Name tokens after meaning, never appearance.** `status.completed` was green,
existed, and was therefore available for a location to borrow — which is how
"visited" came to render green and a progress bar came to run red-to-green as
though exploring were a win condition. The bug was not in the CSS. It was in
the name.

**A colour is safe in a pair, not in isolation.** Three separate defects in this
project were the same shape: a legitimate value, in a legitimate slot, wrong in
relation to what sat behind it. Hence §5.4 rule 2 — a borrowed role is
re-verified, always, because borrowing changes the ground.

**A fixture must be authored by someone other than the implementation.**
Otherwise the check passes by construction. See §9.

**An alias is not a migration mechanism.** It is a second name that survives the
migration it was meant to enable. Where a token must go, resolve it during the
additive PR and delete it in the destructive one; do not leave a shim behind
that grep cannot distinguish from an intentional reference.

**State an algorithm to the precision that reproduces a byte, or the fixture
is not a check.** This document twice described a generation rule in prose that
read as unambiguous and was not: "reduce chroma until it fits" admits a fixed
decrement, a binary search to the boundary, and a binary search to
representability — three rules that produce three different hexes. The fixture
exists to catch a wrong implementation; it cannot, if the specification allows
several right ones. When the fixture and a careful implementation disagree,
suspect the specification before either.

**Enumerate the consumers before declaring a scale set complete.** This
document was wrong twice in the same way: it reasoned outward from a clean set
of colour jobs and both times missed things the code actually needed — 52 token
names the first time, two whole scales the second. Both were found by an
implementation agent grepping for real usage. Design a palette from principle;
verify it against `grep`.

**Distinguish a preference from a rule before encoding it.** "I don't like
salmon as the main colour" is a constraint on the accent. It was encoded as
"red may never render as text", which forced a chip model, forty extra leaves,
and a structural change to every directory row — all to satisfy a rule nobody
had stated. When a stated dislike seems to force a large structural change,
that is the signal to check the scope of the dislike, not to build the
structure.

**Check what is already merged before revising the source of truth.** The v4
draft of this document was written as though nothing had shipped, and it
renamed primitives that `role-map.ts` on `main` already referenced. A schema
that outranks the code still has to be *applied* to a repository that exists;
once an implementation is merged, the schema's freedom is additive only. Read
the branch, then revise.

**On a dark ground, some constraints simply bind.** A red that clears 4.5:1 is
necessarily light, and a light red is pink. When two requirements genuinely
cannot both hold, split the token by role rather than compromising the value —
that is what pairs are for (§4.4). Do not resolve it by quietly failing
contrast, and do not resolve it by shipping a colour the product's owner has
already rejected.

## 11. Where this stands against `main`

Recorded because this document has now been revised against a repository that
was already moving, and getting that wrong cost a round trip.

**Merged (`main`, commit `1b3cc2d`):**

- `12-1` — the derivation. `derive/` holds `contract.ts`, `oklch.ts`,
  `generate.ts`, `role-map.ts`; both theme definitions are four lines calling
  `deriveTokens`, and `schema-fixture.test.ts` compares the output to this
  document's JSON.
- `12-2` — the semantic scales. `outcome`, `knowledge` and `cue` exist in
  `token-types.ts` with no consumers, exactly as intended.

**What this version changes for the code.** It is additive, so nothing already
written becomes wrong. Four things must move, and all four belong to `12-2b`
rather than to the migration — they are bookkeeping on the fixture, and pairing
them with a destructive PR is what would make that PR unrevertible:

1. `schema-fixture.test.ts` asserts `version` 2 and `leafCount` 101. Both
   change, to **6** and **135**.
2. That test carries an `additions` block naming `12-2`'s six colours and two
   cues as exceptions to the tree comparison, because the fixture predated
   them. They now sit in `resolved.<mode>.tree`, so the block is deleted and
   the comparison goes back to a plain equality. A correct workaround becoming
   a second source of truth is the thing it was written to prevent.
3. `role-map.ts` keeps every entry and every source it has. Only its `retire`
   tags change, from `12-3` to `12-3a` or `12-3b` per §5.4.
4. The borrowed-role verification gains the wash pairing from §5.5.

**On `accent.base`.** It appears throughout §5.4's Source column and stays
exactly as it is. It is a *primitive path* inside the generator, not a token in
the theme tree — which is why `accent.ink`/`edge`/`fill` can be added as tree
tokens without touching it. An earlier draft of this document mistook the two
and proposed renaming the primitive; that would have broken the merged
generator for no design gain (D36).

**Still to do:** `12-2b`, then `12-3a`, `12-3b`, `12-5`, `12-6`.
