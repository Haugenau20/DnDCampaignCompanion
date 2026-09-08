# Drift log

Every decision that shapes the work, and every later reversal of one. The
point is that on day nine you can tell the difference between *this was
decided* and *this drifted*.

Append only. Do not edit a decision — supersede it with a revision entry, so
the reasoning survives alongside the change.

---

## Format

```
### D<n> — <short title>
Date: YYYY-MM-DD   Status: active | superseded by R<n>
Decision:  what was decided, one or two sentences
Because:   the reason, in terms that can be argued with later
```

```
### R<n> — revises D<n>
Date: YYYY-MM-DD
Change:    what is now true instead
Because:   what changed — new information, or a wrong assumption
Cost:      what had to be redone
```

---

## Decisions

### D1 — Two finishes, one build
Date: 2026-09-08   Status: active
Decision: `2a` and `3a` differ in token values only. Build the shared
structure; defer the choice to Phase 5.
Because: structure, markup and token names are identical between them, so
deferring costs nothing, and the choice is better made against real campaign
data than a mock with four rows.

### D2 — Interleaved with theme-contract, not after it
Date: 2026-09-08   Status: active
Decision: restructure tokens in-app in the contract's shape now; extract the
versioned package afterwards.
Because: today's ~95 flat colour leaves exercise none of the hard parts of a
generation spec. The visual work produces the awkward cases — surfaces
carrying a foreground, ordered collections, enum values. Finishing the package
first would freeze a spec its first consumer immediately strains. Extraction
is mechanical; speculation is not.

### D3 — Scope is Home plus global chrome
Date: 2026-09-08   Status: active
Decision: Home and the global header/footer. All other pages keep today's look
and must not break.
Because: the chrome is global — a header cannot ship half-done — but every
other surface can adopt the model later at no extra cost.

### D4 — Default theme at parity; dark and medieval follow
Date: 2026-09-08   Status: active
Decision: only the default theme reaches parity before merge.
Because: safe **only** because of D5. Without it, an unmigrated theme loses
its chrome instead of merely looking dated.

### D5 — Every new token falls back to an existing one
Date: 2026-09-08   Status: active
Decision: each new token resolves to the theme's value, else the token it
replaces, else a documented last resort.
Because: makes adding a token a non-breaking change, lets Phase 1 be
screenshot-identical while introducing the whole model, and keeps unmigrated
themes correct. This is the load-bearing rule of the plan.

### D6 — No bitmap imagery at launch
Date: 2026-09-08   Status: active
Decision: image slots ship with a designed empty fallback. No plates, uploads,
Storage, AI generation, licensing or attribution.
Because: the atmosphere has to come from shipped structure, not from content a
user may never add — otherwise the page feels like nothing on day one. Uploads
are an enhancement on top, and a project of their own.

### D7 — Procedural sigils stay in scope
Date: 2026-09-08   Status: active
Decision: deterministic per-entity marks ship; bitmap imagery does not.
Because: identity marks were asked for everywhere, and they need no art files
— one function and a palette. They are also what makes a long list scannable
rather than uniform, which is most of the perceived life on Home.

### D8 — The three existing bugs go in Phase 0
Date: 2026-09-08   Status: active
Decision: the `.selectable-item` cascade, `Typography`'s `leading-none` and
the ~2.87:1 active nav item are fixed before any visual work.
Because: all three are independent of direction, all three improve the product
with no new tokens, and the cascade ambiguity would otherwise make Phase 2
unpredictable.

### D9 — Surface owns paint, state owns feedback
Date: 2026-09-08   Status: active
Decision: surface classes own resting background, border and ink; state
classes own only hover, selected, focus, disabled. Layer order declared
explicitly.
Because: `.selectable-item` currently owns both and is declared last, so its
resting background beats `.card` and `.bg-secondary` — the direct cause of
every list rendering one flat tone. A contract bug, not a typo.

### D10 — Contrast is verified per pair, once
Date: 2026-09-08   Status: active
Decision: contrast is checked on surface/foreground pairs in the token set,
not per usage.
Because: three separate defects in this work shared one shape — a valid token
in a valid slot, wrong in relation to its background. Pairs make that class of
bug unrepresentable, and make the check computable from tokens alone.

### D11 — Long-lived integration branch, one branch per phase
Date: 2026-09-08   Status: active
Decision: an integration branch off `main`; each phase a branch off it, merged
independently.
Because: each phase is independently revertable, and a half-migrated token
model — the one genuinely bad state — is visible as an unmerged branch rather
than something living on `main`.

