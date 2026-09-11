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

| Job | Count | Valenced | Carries |
|---|---|---|---|
| **Accent** | one hue | no | Action, interactivity, and anything in progress |
| **Outcome** | two hues | **yes** | A thing that concluded: succeeded, failed |
| **Knowledge** | one hue, three steps | no | How much the party knows |
| **Entity** | eight hues | no | Identity marks |

Everything else is surface ink. A fallback state is not a colour job — it
takes `surface.*.onMuted` and says nothing.

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
| Location known | `knowledge.1` | ladder, step 1 |
| Location explored | `knowledge.2` | ladder, step 2 |
| Location visited | `knowledge.3` | ladder, step 3 |
| Rumour unconfirmed | `knowledge.1` | a rumour is knowledge, not outcome |
| Rumour confirmed | `knowledge.3` | fully known |
| Rumour false | `knowledge.3` + strike cue | also fully known, and negated |
| NPC alive | `surface.*.on` | the default state needs no encoding |
| NPC deceased | `surface.*.onMuted` + strike cue | a fact, not an error |
| NPC missing | `knowledge.1` | genuinely uncertain |

Two consequences worth stating because they look like omissions:

**NPC presence is not valenced.** A slain villain is not a bad outcome. Alive
takes plain ink, deceased takes muted ink and a shape cue. Green and red leave
the NPC directory entirely.

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
| `knowledge.*` | 245° | 0.034 |
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
| `knowledge.1 / .2 / .3` | 0.48 / 0.385 / 0.29 | 0.65 / 0.735 / 0.84 |
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

1. Convert OKLCH to sRGB. If the colour is outside sRGB, **reduce chroma until
   it fits** — never clip channels, which shifts hue.
2. For every chromatic role, the authored lightness is a *starting point*. Move
   it away from the ground in 0.005 steps until the role clears its threshold
   against **page, card and sunken simultaneously**. Record the value that
   passes.
3. Thresholds: 4.5:1 for anything that is text, 3:1 for anything that is only
   a fill or a border. `outcome.failed` therefore has two values — see §4.4.
4. Regenerate both modes together. A mode is never regenerated alone.

### 4.4 Why `outcome.failed` has two values

On a dark ground, a red that clears 4.5:1 is necessarily light, and a light red
is pink. There is no hue that escapes this — the choice is between failing
contrast and reading as salmon.

So failure splits by role rather than compromising: `outcome.failed.ink`
(`#E16566` dark) is the word "Failed" and must clear 4.5:1, while
`outcome.failed.fill` (`#BE4649` dark) paints bars and hatching and only
needs 3:1, so it can be a proper deep red. In light mode the constraint does
not bind and both roles resolve to the same value.

This is the pair model from token model §2 doing exactly what it was built for.

## 5. Resolved values

Generated. Do not edit these; edit §4 and regenerate.

### 5.1 Surfaces

| Token | L bg | L on | L muted | L border | D bg | D on | D muted | D border |
|---|---|---|---|---|---|---|---|---|
| `surface.chrome` | `#1B1611` | `#F7EFE6` | `#B2ABA3` | `#2F2A25` | `#0A0704` | `#F3EBE3` | `#ABA39B` | `#201B16` |
| `surface.band` | `#26211C` | `#F7EFE6` | `#B2ABA3` | `#3A342F` | `#14100B` | `#F3EBE3` | `#ABA39B` | `#29241F` |
| `surface.page` | `#F2EBE4` | `#211C16` | `#605953` | `#DFD8D1` | `#201B16` | `#E9E1D9` | `#AEA69F` | `#2F2A25` |
| `surface.card` | `#FCF5EE` | `#211C16` | `#605953` | `#E8E2DB` | `#2A2520` | `#E9E1D9` | `#AEA69F` | `#3B3630` |
| `surface.sunken` | `#E8E2DB` | `#211C16` | `#605953` | `#D5CEC7` | `#15110C` | `#E9E1D9` | `#AEA69F` | `#241F1A` |

### 5.2 Roles

| Token | Light | worst ratio | Dark | worst ratio |
|---|---|---|---|---|
| `accent` | `#8D4F00` | 5.02 | `#D69253` | 5.85 |
| `accent.hover` | `#723F00` | — | `#BF7C3C` | — |
| `accent.on` | `#FDF5ED` | 5.99 | `#120D08` | 7.45 |
| `accent.ring` | `rgba(141, 79, 0, 0.35)` | — | `rgba(214, 146, 83, 0.35)` | — |
| `outcome.succeeded` | `#3A6437` | 5.34 | `#7EAB7A` | 5.78 |
| `outcome.failed.ink` | `#951D28` | 6.57 | `#E16566` | 4.52 |
| `outcome.failed.fill` | `#951D28` | 6.57 | `#BE4649` | 3.01 |
| `knowledge.1` | `#4E6070` | 5.05 | `#7E92A3` | 4.72 |
| `knowledge.2` | `#344655` | 7.59 | `#98ACBE` | 6.49 |
| `knowledge.3` | `#1D2D3B` | 10.96 | `#B9CDE0` | 9.3 |
| `action.secondary.bg` | `#322D27` | — | `#3F3934` | — |
| `action.secondary.on` | `#FDF5ED` | 12.63 | `#E9E1D9` | 8.79 |
| `field.border` | `#878079` | 3.03 | `#8C857D` | 4.17 |
| `field.placeholder` | `#69625B` | 4.67 | `#9E978F` | 5.26 |
| `field.disabledBg` | `#F4EDE6` | — | `#221D18` | — |
| `field.errorRing` | `rgba(149, 29, 40, 0.35)` | — | `rgba(225, 101, 102, 0.35)` | — |
| `field.successRing` | `rgba(58, 100, 55, 0.35)` | — | `rgba(126, 171, 122, 0.35)` | — |

`field.bg` is `surface.card.bg`. `field.borderFocus` is `accent`.
`field.errorBorder` and `field.errorText` are `outcome.failed.ink`;
`field.successBorder` and `field.successText` are `outcome.succeeded`.
`danger.deleteText` is `outcome.failed.ink` — and is now distinguishable from
a link, which it was not before.

"Worst ratio" is the lowest of the three content surfaces, so the real-world
figure is never below it.

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
