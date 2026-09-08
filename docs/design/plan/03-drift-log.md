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

Settled: **Q7** by D14, **Q8** by D15.