### D12 — Selection draws an outline, not a border
Date: 2026-09-08   Status: active
Decision: `.selected-item` uses `outline` + `outline-offset: -2px` instead of a
2px border, so `.selectable-item` can stop reserving a transparent border.
Because: D9 requires the state class to own no resting paint, but its
`border: 2px solid transparent` was load-bearing -- it reserved the space the
selected border later filled. Removing it alone would have shifted row content
by 2px on select, failing the Phase 0 gate. An outline is outside layout flow
entirely, so the state costs nothing. `.highlighted-item` already worked this
way, so this is a consistency win as well.

### D13 — Active nav and dropdown ink becomes `--text-primary`
Date: 2026-09-08   Status: active
Decision: `.navigation-item-active` and `.dropdown-item-active` take
`--text-primary`, not `--color-primary`, on `--hover-medium`.
Because: the pair measured 2.87:1 in light. No value of `--hover-medium` fixes
it -- anything light enough to clear 4.5:1 against `#2563EB` lands within
~1.1:1 of the page and the state stops being visible at all. Darkening the ink
is the only move available without a new token. Verified on rendered pixels:
2.87:1 -> 9.90:1 light, 9.26:1 dark, 13.40:1 medieval. Both rules were fixed,
not just the nav one the plan named, because they are byte-identical instances
of the same defect and fixing one would have left the other.

### D14 — `variables.css` declares no custom properties at all
Date: 2026-09-08   Status: active   (settles Q7)
Decision: the `:root` block declaring all ~95 tokens as `--x: ;` is removed.
The file keeps only a comment explaining why it must not come back. A jest
guard, `themes/__tests__/css-custom-properties.test.ts`, fails on any empty
custom property in `themes/css/`.
Because: an empty custom property is *defined*, not guaranteed-invalid, so
`var(--new, --old)` never reaches its fallback -- substitution yields nothing,
the declaration becomes invalid at computed-value time, and the property
resolves to `unset` with no warning. Confirmed in Chrome: a declared-empty
token skipped its fallback while an undeclared one used it. That silently
defeats D5, the load-bearing rule, precisely where it is meant to save dark
and medieval. No existing `var()` fallback was affected -- the codebase has
none yet -- so this is preventive, landed before Phase 1 writes its first one.
The declarations were also inert: every token is set at runtime by
`applyThemeToCssVariables`, and removing the block changed nothing on screen.
The guard was verified against a control that made it fail.

### D15 — `.navigation-item:hover` ink becomes `--text-primary`
Date: 2026-09-08   Status: active   (settles Q8)
Decision: the nav hover rule takes `--text-primary` instead of
`--color-primary`, matching D13.
Because: it is the same defect as D13 one tint lighter -- the accent on
`--hover-light` measured 4.01:1 in light, below AA. Verified on rendered
pixels: 4.01:1 -> 13.84:1 light, 6.53:1 -> 10.43:1 dark, medieval 14.4:1.
Hover still reads as hover: the ground goes from nothing to `--hover-light`
and the ink strengthens from `--text-secondary`. Taken in Phase 0 rather than
deferred to Phase 2 at the maintainer's direction.

### D16 — Phase 1's gate is a token-value diff, not screenshots
Date: 2026-09-08   Status: active
Decision: Phase 1 is gated by `themes/__tests__/token-values.test.tsx`, which
drives the real `ThemeProvider`, reads the variables it writes to the root
element, and compares them against a baseline captured before any
restructuring. Semantics: no existing token may change value or disappear;
adding tokens passes.
Because: the repo has no visual-regression tooling, and adding it is a project
of its own that Phase 1 would have to finish first. A screenshot is also the
weaker instrument here -- it cannot separate a value change from a rendering
difference, and it needs a human to read it. What Phase 1 actually promises is
narrower and exactly checkable: same values, new structure. Additions must
pass, because introducing surface pairs is the point of the phase. Verified
against a control: a one-hex-digit change to lightTheme's primary failed the
light theme only and named the three affected tokens.
Note this does not cover markup or layout drift. Phase 1 changes no markup, so
that is in scope for the phase as written; if it starts to, the gate needs a
second instrument.

### D17 — Clean names now, all consumers migrated in one pass
Date: 2026-09-08   Status: active
Decision: traversal produces model-shaped variable names, and all consumer
sites were rewritten in Phase 1. No aliases, no second pass.
Because: chosen by the maintainer over two lower-risk alternatives (emitting
legacy names alongside new ones, or bending the tree to reproduce today's
names). The cost is the largest diff of the three and a big mechanical rename
inside the phase whose value is being unchanged; the benefit is that the tree
is shaped by the model rather than by history, and the work is finished rather
than half-done across phases. 211 replacements across 6 files; a scan
confirms zero references to any pre-rename name remain.
Naming derivation: path segments join with `-`, and camelCase inside a segment
splits on the same character, so `surface.card.onMuted` gives
`--surface-card-on-muted`. `flattenTokens` throws on two paths deriving one
name rather than letting key order decide the survivor.

### D18 — Seven alias variables retired; the eight location-type ones kept
Date: 2026-09-08   Status: active
Decision: `--book-bg`, `--book-content-bg`, `--book-header-bg`,
`--book-nav-bg`, `--book-pagination-bg`, `--spinner-border` and
`--spinner-active` are gone; their consumers name the token they always
equalled. The eight `--location-type-*` survive.
Because: those seven were pure indirection -- each was defined as another
token's value, so the variable added a name without adding a decision, and all
were consumed only inside components.css. Retiring them is free and reduces
the set. `--location-type-*` is different: the entity palette replaces it in
Phase 3, and retiring it is a listed one-way door, so it stays until the
palette exists to absorb it.

### D19 — `chrome` and `footer` are separate surfaces for now
Date: 2026-09-08   Status: active
Decision: the surface group has both `chrome` and `footer`, rather than one
chrome surface as the design language describes.
Because: today the header is white and the footer is tinted. Collapsing them
into one surface is a visual change, and Phase 1 makes none. Phase 2 merges
them when the chrome becomes one dark band, which is the point at which the
design language's description becomes true of the code.

### D20 — Surface `on` roles repeat the page ink in Phase 1
Date: 2026-09-08   Status: active
Decision: every surface's `on`, `onMuted` and `border` currently hold the same
values as the page's, and `--text-primary` / `--text-secondary` were renamed
to `--surface-page-on` / `--surface-page-on-muted` everywhere rather than
being split per surface.
Because: there is one ink value in each theme today, so any split would be a
rename with no visual consequence -- and choosing a surface for each of the 32
usages is a judgement that only becomes real when a surface's ink actually
differs from the page's. That happens in Phase 2 with the dark chrome. Doing
it now would be unverifiable churn inside a phase gated on changing nothing.
Cost of deferring: until then, text inside a card names the page's ink. The
pair model is in place; it is not yet being exercised.

### D21 — Contrast is enforced on ink pairs, ratcheted on control boundaries
Date: 2026-09-08   Status: active
Decision: `token-contrast.test.ts` enforces 4.5:1 for every surface's `on` and
`onMuted` against its own `bg`, in all three themes. Control boundaries
(`action.outline.border`, `field.border`) are recorded at their measured
ratios and asserted as a floor rather than against 3:1. A surface's own
`border` is not checked.
Because: the ink pairs all pass, so enforcing them costs nothing and locks
them. The control boundaries do not pass and fixing them means changing colour
values, which this phase does not do -- a floor makes the shortfall visible
and prevents it worsening, without adding a red test to a suite whose contract
is that red means regression. A card's hairline is deliberately quiet
structure rather than the thing identifying a control, so WCAG 1.4.11 does not
bind on it and asserting 3:1 there would be inventing a requirement.

### D22 — The chrome is one deep near-neutral band, header and footer together
Date: 2026-09-08   Status: active   (completes D19)
Decision: the light theme's chrome becomes `#171A21` with `#F7F9FC` ink and
`#9AA4B5` muted ink. `surface.footer` is retired; the footer consumes the
chrome pair. Dark and medieval keep their own chrome values.
Because: value contrast belongs in the frame, and the surfaces you scan every
session stay quiet -- the page and cards are untouched. The chrome's ink is the
page's own ground, which ties the band to the paper rather than making it a
separate visual system. D19 deferred the header/footer merge to the phase where
the chrome became one band; this is that phase.

### D23 — Surfaces gained `hover` and `selected` roles
Date: 2026-09-08   Status: active
Decision: `SurfacePair` is six roles, not four. Every surface defines its own
feedback tints, and the two global `state.hover*` tokens no longer serve the
chrome.
Because: a tint is only meaningful relative to what it sits on. A dark chrome
needs a light overlay where the light page needs a dark one, and no single
value is both -- the light theme's opaque `#93C5FD` active pill would have been
a bright slab on a near-black bar. This is token-model section 2 applied as
written: when a component needs something the pair does not offer, the surface
is under-specified, so the role goes on the surface rather than into a one-off
token. Seeded from each theme's existing tints, so nothing outside the chrome
changed.

### D24 — `Typography` inherits its colour
Date: 2026-09-08   Status: active
Decision: `.typography` sets `color: inherit` instead of `--surface-page-on`.
Because: it named an ink unconditionally, so every piece of text carried the
page's colour regardless of the surface under it. That was invisible while all
surfaces shared one ink, and became four unreadable labels the moment the
chrome went dark -- the nav items, the campaign switcher and the footer links
all rendered near-black on near-black. This is the exact defect the pair model
exists to prevent, found by the first surface that stopped matching the page.
`body` still sets the page ink, so the page and cards are unchanged.
Ghost buttons in the chrome are scoped the same way. That is a structural
scope, not a theme-conditional patch: it says a ghost button on this surface
takes this surface's values. Their accent ink measured 2.0:1 on the band.

---

## Revisions

### R1 — revises D9 (the layer-order half only)
Date: 2026-09-08
Change: Phase 0 does **not** declare a CSS layer order. The rest of D9 stands
and is implemented: surface classes own resting paint, `.selectable-item` owns
only hover and transition.
Because: an assumption in D9 turned out to be false. CSS cascade layers are
not a tie-breaker layered on top of specificity -- **unlayered declarations
beat layered ones outright, regardless of specificity**. Tailwind's utilities
are emitted unlayered (the `@import`s are hoisted above them, so utilities
land last). Putting `.selectable-item:hover` in a `state` layer therefore made
it lose to a plain `.bg-secondary` utility, silently killing hover on the
quest-progress cell -- the opposite of the intent, and a breach of the Phase 0
gate. Verified in the browser, not reasoned about: a layered rule with triple
class specificity lost to a single unlayered class.
Cost: the layer blocks were written and reverted the same session; no other
work depended on them. Declaring an order means also wrapping Tailwind's
output (`@layer tw-base, tw-components, surface, state, tw-utilities;` with
`@tailwind` inside each), which changes precedence app-wide -- including
inverting `theme-effects.css` against the utilities. That belongs in Phase 1
alongside the token restructure, not in a phase fenced as "nothing else
changes". Tracked as Q6.

### R2 — revises the recorded test baseline
Date: 2026-09-08
Change: the pre-Phase-0 baseline on `main` is **243 suites / 4883 tests, 0
failed, 2 skipped**.
Because: CLAUDE.md recorded 235 suites / 4717 tests, measured on a branch that
has since merged. Measured fresh at the top of this phase, per that file's own
"measure it, don't carry one forward" rule.
Cost: none -- caught before any change was made, so the after-run had a true
comparison. Post-Phase-0 run is identical: 243 / 4883, 0 failed.

### R3 — revises D5's role in Phase 1
Date: 2026-09-08
Change: Phase 1 introduces **no** `var(--new, --old)` fallbacks. D5 stands as a
rule for adding a token to a partially-migrated set; it simply had nothing to
do here.
Because: D5 exists to keep an unmigrated theme rendering while new tokens
appear. All three themes were migrated in the same commit, so no unmigrated
theme ever existed. The guarantee is now carried by something stronger than a
fallback chain: `themes.test.ts` asserts that light, dark and medieval define
exactly the same token paths as each other, so a theme cannot be missing a
token for a fallback to rescue. A fallback would have been unreachable code
asserting a state the tests forbid.
Cost: none. If a future phase adds a token to one theme before the others --
Phase 2's dark chrome is the likely case -- D5 applies again as written, and
the parity test is what will force the question.
Note also that fallbacks would have been actively unsafe here until D14: while
`variables.css` declared every name as `--x: ;`, `var(--new, --old)` could not
reach its fallback at all.

---

## Open questions

Answer as the work reaches them; move to a decision when settled.

- **Q1** — Entity palette as index-suffixed variables or one joined value?
  Changes what a manifest can assert. Decide before package extraction.
- **Q2** — Does the package validate enum token *values*, or only that
  variables exist? Ornament needs the former, which is stronger than a
  spelling check.
- **Q3** — Should the precedence lint (no resting background in a state class)
  live in the app or the shared package?
- **Q4** — Which surface does the hero band's empty fallback use, and does it
  differ per theme?
- **Q5** — When do fallbacks get removed? Proposal: only once every theme
  defines the token, as deliberate cleanup.
- **Q6** — Where does the cascade layer order land, given R1? Declaring one
  requires wrapping Tailwind's `@tailwind` output in named layers, which
  changes precedence app-wide and inverts `theme-effects.css` against the
  utilities. Proposal: Phase 1, with the token restructure, where a screenshot
  gate would actually catch the fallout.

- **Q9** — `action.outline.border` and `field.border` fail WCAG 1.4.11 (3:1
  for boundaries that identify a control). Measured against the least
  favourable of page and card:

  | theme | action.outline.border | field.border |
  |---|---|---|
  | light | 1.71:1 | 1.40:1 |
  | dark | 1.38:1 | 1.98:1 |
  | medieval | 6.55:1 (ok) | 2.34:1 |

  An outline button and a text input are identified by their borders, so this
  is a real failure, not a quiet-hairline judgement call. Out of scope for
  Phase 1, which changes no values; floors are recorded in
  `token-contrast.test.ts` so it cannot worsen. Fix in Phase 2 with the chrome,
  or as a dedicated contrast pass?

Settled: **Q7** by D14, **Q8** by D15.
